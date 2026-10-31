// Command demoseed fills a local database with demo users and projects for
// the idea-to-team matching demo. It refuses to run against a non-local host.
//
//	go run ./cmd/demoseed          # seed if the demo accounts don't exist yet
//	go run ./cmd/demoseed --reset  # wipe demo data and seed again
//	go run ./cmd/demoseed --mock-for someone@example.com  # mock data for one account
//	go run ./cmd/demoseed --lang en  # English people and projects (data_en.go)
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"

	"gorm.io/datatypes"
)

const (
	demoEmailDomain = "@demo.projectup.local"
	demoPassword    = "demo1234"
	// Served by the Vite dev server; the app sends users without an avatar to
	// the profile setup page, which would interrupt the demo.
	demoAvatarURL = "http://localhost:5173/demo-avatar.svg"
)

type skill struct {
	name  string
	level int
}

type person struct {
	key       string // email local part
	name      string
	field     string
	school    string
	bio       string
	hours     int
	skills    []skill
	interests []string
}

type role struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Skills       []string `json:"skills"`
	HoursPerWeek int      `json:"hours_per_week"`
	Spots        int      `json:"spots"`
	FirstWeek    string   `json:"first_week"`
}

type project struct {
	owner       string
	title       string
	oneLiner    string
	description string
	topics      []string
	roles       []role
}

var people = []person{
	// The two accounts used to drive the demo.
	{"founder", "林舟", "生物医学工程", "示范大学", "研二，做医学影像分割，想把研究做成能落地的工具。", 15,
		[]skill{{"Python", 4}, {"PyTorch", 4}, {"医学影像", 4}, {"论文写作", 3}}, []string{"医疗 AI", "科研工具", "创业"}},
	{"seeker", "陈一", "计算机科学", "示范大学", "大三，做过两个全栈项目，想找有真实用户的项目练手。", 10,
		[]skill{{"React", 4}, {"TypeScript", 4}, {"Node.js", 3}, {"机器学习", 2}}, []string{"教育科技", "AI 应用", "开源"}},

	{"zhangwei", "张蔚", "计算机科学", "示范大学", "全栈工程师，喜欢从 0 到 1。", 12,
		[]skill{{"Go", 4}, {"PostgreSQL", 4}, {"React", 3}, {"Docker", 3}}, []string{"开发者工具", "创业"}},
	{"liuyang", "刘洋", "交互设计", "示范美院", "做过 3 个 App 的完整设计，擅长用户访谈。", 8,
		[]skill{{"Figma", 5}, {"用户研究", 4}, {"交互设计", 4}, {"原型设计", 4}}, []string{"教育科技", "医疗 AI", "社会创新"}},
	{"wangxin", "王欣", "工商管理", "示范大学", "MBA 在读，做过市场调研和 BP。", 6,
		[]skill{{"商业计划书", 4}, {"市场调研", 4}, {"财务模型", 3}, {"路演", 4}}, []string{"创业", "医疗健康", "可持续发展"}},
	{"zhaomin", "赵敏", "统计学", "示范大学", "统计硕士，熟悉实验设计和因果推断。", 10,
		[]skill{{"R", 5}, {"Python", 4}, {"实验设计", 4}, {"因果推断", 4}}, []string{"科研工具", "公共卫生", "教育"}},
	{"sunhao", "孙浩", "临床医学", "示范医学院", "规培医生，对影像辅助诊断很感兴趣。", 4,
		[]skill{{"临床知识", 5}, {"放射影像判读", 4}, {"病例整理", 4}}, []string{"医疗 AI", "医学教育"}},
	{"zhouqi", "周琪", "软件工程", "示范大学", "移动端开发，做过上线的小程序。", 12,
		[]skill{{"Flutter", 4}, {"微信小程序", 4}, {"Firebase", 3}, {"UI 实现", 3}}, []string{"社交", "校园生活", "教育科技"}},
	{"wujie", "吴杰", "电子工程", "示范理工", "做嵌入式和硬件原型，参加过电赛。", 10,
		[]skill{{"嵌入式 C", 4}, {"PCB 设计", 4}, {"传感器", 4}, {"Arduino", 5}}, []string{"智能硬件", "可持续发展"}},
	{"zhengyu", "郑雨", "新闻传播", "示范大学", "运营过 2 万粉丝的公众号。", 8,
		[]skill{{"内容运营", 5}, {"新媒体", 4}, {"文案", 4}, {"社群运营", 4}}, []string{"教育", "社会创新", "创业"}},
	{"hejing", "何静", "心理学", "示范大学", "研究学习动机，做过用户访谈研究。", 6,
		[]skill{{"用户研究", 4}, {"问卷设计", 4}, {"SPSS", 3}, {"访谈", 4}}, []string{"教育科技", "心理健康"}},
	{"maochen", "毛晨", "计算机科学", "示范大学", "NLP 方向研一，做过 RAG 项目。", 10,
		[]skill{{"Python", 5}, {"大模型应用", 4}, {"NLP", 4}, {"LangChain", 3}}, []string{"AI 应用", "科研工具", "教育科技"}},
	{"gaoyan", "高妍", "数据科学", "示范大学", "数据分析实习过两段，擅长可视化。", 8,
		[]skill{{"SQL", 4}, {"Python", 4}, {"数据可视化", 5}, {"Tableau", 4}}, []string{"公共卫生", "可持续发展", "商业分析"}},
	{"luoxi", "罗希", "环境工程", "示范理工", "做过校园碳排放测算。", 6,
		[]skill{{"生命周期评价", 4}, {"数据分析", 3}, {"GIS", 3}}, []string{"可持续发展", "社会创新"}},
	{"tangkai", "唐凯", "计算机科学", "示范大学", "后端开发，熟悉分布式系统。", 15,
		[]skill{{"Java", 4}, {"Spring Boot", 4}, {"Redis", 4}, {"系统设计", 3}}, []string{"开发者工具", "金融科技"}},
	{"fengjia", "冯佳", "视觉传达", "示范美院", "品牌和插画设计，做过多个活动视觉。", 6,
		[]skill{{"品牌设计", 5}, {"插画", 4}, {"Illustrator", 5}, {"Figma", 3}}, []string{"社会创新", "文创"}},
	{"dengrui", "邓睿", "金融学", "示范大学", "量化社团成员，做过回测框架。", 8,
		[]skill{{"Python", 4}, {"量化回测", 4}, {"财务模型", 4}}, []string{"金融科技", "创业"}},
	{"xiaolin", "肖琳", "教育学", "示范师范", "做过 K12 课程设计，关心教育公平。", 6,
		[]skill{{"课程设计", 5}, {"教学评估", 4}, {"访谈", 3}}, []string{"教育", "教育科技", "社会创新"}},
	{"panyue", "潘悦", "公共卫生", "示范医学院", "流行病学硕士，做过社区健康调查。", 8,
		[]skill{{"流行病学", 4}, {"问卷设计", 4}, {"R", 3}}, []string{"公共卫生", "医疗健康"}},
	{"qianfeng", "钱峰", "人工智能", "示范理工", "CV 方向，做过目标检测落地。", 12,
		[]skill{{"PyTorch", 5}, {"计算机视觉", 5}, {"模型部署", 4}, {"Python", 5}}, []string{"医疗 AI", "智能硬件"}},
	{"shenlu", "沈露", "法学", "示范大学", "知识产权方向，帮学生团队看过合同。", 3,
		[]skill{{"知识产权", 4}, {"合同审查", 4}, {"数据合规", 3}}, []string{"创业", "科研工具"}},
}

var projects = []project{
	{"zhangwei", "校园二手书循环平台", "让教材在学长学妹间流动",
		"每学期大量教材被丢弃。我们想做一个按课程匹配的二手书平台，先在本校跑通。",
		[]string{"校园生活", "可持续发展", "小程序"},
		[]role{
			{"小程序开发", "负责微信小程序端的开发与上线。", []string{"微信小程序", "前端开发", "UI 实现"}, 8, 1, "搭出按课程搜索教材的小程序首页原型"},
			{"校园运营", "负责冷启动、社群和地推。", []string{"社群运营", "内容运营", "活动策划"}, 6, 1, "在两个院系群里发问卷，摸清教材需求"},
		}},
	{"maochen", "论文速读助手", "十分钟读懂一篇论文",
		"研究生读文献效率低。用大模型做结构化速读和对比，先服务本实验室。",
		[]string{"科研工具", "AI 应用", "教育科技"},
		[]role{
			{"前端工程师", "负责阅读器界面和交互实现。", []string{"React", "TypeScript", "PDF 渲染"}, 10, 1, "做出能上传 PDF 并分栏显示速读结果的页面"},
			{"产品设计师", "访谈研究生，设计阅读流程。", []string{"用户研究", "Figma", "交互设计"}, 6, 1, "访谈 3 位研究生，画出他们现在的读文献流程"},
		}},
	{"panyue", "社区慢病随访小助手", "让随访不再漏掉一个人",
		"社区医生随访高血压患者靠电话和表格，容易遗漏。想做一个轻量随访提醒和记录工具。",
		[]string{"公共卫生", "医疗健康", "社会创新"},
		[]role{
			{"全栈开发", "搭建随访记录和提醒系统。", []string{"React", "Node.js", "数据库"}, 10, 1, "搭好患者列表和随访记录的基础页面"},
			{"数据分析", "分析随访数据，找出高风险人群。", []string{"Python", "数据可视化", "统计分析"}, 6, 1, "整理一份脱敏样例数据，做出血压趋势图"},
		}},
	{"wujie", "宿舍用电监测与节能", "看见每一度电去了哪",
		"用低成本传感器监测宿舍用电，结合可视化和激励机制推动节能，参加双创比赛。",
		[]string{"智能硬件", "可持续发展", "双创竞赛"},
		[]role{
			{"数据可视化", "做用电数据看板。", []string{"数据可视化", "前端开发", "SQL"}, 6, 1, "用样例数据做一个单宿舍用电的折线看板"},
			{"商业与路演", "负责商业计划书和比赛路演。", []string{"商业计划书", "路演", "市场调研"}, 5, 1, "写出一页纸的项目简介和比赛时间表"},
		}},
	{"xiaolin", "乡村学校 AI 助教", "给每个乡村老师一个助教",
		"乡村学校老师要教多门课。想做一个帮老师备课和批改的 AI 助教，先在两所学校试点。",
		[]string{"教育", "AI 应用", "社会创新"},
		[]role{
			{"大模型应用开发", "实现备课和批改的核心功能。", []string{"Python", "大模型应用", "后端开发"}, 10, 1, "跑通一份教案的自动生成，并拿给老师试用"},
			{"前端工程师", "实现老师端 Web 界面。", []string{"React", "TypeScript", "UI 实现"}, 8, 1, "做出老师上传作业、查看批改结果的页面"},
		}},
	{"dengrui", "学生理财模拟器", "毕业前学会管钱",
		"用模拟投资和记账游戏帮大学生建立理财观念。",
		[]string{"金融科技", "教育科技", "创业"},
		[]role{
			{"后端开发", "实现模拟交易引擎。", []string{"Java", "Spring Boot", "数据库"}, 10, 1, "设计模拟交易的数据表，跑通一次买入卖出"},
			{"视觉设计", "设计游戏化界面和品牌。", []string{"品牌设计", "Figma", "插画"}, 5, 1, "画出首页和记账页的低保真稿"},
		}},
	{"hejing", "学习拖延干预实验", "用实验找到真正有效的方法",
		"心理学课题：比较三种拖延干预方式的效果，需要做一个实验用的小工具并分析数据。",
		[]string{"心理健康", "教育", "科研工具"},
		[]role{
			{"实验工具开发", "开发记录学习行为的 Web 小工具。", []string{"React", "前端开发", "数据库"}, 8, 1, "做一个能记录每日学习时长的打卡页面"},
			{"统计分析", "设计实验并做因果分析。", []string{"R", "实验设计", "因果推断"}, 6, 1, "写出实验设计草案和需要的样本量估算"},
		}},
	{"qianfeng", "眼底照片糖网筛查", "让基层也能早筛糖网",
		"用眼底照片做糖尿病视网膜病变筛查，模型已有雏形，缺临床验证和产品化。",
		[]string{"医疗 AI", "计算机视觉", "双创竞赛"},
		[]role{
			{"临床顾问", "提供标注标准和临床验证建议。", []string{"临床知识", "放射影像判读", "病例整理"}, 3, 1, "按现有标准标注 50 张样例图并给出修改建议"},
			{"产品与商业", "梳理落地路径，准备比赛材料。", []string{"商业计划书", "市场调研", "路演"}, 5, 1, "列出 3 个目标落地场景和对应的比赛"},
		}},
}

// Cover photos for the demo projects, from Unsplash (free to use under the
// Unsplash License). Keyed by project title; photographer in the comment.
const unsplashCoverParams = "?w=1200&h=750&fit=crop&auto=format&q=80"

var demoCovers = map[string]string{
	"校园二手书循环平台":  "photo-1495446815901-a7297e633e8d", // Tom Hermans (@tomhermans)
	"论文速读助手":     "photo-1491309055486-24ae511c15c7", // Thought Catalog (@thoughtcatalog)
	"社区慢病随访小助手":  "photo-1631815587646-b85a1bb027e1", // CDC (@cdc)
	"宿舍用电监测与节能":  "photo-1556401615-c909c3d67480",    // Jack Carter (@carterjack)
	"乡村学校 AI 助教": "photo-1759143101324-d375443f1955", // @sanoyatra
	"学生理财模拟器":    "photo-1554224155-6726b3ff858f",    // Kelly Sikkema (@kellysikkema)
	"学习拖延干预实验":   "photo-1598981457915-aea220950616", // Jeswin Thomas (@jeswinthomas)
	"眼底照片糖网筛查":   "photo-1757386320806-e3f03c9f41e8", // @judy_beth_morris_idaho

	"Campus Textbook Exchange":                "photo-1495446815901-a7297e633e8d",
	"Paper Speed-Reader":                      "photo-1491309055486-24ae511c15c7",
	"Chronic Care Follow-up Helper":           "photo-1631815587646-b85a1bb027e1",
	"Dorm Energy Monitor":                     "photo-1556401615-c909c3d67480",
	"AI Teaching Assistant for Rural Schools": "photo-1759143101324-d375443f1955",
	"Student Money Simulator":                 "photo-1554224155-6726b3ff858f",
	"Procrastination Intervention Study":      "photo-1598981457915-aea220950616",
	"Diabetic Retinopathy Screening":          "photo-1757386320806-e3f03c9f41e8",
}

// coverFor returns the cover URL for a demo project title, or nil.
func coverFor(title string) *string {
	id, ok := demoCovers[title]
	if !ok {
		return nil
	}
	url := "https://images.unsplash.com/" + id + unsplashCoverParams
	return &url
}

// backfillCovers adds covers to demo posts seeded before covers existed.
func backfillCovers(ownerIDs []uint) {
	for title := range demoCovers {
		database.DB.Model(&models.ProjectPost{}).
			Where("title = ? AND user_id IN ? AND (cover IS NULL OR cover = '')", title, ownerIDs).
			Update("cover", coverFor(title))
	}
}

type communityPost struct {
	author   string
	title    string
	content  string
	tags     []string
	hoursAgo int
}

// Posts for the community feed (/home): lessons from teaming up, written by demo users.
var communityPosts = []communityPost{
	{"zhangwei", "组队三个月后散伙，我总结了 3 个原因",
		"去年和两个同学做校园二手平台，三个月后散了。回头看问题不在技术：\n\n1. 没有写下来谁负责什么，最后谁都以为别人在做；\n2. 每周投入时间没对齐，有人 20 小时有人 2 小时；\n3. 第一周就开始写代码，没人验证过有没有人要。\n\n现在组队我会先约定每周 check-in，再一起做一个小的第一步。",
		[]string{"组队经验", "复盘"}, 5},
	{"liuyang", "设计师加入技术项目，第一周可以做什么",
		"被拉进好几个技术项目，发现最有用的不是马上出高保真，而是先做 5 个用户访谈，把真实流程画出来。工程师看完流程图，常常会砍掉一半功能。",
		[]string{"设计", "用户研究"}, 20},
	{"wangxin", "比赛 BP 里评委最常问的 4 个问题",
		"参加了几次双创比赛，评委问得最多的是：谁是第一批用户？为什么是你们团队？钱花在哪？半年后靠什么活下去？建议组队时就把这 4 个问题分给不同的人去准备。",
		[]string{"双创竞赛", "商业计划书"}, 30},
	{"seeker", "第一次申请别人的项目，我写了什么",
		"之前申请只写「我会 React，想加入」，基本没回音。这次按角色卡写了第一步提议：先把打卡页面做出来，周末给发起人演示。第二天就收到回复约聊了。",
		[]string{"申请经验", "前端"}, 48},
	{"zhaomin", "做实验类项目，先算样本量再招人",
		"很多教育实验项目最后做不出结论，是因为样本量根本不够。招人前先估一下需要多少被试、要跑几周，招募时就能说清楚每个人要投入多少。",
		[]string{"实验设计", "科研"}, 72},
	{"zhengyu", "项目没人知道？先找 10 个真实用户",
		"运营公众号的经验：项目早期别急着铺渠道，先在身边找 10 个愿意每周用的人，听他们抱怨。等他们开始主动转发，再考虑做内容。",
		[]string{"运营", "早期用户"}, 120},
}

func main() {
	reset := flag.Bool("reset", false, "delete existing demo data before seeding")
	mockFor := flag.String("mock-for", "", "email of an existing account to fill with mock data (see mock.go)")
	lang := flag.String("lang", "zh", "demo data language: zh or en")
	flag.Parse()

	switch *lang {
	case "zh":
	case "en":
		people, projects, communityPosts = peopleEN, projectsEN, communityPostsEN
		demoLanguage, demoTimezone = "English", "America/New_York"
	default:
		log.Fatalf("unknown --lang %q (use zh or en)", *lang)
	}

	host := os.Getenv("PG_HOST")
	if host != "localhost" && host != "127.0.0.1" {
		log.Fatalf("refusing to seed: PG_HOST=%q is not local (source demo/demo.env first)", host)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("connect: %v", err)
	}

	if *mockFor != "" {
		seedMockAccount(*mockFor)
		return
	}
	if *reset {
		resetDemoData()
	}

	var existing int64
	database.DB.Model(&models.User{}).Where("email LIKE ?", "%"+demoEmailDomain).Count(&existing)
	if existing > 0 {
		fmt.Printf("Demo data already present (%d users). Use --reset to reseed.\n", existing)
		// Databases seeded before the community feed existed get its posts here.
		var ids []uint
		database.DB.Model(&models.User{}).Where("email LIKE ?", "%"+demoEmailDomain).Pluck("id", &ids)
		var keys []string
		database.DB.Model(&models.User{}).Where("id IN ?", ids).Pluck("username", &keys)
		userIDs := map[string]uint{}
		for i, key := range keys {
			userIDs[strings.TrimPrefix(key, "demo_")] = ids[i]
		}
		seedCommunityPosts(userIDs)
		backfillCovers(ids)
		return
	}

	// Hashing at cost 14 is slow, so hash the shared demo password once.
	passwordHash := helper.HashPassword(demoPassword)
	userIDs := map[string]uint{}
	for _, p := range people {
		userIDs[p.key] = seedPerson(p, passwordHash)
	}
	for _, pr := range projects {
		seedProject(pr, userIDs[pr.owner])
	}

	seedCommunityPosts(userIDs)

	fmt.Printf("Seeded %d users and %d projects.\n", len(people), len(projects))
	fmt.Printf("Demo logins (password %s):\n  founder%s  (发起人)\n  seeker%s   (求组队)\n", demoPassword, demoEmailDomain, demoEmailDomain)
}

var (
	demoLanguage = "中文"
	demoTimezone = "Asia/Shanghai"
)

func seedPerson(p person, passwordHash string) uint {
	email := p.key + demoEmailDomain
	username := "demo_" + p.key
	user := models.User{
		Username: &username, Email: &email, Password: &passwordHash, EmailVerified: true, Verified: true,
		ProjectTutorialCompleted: true, DashboardTutorialCompleted: true,
	}
	must(database.DB.Create(&user).Error, "create user "+p.key)

	// The app renders "<preferred> <last>"; keep the full name in the
	// preferred name and leave the last name empty so it isn't repeated.
	first := string([]rune(p.name)[1:])
	if fields := strings.Fields(p.name); len(fields) > 1 {
		first = fields[0]
	}
	hours := p.hours
	avatar := demoAvatarURL
	profile := models.Profile{
		AvatarURL:     &avatar,
		UserID:        user.ID,
		ShortID:       helper.GenerateShortID(8),
		FirstName:     &first,
		PreferredName: &p.name,
		Field:         &p.field,
		School:        &p.school,
		Biography:     &p.bio,
		Language:      demoLanguage,
		HoursPerWeek:  &hours,
		Timezone:      &demoTimezone,
	}
	must(database.DB.Create(&profile).Error, "create profile "+p.key)

	for _, s := range p.skills {
		must(database.DB.Create(&models.UserSkill{UserID: user.ID, Name: s.name, Level: s.level}).Error, "create skill")
	}
	for _, name := range p.interests {
		must(database.DB.Create(&models.UserInterest{UserID: user.ID, Name: name, Level: 4}).Error, "create interest")
	}
	return user.ID
}

func seedProject(pr project, ownerID uint) {
	topicJSON, _ := json.Marshal(pr.topics)
	spotsJSON, _ := json.Marshal(pr.roles)
	description := pr.oneLiner + "\n\n" + pr.description
	location := "Remote"
	projectType := "Idea"
	scenario := "personal"
	now := time.Now()

	p := models.Project{
		ShortID:         helper.GenerateShortID(8),
		OwnerID:         ownerID,
		Title:           &pr.title,
		Description:     &description,
		ProjectType:     &projectType,
		ProjectScenario: &scenario,
		Location:        &location,
		StartTime:       &now,
		Topic:           datatypes.JSON(topicJSON),
		Status:          1,
		IsPublished:     true,
	}
	must(repositories.GenerateSlug(&p, pr.title), "slug")
	must(database.DB.Create(&p).Error, "create project "+pr.title)
	must(database.DB.Create(&models.ProjectMember{ProjectID: p.ProjectID, UserID: ownerID, Role: "owner", Permissions: 255}).Error, "create owner")

	post := models.ProjectPost{
		UserID:      ownerID,
		ProjectID:   p.ProjectID,
		Title:       pr.title,
		Description: &description,
		Location:    &location,
		Spots:       datatypes.JSON(spotsJSON),
		Cover:       coverFor(pr.title),
		StartTime:   &now,
		Visibility:  2,
		Status:      1,
	}
	must(repositories.GenerateProjectPostShortID(&post), "post sid")
	must(database.DB.Create(&post).Error, "create post "+pr.title)
}

// seedCommunityPosts adds the feed posts unless the demo users already have posts.
func seedCommunityPosts(userIDs map[string]uint) {
	ids := make([]uint, 0, len(userIDs))
	for _, id := range userIDs {
		ids = append(ids, id)
	}
	var count int64
	database.DB.Model(&models.Post{}).Where("user_id IN ?", ids).Count(&count)
	if count > 0 {
		return
	}
	for _, cp := range communityPosts {
		userID, ok := userIDs[cp.author]
		if !ok {
			continue
		}
		created := time.Now().Add(-time.Duration(cp.hoursAgo) * time.Hour)
		post := models.Post{UserID: userID}
		must(repositories.GeneratePostShortID(&post), "post short id")
		// Same insert as the create-post endpoint: tags as a Postgres array literal.
		must(database.DB.Exec(
			"INSERT INTO posts (short_id, user_id, title, content, post_type, visibility, created_at, updated_at, is_deleted, tags, media) VALUES (?, ?, ?, ?, 'general', 2, ?, ?, false, ?, '[]')",
			post.ShortID, userID, cp.title, cp.content, created, created, "{"+strings.Join(cp.tags, ",")+"}",
		).Error, "create community post "+cp.title)
	}
	fmt.Printf("Seeded %d community posts.\n", len(communityPosts))
}

// resetDemoData removes demo users and everything they own or created.
func resetDemoData() {
	var ids []uint
	database.DB.Model(&models.User{}).Where("email LIKE ?", "%"+demoEmailDomain).Pluck("id", &ids)
	if len(ids) == 0 {
		return
	}
	var projectIDs []uint
	database.DB.Model(&models.Project{}).Where("owner_id IN ?", ids).Pluck("project_id", &projectIDs)

	stmts := []struct {
		sql  string
		args []interface{}
	}{
		{"DELETE FROM application_answers WHERE application_id IN (SELECT application_id FROM project_application WHERE user_id IN ? OR post_id IN (SELECT post_id FROM project_posts WHERE project_id IN ?))", []interface{}{ids, projectIDs}},
		{"DELETE FROM project_application WHERE user_id IN ? OR post_id IN (SELECT post_id FROM project_posts WHERE project_id IN ?)", []interface{}{ids, projectIDs}},
		{"DELETE FROM project_posts WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_group_members WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_groups WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM project_members WHERE project_id IN ? OR user_id IN ?", []interface{}{projectIDs, ids}},
		{"DELETE FROM projects WHERE project_id IN ?", []interface{}{projectIDs}},
		{"DELETE FROM idea_drafts WHERE user_id IN ?", []interface{}{ids}},
		{"DELETE FROM project_checkins WHERE project_id IN ? OR user_id IN ?", []interface{}{projectIDs, ids}},
		{"DELETE FROM project_decisions WHERE project_id IN ? OR user_id IN ?", []interface{}{projectIDs, ids}},
		{"DELETE FROM posts WHERE user_id IN ?", []interface{}{ids}},
		{"DELETE FROM user_skills WHERE user_id IN ?", []interface{}{ids}},
		{"DELETE FROM user_interests WHERE user_id IN ?", []interface{}{ids}},
		{"DELETE FROM profiles WHERE user_id IN ?", []interface{}{ids}},
	}
	for _, s := range stmts {
		if err := database.DB.Exec(s.sql, s.args...).Error; err != nil && !strings.Contains(err.Error(), "does not exist") {
			log.Printf("reset: %v", err)
		}
	}

	// Logging in creates rows (subscriptions, preferences, ...) in tables that
	// reference users; clear whatever references the demo users, then delete them.
	var refs []struct {
		TableName  string
		ColumnName string
	}
	database.DB.Raw(`
		SELECT kcu.table_name, kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users' AND kcu.table_name <> 'users'`).Scan(&refs)
	for _, ref := range refs {
		sql := fmt.Sprintf(`DELETE FROM %q WHERE %q IN ?`, ref.TableName, ref.ColumnName)
		if err := database.DB.Exec(sql, ids).Error; err != nil {
			log.Printf("reset %s: %v", ref.TableName, err)
		}
	}
	if err := database.DB.Exec("DELETE FROM users WHERE id IN ?", ids).Error; err != nil {
		log.Fatalf("reset users: %v", err)
	}
	fmt.Printf("Removed %d demo users and %d projects.\n", len(ids), len(projectIDs))
}

func must(err error, what string) {
	if err != nil {
		log.Fatalf("%s: %v", what, err)
	}
}
