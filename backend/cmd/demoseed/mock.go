package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"

	"gorm.io/datatypes"
)

// Mock data for one existing account, so every page of the matching flow
// has something to show when you sign in as it:
//
//	go run ./cmd/demoseed --mock-for someone@example.com
//
// It fills an empty matching profile, adds idea drafts, a published project
// with applicants at each stage, a teammate, team chat, check-in and
// decision, the account's own applications to demo projects, notifications
// and a community post. Running it again replaces what it created before.
// It needs the demo users, so run the plain seed first.

const mockMarker = "mock"

type mockApplicant struct {
	key, role, stage, firstStep, trialTask string
	hours, status, hoursAgo, trialDueDays  int
}

var mockBrief = map[string]interface{}{
	"title":        "校园心理咨询预约助手",
	"one_liner":    "心理咨询预约不再排长队",
	"vision":       "让想找心理咨询的同学三分钟内约上时间，咨询中心也能看清哪几周最忙。",
	"problem":      "学校心理咨询中心靠电话和纸质登记预约，学生常常打不通电话，高峰周排队要等两三周，有些同学因此放弃求助。",
	"target_users": "本校本科生和研究生，以及心理咨询中心的值班老师。",
	"blockers":     []string{"还不清楚咨询中心愿意开放哪些时段数据", "预约信息涉及隐私，需要先确认存储和权限方案"},
	"next_steps":   []string{"和咨询中心老师聊一次，梳理现在的预约流程", "做一个只有预约和取消的小程序原型", "找 10 位同学试用并记录卡在哪一步"},
	"topics":       []string{"心理健康", "校园服务", "微信小程序"},
	"roles": []map[string]interface{}{
		{"title": "心理学顾问", "description": "把关咨询流程和隐私边界，帮忙设计预约前的分流问题。", "skills": []string{"心理咨询流程", "用户访谈", "问卷设计"}, "hours_per_week": 4, "spots": 1, "first_week": "整理一份预约前需要问学生的 5 个分流问题"},
		{"title": "后端开发", "description": "负责预约数据、时段管理和提醒推送。", "skills": []string{"Go", "PostgreSQL", "接口设计"}, "hours_per_week": 8, "spots": 1, "first_week": "设计预约和时段两张表，并写好创建预约的接口"},
		{"title": "校园运营", "description": "联系咨询中心和学院，组织试用并收集反馈。", "skills": []string{"社群运营", "活动策划", "用户访谈"}, "hours_per_week": 5, "spots": 2, "first_week": "联系两个学院的辅导员，约好第一次试用"},
	},
	"agent_prompt": "你是一名全栈工程师。请用微信小程序和 Go 后端实现一个心理咨询预约原型：学生可以查看可预约时段、预约和取消；值班老师可以查看当天预约列表。",
}

var mockApplicants = []mockApplicant{
	{key: "hejing", role: "心理学顾问", stage: "talking", hours: 4, hoursAgo: 50,
		firstStep: "第一周我会访谈 3 位去过咨询中心的同学，整理出预约前最需要问的 5 个问题。"},
	{key: "tangkai", role: "后端开发", stage: "trial", hours: 8, hoursAgo: 72, trialDueDays: 4,
		firstStep: "先把预约、取消和时段冲突检查三个接口做出来，周末前给你演示。",
		trialTask: "实现创建预约接口，同一时段不能被两个人约走，附上测试。"},
	{key: "zhengyu", role: "校园运营", stage: "new", hours: 5, hoursAgo: 3,
		firstStep: "我运营过学院公众号，可以先发一篇推文招募 20 位试用同学。"},
	{key: "gaoyan", role: "后端开发", stage: "new", status: 2, hours: 6, hoursAgo: 120,
		firstStep: "我可以先做数据分析，看看哪些时段预约最多。"},
}

// mockTeammate joined as 校园运营 and shows up in the team chat and check-ins.
const mockTeammate = "xiaolin"

var mockOwnApplications = []struct {
	postTitle, role, stage, firstStep, trialTask string
	hours, status, hoursAgo, trialDueDays        int
}{
	{postTitle: "论文速读助手", role: "前端工程师", stage: "talking", hours: 8, hoursAgo: 30,
		firstStep: "第一周我会做出论文上传和摘要展示两个页面，周五给发起人演示。"},
	{postTitle: "乡村学校 AI 助教", role: "前端工程师", stage: "trial", hours: 8, hoursAgo: 80, trialDueDays: 3,
		firstStep: "先做一个老师能直接用的出题页面原型，找两位老师试用。",
		trialTask: "用 React 做一个出题页面原型：输入知识点，展示 AI 生成的 3 道题，可以删改。"},
	{postTitle: "学生理财模拟器", role: "视觉设计", stage: "new", status: 2, hours: 5, hoursAgo: 200,
		firstStep: "我可以先画出首页和记账页的高保真稿。"},
}

var mockDrafts = []struct {
	idea    string
	rounds  []map[string]interface{}
	current map[string]interface{}
	brief   bool // use mockBrief and link the published post
}{
	{
		idea: "做一个帮留学生在校内找兼职的平台，他们常常不知道哪些岗位允许签证身份打工。",
		rounds: []map[string]interface{}{{
			"questions": []map[string]string{
				{"lens": "目标用户与场景", "question": "最需要这个平台的留学生是谁，他们现在怎么找兼职？", "hint": "说出一类具体的同学和他们现在用的办法"},
				{"lens": "关键假设与风险", "question": "你假设学校愿意公开哪些岗位信息？", "hint": "想想信息由谁维护、多久更新"},
				{"lens": "最小验证", "question": "不写代码的话，你能怎样在两周内验证需求？", "hint": "一个表格、一个群或一次问卷都可以"},
			},
			"answers": []string{
				"主要是研一的留学生，靠学长学姐和微信群打听，信息很零散。",
				"国际处有一份允许校内兼职的岗位清单，但只有纸质版。",
				"先把清单整理成在线表格发到留学生群里，看有多少人点开和咨询。",
			},
		}},
		current: map[string]interface{}{
			"reflection": "你提到信息零散，但还没说清楚留学生最怕的是找不到岗位，还是怕违规打工。",
			"questions": []map[string]string{
				{"lens": "本质/第一性原理", "question": "留学生找兼职真正的阻碍是信息少，还是不确定是否合规？", "hint": "回想你听到的一次具体求助"},
				{"lens": "需要什么样的伙伴", "question": "要把这件事做成，你最缺哪种同伴？", "hint": "技术、熟悉政策的人，还是能进留学生社群的人"},
				{"lens": "为什么是现在", "question": "为什么现在是做这件事的好时机？", "hint": "政策、人数或学校的变化"},
			},
			"answers": []string{"我觉得两个都有，但更怕违规，因为听说有同学因此被约谈。", "", ""},
		},
	},
	{
		idea:  "做一个校园心理咨询预约小程序，现在要打电话预约，经常打不通，高峰期要排两三周。",
		brief: true,
		rounds: []map[string]interface{}{{
			"questions": []map[string]string{
				{"lens": "目标用户与场景", "question": "谁在什么时候最需要预约，又最容易放弃？", "hint": "想一个具体的学期节点"},
				{"lens": "最小验证", "question": "你怎么证明线上预约真能减少放弃？", "hint": "能先比较的一个数字"},
				{"lens": "需要什么样的伙伴", "question": "你需要谁来把关隐私和咨询流程？", "hint": "具体的专业背景"},
			},
			"answers": []string{
				"期中和期末前最多，很多同学打两三次电话没人接就不打了。",
				"先和咨询中心对比试用前后两周的预约数和爽约数。",
				"需要学心理学、了解咨询伦理的同学，还要有人做后端。",
			},
		}},
	},
}

// seedMockAccount fills the account with mock data (see the top of this file).
func seedMockAccount(email string) {
	var user models.User
	if err := database.DB.Where("email = ?", email).Take(&user).Error; err != nil {
		log.Fatalf("mock: no account with email %s", email)
	}
	demo := demoUserIDs()
	for _, key := range append([]string{mockTeammate}, "zhangwei") {
		if demo[key] == 0 {
			log.Fatalf("mock: demo users are missing; run the plain seed first")
		}
	}
	removeMockData(user.ID)

	fillMockProfile(user.ID)
	postSID := seedMockProject(user.ID, demo)
	seedMockDrafts(user.ID, postSID)
	seedMockOwnApplications(user.ID)
	seedMockNotifications(user.ID, postSID)
	seedMockCommunityPost(user.ID)
	fmt.Printf("Mock data added for %s (user %d); recruiting post %s.\n", email, user.ID, postSID)
}

func demoUserIDs() map[string]uint {
	var rows []struct {
		ID       uint
		Username string
	}
	database.DB.Model(&models.User{}).Where("email LIKE ?", "%"+demoEmailDomain).Select("id, username").Scan(&rows)
	ids := map[string]uint{}
	for _, r := range rows {
		ids[r.Username[len("demo_"):]] = r.ID
	}
	return ids
}

// removeMockData deletes what an earlier mock run created for this account.
// Everything is found by the mock marker or by the exact texts above.
func removeMockData(userID uint) {
	var projectIDs []uint
	database.DB.Model(&models.Project{}).
		Where("owner_id = ? AND onboarding_metadata->>'source' = ?", userID, mockMarker).
		Pluck("project_id", &projectIDs)
	ideas := make([]string, 0, len(mockDrafts))
	for _, d := range mockDrafts {
		ideas = append(ideas, d.idea)
	}
	firstSteps := make([]string, 0, len(mockOwnApplications))
	for _, a := range mockOwnApplications {
		firstSteps = append(firstSteps, a.firstStep)
	}
	stmts := []struct {
		sql  string
		args []interface{}
	}{
		{"DELETE FROM group_messages WHERE chat_id IN (SELECT id FROM group_chats WHERE project_id IN ?)", []interface{}{projectIDs}},
		{"DELETE FROM group_chats WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_checkins WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_decisions WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_application WHERE post_id IN (SELECT post_id FROM project_posts WHERE project_id IN ?)", []interface{}{projectIDs}},
		{"DELETE FROM project_posts WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_members WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM projects WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM idea_drafts WHERE user_id = ? AND idea IN ?", []interface{}{userID, ideas}},
		{"DELETE FROM project_application WHERE user_id = ? AND first_step IN ?", []interface{}{userID, firstSteps}},
		{"DELETE FROM notifications WHERE user_id = ? AND url LIKE ?", []interface{}{userID, "%#" + mockMarker}},
		{"DELETE FROM posts WHERE user_id = ? AND title = ?", []interface{}{userID, mockPostTitle}},
	}
	for _, s := range stmts {
		if err := database.DB.Exec(s.sql, s.args...).Error; err != nil {
			log.Printf("mock cleanup: %v", err)
		}
	}
}

// fillMockProfile completes the matching profile; existing names and avatar stay.
func fillMockProfile(userID uint) {
	field, school := "计算机科学", "示范大学"
	bio := "大四，做过两个上线的小程序，想和医学、心理方向的同学一起做点真正有人用的东西。"
	hours := 10
	desired, _ := json.Marshal([]string{"前端开发", "产品设计"})
	var profile models.Profile
	if err := database.DB.Where("user_id = ?", userID).Take(&profile).Error; err != nil {
		profile = models.Profile{UserID: userID, ShortID: helper.GenerateShortID(8)}
		must(database.DB.Create(&profile).Error, "mock profile")
	}
	must(database.DB.Model(&models.Profile{}).Where("user_id = ?", userID).Updates(map[string]interface{}{
		"field": field, "school": school, "biography": bio, "hours_per_week": hours,
		"timezone": demoTimezone, "desired_roles": datatypes.JSON(desired), "language": "中文",
	}).Error, "mock profile fields")

	for _, s := range []skill{{"React", 4}, {"TypeScript", 4}, {"微信小程序", 3}, {"Figma", 3}, {"用户研究", 2}} {
		database.DB.Where("user_id = ? AND name = ?", userID, s.name).Delete(&models.UserSkill{})
		must(database.DB.Create(&models.UserSkill{UserID: userID, Name: s.name, Level: s.level}).Error, "mock skill")
	}
	for _, name := range []string{"心理健康", "教育科技", "医疗 AI"} {
		database.DB.Where("user_id = ? AND name = ?", userID, name).Delete(&models.UserInterest{})
		must(database.DB.Create(&models.UserInterest{UserID: userID, Name: name, Level: 4}).Error, "mock interest")
	}
}

// seedMockProject publishes the account's own project with applicants at each
// stage, one teammate, and the team's chat, check-in and decision.
func seedMockProject(userID uint, demo map[string]uint) string {
	title := mockBrief["title"].(string)
	topics, _ := json.Marshal(mockBrief["topics"])
	metadata, _ := json.Marshal(map[string]interface{}{"source": mockMarker, "brief": mockBrief})
	kickoff, _ := json.Marshal(map[string]bool{"team": true, "roles": true})
	description := mockBrief["vision"].(string) + "\n\n" + mockBrief["problem"].(string)
	location, projectType, scenario := "Remote", "Idea", "personal"
	started := time.Now().AddDate(0, 0, -12)

	project := models.Project{
		ShortID: helper.GenerateShortID(8), OwnerID: userID, Title: &title, Description: &description,
		ProjectType: &projectType, ProjectScenario: &scenario, Location: &location, StartTime: &started,
		Topic: datatypes.JSON(topics), OnboardingMetadata: datatypes.JSON(metadata), Kickoff: datatypes.JSON(kickoff),
		Status: 1, IsPublished: true,
	}
	must(repositories.GenerateSlug(&project, title), "mock slug")
	must(database.DB.Create(&project).Error, "mock project")
	must(database.DB.Create(&models.ProjectMember{ProjectID: project.ProjectID, UserID: userID, Role: "owner", Permissions: 255}).Error, "mock owner")

	spots, _ := json.Marshal(mockBrief["roles"])
	postDescription := mockBrief["one_liner"].(string) + "\n\n" + mockBrief["vision"].(string)
	// Two women talking in chairs, by WOCinTech Chat (@wocintechchat) on Unsplash
	cover := "https://images.unsplash.com/photo-1573497620053-ea5300f94f21" + unsplashCoverParams
	post := models.ProjectPost{
		UserID: userID, ProjectID: project.ProjectID, Title: title, Description: &postDescription,
		Location: &location, Spots: datatypes.JSON(spots), StartTime: &started, Visibility: 2, Status: 1, Cover: &cover,
	}
	must(repositories.GenerateProjectPostShortID(&post), "mock post sid")
	must(database.DB.Create(&post).Error, "mock post")

	now := time.Now()
	reminded := now // keeps the 48h reminder job from emailing about mock applications
	for _, a := range mockApplicants {
		applied := now.Add(-time.Duration(a.hoursAgo) * time.Hour)
		app := models.ProjectApplication{
			UserID: demo[a.key], PostID: post.PostID, Status: a.status, AppliedAt: applied, Role: a.role,
			HoursPerWeek: a.hours, FirstStep: a.firstStep, Stage: a.stage, TrialTask: a.trialTask, RemindedAt: &reminded,
			Description: a.firstStep,
		}
		if a.stage != "new" || a.status != 0 {
			reviewed := applied.Add(5 * time.Hour)
			app.ReviewAt = &reviewed
		}
		if a.trialDueDays > 0 {
			due := time.Date(now.Year(), now.Month(), now.Day()+a.trialDueDays, 12, 0, 0, 0, time.UTC)
			app.TrialDue = &due
		}
		must(database.DB.Create(&app).Error, "mock application from "+a.key)
	}

	// The teammate was accepted a week ago
	teammate := demo[mockTeammate]
	joined := now.AddDate(0, 0, -7)
	must(database.DB.Create(&models.ProjectApplication{
		UserID: teammate, PostID: post.PostID, Status: 1, AppliedAt: joined.Add(-48 * time.Hour), ReviewAt: &joined,
		Role: "校园运营", HoursPerWeek: 6, Stage: "trial", RemindedAt: &reminded,
		FirstStep:   "联系教育学院和外国语学院的辅导员，各约 5 位同学参加第一次试用。",
		Description: "联系教育学院和外国语学院的辅导员，各约 5 位同学参加第一次试用。",
	}).Error, "mock teammate application")
	must(database.DB.Create(&models.ProjectMember{
		ProjectID: project.ProjectID, UserID: teammate, Role: "viewer", Permissions: helper.RoleToPermissions("viewer"), JoinedAt: joined,
	}).Error, "mock teammate")

	chatName := title
	projectID := project.ProjectID
	chat := models.GroupChat{Name: chatName, ProjectID: &projectID}
	must(database.DB.Create(&chat).Error, "mock team chat")
	joinedEvent, _ := json.Marshal(map[string]string{"event": "joined", "role": "校园运营"})
	messages := []models.GroupMessage{
		{SenderID: teammate, Content: string(joinedEvent), System: true, Timestamp: joined},
		{SenderID: userID, Content: "欢迎肖琳！这周先把试用同学约起来，我把原型链接发群里。", Timestamp: joined.Add(2 * time.Hour)},
		{SenderID: teammate, Content: "好的，教育学院那边已经有 4 位同学答应了，周四下午可以试用。", Timestamp: joined.Add(26 * time.Hour)},
		{SenderID: userID, Content: "太好了。试用时记得记录大家卡在哪一步，尤其是选时段那里。", Timestamp: now.Add(-20 * time.Hour)},
	}
	for i := range messages {
		messages[i].ChatID = chat.ID
		must(database.DB.Create(&messages[i]).Error, "mock team message")
	}

	week := mondayOf(now)
	must(database.DB.Create(&models.ProjectCheckin{
		ProjectID: project.ProjectID, UserID: teammate, WeekStart: week,
		Done: "约到 9 位试用同学，整理了一份试用记录表。", Next: "周四组织第一次试用，周末汇总问题。", Blockers: "外国语学院的辅导员还没回复。",
	}).Error, "mock checkin")
	must(database.DB.Create(&models.ProjectDecision{
		ProjectID: project.ProjectID, UserID: userID, Text: "第一版只做预约和取消，不做在线咨询和聊天，避免隐私风险。", CreatedAt: now.AddDate(0, 0, -5),
	}).Error, "mock decision")
	return post.ShortID
}

func mondayOf(t time.Time) time.Time {
	t = t.Local()
	offset := (int(t.Weekday()) + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day()-offset, 0, 0, 0, 0, time.Local)
}

func seedMockDrafts(userID uint, postSID string) {
	for i, d := range mockDrafts {
		rounds, _ := json.Marshal(d.rounds)
		draft := models.IdeaDraft{UserID: userID, Idea: d.idea, Rounds: datatypes.JSON(rounds)}
		if d.current != nil {
			current, _ := json.Marshal(d.current)
			draft.Current = datatypes.JSON(current)
		}
		if d.brief {
			brief, _ := json.Marshal(mockBrief)
			draft.Brief = datatypes.JSON(brief)
			draft.PostSID = &postSID
		}
		must(database.DB.Create(&draft).Error, fmt.Sprintf("mock draft %d", i+1))
	}
}

// seedMockOwnApplications applies the account to demo projects at different stages.
func seedMockOwnApplications(userID uint) {
	now := time.Now()
	for _, a := range mockOwnApplications {
		var post models.ProjectPost
		if err := database.DB.Where("title = ?", a.postTitle).Take(&post).Error; err != nil {
			log.Printf("mock: demo post %q not found, skipping", a.postTitle)
			continue
		}
		applied := now.Add(-time.Duration(a.hoursAgo) * time.Hour)
		app := models.ProjectApplication{
			UserID: userID, PostID: post.PostID, Status: a.status, AppliedAt: applied, Role: a.role, HoursPerWeek: a.hours,
			FirstStep: a.firstStep, Description: a.firstStep, Stage: a.stage, TrialTask: a.trialTask, RemindedAt: &now,
		}
		if a.stage != "new" || a.status != 0 {
			reviewed := applied.Add(6 * time.Hour)
			app.ReviewAt = &reviewed
		}
		if a.trialDueDays > 0 {
			due := time.Date(now.Year(), now.Month(), now.Day()+a.trialDueDays, 12, 0, 0, 0, time.UTC)
			app.TrialDue = &due
		}
		must(database.DB.Create(&app).Error, "mock own application to "+a.postTitle)
	}
}

// Mock notifications end their URL with #mock so a rerun can find them.
func seedMockNotifications(userID uint, postSID string) {
	now := time.Now()
	notes := []models.Notification{
		{Type: models.NotificationTypeApplication, Title: "New application", Description: "郑雨 applied to 校园心理咨询预约助手 as 校园运营.", URL: "/applications", CreatedAt: now.Add(-3 * time.Hour)},
		{Type: models.NotificationTypeApplication, Title: "Trial task assigned", Description: "乡村学校 AI 助教 gave you a trial task for 前端工程师.", URL: "/my-projects", CreatedAt: now.Add(-74 * time.Hour), IsRead: true},
		{Type: models.NotificationTypeApplication, Title: "Application Declined", Description: "Your application to join 学生理财模拟器 has been declined.", URL: "/my-projects", CreatedAt: now.Add(-190 * time.Hour), IsRead: true},
		{Type: models.NotificationTypeProject, Title: "New teammate", Description: "肖琳 joined 校园心理咨询预约助手 as 校园运营.", URL: "/projectpost/" + postSID, CreatedAt: now.AddDate(0, 0, -7), IsRead: true},
	}
	for _, n := range notes {
		n.UserID = userID
		n.URL += "#" + mockMarker
		must(database.DB.Create(&n).Error, "mock notification")
	}
}

const mockPostTitle = "做了两年小程序，我踩过的 3 个坑"

func seedMockCommunityPost(userID uint) {
	post := models.Post{UserID: userID}
	must(repositories.GeneratePostShortID(&post), "mock community post id")
	created := time.Now().Add(-30 * time.Hour)
	content := "1. 第一版功能太多，用户只用了预约这一个；\n2. 没有提前问学校能不能拿到数据，做完才发现接不上；\n3. 没定期和队友对进度，两周后才发现大家理解的需求不一样。\n\n现在我会先做最小的一步，每周写一次 check-in。"
	must(database.DB.Exec(
		"INSERT INTO posts (short_id, user_id, title, content, post_type, visibility, created_at, updated_at, is_deleted, tags, media) VALUES (?, ?, ?, ?, 'general', 2, ?, ?, false, ?, '[]')",
		post.ShortID, userID, mockPostTitle, content, created, created, "{小程序,组队经验}",
	).Error, "mock community post")
}
