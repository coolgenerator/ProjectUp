# AI-Guided Project Creation - Design Document

## Overview

**问题**: 当前设计要求用户先有项目想法，然后AI只在最后生成任务。但实际上很多用户不知道做什么项目。

**解决方案**: AI从一开始就介入，从需求/约束出发，渐进式引导用户从"我不知道做什么"到"完整的项目计划"。

## Design Philosophy

### 核心原则

1. **从约束到创意** - 从课程要求/研究领域/问题描述开始
2. **渐进式具体化** - 从模糊想法 → 明确方向 → 详细计划
3. **AI贯穿始终** - 每个决策点都有AI辅助，不是单独模块
4. **用户可控** - AI提供建议，用户可以选择、编辑、拒绝

### 与当前设计的对比

| 维度 | 当前设计 | 新设计 |
|-----|---------|--------|
| 起点 | 用户已有项目想法 | 用户只有课程要求 |
| AI角色 | 最后生成任务板（可选） | 全程引导和建议 |
| 交互方式 | 一次性生成 | 多轮渐进式交互 |
| 用户体验 | "空白画布"焦虑 | "引导式探索" |

---

## Course Project Flow (Prototype)

### 流程概览

```
Step 1: Course Requirements Input (课程要求)
   ↓ AI分析
Step 2: AI Topic Suggestions (主题建议)
   ↓ 用户选择
Step 3: Topic Elaboration (主题细化)
   ↓ 用户确认/编辑
Step 4: Project Details Generation (项目详情)
   ↓ 用户确认/编辑
Step 5: Full Project Plan (完整计划)
   ↓
Step 6: Timeline, Team, Preview (传统流程)
```

### 详细步骤设计

#### Step 1: Course Requirements Input

**用户输入**:
- 课程名称、学校、课程代码
- 课程要求（文本描述或上传syllabus）
- 项目约束（时长、团队大小、必须使用的技术等）

**UI组件**: `CourseRequirementsInput.tsx`

**后端**: 无需立即处理，暂存数据

#### Step 2: AI Topic Suggestions

**AI任务**:
- 分析课程要求和约束
- 生成3-5个项目主题建议
- 每个主题包含：
  - 名称（简短、吸引人）
  - 一句话描述
  - 为什么适合这门课（对齐学习目标）
  - 建议技术栈
  - 难度级别（初级/中级/高级）
  - 预估工作量

**AI Prompt策略**:
```
你是一位经验丰富的课程项目顾问。根据以下课程信息，建议3-5个适合的项目主题。

课程信息：
- 课程名称：{{course_name}}
- 学校：{{school}}
- 课程要求：{{requirements}}
- 约束条件：
  - 团队大小：{{team_size}}
  - 项目时长：{{duration_weeks}}周
  - 必须使用：{{required_tech}}

对于每个项目主题，提供：
1. 项目名称（吸引人且描述性强）
2. 一句话描述
3. 如何对齐课程学习目标
4. 建议的技术栈
5. 难度级别和理由
6. 预估工作量（以周为单位）

要求：
- 项目要有实际价值，不要做玩具项目
- 考虑可行性，在给定时间内完成
- 难度梯度分布（1个简单、2-3个中等、1个挑战）
- 技术栈现代且实用

返回JSON格式。
```

**UI组件**: `AITopicSuggestions.tsx`
- 卡片式展示3-5个主题
- 每个卡片显示名称、描述、技术栈、难度
- 支持选择一个或"None, let me define my own"
- 加载状态：显示AI正在分析课程要求

**后端端点**: `POST /api/projects/ai/suggest-topics`

**请求**:
```json
{
  "course_name": "Web Development",
  "school": "UC San Diego",
  "course_code": "CSE 112",
  "requirements": "Build a full-stack web application...",
  "constraints": {
    "team_size": 4,
    "duration_weeks": 10,
    "required_tech": ["React", "Node.js"]
  }
}
```

**响应**:
```json
{
  "topics": [
    {
      "topic_id": "t1",
      "name": "Campus Event Discovery Platform",
      "tagline": "Help students discover and organize campus events",
      "description": "A web platform where students can create, discover, and RSVP to campus events...",
      "alignment_reason": "Covers full-stack development, user authentication, real-time updates...",
      "suggested_tech": ["React", "Node.js", "MongoDB", "Socket.io"],
      "difficulty": "medium",
      "estimated_weeks": 10,
      "key_features": ["User profiles", "Event creation", "Search & filters", "Notifications"]
    },
    // ... 2-4 more topics
  ],
  "analysis_summary": "Based on your course requirements, I've suggested projects that emphasize..."
}
```

#### Step 3: Topic Elaboration

**AI任务**:
- 深入阐述选定的主题
- 生成详细的项目范围
- 列出核心功能和可选功能
- 明确成功标准

**AI Prompt策略**:
```
用户选择了项目主题："{{selected_topic_name}}"

现在请详细阐述这个项目：

1. **项目背景**：为什么这个项目有价值？解决什么问题？
2. **目标用户**：谁会使用这个系统？
3. **核心功能**（MVP必须有的）：列出3-5个
4. **增强功能**（时间允许可以加的）：列出2-3个
5. **技术架构建议**：
   - 前端技术栈和理由
   - 后端技术栈和理由
   - 数据库选择和理由
   - 其他工具/服务
6. **项目里程碑**：建议分几个阶段，每个阶段的目标
7. **成功标准**：什么样算完成？

考虑因素：
- 课程要求：{{course_requirements}}
- 时间限制：{{duration_weeks}}周
- 团队大小：{{team_size}}人

返回JSON格式。
```

**UI组件**: `TopicElaboration.tsx`
- 显示AI生成的详细阐述
- 分section展示（背景、功能、架构等）
- 用户可以：
  - 编辑任何部分
  - 要求AI重新生成某个部分
  - 添加自己的想法
- "Looks good, continue" 按钮

**后端端点**: `POST /api/projects/ai/elaborate-topic`

#### Step 4: Project Details Generation

**AI任务**:
- 生成具体的项目名称（多个选项）
- 生成项目描述（elevator pitch风格）
- 确定项目标签/topics

**AI Prompt策略**:
```
基于以下项目概念，生成具体的项目详情：

项目概念：{{topic_elaboration}}

请生成：
1. **项目名称选项**（3个）：
   - 简洁、专业、有辨识度
   - 避免通用名称如"Event Manager"
   - 每个名称提供命名理由

2. **项目描述**：
   - 2-3句话的elevator pitch
   - 清楚说明是什么、为谁、解决什么问题
   - 突出独特价值

3. **项目标签**：3-5个关键词标签

返回JSON格式。
```

**UI组件**: `AIProjectDetailsGenerator.tsx`
- 显示3个名称选项，用户选择一个或自定义
- 显示生成的描述，用户可编辑
- 显示标签，用户可添加/删除
- 实时预览最终的项目卡片样式

**后端端点**: `POST /api/projects/ai/generate-details`

#### Step 5: Full Project Plan Generation

**复用现有逻辑**:
- 使用现有的 `POST /api/projects/board/generate`
- 但输入更丰富（因为前面AI已经生成了详细内容）

**Context包含**:
- 课程要求
- 选定的主题和详细阐述
- 确定的项目名称、描述
- 技术栈决策

**生成**:
- Phases（基于里程碑）
- Tasks（详细且可执行）
- Milestones（对齐课程deadline）
- Task dependencies

#### Step 6-8: Timeline, Team, Preview

**保持原有流程**，但：
- Timeline可以基于AI生成的里程碑预填充
- Team设置可以根据技术栈建议角色（Frontend Dev, Backend Dev等）

---

## Backend Implementation

### New API Endpoints

#### 1. Suggest Topics

```go
// POST /api/projects/ai/suggest-topics
func SuggestProjectTopics() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req struct {
            CourseName    string            `json:"course_name"`
            School        string            `json:"school"`
            CourseCode    string            `json:"course_code"`
            Requirements  string            `json:"requirements"`
            Constraints   map[string]interface{} `json:"constraints"`
        }

        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(400, gin.H{"error": err.Error()})
            return
        }

        // Get AI service
        aiService := services.GetDefaultAIService()

        // Build prompt
        prompt := buildTopicSuggestionPrompt(req)
        systemPrompt := "You are an expert course project advisor..."

        // Generate
        response, err := aiService.GenerateCompletion(prompt, systemPrompt)

        // Parse JSON response
        var topics struct {
            Topics []ProjectTopic `json:"topics"`
            AnalysisSummary string `json:"analysis_summary"`
        }
        json.Unmarshal([]byte(extractJSON(response)), &topics)

        c.JSON(200, topics)
    }
}
```

#### 2. Elaborate Topic

```go
// POST /api/projects/ai/elaborate-topic
func ElaborateTopic() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req struct {
            SelectedTopic  ProjectTopic `json:"selected_topic"`
            CourseContext  CourseContext `json:"course_context"`
        }

        // Similar to above, generate detailed elaboration
    }
}
```

#### 3. Generate Project Details

```go
// POST /api/projects/ai/generate-details
func GenerateProjectDetails() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req struct {
            TopicElaboration TopicElaboration `json:"topic_elaboration"`
        }

        // Generate name options, description, tags
    }
}
```

### AI Prompt Templates

Create `services/aiPrompts.go` to centralize all prompts:

```go
package services

const TopicSuggestionPromptTemplate = `
You are an expert course project advisor. Analyze the following course and suggest 3-5 suitable project topics.

Course Information:
- Name: {{.CourseName}}
- School: {{.School}}
- Requirements: {{.Requirements}}

Constraints:
- Team size: {{.TeamSize}} people
- Duration: {{.DurationWeeks}} weeks
- Required tech: {{.RequiredTech}}

Generate 3-5 project topics with:
1. Project name (catchy and descriptive)
2. One-line tagline
3. Full description
4. Why it aligns with course goals
5. Suggested tech stack
6. Difficulty level (beginner/intermediate/advanced)
7. Estimated workload (in weeks)
8. Key features list

Requirements:
- Projects should be practical and valuable, not toy projects
- Must be feasible within the given timeframe
- Vary difficulty (1 easy, 2-3 medium, 1 challenging)
- Use modern, industry-relevant tech stacks

Return ONLY valid JSON with this structure:
{
  "topics": [...],
  "analysis_summary": "..."
}
`
```

---

## Frontend Implementation

### New Components

#### 1. CourseRequirementsInput.tsx

```tsx
interface CourseRequirementsInputProps {
  onComplete: (data: CourseRequirements) => void;
  onBack: () => void;
}

interface CourseRequirements {
  courseName: string;
  school: string;
  courseCode: string;
  requirements: string;  // Text or parsed from syllabus
  constraints: {
    teamSize: number;
    durationWeeks: number;
    requiredTech: string[];
  };
}

const CourseRequirementsInput: React.FC<CourseRequirementsInputProps> = ({
  onComplete,
  onBack
}) => {
  return (
    <div>
      {/* Course info fields */}

      {/* Requirements input with tabs */}
      <Tabs>
        <Tab label="Paste Text">
          <textarea placeholder="Paste course requirements or syllabus..." />
        </Tab>
        <Tab label="Upload File">
          <FileUpload accept=".pdf,.txt,.doc" />
        </Tab>
      </Tabs>

      {/* Constraints */}
      <div>
        <label>Team Size</label>
        <input type="number" />

        <label>Project Duration (weeks)</label>
        <input type="number" />

        <label>Required Technologies</label>
        <TagInput />
      </div>

      <button onClick={() => onComplete(data)}>
        Continue with AI Suggestions →
      </button>
    </div>
  );
};
```

#### 2. AITopicSuggestions.tsx

```tsx
interface AITopicSuggestionsProps {
  courseRequirements: CourseRequirements;
  onTopicSelected: (topic: ProjectTopic | null) => void;
  onBack: () => void;
}

const AITopicSuggestions: React.FC<AITopicSuggestionsProps> = ({
  courseRequirements,
  onTopicSelected,
  onBack
}) => {
  const [topics, setTopics] = useState<ProjectTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    loadTopicSuggestions();
  }, []);

  const loadTopicSuggestions = async () => {
    setIsLoading(true);
    const response = await fetchWithAuth(
      `${config.API_BASE_URL}/api/projects/ai/suggest-topics`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseRequirements)
      }
    );
    const data = await response.json();
    setTopics(data.topics);
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingState message="AI is analyzing your course requirements and suggesting project topics..." />;
  }

  return (
    <div>
      <h2>AI Suggested Project Topics</h2>
      <p>{data.analysis_summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map(topic => (
          <TopicCard
            key={topic.topic_id}
            topic={topic}
            isSelected={selectedTopic === topic.topic_id}
            onSelect={() => setSelectedTopic(topic.topic_id)}
          />
        ))}

        {/* Custom topic option */}
        <CustomTopicCard
          isSelected={selectedTopic === 'custom'}
          onSelect={() => setSelectedTopic('custom')}
        />
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={onBack}>← Back</button>
        <button
          onClick={() => {
            const selected = topics.find(t => t.topic_id === selectedTopic);
            onTopicSelected(selected || null);
          }}
          disabled={!selectedTopic}
        >
          Continue with Selected Topic →
        </button>
      </div>
    </div>
  );
};
```

#### 3. TopicElaboration.tsx

```tsx
interface TopicElaborationProps {
  selectedTopic: ProjectTopic;
  courseContext: CourseContext;
  onComplete: (elaboration: TopicElaboration) => void;
  onBack: () => void;
}

const TopicElaboration: React.FC<TopicElaborationProps> = ({
  selectedTopic,
  courseContext,
  onComplete,
  onBack
}) => {
  const [elaboration, setElaboration] = useState<TopicElaboration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    loadElaboration();
  }, []);

  return (
    <div>
      {isLoading ? (
        <LoadingState message="AI is elaborating on your selected topic..." />
      ) : (
        <>
          <h2>{selectedTopic.name}</h2>

          {/* Editable sections */}
          <Section
            title="Project Background"
            content={elaboration.background}
            isEditing={isEditing === 'background'}
            onEdit={() => setIsEditing('background')}
            onSave={(newContent) => {
              setElaboration({...elaboration, background: newContent});
              setIsEditing(null);
            }}
          />

          <Section
            title="Target Users"
            content={elaboration.target_users}
            // ...
          />

          <Section
            title="Core Features (MVP)"
            content={elaboration.core_features}
            type="list"
            // ...
          />

          {/* ... more sections */}

          <div className="flex justify-between mt-6">
            <button onClick={onBack}>← Back to Topics</button>
            <button onClick={() => onComplete(elaboration)}>
              Looks Good, Continue →
            </button>
          </div>
        </>
      )}
    </div>
  );
};
```

### Updated CourseProjectFlow

```tsx
type Step =
  | 'requirements'      // NEW: Course requirements input
  | 'ai-topics'         // NEW: AI topic suggestions
  | 'ai-elaboration'    // NEW: Topic elaboration
  | 'ai-details'        // NEW: Project details generation
  | 'ai-plan'           // NEW: Full project plan
  | 'timeline'
  | 'team'
  | 'preview';

const CourseProjectFlowV2: React.FC<Props> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('requirements');

  // State for each step
  const [courseRequirements, setCourseRequirements] = useState<CourseRequirements | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [topicElaboration, setTopicElaboration] = useState<TopicElaboration | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);

  return (
    <div>
      {/* Progress indicator */}

      {currentStep === 'requirements' && (
        <CourseRequirementsInput
          onComplete={(data) => {
            setCourseRequirements(data);
            setCurrentStep('ai-topics');
          }}
          onBack={onBack}
        />
      )}

      {currentStep === 'ai-topics' && (
        <AITopicSuggestions
          courseRequirements={courseRequirements!}
          onTopicSelected={(topic) => {
            setSelectedTopic(topic);
            setCurrentStep('ai-elaboration');
          }}
          onBack={() => setCurrentStep('requirements')}
        />
      )}

      {currentStep === 'ai-elaboration' && (
        <TopicElaboration
          selectedTopic={selectedTopic!}
          courseContext={courseRequirements!}
          onComplete={(elaboration) => {
            setTopicElaboration(elaboration);
            setCurrentStep('ai-details');
          }}
          onBack={() => setCurrentStep('ai-topics')}
        />
      )}

      {/* ... more steps */}
    </div>
  );
};
```

---

## Benefits of New Design

### For Students

✅ **No more blank canvas anxiety** - Start from course requirements, not ideas
✅ **AI-guided exploration** - Discover project possibilities you wouldn't think of
✅ **Gradual refinement** - From vague → specific, reducing decision paralysis
✅ **Learn from AI** - See how professionals scope and plan projects
✅ **Save time** - Don't spend hours brainstorming what to build

### For Instructors

✅ **Better project quality** - AI ensures projects align with learning goals
✅ **Reduced office hours** - Fewer "I don't know what to build" questions
✅ **Standardized scope** - AI helps keep projects feasible

### For ProjectUp

✅ **Differentiation** - Unique value proposition vs. Trello/Asana
✅ **Higher engagement** - Users invested from step 1, not just task management
✅ **AI showcase** - Demonstrates AI capabilities beyond simple generation

---

## Next Steps for Prototype

### Phase 1: Backend Foundation
1. Create `aiPrompts.go` with prompt templates
2. Implement `SuggestProjectTopics` endpoint
3. Implement `ElaborateTopic` endpoint
4. Implement `GenerateProjectDetails` endpoint
5. Test with real AI providers

### Phase 2: Frontend Components
1. Create `CourseRequirementsInput.tsx`
2. Create `AITopicSuggestions.tsx` with topic cards
3. Create `TopicElaboration.tsx` with editable sections
4. Create `AIProjectDetailsGenerator.tsx`

### Phase 3: Integration
1. Create new `CourseProjectFlowV2.tsx`
2. Wire up all components
3. Handle state management
4. Add loading states and error handling

### Phase 4: Polish & Testing
1. UX refinements based on testing
2. Edge case handling
3. Performance optimization
4. Documentation

---

## Future Expansion

Once Course Project prototype is validated, apply same pattern to:

- **Research Project**: From research area → literature gap analysis → research question suggestions → methodology
- **Product Development**: From problem description → user research → feature prioritization → MVP definition
- **Personal Project**: From learning goals → skill assessment → project recommendations → learning path

---

**Status**: Design document ready for implementation
**Next Action**: Begin Phase 1 - Backend Foundation
