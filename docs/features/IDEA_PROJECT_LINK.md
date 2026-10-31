# 想法与项目的绑定

想法工作台里的草稿（`idea_drafts`）发布后会变成一个项目和一条招募帖。本文定义发布前后两者的关系：谁是谁的来源、哪份数据算数、发布后在哪里修改。

所属主线见 [TEAM_MATCHING_FLOW](./TEAM_MATCHING_FLOW.md) 的「理清想法」和「开工」两步。

**状态**：P1–P4 均已实现。下文「现状与问题」描述的是 P1 之前的情况。

## 原则

1. **想法是项目的来源，不是项目的一部分。** 一个想法最多变成一个项目。发布那一刻起，项目接管简介，想法变成只读的「思考记录」。
2. **每份数据只有一个权威来源。**
   - 简介正文（愿景、问题、服务谁、接下来两周、卡点）由项目保存。
   - 角色由招募帖的 `spots` 保存。
   - 想法草稿只保留发布前的问答过程。
3. **简介会随项目变化。** 接下来两周的计划和卡点每隔几周就会过时，所以它们要能在项目里改，不能冻结在发布那一刻。

## 现状与问题

| 现状 | 问题 |
|---|---|
| `POST /api/ideas/materialize` 只接收 brief，不知道来自哪个草稿；前端拿到 `post_sid` 后，再调一次草稿保存，把它写回草稿 | 第二步失败时，草稿还显示未发布，可以再发布一次，于是产生两个项目。重复点击或重试也会重复创建 |
| 草稿只记 `post_sid`，项目侧没有指回草稿的字段 | 从项目找不到当初的思考记录 |
| 发布后工作台锁定编辑，但只锁了前端；`PUT /api/ideas/drafts/:id` 仍然接受修改 | 改草稿不会影响线上，接口却允许改，状态不一致 |
| brief 复制进 `projects.onboarding_metadata.brief`，之后没有任何地方能改 | 项目推进后简介过时；项目详情页能编辑的只有类型、学校这些旧字段 |
| 角色同时存在于 `brief.roles` 和 `project_posts.spots` | 匹配、申请看板、团队页读 `spots`；项目详情页读 `brief.roles`。用「管理帖子」改了角色后，两处显示不一致 |
| 项目描述 = 愿景 + 问题，帖子描述 = 一句话 + 愿景 | 同一段话存了三份 |

## 数据模型

```
idea_drafts                      projects                         project_posts
  id                               project_id                       post_id
  idea, rounds, current            brief jsonb        (新增)        project_id
  brief      ← 发布前的工作稿       brief_updated_at   (新增)        spots      ← 角色的唯一来源
  post_sid   (保留，兼容)           brief_updated_by   (新增)        description
  project_id (新增, unique, null)  onboarding_metadata
```

- **`idea_drafts.project_id`**：可为空、唯一，外键指向 `projects`，`ON DELETE SET NULL`。从项目反查草稿用 `WHERE project_id = ?`。只在草稿表上加这一个字段，避免两边各存一个外键互相同步。
- **`projects.brief`**：项目的权威简介，字段有 `one_liner`、`vision`、`problem`、`target_users`、`next_steps`、`blockers`、`topics`。不含 `roles`（角色在帖子上）。`agent_prompt` 仍放在 `onboarding_metadata`，因为它只给发起人看。
- **`idea_drafts.target_project_sid`**：P4 用，记下这个草稿是在给哪个已有项目补写简介。
- **`brief_updated_at` / `brief_updated_by`**：用来显示「更新于 3 周前」，并在过时时提醒更新。
- **软删除**：项目是软删除，`ON DELETE` 不会触发。删除项目的代码里要同时把草稿的 `project_id` 置空，草稿回到可编辑、可重新发布的状态。

### 迁移

1. 加列：`idea_drafts.project_id`、`projects.brief`、`brief_updated_at`、`brief_updated_by`。演示环境同步改 `demo/start.sh`。
2. 回填 `idea_drafts.project_id`：通过 `post_sid` 关联 `project_posts`，取它的 `project_id`。
3. 回填 `projects.brief`：取 `onboarding_metadata.brief`（`source = idea_workbench`），去掉 `roles`、`agent_prompt` 和 `title`；`agent_prompt` 移到 `onboarding_metadata.agent_prompt`，`onboarding_metadata.brief` 删除。
4. `workbenchBrief()` 改为读 `projects.brief`。`projects.brief` 为空时仍会读 `onboarding_metadata.brief`，保留一个版本后删除。

以上 SQL 都写在 `demo/start.sh` 里，可重复执行。

## 流程

### 1. 发布（把绑定放进一个事务）

`POST /api/ideas/materialize`，请求体改为 `{ draft_id, brief }`：

- 校验草稿属于当前用户。
- 草稿已有 `project_id` 时，直接返回已有的项目和帖子。这样重复点击和网络重试都不会产生第二个项目。草稿行用 `SELECT … FOR UPDATE` 锁住，两个请求同时到达也只会建一个项目。
- 草稿里的 brief 会被替换成实际发布的版本，作为思考记录的终点。
- 不带 `draft_id`（请求体直接是 brief）仍然可以发布，只是不绑定草稿；`demo/ai_eval.py` 就是这样调用的。
- 在同一个事务里：创建项目（写入 `projects.brief`）、创建帖子（`spots` = brief 里的角色）、把 `draft.project_id` 和 `draft.post_sid` 写回草稿。
- 前端不再单独写回 `post_sid`。

### 2. 工作台：已发布的想法

- 左侧「我的想法」列表中，已发布的草稿显示为「已成为项目 · {项目名}」，排在未发布的草稿后面。
- 打开已发布的草稿时，顶部横幅写「这个想法已经成为项目，之后的修改请在项目里进行」，并给出三个按钮：进入项目、查看招募页、看看推荐的人（即 MatchReveal）。
- 问答轮次和发布时的 brief 只读展示，brief 标为「发布时的版本」。
- 「以此为起点开新想法」：把想法原文复制到一个新草稿，从第一轮问题重新开始，新草稿不关联项目。用于转方向或拆分子项目。只复制原文、不复制问答，是因为转方向时原来的回答多半不再成立，而且想法原文在有问答后就不能再改了。
- 后端：`PUT` 和 `DELETE /api/ideas/drafts/:id` 对已发布的草稿一律返回 409；列表中已发布的草稿不显示删除按钮。项目删除后草稿自动解绑，恢复可编辑、可删除。

### 3. 项目：简介可以持续更新

项目详情页的「项目简介」卡（`ProjectDetailsPanel`）：

组件为 `ProjectBriefSection`。

- 发起人和管理员点「编辑简介」进入表单，每段旁有「按近况重写」。重写用的是单独的提示词，输入是项目名、开始日期、当前简介（包括没保存的修改）、最近四周的 check-in 和最近 8 条决策记录：「接下来两周」不重复已完成的事，「当前卡点」去掉 check-in 里已解决的。没有近况可参考时，只润色现有内容。模型偶尔会返回整份简介或 `{"<字段>": …}`，后端会从中取出这一段。
- 保存后写入 `projects.brief`，招募页立刻显示新内容，推荐缓存和这条帖子的候选人缓存失效。从工作台发布的项目（`onboarding_metadata.source = idea_workbench`）还会重新生成项目描述（愿景 + 问题）、招募帖描述（一句话 + 愿景）和话题；通过 P4 补写简介的老项目保留发起人自己写的描述和话题。
- 「接下来两周」或「当前卡点」有变化时，在团队讨论里发一条系统消息（`event: brief_updated`），写明谁改了哪几项。
- 卡片标题下显示「更新于 X 天前」。超过 21 天没更新且招募帖还开着时，显示黄色提示和「现在更新」。目前只在详情页提示，「等你处理」里还没有。
- 卡片底部有链接「查看最初的想法和思考记录」，只有发起人看得到，打开的是只读的工作台草稿。

### 4. 角色只看帖子

- 项目详情页的「团队角色」卡改为读 `project_posts.spots`，并带上 `role_fills`。这和团队页、申请看板是同一份数据，所以能显示「已招 1/2」。
- 编辑角色仍然通过「管理帖子」，卡片上提供入口「编辑招募角色」。
- `brief.roles` 不再读取，只作为想法草稿里的历史留着。

### 5. 没有来源想法的项目（老流程建的）

- 项目详情页的简介卡显示空状态：「给项目补一份简介，招募页和推荐会更准」。
- 空状态只对发起人和管理员显示，按钮「补写简介」打开 `/ideas?project=:sid`，即工作台的「项目模式」：用项目名和描述作为想法起点，走同样的问答流程。草稿记下 `target_project_sid`，刷新后仍在项目模式。
- 成型后点「保存到项目」（`POST /api/ideas/attach`），在一个事务里写入这个项目的 `projects.brief`、把草稿绑定到项目，不新建项目。项目原来的描述、话题和招募角色都不改。一个项目只能绑定一个想法，第二次返回 409。
- 生成的角色只作为「角色建议」：保存后横幅里逐个列出，发起人点「加到招募帖」（`POST /api/match/projects/:sid/roles`）才会加入；招募帖里已有同名角色时不重复添加。

## 接口

| 接口 | 变化 | 权限 |
|---|---|---|
| `POST /api/ideas/materialize` | 请求体加 `draft_id`；幂等；事务内完成绑定 | 草稿所有者 |
| `POST /api/ideas/attach` | 第 5 步：`{ draft_id, project_sid, brief }`，把简介写进已有项目并绑定草稿 | 草稿所有者，且是项目发起人/管理员 |
| `POST /api/match/projects/:sid/roles` | 把一个建议角色加到最新的招募帖；同名不重复 | 发起人/管理员 |
| `GET /api/ideas/drafts` | 每项带上 `project: { sid, title, post_sid, status }` | 本人 |
| `PUT`/`DELETE /api/ideas/drafts/:id` | 已发布的草稿返回 409 | 本人 |
| `GET /api/project/:sid` | `brief` 改读 `projects.brief`，加 `brief_updated_at` 和 `recruiting`（角色、各角色已加入人数）；发起人额外拿到 `idea_draft_id` | 项目成员 |
| `PUT /api/match/projects/:sid/brief` | 新增；可只改部分字段；返回 `changed` | 发起人/管理员 |
| `POST /api/match/projects/:sid/brief/regenerate` | 新增；`{ field, brief? }`，带项目近况；不支持 `roles` | 发起人/管理员 |

## 分期

| 阶段 | 内容 | 解决的问题 |
|---|---|---|
| P1 绑定 | 加 `idea_drafts.project_id` 并回填；materialize 幂等、事务内绑定；工作台已发布状态和横幅；草稿接口拒绝修改已发布的草稿；项目删除时解绑；项目详情页给发起人显示「查看最初的想法和思考记录」 | 重复项目、找不到来源、接口状态不一致 |
| P2 单一来源 | 加 `projects.brief` 并迁移；角色卡改读 `spots` | 角色不一致 |
| P3 可更新的简介 | 项目内编辑和单段重写（带近况）；过时提醒；「查看思考记录」 | 简介跟不上项目进展 |
| P4 补简介 | 老项目进入工作台项目模式补写简介 | 老项目没有简介，匹配不准 |

P1 和 P2 改动小、风险低，可以一起做；P3 是用户最能感知到的部分；P4 视老项目的数量决定是否做。

项目描述和帖子描述由简介生成，供列表卡片使用，没有合并成一份：列表和卡片只需要一段短文字，合并要改的读取方太多。P3 起，每次保存简介都会重新生成这两段描述，让它们跟着简介走。

## 待定

1. **成员能不能看思考记录？** 默认只有发起人能看。问答里可能有发起人不想公开的犹豫和判断。可以考虑由发起人手动打开「分享给团队」。
2. ~~改简介要不要通知团队？~~ 已定：只在 `next_steps` 或 `blockers` 变化时，在团队讨论里发系统消息。
3. **一个想法能不能发布第二次？** 本方案只允许在项目被删除后重新发布。项目归档后想重启，应该直接在项目里恢复，而不是从想法再发一次。
