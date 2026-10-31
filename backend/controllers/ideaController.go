package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm/clause"
)

// IdeaQuestion is one guided question in a thinking round.
type IdeaQuestion struct {
	Lens     string `json:"lens"`
	Question string `json:"question"`
	Hint     string `json:"hint"`
}

// IdeaRound is a set of questions plus the user's own answers to them.
type IdeaRound struct {
	Questions []IdeaQuestion `json:"questions"`
	Answers   []string       `json:"answers"`
}

type ideaRequest struct {
	Idea   string      `json:"idea" binding:"required"`
	Rounds []IdeaRound `json:"rounds"`
}

// RoleCard describes one teammate the project needs.
type RoleCard struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Skills       []string `json:"skills"`
	HoursPerWeek int      `json:"hours_per_week"`
	Spots        int      `json:"spots"`
	FirstWeek    string   `json:"first_week"` // A concrete task a new teammate could finish in week one
}

// IdeaBrief is the structured project shaped from an idea and its rounds.
type IdeaBrief struct {
	Title       string     `json:"title"`
	OneLiner    string     `json:"one_liner"`
	Vision      string     `json:"vision"`
	Problem     string     `json:"problem"`
	TargetUsers string     `json:"target_users"`
	Blockers    []string   `json:"blockers"`
	NextSteps   []string   `json:"next_steps"`
	Topics      []string   `json:"topics"`
	Roles       []RoleCard `json:"roles"`
	AgentPrompt string     `json:"agent_prompt"`
}

const ideaCoachPrompt = `You are a thinking coach for early-stage project ideas. You never think for the user; you ask the questions an expert founder or researcher would ask so the user does the thinking.

Given an idea and any previous question rounds with the user's answers, return JSON:
{"reflection": "...", "questions": [{"lens": "...", "question": "...", "hint": "..."}]}

Rules:
- Exactly 3 questions. Each uses a different lens, chosen from: 本质/第一性原理, 目标用户与场景, 为什么是现在, 最小验证, 关键假设与风险, 需要什么样的伙伴.
- Do not repeat a lens or question already asked in previous rounds; go deeper based on the answers.
- "question" is one short sentence. "hint" is a one-line example of what a good answer covers, not the answer itself.
- "reflection" is at most 2 short sentences reacting to the user's latest answers (empty string on the first round). Point out a gap or tension; do not praise.
- Reply in the same language as the idea.`

// noInventedFacts keeps briefs to what the founder said: a model-made
// statistic in a public post reads as the founder's own claim.
const noInventedFacts = `Never add numbers, statistics, dates, studies, reports or sources the user didn't give. Where the user gave no figure, describe it in words instead (e.g. "many patients are missed", not "15% are missed").`

const ideaShapePrompt = `You turn an idea plus the user's own answers into a concise project brief that a small team could start on. Stay faithful to what the user wrote; where they were vague, make the smallest reasonable assumption.

Return JSON:
{"title": "", "one_liner": "", "vision": "", "problem": "", "target_users": "",
 "blockers": [""], "next_steps": [""], "topics": [""],
 "roles": [{"title": "", "description": "", "skills": [""], "hours_per_week": 0, "spots": 1, "first_week": ""}],
 "agent_prompt": ""}

Rules:
- one_liner: at most 15 Chinese characters or 10 English words.
- blockers: 2-3 current sticking points. next_steps: 3 concrete steps for the next two weeks.
- topics: 3-5 short tags.
- roles: 2-3 teammates the founder still needs to fill the gaps in their own skills (listed as "Founder skills"; do not ask for skills the founder already has). Cover different kinds of work, e.g. building, design/research, domain expertise, operations.
- Each role's skills are 3-5 concrete, learnable abilities (tools, methods, domain knowledge), never connections, titles or credentials. hours_per_week is a realistic weekly commitment for a student or researcher (usually 4-12).
- Each role's first_week is one concrete task a new teammate in that role could finish in their first week, tied to next_steps (one short sentence).
- agent_prompt: a ready-to-paste prompt the founder can give another AI agent to start building the first step.
- ` + noInventedFacts + ` next_steps may set targets (e.g. "interview 5 doctors"), since those are plans, not claims.
- Reply in the same language as the idea.`

func ideaUserPrompt(req ideaRequest, founderSkills []string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Idea:\n%s\n", req.Idea)
	if len(founderSkills) > 0 {
		fmt.Fprintf(&b, "\nFounder skills: %s\n", strings.Join(founderSkills, ", "))
	}
	for i, round := range req.Rounds {
		fmt.Fprintf(&b, "\nRound %d:\n", i+1)
		for j, q := range round.Questions {
			answer := ""
			if j < len(round.Answers) {
				answer = round.Answers[j]
			}
			fmt.Fprintf(&b, "Q (%s): %s\nA: %s\n", q.Lens, q.Question, answer)
		}
	}
	return b.String()
}

// ideaLanguageInstruction pins the reply to the idea's language. "Same
// language as the idea" alone isn't enough: Chinese founder skills or lens
// names pull an English idea's brief into Chinese. except names any value
// that must stay as is.
func ideaLanguageInstruction(idea, except string) string {
	language := "English"
	for _, r := range idea {
		if unicode.Is(unicode.Han, r) {
			language = "Simplified Chinese"
			break
		}
	}
	instruction := "Write every text value in " + language
	if except != "" {
		instruction += ", except " + except
	}
	return instruction + ", whatever language other inputs are in.\n\n"
}

// GetIdeaQuestions returns the next round of guided questions for an idea.
func GetIdeaQuestions() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ideaRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idea is required"})
			return
		}

		var result struct {
			Reflection string         `json:"reflection"`
			Questions  []IdeaQuestion `json:"questions"`
		}
		userPrompt := ideaLanguageInstruction(req.Idea, "lens, which must stay exactly one of the listed lens names") + ideaUserPrompt(req, nil)
		if err := services.OpenRouterJSON(ideaCoachPrompt, userPrompt, 0.7, &result); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

// ShapeIdea turns an idea and its answered rounds into a project brief.
func ShapeIdea() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ideaRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idea is required"})
			return
		}

		var founderSkills []string
		database.DB.Model(&models.UserSkill{}).Where("user_id = ?", c.GetUint("userID")).Pluck("name", &founderSkills)

		var brief IdeaBrief
		userPrompt := ideaLanguageInstruction(req.Idea, "") + ideaUserPrompt(req, founderSkills)
		if err := services.OpenRouterJSON(ideaShapePrompt, userPrompt, 0.4, &brief); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		if len(brief.Roles) > 3 {
			brief.Roles = brief.Roles[:3]
		}
		c.JSON(http.StatusOK, brief)
	}
}

// ProjectBrief is the brief a project keeps after it is published: the
// IdeaBrief without roles (those live on the recruiting post's spots), the
// title (the project's own) and the private agent prompt.
type ProjectBrief struct {
	OneLiner    string   `json:"one_liner"`
	Vision      string   `json:"vision"`
	Problem     string   `json:"problem"`
	TargetUsers string   `json:"target_users"`
	Blockers    []string `json:"blockers"`
	NextSteps   []string `json:"next_steps"`
	Topics      []string `json:"topics"`
}

func (b IdeaBrief) projectBrief() ProjectBrief {
	return ProjectBrief{OneLiner: b.OneLiner, Vision: b.Vision, Problem: b.Problem, TargetUsers: b.TargetUsers,
		Blockers: b.Blockers, NextSteps: b.NextSteps, Topics: b.Topics}
}

type materializeRequest struct {
	DraftID uint      `json:"draft_id"`
	Brief   IdeaBrief `json:"brief"`
}

// MaterializeIdea turns a shaped brief into a project with an open recruiting
// post. With a draft_id the draft is linked to the project in the same
// transaction, and publishing an already published draft returns its project
// instead of creating another. A bare brief (no draft) is still accepted.
func MaterializeIdea() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		var raw map[string]json.RawMessage
		if err := c.ShouldBindJSON(&raw); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "brief with a title is required"})
			return
		}
		var req materializeRequest
		body, _ := json.Marshal(raw)
		if _, wrapped := raw["brief"]; wrapped {
			_ = json.Unmarshal(body, &req)
		} else {
			_ = json.Unmarshal(body, &req.Brief)
		}
		brief := req.Brief
		if strings.TrimSpace(brief.Title) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "brief with a title is required"})
			return
		}

		tx := database.DB.Begin()

		var draft *models.IdeaDraft
		if req.DraftID != 0 {
			var d models.IdeaDraft
			// Lock the draft so two publishes of it can't both create a project
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", req.DraftID, userID).First(&d).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusNotFound, gin.H{"error": "Draft not found"})
				return
			}
			if d.ProjectID != nil {
				tx.Rollback()
				attachDraftProjects([]*models.IdeaDraft{&d})
				if d.Project != nil {
					c.JSON(http.StatusOK, gin.H{"project_sid": d.Project.SID, "post_sid": d.Project.PostSID, "draft": d})
					return
				}
				c.JSON(http.StatusConflict, gin.H{"error": "This idea is already a project"})
				return
			}
			draft = &d
		}

		topicJSON, _ := json.Marshal(brief.Topics)
		// The agent prompt is the founder's alone, so it stays out of the shared brief
		metadataJSON, _ := json.Marshal(gin.H{"source": "idea_workbench", "agent_prompt": brief.AgentPrompt})
		briefJSON, _ := json.Marshal(brief.projectBrief())
		description := fmt.Sprintf("%s\n\n%s", brief.Vision, brief.Problem)
		location := "Remote"
		scenario := "personal"
		projectType := "Idea"
		now := time.Now()

		project := models.Project{
			ShortID:            helper.GenerateShortID(8),
			OwnerID:            userID,
			Title:              &brief.Title,
			Description:        &description,
			ProjectType:        &projectType,
			Location:           &location,
			ProjectScenario:    &scenario,
			StartTime:          &now,
			Topic:              datatypes.JSON(topicJSON),
			OnboardingMetadata: datatypes.JSON(metadataJSON),
			Brief:              datatypes.JSON(briefJSON),
			BriefUpdatedAt:     &now,
			BriefUpdatedBy:     &userID,
			Status:             1,
			IsPublished:        true,
		}
		if err := repositories.GenerateSlug(&project, brief.Title); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate slug"})
			return
		}
		if err := tx.Create(&project).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
			return
		}

		owner := models.ProjectMember{ProjectID: project.ProjectID, UserID: userID, Role: "owner", Permissions: 255}
		if err := tx.Create(&owner).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add owner to project"})
			return
		}

		spotsJSON, _ := json.Marshal(brief.Roles)
		postDescription := fmt.Sprintf("%s\n\n%s", brief.OneLiner, brief.Vision)
		post := models.ProjectPost{
			UserID:      userID,
			ProjectID:   project.ProjectID,
			Title:       brief.Title,
			Description: &postDescription,
			Location:    &location,
			Spots:       datatypes.JSON(spotsJSON),
			StartTime:   &now,
			Visibility:  2,
			Status:      1,
		}
		if err := repositories.GenerateProjectPostShortID(&post); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate post id"})
			return
		}
		if err := tx.Create(&post).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
			return
		}

		if draft != nil {
			// The draft keeps the brief exactly as published, as the start of its thinking record
			fullBrief, _ := json.Marshal(brief)
			draft.ProjectID = &project.ProjectID
			draft.PostSID = &post.ShortID
			draft.Brief = datatypes.JSON(fullBrief)
			draft.Current = nil
			if err := tx.Save(draft).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link the draft"})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		// A new open project changes everyone's recommendations
		invalidateMatchCache("posts:")
		// The workbench shows the founder their candidates right after publishing
		warmPostCandidates(post, replyLanguage(c, post.Title+strOrEmpty(post.Description)))
		response := gin.H{"project_sid": project.ShortID, "post_sid": post.ShortID}
		if draft != nil {
			draft.Project = &models.IdeaDraftProject{SID: project.ShortID, Title: brief.Title, PostSID: post.ShortID, Status: project.Status}
			response["draft"] = draft
		}
		c.JSON(http.StatusOK, response)
	}
}

// workbenchBrief returns a project's brief, or nil for projects that have none.
// Projects published before the brief column existed keep it in onboarding_metadata.
func workbenchBrief(projectID uint) *ProjectBrief {
	var row struct {
		Brief              []byte
		OnboardingMetadata []byte
	}
	if err := database.DB.Model(&models.Project{}).Select("brief, onboarding_metadata").Where("project_id = ?", projectID).Scan(&row).Error; err != nil {
		return nil
	}
	if len(row.Brief) > 0 && string(row.Brief) != "null" {
		var brief ProjectBrief
		if json.Unmarshal(row.Brief, &brief) == nil {
			return &brief
		}
	}
	var stored struct {
		Source string     `json:"source"`
		Brief  *IdeaBrief `json:"brief"`
	}
	if json.Unmarshal(row.OnboardingMetadata, &stored) != nil || stored.Source != "idea_workbench" || stored.Brief == nil {
		return nil
	}
	brief := stored.Brief.projectBrief()
	return &brief
}

// Brief fields the workbench can regenerate one at a time.
var regenerableFields = map[string]string{
	"one_liner":    "one_liner: at most 15 Chinese characters or 10 English words",
	"vision":       "vision: 1-2 sentences on what success looks like",
	"problem":      "problem: 1-3 sentences on the concrete pain, for whom, and why existing options fail",
	"target_users": "target_users: who exactly, in one sentence",
	"blockers":     "blockers: 2-3 current sticking points, as an array of strings",
	"next_steps":   "next_steps: 3 concrete steps for the next two weeks, as an array of strings",
	"roles":        `roles: 2-3 teammates the founder still needs, as an array of {"title","description","skills":[3-5 learnable abilities],"hours_per_week","spots","first_week"}; never ask for skills listed as founder skills`,
}

// RegenerateBriefField rewrites one field of a brief, keeping the rest as the user edited it.
func RegenerateBriefField() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ideaRequest
			Brief IdeaBrief `json:"brief"`
			Field string    `json:"field"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idea is required"})
			return
		}
		rule, ok := regenerableFields[req.Field]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "this field can't be regenerated"})
			return
		}

		// Founder skills only matter for roles; elsewhere they bias the rewrite towards the founder's field
		var founderSkills []string
		if req.Field == "roles" {
			database.DB.Model(&models.UserSkill{}).Where("user_id = ?", c.GetUint("userID")).Pluck("name", &founderSkills)
		}
		current, _ := json.Marshal(req.Brief)
		prompt := fmt.Sprintf(`You improve one field of a project brief. Rewrite only "%s", consistent with the rest of the brief (which the user may have edited) and faithful to the user's own answers. Give a fresh take, not a paraphrase of the current value.
Return JSON: {"value": ...}
Rule: %s
%s
Reply in the same language as the idea.`, req.Field, rule, noInventedFacts)
		input := ideaLanguageInstruction(req.Idea, "") + ideaUserPrompt(req.ideaRequest, founderSkills) + "\nCurrent brief:\n" + string(current)

		var result struct {
			Value json.RawMessage `json:"value"`
		}
		if err := services.OpenRouterJSON(prompt, input, 0.8, &result); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"field": req.Field, "value": result.Value})
	}
}
