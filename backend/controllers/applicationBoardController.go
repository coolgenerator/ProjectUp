package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"projectup/database"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

// While an application is pending (status 0) the founder moves it through
// review stages. Accepting and declining still go through
// UpdateApplicationStatusHandler, which also adds the member.
var applicationStages = map[string]bool{"new": true, "talking": true, "trial": true}

type boardPost struct {
	PostID     uint           `json:"post_id"`
	SID        string         `json:"sid"`
	ProjectSID string         `json:"project_sid"`
	Title      string         `json:"title"`
	Roles      []RoleCard     `json:"roles"`
	RoleFills  map[string]int `json:"role_fills"`
}

type boardAnswer struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type boardApplicant struct {
	UserID       uint        `json:"user_id"`
	SID          string      `json:"sid"`
	Name         string      `json:"name"`
	AvatarURL    string      `json:"avatar_url"`
	Field        string      `json:"field"`
	School       string      `json:"school"`
	Skills       []string    `json:"skills"`
	HoursPerWeek int         `json:"hours_per_week"`
	Website      string      `json:"website"`
	Reliability  reliability `json:"reliability"`
	ResumeURL    string      `json:"resume_url"`
}

// applicationSummary is the AI's quick read of an application for the founder.
type applicationSummary struct {
	Summary string `json:"summary"`
	Fit     string `json:"fit"`
	Risk    string `json:"risk"`
	Lang    string `json:"lang"`
}

type boardApplication struct {
	ApplicationID uint                `json:"application_id"`
	PostSID       string              `json:"post_sid"`
	Role          string              `json:"role"`
	HoursPerWeek  int                 `json:"hours_per_week"`
	FirstStep     string              `json:"first_step"`
	Motivation    string              `json:"motivation"`
	Status        int                 `json:"status"`
	Stage         string              `json:"stage"`
	TrialTask     string              `json:"trial_task"`
	TrialDue      *time.Time          `json:"trial_due"`
	AISummary     *applicationSummary `json:"ai_summary"`
	AppliedAt     time.Time           `json:"applied_at"`
	Applicant     boardApplicant      `json:"applicant"`
	Answers       []boardAnswer       `json:"answers"`
}

// roleFills counts accepted applications per role title for each post.
func roleFills(postIDs []uint) map[uint]map[string]int {
	var rows []struct {
		PostID uint
		Role   string
		Count  int
	}
	fills := map[uint]map[string]int{}
	if len(postIDs) == 0 {
		return fills
	}
	database.DB.Model(&models.ProjectApplication{}).
		Select("post_id, role, COUNT(*) AS count").
		Where("post_id IN ? AND status = ? AND role <> ''", postIDs, 1).
		Group("post_id, role").Scan(&rows)
	for _, r := range rows {
		if fills[r.PostID] == nil {
			fills[r.PostID] = map[string]int{}
		}
		fills[r.PostID][r.Role] = r.Count
	}
	return fills
}

// normalizeStage maps empty or unknown stages (rows created before stages existed) to "new".
func normalizeStage(stage string) string {
	if applicationStages[stage] {
		return stage
	}
	return "new"
}

// GetApplicationBoard returns every application to the caller's live recruiting posts.
func GetApplicationBoard() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		var posts []struct {
			models.ProjectPost
			ProjectSID string `gorm:"column:project_sid"`
		}
		if err := database.DB.Model(&models.ProjectPost{}).
			Select("project_posts.*, projects.sid AS project_sid").
			Joins("JOIN projects ON projects.project_id = project_posts.project_id").
			Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND project_posts.status <> ?", userID, 4).
			Order("project_posts.created_at DESC").
			Scan(&posts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load your projects"})
			return
		}

		postIDs := make([]uint, 0, len(posts))
		postSIDs := map[uint]string{}
		for _, p := range posts {
			postIDs = append(postIDs, p.PostID)
			postSIDs[p.PostID] = p.ShortID
		}
		fills := roleFills(postIDs)

		boardPosts := make([]boardPost, 0, len(posts))
		for _, p := range posts {
			roleFill := fills[p.PostID]
			if roleFill == nil {
				roleFill = map[string]int{}
			}
			boardPosts = append(boardPosts, boardPost{
				PostID: p.PostID, SID: p.ShortID, ProjectSID: p.ProjectSID, Title: p.Title,
				Roles: parseRoles(p.Spots), RoleFills: roleFill,
			})
		}

		applications := []boardApplication{}
		if len(postIDs) > 0 {
			var apps []models.ProjectApplication
			if err := database.DB.Where("post_id IN ?", postIDs).Order("applied_at DESC").Find(&apps).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load applications"})
				return
			}

			appIDs := make([]uint, 0, len(apps))
			applicantIDs := make([]uint, 0, len(apps))
			for _, a := range apps {
				appIDs = append(appIDs, a.ApplicationID)
				applicantIDs = append(applicantIDs, a.UserID)
			}

			applicants := map[uint]boardApplicant{}
			if profiles, err := loadCandidateProfiles(applicantIDs, nil); err == nil {
				for _, p := range profiles {
					applicants[p.UserID] = boardApplicant{
						UserID: p.UserID, SID: p.ShortID, Name: p.Name, Field: p.Field,
						School: p.School, Skills: p.Skills, HoursPerWeek: p.HoursPerWeek,
					}
				}
			}
			var links []struct {
				UserID    uint
				AvatarURL *string
				Website   *string
				ResumeURL *string
			}
			database.DB.Model(&models.Profile{}).Select("user_id, avatar_url, website, resume_url").Where("user_id IN ?", applicantIDs).Scan(&links)
			for _, l := range links {
				if applicant, ok := applicants[l.UserID]; ok {
					applicant.AvatarURL = strOrEmpty(l.AvatarURL)
					applicant.Website = strOrEmpty(l.Website)
					applicant.ResumeURL = strOrEmpty(l.ResumeURL)
					applicants[l.UserID] = applicant
				}
			}

			for id, r := range loadReliability(applicantIDs) {
				if applicant, ok := applicants[id]; ok {
					applicant.Reliability = r
					applicants[id] = applicant
				}
			}

			var answerRows []struct {
				ApplicationID uint
				Text          string
				AnswerText    string
			}
			database.DB.Model(&models.ApplicationAnswer{}).
				Select("application_answers.application_id, application_questions.text, application_answers.answer_text").
				Joins("JOIN application_questions ON application_questions.question_id = application_answers.question_id").
				Where("application_answers.application_id IN ?", appIDs).
				Order("application_questions.question_id").
				Scan(&answerRows)
			answers := map[uint][]boardAnswer{}
			for _, r := range answerRows {
				answers[r.ApplicationID] = append(answers[r.ApplicationID], boardAnswer{Question: r.Text, Answer: r.AnswerText})
			}

			for _, a := range apps {
				applicant, ok := applicants[a.UserID]
				if !ok {
					applicant = boardApplicant{UserID: a.UserID}
				}
				applications = append(applications, boardApplication{
					ApplicationID: a.ApplicationID,
					PostSID:       postSIDs[a.PostID],
					Role:          a.Role,
					HoursPerWeek:  a.HoursPerWeek,
					FirstStep:     a.FirstStep,
					Motivation:    a.Description,
					Status:        a.Status,
					Stage:         normalizeStage(a.Stage),
					TrialTask:     a.TrialTask,
					TrialDue:      a.TrialDue,
					AISummary:     parseSummary(a.AISummary),
					AppliedAt:     a.AppliedAt,
					Applicant:     applicant,
					Answers:       answers[a.ApplicationID],
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{"posts": boardPosts, "applications": applications})
	}
}

// parseSummary reads a cached AI summary, or nil when there is none.
func parseSummary(raw []byte) *applicationSummary {
	if len(raw) == 0 {
		return nil
	}
	var summary applicationSummary
	if json.Unmarshal(raw, &summary) != nil || summary.Summary == "" {
		return nil
	}
	return &summary
}

// findOwnedApplication loads an application to one of the caller's projects,
// answering 404 otherwise. It also returns the post's title.
func findOwnedApplication(c *gin.Context) (*models.ProjectApplication, string, bool) {
	var row struct {
		models.ProjectApplication
		PostTitle string `gorm:"column:post_title"`
	}
	if err := database.DB.Model(&models.ProjectApplication{}).
		Select("project_application.*, project_posts.title AS post_title").
		Joins("JOIN project_posts ON project_posts.post_id = project_application.post_id").
		Joins("JOIN projects ON projects.project_id = project_posts.project_id").
		Where("project_application.application_id = ? AND projects.owner_id = ?", c.Param("id"), c.GetUint("userID")).
		Take(&row).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
		return nil, "", false
	}
	return &row.ProjectApplication, row.PostTitle, true
}

// UpdateApplicationStage moves a pending application between review stages.
// Moving to "trial" requires the task the applicant should do.
func UpdateApplicationStage() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Stage     string `json:"stage"`
			TrialTask string `json:"trial_task"`
			TrialDue  string `json:"trial_due"` // YYYY-MM-DD
		}
		if err := c.ShouldBindJSON(&req); err != nil || !applicationStages[strings.TrimSpace(req.Stage)] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "stage must be one of new, talking, trial"})
			return
		}
		updates := map[string]interface{}{"stage": req.Stage}
		req.TrialTask = strings.TrimSpace(req.TrialTask)
		if req.Stage == "trial" {
			if req.TrialTask == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Describe the trial task"})
				return
			}
			updates["trial_task"] = req.TrialTask
			updates["trial_due"] = nil
			if req.TrialDue != "" {
				// Noon UTC keeps the calendar date the same in every user's timezone
				due, err := time.Parse("2006-01-02 15:04", req.TrialDue+" 12:00")
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "trial_due must be YYYY-MM-DD"})
					return
				}
				updates["trial_due"] = due
			}
		}

		application, postTitle, ok := findOwnedApplication(c)
		if !ok {
			return
		}
		if application.Status != 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Only pending applications can change stage"})
			return
		}
		// Any move counts as the founder's first response
		if application.ReviewAt == nil {
			updates["review_at"] = time.Now()
		}

		if err := database.DB.Model(&models.ProjectApplication{}).
			Where("application_id = ?", application.ApplicationID).
			Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stage"})
			return
		}

		if req.Stage == "trial" {
			var postSID string
			database.DB.Model(&models.ProjectPost{}).Where("post_id = ?", application.PostID).Pluck("sid", &postSID)
			_ = repositories.SaveTypedNotification(application.UserID, models.NotificationTypeApplication,
				"Trial task: "+postTitle,
				fmt.Sprintf("The founder of %s gave you a trial task: %s", postTitle, req.TrialTask),
				fmt.Sprintf("/project/%s/apply", postSID))
		}
		c.JSON(http.StatusOK, gin.H{"application_id": application.ApplicationID, "stage": req.Stage})
	}
}

const applicationSummaryPrompt = `You help a busy project founder triage applications. Given the role the applicant chose, the role card, the applicant's profile and everything they wrote, return JSON:
{"summary": "...", "fit": "...", "risk": "..."}

Rules:
- summary: one sentence on who this person is and what they propose to do first.
- fit: the strongest concrete match between them and the role (skills, hours, the first-step proposal).
- For weekly hours, use hours_check exactly as given; never recompute or guess the role's hours.
- risk: the single biggest concern (e.g. hours below the role's need, vague first step, missing key skill). Say "none obvious" only if there truly is none.
- Each field at most 40 Chinese characters or 25 English words. Base everything on the given data; never invent experience.`

// SummarizeApplication returns (and caches) an AI summary of one application.
func SummarizeApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		application, postTitle, ok := findOwnedApplication(c)
		if !ok {
			return
		}
		lang := replyLanguage(c, application.FirstStep+application.Description)
		if cached := parseSummary(application.AISummary); cached != nil && cached.Lang == lang && c.Query("refresh") == "" {
			c.JSON(http.StatusOK, gin.H{"ai_summary": cached})
			return
		}

		var post models.ProjectPost
		database.DB.Select("spots").Where("post_id = ?", application.PostID).Take(&post)
		var role *RoleCard
		for _, r := range parseRoles(post.Spots) {
			if r.Title == application.Role {
				r := r
				role = &r
			}
		}
		profiles, _ := loadCandidateProfiles([]uint{application.UserID}, nil)
		var answers []boardAnswer
		database.DB.Model(&models.ApplicationAnswer{}).
			Select("application_questions.text AS question, application_answers.answer_text AS answer").
			Joins("JOIN application_questions ON application_questions.question_id = application_answers.question_id").
			Where("application_answers.application_id = ?", application.ApplicationID).
			Scan(&answers)

		input, _ := json.Marshal(gin.H{
			"project":        postTitle,
			"role_applied":   application.Role,
			"role_card":      role,
			"hours_per_week": application.HoursPerWeek,
			"hours_check":    hoursCheck(application.HoursPerWeek, rolesOrNone(role)),
			"first_step":     application.FirstStep,
			"motivation":     application.Description,
			"answers":        answers,
			"profile":        profiles,
		})
		instruction := "Write all three fields in English.\n\n"
		if lang == "zh" {
			instruction = "Write all three fields in Simplified Chinese.\n\n"
		}
		var summary applicationSummary
		if err := services.OpenRouterJSON(applicationSummaryPrompt, instruction+string(input), 0.3, &summary); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		summary.Lang = lang
		cached, _ := json.Marshal(summary)
		database.DB.Model(&models.ProjectApplication{}).Where("application_id = ?", application.ApplicationID).Update("ai_summary", string(cached))
		c.JSON(http.StatusOK, gin.H{"ai_summary": summary})
	}
}

// annotateRecruiting fills in role fills and team size for a page of posts.
func annotateRecruiting(posts []models.ProjectPostResponse) {
	if len(posts) == 0 {
		return
	}
	postIDs := make([]uint, 0, len(posts))
	projectIDs := make([]uint, 0, len(posts))
	for _, p := range posts {
		postIDs = append(postIDs, p.PostID)
		projectIDs = append(projectIDs, p.ProjectID)
	}
	fills := roleFills(postIDs)

	var counts []struct {
		ProjectID uint
		Count     int
	}
	database.DB.Model(&models.ProjectMember{}).
		Select("project_id, COUNT(*) AS count").
		Where("project_id IN ? AND role <> ? AND removed_at IS NULL AND NOT COALESCE(is_placeholder, false)", projectIDs, "owner").
		Group("project_id").Scan(&counts)
	members := map[uint]int{}
	for _, c := range counts {
		members[c.ProjectID] = c.Count
	}

	for i := range posts {
		posts[i].RoleFills = fills[posts[i].PostID]
		if posts[i].RoleFills == nil {
			posts[i].RoleFills = map[string]int{}
		}
		posts[i].MemberCount = members[posts[i].ProjectID]
	}
}

func rolesOrNone(role *RoleCard) []RoleCard {
	if role == nil {
		return nil
	}
	return []RoleCard{*role}
}
