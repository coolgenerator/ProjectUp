# ProjectUp 匹配 Demo

一条演示主线：**想法 → AI 引导思考 → 成型为项目和角色卡 → AI 推荐候选人 / 推荐项目 → 带承诺的申请**。

背景见 [AI_PROJECT_MATCHING_STRATEGY.md](../docs/strategy/AI_PROJECT_MATCHING_STRATEGY.md) 和 [INNOVATION_DANCE_COLLABORATION_ANALYSIS.md](../docs/strategy/INNOVATION_DANCE_COLLABORATION_ANALYSIS.md)。

## 启动

需要：Docker、Go、Node.js、`psql`。

1. 配置 OpenRouter：

   ```bash
   cp demo/openrouter.env.example demo/openrouter.env
   ```

   填入 `OPENROUTER_API_KEY`，并把 `OPENROUTER_MODEL` 改成 OpenRouter 页面上 DeepSeek 模型的准确名称。

2. 启动（第一次会自动建表并灌入示例数据）：

   ```bash
   ./demo/start.sh
   ```

   想清空重来：`./demo/start.sh --reset`

3. 打开 http://localhost:5173

本地数据库跑在 Docker 里（Postgres 5433、Redis 6380），**不会连接 `backend/.env` 里配置的 AWS RDS**。`demo/demo.env` 会在启动前覆盖数据库和 Redis 的连接配置。

上传的图片和文件存在本地 MinIO（API 9010，控制台 http://localhost:9011，账号 `projectup` / `projectup-minio`），**不会写入 AWS S3**。`media/` 和 `avatar/` 可以公开读取；`papers/` 和 `resources/` 是私有的，只能通过预签名链接访问，和线上 S3 的行为一致。

## 演示账号

密码都是 `demo1234`。

| 账号 | 身份 | 用来演示 |
|---|---|---|
| `founder@demo.projectup.local` | 林舟，生物医学工程研二 | 想法工作台 → 成型为项目 → 推荐候选人 |
| `seeker@demo.projectup.local` | 陈一，计算机大三，会 React | 推荐给你的项目 → 带承诺的申请 |

另外还有 19 个不同专业、技能和可投入时间的示例用户，以及 8 个正在招人的示例项目。

## 演示脚本（约 5 分钟）

**1. 发起人：从想法到项目**（用 founder 登录）
1. 顶部导航点 **想法工作台**。
2. 输入一个想法，例如："做一个帮医学影像研究者快速找到临床合作者的工具，因为我们组总缺懂临床的人来做标注和验证。"
3. 点 **开始思考**：AI 只提 3 个问题，每个问题有不同的思考角度；每个问题都要用自己的话回答才能继续。
4. 可以点 **再追问一轮**，展示 AI 会根据回答指出漏洞、继续深挖。
5. 点 **为我成型为项目**：生成愿景、问题、目标用户、卡点、两周计划、角色卡，以及可以复制给其他 AI Agent 的启动提示词。
6. 点 **公开项目，开始找搭档**：跳到招募页，下方出现 **推荐候选人**，每人附推荐理由和主要风险（比如"每周只能投入 4 小时"）。

**2. 求组队的人：被推荐、带承诺地申请**（退出，用 seeker 登录）
1. 进入 **Projects** 页，顶部是 **推荐给你的项目**，每个推荐对应一个具体角色。
2. 点 **申请这个角色**（项目详情页的角色卡上也有）：角色已预选，必须填写每周能投入的小时数和 **第一步提议**（加入后第一周打算完成什么）；每人最多同时有 3 个待处理申请。

**3. 回到发起人**：**我的项目 → 申请看板**，申请按 新申请 / 沟通中 / 试做中 / 已加入 / 未通过 排列，卡片上直接显示角色、承诺时长和第一步提议。拖动卡片或点卡片上的按钮推进阶段；点 **通过** 会把对方加入项目，详情页对应角色显示"已招满"。

想法工作台会自动保存草稿，左侧 **我的想法** 列表可以随时切回之前的想法，刷新页面也不会丢。

## 这次改了什么

**后端（Go）**
- `services/openRouterService.go`：OpenRouter 客户端（OpenAI 兼容接口）。
- `controllers/ideaController.go`：`POST /api/ideas/questions`、`/shape`、`/materialize`。
- `controllers/matchController.go`：`GET /api/match/posts/:sid/candidates`、`/api/match/recommended-posts`。先按技能和兴趣重叠初筛 12 个，再由 LLM 精排出最多 5 个，结果缓存 10 分钟；点"重新匹配"会跳过缓存。
- 申请增加 `role`、`hours_per_week` 字段，每周时长必填，每人最多 3 个待处理申请。
- `Profile` 增加 `hours_per_week`。
- 修复 `GetProjectPosts` 的话题、名额筛选，搜索改为不区分大小写。
- `cmd/demoseed`：示例数据，只允许连本地数据库。

**前端**
- 新页面 `/ideas`（想法工作台）。
- `components/match/Recommendations.tsx`：推荐候选人、推荐项目。
- 招募页对发起人展示推荐候选人；Projects 页展示推荐项目；申请页加角色和承诺时长；申请列表展示角色和时长。
- 导航栏和路由隐藏了课程、科研、资源、定价、订阅、俱乐部、工作等入口。只是注释掉，没有删除代码。
- 登录后直接进入 `/ideas`（原来是 `/home`）。
- 首页 `/`（`routes/Welcome.tsx`）按新定位重写：Hero、痛点、怎么运作、匹配预览、靠谱机制、FAQ、收尾 CTA。交互模块来自 Lucian UX/UI Prompt（MIT），放在 `components/landing/lucian/`。
- 中英文切换（导航栏语言选择）：首页、想法工作台、推荐、申请页的文案在 `i18n/locales/{zh,en}/landing.json`、`match.json`。推荐接口带 `?lang=zh|en`，AI 的推荐理由和风险按界面语言生成，缓存也按语言分开。AI 追问和成型仍跟随你输入想法所用的语言。西班牙语没有翻译这些新页面，会显示英文。
- 去掉了 Projects 页一段强制显示新手引导横幅的临时代码（原来连关闭按钮都无效）。
- 示例用户都带头像（`frontend/public/demo-avatar.svg`），并且已标记完成新手教程；否则应用会把没有头像的用户强制跳转到资料填写页，并弹出教程，打断演示。

**没有改动**：ai-service、crawler。这个 Demo 不需要启动它们。

## 实测耗时（deepseek/deepseek-chat）

| 步骤 | 耗时 |
|---|---|
| 生成一轮问题 | 约 6 秒 |
| 成型为项目 | 15–25 秒 |
| 推荐候选人 | 4–7 秒 |
| 推荐项目（首次） | 约 10 秒；之后 30 分钟内走缓存，几乎即时 |

`start.sh` 启动后会自动为 seeker 预热推荐结果。发布新项目时会清空"推荐项目"缓存，新项目能马上出现在别人的推荐里。

每周时长是否够用由后端先算好再交给模型（`hours_check`），避免模型把 10 小时和 8 小时比错。

同样的回答，每次成型出来的角色可能不完全一样（大模型的正常波动），所以推荐出来的候选人也会有差异。正式演示前建议先走一遍。

## 已知限制

- 匹配没有用向量召回。示例数据量小，直接用技能重叠初筛加 LLM 精排；用户量上来后再接 pgvector。
- 仓库自带的 `migrate/migrate.go` 无法修改已存在的表，会报 "insufficient arguments"，所以新增字段在 `start.sh` 里用 SQL 添加。如果要上 RDS，也需要手动执行同样的 `ALTER TABLE`。
- 试用期、可靠度分、中途补位还没有实现，申请页上只有文案提示。
- "发消息邀请"按钮只是跳到消息页，没有预填对象。
