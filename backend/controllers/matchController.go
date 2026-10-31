package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"projectup/database"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// Matching is two-stage: a cheap skill/topic overlap prefilter narrows the
// pool, then the LLM reranks the shortlist and explains each pick.
const (
	matchShortlistSize = 8
	matchResultSize    = 5
	matchCacheTTL      = 30 * time.Minute
	// Candidates for a post are shortlisted and shown per open role, so every
	// gap in the team gets its own few names.
	matchPerRoleShortlist = 3
	matchPerRole          = 2
	matchShortlistCap     = 12
	// Up to this many people (or projects), the model sees all of them: the
	// keyword prefilter misses related fields (临床 vs 医疗 vs 公共卫生), and
	// a small pool fits in one prompt anyway.
	matchFullPoolSize = 30
	// Matches scored below this are a weak fit and are not shown
	matchMinScore = 60
)

// The founder watches candidates load right after publishing. Replies
// usually take about 8s but now and then stall for 30s or more, so a
// second, identical request starts if the first hasn't answered by
// candidateHedgeAfter, and whichever answers first wins.
const (
	candidateHedgeAfter  = 12 * time.Second
	candidateCallTimeout = 45 * time.Second
)

type rankedCandidates struct {
	Matches []candidateMatch `json:"matches"`
}

// rankCandidatesHedged runs the ranking call, hedged as described above.
func rankCandidatesHedged(postSID, userPrompt string) (rankedCandidates, error) {
	type result struct {
		ranked rankedCandidates
		err    error
	}
	results := make(chan result, 2)
	start := func() {
		go func() {
			var r rankedCandidates
			err := services.OpenRouterJSONWithin(candidateCallTimeout, candidateRankPrompt, userPrompt, 0.2, &r)
			results <- result{r, err}
		}()
	}

	start()
	pending := 1
	hedge := time.NewTimer(candidateHedgeAfter)
	defer hedge.Stop()
	var lastErr error
	for pending > 0 {
		select {
		case <-hedge.C:
			log.Printf("candidate matching for %s is slow; starting a second request", postSID)
			start()
			pending++
		case r := <-results:
			pending--
			if r.err == nil {
				return r.ranked, nil
			}
			lastErr = r.err
			// A fast failure (e.g. a provider error) is retried once right away
			if pending == 0 && hedge.Stop() {
				log.Printf("candidate matching for %s failed: %v; retrying", postSID, r.err)
				start()
				pending++
			}
		}
	}
	return rankedCandidates{}, lastErr
}

type matchCacheEntry struct {
	value   interface{}
	expires time.Time
}

var (
	matchCache   = map[string]matchCacheEntry{}
	matchCacheMu sync.Mutex
)

func getCachedMatch(key string) (interface{}, bool) {
	matchCacheMu.Lock()
	defer matchCacheMu.Unlock()
	entry, ok := matchCache[key]
	if !ok || time.Now().After(entry.expires) {
		return nil, false
	}
	return entry.value, true
}

// invalidateMatchCache drops cached results whose key starts with prefix.
func invalidateMatchCache(prefix string) {
	matchCacheMu.Lock()
	defer matchCacheMu.Unlock()
	for key := range matchCache {
		if strings.HasPrefix(key, prefix) {
			delete(matchCache, key)
		}
	}
}

func setCachedMatch(key string, value interface{}) {
	matchCacheMu.Lock()
	defer matchCacheMu.Unlock()
	matchCache[key] = matchCacheEntry{value: value, expires: time.Now().Add(matchCacheTTL)}
}

type matchCall struct {
	done  chan struct{}
	value gin.H
	err   error
}

var (
	matchInflight   = map[string]*matchCall{}
	matchInflightMu sync.Mutex
)

// sharedMatch returns the cached result for key, or computes it once: callers
// that arrive while it runs (e.g. the warm-up started at publish and the
// page's own request) wait for the same LLM call instead of starting another.
func sharedMatch(key string, refresh bool, compute func() (gin.H, error)) (gin.H, error) {
	if !refresh {
		if cached, ok := getCachedMatch(key); ok {
			return cached.(gin.H), nil
		}
	}
	matchInflightMu.Lock()
	if call, ok := matchInflight[key]; ok {
		matchInflightMu.Unlock()
		<-call.done
		return call.value, call.err
	}
	call := &matchCall{done: make(chan struct{})}
	matchInflight[key] = call
	matchInflightMu.Unlock()

	call.value, call.err = compute()
	if call.err == nil {
		setCachedMatch(key, call.value)
	}
	matchInflightMu.Lock()
	delete(matchInflight, key)
	matchInflightMu.Unlock()
	close(call.done)
	return call.value, call.err
}

// candidateProfile is the compact view of a user that the matcher reasons over.
type candidateProfile struct {
	// HoursCheck maps role title to a precomputed weekly-hours comparison, so
	// the model doesn't have to do (and get wrong) the arithmetic itself.
	HoursCheck   map[string]string `json:"hours_check,omitempty"`
	UserID       uint              `json:"user_id"`
	ShortID      string            `json:"sid"`
	Name         string            `json:"name"`
	Field        string            `json:"field"`
	School       string            `json:"school"`
	Bio          string            `json:"bio"`
	Skills       []string          `json:"skills"`
	Interests    []string          `json:"interests"`
	DesiredRoles []string          `json:"desired_roles,omitempty"`
	HoursPerWeek int               `json:"hours_per_week"`
}

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func displayName(p models.Profile) string {
	if name := strOrEmpty(p.PreferredName); name != "" {
		return name
	}
	return strings.TrimSpace(strOrEmpty(p.FirstName) + " " + strOrEmpty(p.LastName))
}

// loadCandidateProfiles builds profiles for the given users, or for everyone
// except excludeIDs when userIDs is nil.
func loadCandidateProfiles(userIDs []uint, excludeIDs []uint) ([]candidateProfile, error) {
	query := database.DB.Model(&models.Profile{})
	if userIDs != nil {
		query = query.Where("user_id IN ?", userIDs)
	}
	if len(excludeIDs) > 0 {
		query = query.Where("user_id NOT IN ?", excludeIDs)
	}
	var profiles []models.Profile
	if err := query.Find(&profiles).Error; err != nil {
		return nil, err
	}

	ids := make([]uint, 0, len(profiles))
	for _, p := range profiles {
		ids = append(ids, p.UserID)
	}
	var skills []models.UserSkill
	var interests []models.UserInterest
	database.DB.Where("user_id IN ?", ids).Find(&skills)
	database.DB.Where("user_id IN ?", ids).Find(&interests)

	skillsByUser := map[uint][]string{}
	for _, s := range skills {
		skillsByUser[s.UserID] = append(skillsByUser[s.UserID], fmt.Sprintf("%s (%d/5)", s.Name, s.Level))
	}
	interestsByUser := map[uint][]string{}
	for _, i := range interests {
		interestsByUser[i.UserID] = append(interestsByUser[i.UserID], i.Name)
	}

	result := make([]candidateProfile, 0, len(profiles))
	for _, p := range profiles {
		hours := 0
		if p.HoursPerWeek != nil {
			hours = *p.HoursPerWeek
		}
		var desiredRoles []string
		if len(p.DesiredRoles) > 0 {
			_ = json.Unmarshal(p.DesiredRoles, &desiredRoles)
		}
		result = append(result, candidateProfile{
			DesiredRoles: desiredRoles,
			UserID:       p.UserID,
			ShortID:      p.ShortID,
			Name:         displayName(p),
			Field:        strOrEmpty(p.Field),
			School:       strOrEmpty(p.School),
			Bio:          strOrEmpty(p.Biography),
			Skills:       skillsByUser[p.UserID],
			Interests:    interestsByUser[p.UserID],
			HoursPerWeek: hours,
		})
	}
	return result, nil
}

// overlapScore counts terms in want that loosely match a term in have.
func overlapScore(want []string, have []string) int {
	score := 0
	for _, w := range want {
		w = strings.ToLower(strings.TrimSpace(w))
		if w == "" {
			continue
		}
		for _, h := range have {
			h = strings.ToLower(h)
			if strings.Contains(h, w) || strings.Contains(w, strings.SplitN(h, " (", 2)[0]) {
				score++
				break
			}
		}
	}
	return score
}

// hanBigrams returns the two-character runs of the Han text in s, e.g.
// "临床顾问" -> 临床, 床顾, 顾问.
func hanBigrams(s string) []string {
	var grams []string
	runes := []rune(s)
	for i := 0; i+1 < len(runes); i++ {
		if unicode.Is(unicode.Han, runes[i]) && unicode.Is(unicode.Han, runes[i+1]) {
			grams = append(grams, string(runes[i:i+2]))
		}
	}
	return grams
}

// fuzzyOverlap counts terms in want that share a two-character Chinese word
// with some text in have. Chinese role and skill names rarely match whole
// (临床顾问 vs 临床知识), so exact overlap alone misses the obvious people.
func fuzzyOverlap(want []string, have []string) int {
	score := 0
	for _, w := range want {
		matched := false
		for _, gram := range hanBigrams(w) {
			for _, h := range have {
				if strings.Contains(h, gram) {
					matched = true
					break
				}
			}
			if matched {
				break
			}
		}
		if matched {
			score++
		}
	}
	return score
}

// replyLanguage is the UI language from ?lang=zh|en, or else the language of
// the sample text, so reasons match what the user is reading.
func replyLanguage(c *gin.Context, sample string) string {
	switch lang := c.Query("lang"); lang {
	case "zh", "en":
		return lang
	}
	for _, r := range sample {
		if unicode.Is(unicode.Han, r) {
			return "zh"
		}
	}
	return "en"
}

// languageInstruction pins the reply language, since the JSON payload and the
// English system prompt otherwise pull the model towards English.
func languageInstruction(lang string) string {
	if lang == "zh" {
		return "Write every reason and risk in Simplified Chinese.\n\n"
	}
	return "Write every reason and risk in English, even when the profiles and projects are in Chinese.\n\n"
}

// hoursCheck states whether available hours cover each role's weekly need.
func hoursCheck(available int, roles []RoleCard) map[string]string {
	checks := map[string]string{}
	for _, r := range roles {
		switch {
		case r.HoursPerWeek <= 0:
			continue
		case available <= 0:
			checks[r.Title] = fmt.Sprintf("needs %dh/week; availability unknown", r.HoursPerWeek)
		case available >= r.HoursPerWeek:
			checks[r.Title] = fmt.Sprintf("needs %dh/week, has %dh: enough", r.HoursPerWeek, available)
		default:
			checks[r.Title] = fmt.Sprintf("needs %dh/week, has %dh: short by %dh", r.HoursPerWeek, available, r.HoursPerWeek-available)
		}
	}
	return checks
}

func parseRoles(spots []byte) []RoleCard {
	var roles []RoleCard
	_ = json.Unmarshal(spots, &roles)
	return roles
}

func parseTopics(topic []byte) []string {
	var topics []string
	_ = json.Unmarshal(topic, &topics)
	return topics
}

func roleSkills(roles []RoleCard) []string {
	var all []string
	for _, r := range roles {
		all = append(all, r.Skills...)
		all = append(all, r.Title)
	}
	return all
}

const candidateRankPrompt = `You help a project owner pick teammates. Matching is about reliable, complementary people, not just keyword overlap: weigh concrete skills for a specific role, whether their weekly hours cover the role's needs, and relevant interests.

Given the project, its open roles and a shortlist of candidates, return JSON:
{"matches": [{"user_id": 0, "role": "", "score": 0, "reason": "", "risk": ""}]}

Rules:
- For each open role, list up to 2 candidates who could fill it, best first. A person appears under at most one role: the one they fit best. Leave a role out when nobody on the list fits it.
- role must be one of the open role titles. score is 0-100.
- hours_check is computed exactly from the data; trust it and never contradict it. Only raise hours as a risk when it says "short by". Never mention field names like hours_check in what you write.
- Treat closely related skills as transferable (e.g. React covers UI implementation and frontend development; Python plus statistics covers data analysis). Do not penalise a missing keyword the person plausibly covers.
- reason: one sentence, at most 40 Chinese characters or 25 English words, citing their concrete evidence.
- score honestly: 80+ needs direct evidence for the role's core work (a matching skill at 3/5 or above, or a field or desired role that is this kind of work); 60-79 means related, transferable experience; below 60 is a weak fit. Do not stretch unrelated skills to fill a role (statistics is not campus operations, finance is not healthcare).
- risk: the single concern that matters most for this decision, at most 40 Chinese characters or 25 English words. Prefer a concrete mismatch (weekly hours below what the role needs, a must-have skill truly missing, a skill level of 1-2/5). Do not default to "may lack experience in X". Never leave it empty or write "none" or "无": even a strong fit has one thing worth checking first, such as a skill below 4/5 or no shipped work in this area.
- Write reason and risk in the language the user message asks for.`

const postRankPrompt = `You recommend projects to a person looking to join a team. Weigh whether they can fill a specific open role with their concrete skills, whether their weekly hours cover what the role needs, and whether the project matches their interests.

Given the person and a shortlist of projects, return JSON:
{"matches": [{"post_sid": "", "role": "", "score": 0, "reason": "", "risk": ""}]}

Rules:
- At most 5 matches, best first. Only include projects where they could really fill a role; fewer or none is fine.
- role must be one of that project's role titles. score is 0-100.
- hours_check is computed exactly from the data; trust it and never contradict it. Only raise hours as a risk when it says "short by". Never mention field names like hours_check in what you write.
- Treat closely related skills as transferable (e.g. React covers UI implementation and frontend development; Python plus statistics covers data analysis). Do not penalise a missing keyword the person plausibly covers.
- reason: one sentence, at most 40 Chinese characters or 25 English words, citing their concrete evidence.
- score honestly: 80+ needs direct evidence for the role's core work (a matching skill at 3/5 or above, or a field or desired role that is this kind of work); 60-79 means related, transferable experience; below 60 is a weak fit. Do not stretch unrelated skills to fill a role (statistics is not campus operations, finance is not healthcare).
- risk: the single concern that matters most for this decision, at most 40 Chinese characters or 25 English words. Prefer a concrete mismatch (weekly hours below what the role needs, a must-have skill truly missing, a skill level of 1-2/5). Do not default to "may lack experience in X". Never leave it empty or write "none" or "无": even a strong fit has one thing worth checking first, such as a skill below 4/5 or no shipped work in this area.
- Write reason and risk in the language the user message asks for.`

type candidateMatch struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	Score  int    `json:"score"`
	Reason string `json:"reason"`
	Risk   string `json:"risk"`
}

type postMatch struct {
	PostSID string `json:"post_sid"`
	Role    string `json:"role"`
	Score   int    `json:"score"`
	Reason  string `json:"reason"`
	Risk    string `json:"risk"`
}

// GetPostCandidates recommends people for the open roles of a post the
// current user owns, a few per role.
func GetPostCandidates() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		sid := c.Param("sid")

		var post models.ProjectPost
		if err := database.DB.Where("sid = ?", sid).First(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}
		if post.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the post owner can see recommended candidates"})
			return
		}

		lang := replyLanguage(c, post.Title+strOrEmpty(post.Description))
		response, err := sharedMatch(candidatesCacheKey(sid, lang), c.Query("refresh") != "", func() (gin.H, error) {
			return computePostCandidates(post, lang)
		})
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, response)
	}
}

func candidatesCacheKey(sid, lang string) string {
	return fmt.Sprintf("candidates:%s:%s", sid, lang)
}

// warmPostCandidates starts matching for a just-published post in the
// background, so the founder's first look at their candidates doesn't wait
// on the LLM from scratch.
func warmPostCandidates(post models.ProjectPost, lang string) {
	go func() {
		if _, err := sharedMatch(candidatesCacheKey(post.ShortID, lang), false, func() (gin.H, error) {
			return computePostCandidates(post, lang)
		}); err != nil {
			log.Printf("warm candidates for %s: %v", post.ShortID, err)
		}
	}()
}

// roleShortlist picks, for each role, the few candidates whose skills,
// desired roles and interests overlap it most, so no role is crowded out by
// another with more keywords. With no overlap at all it falls back to the
// overall ranking.
func roleShortlist(candidates []candidateProfile, roles []RoleCard, topics []string) []candidateProfile {
	roleScore := func(cand candidateProfile, r RoleCard) int {
		want := append(append([]string{}, r.Skills...), r.Title)
		background := append(append([]string{}, cand.Skills...), cand.Field, cand.Bio)
		return overlapScore(want, cand.Skills)*2 + fuzzyOverlap(want, background) +
			overlapScore([]string{r.Title}, cand.DesiredRoles)*2 + overlapScore(topics, cand.Interests)
	}

	picked := map[uint]bool{}
	var shortlist []candidateProfile
	for _, r := range roles {
		ranked := append([]candidateProfile{}, candidates...)
		sort.SliceStable(ranked, func(i, j int) bool { return roleScore(ranked[i], r) > roleScore(ranked[j], r) })
		taken := 0
		for _, cand := range ranked {
			if taken == matchPerRoleShortlist || roleScore(cand, r) == 0 {
				break
			}
			if picked[cand.UserID] {
				continue
			}
			picked[cand.UserID] = true
			shortlist = append(shortlist, cand)
			taken++
		}
	}
	if len(shortlist) == 0 {
		want := roleSkills(roles)
		shortlist = append([]candidateProfile{}, candidates...)
		sort.SliceStable(shortlist, func(i, j int) bool {
			return overlapScore(want, shortlist[i].Skills)*2+overlapScore(topics, shortlist[i].Interests) >
				overlapScore(want, shortlist[j].Skills)*2+overlapScore(topics, shortlist[j].Interests)
		})
		if len(shortlist) > matchShortlistSize {
			shortlist = shortlist[:matchShortlistSize]
		}
	}
	if len(shortlist) > matchShortlistCap {
		shortlist = shortlist[:matchShortlistCap]
	}
	return shortlist
}

// computePostCandidates shortlists people per open role and has the LLM pick
// and explain up to matchPerRole of them for each.
func computePostCandidates(post models.ProjectPost, lang string) (gin.H, error) {
	var project models.Project
	database.DB.First(&project, post.ProjectID)
	roles := parseRoles(post.Spots)

	var memberIDs []uint
	database.DB.Model(&models.ProjectMember{}).Where("project_id = ?", post.ProjectID).Pluck("user_id", &memberIDs)
	exclude := append(memberIDs, post.UserID)

	pool, err := loadCandidateProfiles(nil, exclude)
	if err != nil {
		return nil, fmt.Errorf("failed to load candidates")
	}

	topics := parseTopics(project.Topic)
	candidates := pool
	if len(pool) > matchFullPoolSize {
		candidates = roleShortlist(pool, roles, topics)
	}
	for i := range candidates {
		candidates[i].HoursCheck = hoursCheck(candidates[i].HoursPerWeek, roles)
	}

	// Only what the model judges fit on: no short IDs or schools, and roles
	// without their descriptions, to keep the prompt (and the wait) short
	type promptCandidate struct {
		UserID       uint              `json:"user_id"`
		Name         string            `json:"name"`
		Field        string            `json:"field"`
		Bio          string            `json:"bio"`
		Skills       []string          `json:"skills"`
		Interests    []string          `json:"interests,omitempty"`
		DesiredRoles []string          `json:"desired_roles,omitempty"`
		HoursPerWeek int               `json:"hours_per_week"`
		HoursCheck   map[string]string `json:"hours_check,omitempty"`
	}
	people := make([]promptCandidate, 0, len(candidates))
	for _, cand := range candidates {
		people = append(people, promptCandidate{cand.UserID, cand.Name, cand.Field, cand.Bio, cand.Skills, cand.Interests, cand.DesiredRoles, cand.HoursPerWeek, cand.HoursCheck})
	}
	type promptRole struct {
		Title        string   `json:"title"`
		Skills       []string `json:"skills"`
		HoursPerWeek int      `json:"hours_per_week"`
	}
	openRoleList := make([]promptRole, 0, len(roles))
	for _, r := range roles {
		openRoleList = append(openRoleList, promptRole{r.Title, r.Skills, r.HoursPerWeek})
	}
	promptData, _ := json.Marshal(gin.H{
		"project":    gin.H{"title": post.Title, "description": strOrEmpty(post.Description), "topics": topics},
		"roles":      openRoleList,
		"candidates": people,
	})

	userPrompt := languageInstruction(lang) + string(promptData)
	ranked, err := rankCandidatesHedged(post.ShortID, userPrompt)
	if err != nil {
		return nil, err
	}

	byID := map[uint]candidateProfile{}
	for _, cand := range candidates {
		byID[cand.UserID] = cand
	}
	openRoles := map[string]bool{}
	for _, r := range roles {
		openRoles[r.Title] = true
	}
	// The model may list one person under several roles or overfill a role;
	// keep each person once and at most matchPerRole per role.
	results := []gin.H{}
	seen := map[uint]bool{}
	perRole := map[string]int{}
	for _, m := range ranked.Matches {
		cand, ok := byID[m.UserID]
		if !ok || seen[m.UserID] || (len(openRoles) > 0 && !openRoles[m.Role]) || perRole[m.Role] == matchPerRole || m.Score < matchMinScore {
			continue
		}
		seen[m.UserID] = true
		perRole[m.Role]++
		results = append(results, gin.H{"candidate": cand, "role": m.Role, "score": m.Score, "reason": m.Reason, "risk": m.Risk})
	}

	return gin.H{"post_sid": post.ShortID, "title": post.Title, "roles": roles, "matches": results, "pool_size": len(pool), "shortlist_size": len(candidates)}, nil
}

// GetRecommendedPosts recommends open projects to the current user.
func GetRecommendedPosts() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		lang := replyLanguage(c, "")
		cacheKey := fmt.Sprintf("posts:%d:%s", userID, lang)
		if c.Query("refresh") == "" {
			if cached, ok := getCachedMatch(cacheKey); ok {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		me, err := loadCandidateProfiles([]uint{userID}, nil)
		if err != nil || len(me) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Complete your profile (skills and interests) to get recommendations"})
			return
		}
		person := me[0]

		var joined []uint
		database.DB.Model(&models.ProjectMember{}).Where("user_id = ?", userID).Pluck("project_id", &joined)

		query := database.DB.Where("status = ? AND visibility = ? AND user_id <> ?", 1, 2, userID)
		if len(joined) > 0 {
			query = query.Where("project_id NOT IN ?", joined)
		}
		var posts []models.ProjectPost
		if err := query.Find(&posts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load projects"})
			return
		}

		projectIDs := make([]uint, 0, len(posts))
		for _, p := range posts {
			projectIDs = append(projectIDs, p.ProjectID)
		}
		var projects []models.Project
		database.DB.Where("project_id IN ?", projectIDs).Find(&projects)
		topicsByProject := map[uint][]string{}
		for _, p := range projects {
			topicsByProject[p.ProjectID] = parseTopics(p.Topic)
		}

		type shortlistItem struct {
			SID         string            `json:"post_sid"`
			Title       string            `json:"title"`
			Description string            `json:"description"`
			Topics      []string          `json:"topics"`
			Roles       []RoleCard        `json:"roles"`
			HoursCheck  map[string]string `json:"hours_check"`
			score       int
		}
		items := make([]shortlistItem, 0, len(posts))
		for _, p := range posts {
			roles := parseRoles(p.Spots)
			topics := topicsByProject[p.ProjectID]
			items = append(items, shortlistItem{
				SID:         p.ShortID,
				Title:       p.Title,
				Description: strOrEmpty(p.Description),
				Topics:      topics,
				Roles:       roles,
				HoursCheck:  hoursCheck(person.HoursPerWeek, roles),
				score:       overlapScore(roleSkills(roles), person.Skills)*2 + overlapScore(topics, person.Interests),
			})
		}
		sort.SliceStable(items, func(i, j int) bool { return items[i].score > items[j].score })
		if len(items) > matchFullPoolSize {
			items = items[:matchShortlistSize]
		}

		promptData, _ := json.Marshal(gin.H{"person": person, "projects": items})
		var ranked struct {
			Matches []postMatch `json:"matches"`
		}
		userPrompt := languageInstruction(lang) + string(promptData)
		if err := services.OpenRouterJSON(postRankPrompt, userPrompt, 0.2, &ranked); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}

		bySID := map[string]shortlistItem{}
		for _, it := range items {
			bySID[it.SID] = it
		}
		// The model may list one project under several roles; keep the best.
		results := []gin.H{}
		seen := map[string]bool{}
		for _, m := range ranked.Matches {
			it, ok := bySID[m.PostSID]
			if !ok || seen[m.PostSID] || m.Score < matchMinScore {
				continue
			}
			seen[m.PostSID] = true
			results = append(results, gin.H{"post": it, "role": m.Role, "score": m.Score, "reason": m.Reason, "risk": m.Risk})
			if len(results) == matchResultSize {
				break
			}
		}

		response := gin.H{"matches": results}
		setCachedMatch(cacheKey, response)
		c.JSON(http.StatusOK, response)
	}
}
