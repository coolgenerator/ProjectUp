# 组队主线：想法 → 招募 → 申请 → 筛选 → 开工

ProjectUp 登录后的核心流程。每个页面只服务主线上的一步。

| 步骤 | 页面 | 解决的问题 |
|---|---|---|
| 理清想法 | `/ideas` 想法工作台 | 想法模糊、不知道缺什么人 |
| 找项目 | `/projects` 招募中的项目 | 找不到适合自己时间和技能的角色 |
| 看项目 | `/projectpost/:sid` 项目详情 | 判断项目靠不靠谱、申请哪个角色 |
| 申请 | `/project/:sid/apply` | 申请只写一句"我想加入"，发起人无从判断 |
| 筛选 | `/applications` 申请看板 | 申请多了靠聊天记录管理会漏人 |
| 待办 | `/my-projects` 顶部 | 不知道现在该处理什么 |
| 开工 | 项目看板「概览」 | 团队组好后没有第一步，很快就散 |

## 各页面功能

**想法工作台**（`frontend/src/routes/ideas/`）
- 空状态的示例想法；草稿自动保存到服务器（`idea_drafts` 表），URL 带 `?draft=id`，刷新可恢复；左侧「我的想法」列表。
- AI 每轮提 3 个问题，进度条显示已覆盖的思考维度（共 6 个）。
- 成型后的 brief 每段都能直接编辑，或点 ↻ 让 AI 只重写这一段（`POST /api/ideas/regenerate`）；角色卡可编辑、增删。
- 发布前可「预览招募页」；Agent 提示词收在「高级」里；发布后草稿锁定并显示「查看招募页」。

**招募中的项目**：按关键词、角色或技能、每周最多投入时间、只看还缺人筛选（`role`、`max_hours`、`open` 参数）；卡片显示每个角色还缺几人、已有几人加入；匹配资料不完整时提示补全。

**项目详情**：项目简介（问题、目标用户、接下来两周、卡点，来自工作台 brief）；角色卡（技能、每周时长、第一周任务、剩余名额、按角色申请）；发起人信息（已发布项目数、平均回复时间、回复率）和已加入成员；「向发起人提问」直接打开私信。

**申请**：必填「第一步提议」（至少 10 个字，前后端都会校验），旁边显示发起人建议的第一周任务；预览会随申请一起发出的个人资料；提交后可以看到申请所处阶段和试做任务。

**申请看板**：五列：新申请 / 沟通中 / 试做中 / 已加入 / 未通过。卡片可以拖动，也可以点按钮。
- 移到「试做中」时需要填写试做任务和截止日期，申请人会收到通知。
- 每张卡片自动生成 AI 速读（摘要、匹配点、风险），并缓存在 `project_application.ai_summary` 中。
- 卡片上能直接查看申请人资料、可靠度、作品链接，或发起私信。
- 申请超过 48 小时没人处理，后台任务（`StartApplicationReminders`，每小时运行）会给发起人发一次站内通知和邮件提醒。

**我的项目**：
- 「等你处理」：新申请、待评估的试做、我要完成的试做、邀请、本周还没写的 check-in。
- 「我的申请」：我投出的每份申请及其当前状态。

**项目看板**：
- 侧栏只保留 概览、任务、资料、成员、设置。其余入口在 `sections` 里注释掉了，没有删除。
- 概览页包含：开工清单（`projects.kickoff`）、角色缺口及「重新开放招募」、每周 check-in（`project_checkins`）、决策记录（`project_decisions`）。

**个人资料**：
- 匹配资料（技能和熟练度、每周时长、时区、想担任的角色），可通过 `GET/PUT /api/match/profile` 读写。
- 在 ProjectUp 的项目经历（发起的和加入的公开项目）。
- 可靠度：加入过几个项目、完成几个、最近 4 周有几周写了 check-in。

**通知**：按 全部 / 申请 / 邀请 / 其他 分组（`notifications.type`；旧通知按链接推断类型）。

## 后端接口（`backend/routes/ideaMatchRouter.go`）

- `/api/ideas/*`：问题、成型、单段重写、发布、草稿增删改查
- `/api/match/applications`：看板数据、阶段变更、AI 摘要
- `/api/match/posts/:sid/team`：发起人与成员
- `/api/match/projects/:sid/{pulse,checkin,kickoff,decisions,reopen}`
- `/api/match/{profile,todo,my-applications,users/:sid/record}`

权限：看板相关接口只允许项目所有者访问；pulse、check-in、决策记录要求是项目成员；开工清单和重新开放招募要求管理员。`/api/projects/:sid/application-questions` 只把申请和回答返回给所有者和管理员。

## 共享 UI 组件

`frontend/src/components/ui/` 提供 Button、Card、Badge、Tag、Dialog、Input/TextArea/Select、EmptyState、PageHeader、ProgressBar、FadeIn，基于 Tailwind、framer-motion 和 lucide 图标，主色为 indigo。主线页面统一使用这套组件；其余旧页面仍在用 MUI，新页面建议直接用这套。

## 数据库变更

新表：`idea_drafts`、`project_checkins`、`project_decisions`。

新列：
- `project_application`：`first_step`、`stage`、`trial_task`、`trial_due`、`ai_summary`、`reminded_at`
- `notifications.type`
- `projects.kickoff`
- `profiles`：`timezone`、`desired_roles`

Demo 环境由 `demo/start.sh` 自动补上这些表和列；全新库则由 `backend/migrate/migrate.go` 创建。
