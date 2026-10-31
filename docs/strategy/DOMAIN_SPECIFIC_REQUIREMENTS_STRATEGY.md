# Domain-Specific Requirements Strategy

## The Question

**Context:** Different fields (e.g., biomed, engineering, humanities) have unique needs:
- **Biomed:** Wet lab vs. Dry lab distinction, protocols, reagents, equipment
- **Engineering:** Hardware vs. Software, CAD files, testing protocols
- **Humanities:** Primary vs. Secondary sources, archives, interviews

**Decision:** How should ProjectUp handle domain-specific requirements?

**Options:**
1. **Hard-code** special fields based on project category
2. **Provide templates** with preset structures per domain
3. **Let users manually configure** everything
4. **AI-triggered recommendations** based on category selection

---

## Recommended Approach: **Hybrid AI-Powered Template System**

**Philosophy:** "Flexible by default, intelligent by suggestion"

### Core Principle
```
Base System (Generic) + AI Templates (Domain-Specific) + User Customization (Flexible)
```

**Why This Works:**
- ✅ Scalable to infinite domains without code changes
- ✅ Leverages ProjectUp's AI-first advantage
- ✅ Reduces friction for users (smart defaults)
- ✅ Maintains flexibility (not locked into structure)
- ✅ Avoids maintenance nightmare of hard-coded fields

---

## Implementation Strategy

### Phase 1: Flexible Base System (Generic Foundation)

**Build a flexible metadata system that works for ANY domain:**

#### A. Custom Fields on Projects/Tasks
```go
// /backend/models/projectModel.go
type Project struct {
    // ... existing fields ...

    // Flexible custom fields
    CustomFields    datatypes.JSON `gorm:"type:jsonb" json:"custom_fields"`
    FieldDefinitions datatypes.JSON `gorm:"type:jsonb" json:"field_definitions"`
}

// Field definition structure
type FieldDefinition struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Type        string `json:"type"` // text, number, select, multi-select, date, checkbox
    Required    bool   `json:"required"`
    Options     []string `json:"options"` // For select/multi-select
    Description string `json:"description"`
    Category    string `json:"category"` // Group related fields
}

// Example for Biomed project:
{
  "field_definitions": [
    {
      "id": "lab_type",
      "name": "Lab Type",
      "type": "select",
      "required": true,
      "options": ["Wet Lab", "Dry Lab", "Hybrid"],
      "description": "Type of laboratory work",
      "category": "Lab Setup"
    },
    {
      "id": "biosafety_level",
      "name": "Biosafety Level",
      "type": "select",
      "required": false,
      "options": ["BSL-1", "BSL-2", "BSL-3", "BSL-4"],
      "description": "Required biosafety level",
      "category": "Safety"
    },
    {
      "id": "equipment_needed",
      "name": "Equipment Needed",
      "type": "multi-select",
      "required": false,
      "options": ["Microscope", "Centrifuge", "PCR Machine", "Sequencer", "Flow Cytometer"],
      "category": "Resources"
    }
  ],
  "custom_fields": {
    "lab_type": "Wet Lab",
    "biosafety_level": "BSL-2",
    "equipment_needed": ["Microscope", "PCR Machine"]
  }
}
```

**Benefits:**
- Works for biomed, engineering, humanities, ANY domain
- User-defined fields (no code changes needed for new domains)
- Stored as JSON (flexible schema)
- Can be copied/templated

#### B. Task Custom Fields (Same Pattern)
```go
type Task struct {
    // ... existing fields ...
    CustomFields datatypes.JSON `gorm:"type:jsonb" json:"custom_fields"`
}

// Example for Biomed task:
{
  "protocol_id": "PROT-001",
  "reagents": ["PBS", "DMEM", "FBS"],
  "incubation_time": "24 hours",
  "temperature": "37°C",
  "completion_criteria": "Cell confluence >80%"
}
```

---

### Phase 2: AI-Powered Domain Templates (Smart Defaults)

**Create a template system that AI can populate based on domain:**

#### A. Project Category Selection with AI Trigger

**User Experience Flow:**
```
Step 1: Create Project
┌────────────────────────────────────────┐
│ Project Name: [Neural Network Study]  │
│                                        │
│ Category: [Select category ▾]         │
│   ├─ Biomed Research 🧬               │
│   ├─ Computer Science 💻              │
│   ├─ Engineering ⚙️                   │
│   ├─ Humanities 📚                    │
│   ├─ Creative/Design 🎨               │
│   └─ General                          │
└────────────────────────────────────────┘

Step 2: AI Detects Category + Suggests Template
┌────────────────────────────────────────┐
│ 🤖 We detected this is a Biomed       │
│    Research project.                   │
│                                        │
│ Would you like to use the             │
│ Biomed Research Template?              │
│                                        │
│ This template includes:                │
│ ✓ Lab type field (Wet/Dry/Hybrid)    │
│ ✓ Biosafety level tracking            │
│ ✓ Equipment & reagent checklists      │
│ ✓ Protocol management                 │
│ ✓ Ethics approval workflow            │
│                                        │
│ [Use Template] [Customize] [Skip]     │
└────────────────────────────────────────┘
```

#### B. Template Library (Presets per Domain)

**Backend Storage:**
```go
// /backend/models/templateModel.go
type ProjectTemplate struct {
    ID              uint
    Name            string
    Category        string // "biomed", "engineering", "cs", etc.
    Description     string
    FieldDefinitions datatypes.JSON
    DefaultWorkflow  datatypes.JSON
    TaskTemplates    datatypes.JSON
    Milestones       datatypes.JSON
    IsOfficial      bool   // Official ProjectUp template vs. user-created
    CreatedBy       uint
    Public          bool   // Share with community
    UsageCount      int
}
```

**Example: Biomed Research Template**
```json
{
  "name": "Biomed Research Project",
  "category": "biomed",
  "description": "Template for biological/medical research projects with lab work",
  "field_definitions": [
    {
      "id": "lab_type",
      "name": "Lab Type",
      "type": "select",
      "options": ["Wet Lab", "Dry Lab", "Hybrid"],
      "required": true,
      "help_text": "Wet Lab: Hands-on experiments with biological materials. Dry Lab: Computational/data analysis only."
    },
    {
      "id": "ethics_approval",
      "name": "Ethics Approval Required",
      "type": "checkbox",
      "required": false,
      "help_text": "Check if IRB/IACUC approval is needed"
    },
    {
      "id": "funding_source",
      "name": "Funding Source",
      "type": "text",
      "required": false,
      "help_text": "NIH, NSF, private grant, etc."
    },
    {
      "id": "animal_subjects",
      "name": "Uses Animal Subjects",
      "type": "checkbox",
      "required": false
    },
    {
      "id": "human_subjects",
      "name": "Uses Human Subjects",
      "type": "checkbox",
      "required": false
    }
  ],
  "default_workflow": {
    "statuses": [
      {"name": "Protocol Design", "color": "#3B82F6", "type": "start"},
      {"name": "Ethics Review", "color": "#F59E0B", "type": "in_progress"},
      {"name": "Data Collection", "color": "#10B981", "type": "in_progress"},
      {"name": "Analysis", "color": "#8B5CF6", "type": "in_progress"},
      {"name": "Manuscript Prep", "color": "#EC4899", "type": "in_progress"},
      {"name": "Published", "color": "#06B6D4", "type": "end"}
    ]
  },
  "task_templates": [
    {
      "title": "Literature Review",
      "description": "Comprehensive review of existing research",
      "priority": 5,
      "est_hours": 40
    },
    {
      "title": "Submit IRB/IACUC Application",
      "description": "Obtain ethics approval if working with humans/animals",
      "priority": 5,
      "est_hours": 10,
      "conditional": {
        "field": "ethics_approval",
        "value": true
      }
    },
    {
      "title": "Order Reagents/Supplies",
      "description": "Order necessary lab materials",
      "priority": 4,
      "est_hours": 5,
      "conditional": {
        "field": "lab_type",
        "value": "Wet Lab"
      }
    },
    {
      "title": "Setup Computational Environment",
      "description": "Install analysis software, setup data pipeline",
      "priority": 4,
      "est_hours": 8,
      "conditional": {
        "field": "lab_type",
        "value": ["Dry Lab", "Hybrid"]
      }
    }
  ],
  "milestones": [
    {
      "title": "Ethics Approval Obtained",
      "description": "IRB/IACUC approval received",
      "conditional": {
        "field": "ethics_approval",
        "value": true
      }
    },
    {
      "title": "Data Collection Complete",
      "description": "All experiments/measurements finished"
    },
    {
      "title": "Manuscript Submitted",
      "description": "Paper submitted to journal"
    }
  ]
}
```

**More Domain Templates:**

1. **Engineering Project Template:**
```json
{
  "name": "Engineering Project",
  "category": "engineering",
  "field_definitions": [
    {"id": "project_type", "type": "select", "options": ["Hardware", "Software", "Hybrid"]},
    {"id": "testing_required", "type": "multi-select", "options": ["Unit Testing", "Integration Testing", "Stress Testing", "Field Testing"]},
    {"id": "certifications", "type": "multi-select", "options": ["FCC", "CE", "UL", "ISO"]},
    {"id": "cad_software", "type": "select", "options": ["AutoCAD", "SolidWorks", "Fusion 360", "KiCAD"]}
  ]
}
```

2. **Computer Science Project Template:**
```json
{
  "name": "Software Development Project",
  "category": "cs",
  "field_definitions": [
    {"id": "tech_stack", "type": "multi-select", "options": ["React", "Node.js", "Python", "Go", "PostgreSQL", "MongoDB"]},
    {"id": "deployment_platform", "type": "select", "options": ["AWS", "GCP", "Azure", "Heroku", "Vercel"]},
    {"id": "repo_url", "type": "text", "help_text": "GitHub/GitLab repository URL"}
  ]
}
```

3. **Humanities Research Template:**
```json
{
  "name": "Humanities Research Project",
  "category": "humanities",
  "field_definitions": [
    {"id": "research_type", "type": "select", "options": ["Archival", "Fieldwork", "Textual Analysis", "Oral History"]},
    {"id": "primary_sources", "type": "text", "help_text": "Archives, manuscripts, interviews"},
    {"id": "languages", "type": "multi-select", "options": ["English", "French", "Spanish", "German", "Latin", "Greek", "Arabic", "Chinese"]},
    {"id": "time_period", "type": "text", "help_text": "Historical period under study"}
  ]
}
```

---

### Phase 3: AI-Enhanced Suggestions (Intelligence Layer)

**AI analyzes project context and suggests relevant fields:**

#### A. Context-Aware Field Suggestions

**Scenario: User types project title**
```
User types: "CRISPR Gene Editing for Cancer Therapy"

AI Analysis:
- Detects keywords: "CRISPR", "Gene Editing", "Cancer", "Therapy"
- Infers: Biomed project, Wet Lab, likely needs ethics approval
- Category: Biomed Research

AI Suggests:
┌────────────────────────────────────────┐
│ 🤖 Smart Suggestions for Your Project │
├────────────────────────────────────────┤
│ Based on your project title, we       │
│ recommend adding these fields:         │
│                                        │
│ ✓ Lab Type: Wet Lab (auto-detected)  │
│ ✓ Ethics Approval: Required (human)  │
│ ✓ Biosafety Level: BSL-2 (suggested) │
│ ✓ Gene Editing Protocol: CRISPR      │
│ ✓ Cell Line: [Specify]               │
│                                        │
│ [Apply All] [Customize] [Dismiss]     │
└────────────────────────────────────────┘
```

#### B. Progressive Disclosure (Show Relevant Fields Only)

**Dynamic Form Based on Selections:**
```
Step 1: User selects "Lab Type: Wet Lab"
→ Show: Equipment, Reagents, Biosafety Level

Step 2: User checks "Uses Human Subjects"
→ Show: Ethics Approval, IRB Number, Consent Forms

Step 3: User selects "Biosafety Level: BSL-3"
→ Show: Safety Training Required, PPE Checklist, Decontamination Protocol
```

**Implementation:**
```typescript
// /frontend/src/components/project/Forms/DynamicProjectForm.tsx

interface ConditionalField {
  showIf: {
    field: string;
    operator: 'equals' | 'contains' | 'not_equals';
    value: any;
  };
  fields: FieldDefinition[];
}

// Example conditional logic
const conditionalFields: ConditionalField[] = [
  {
    showIf: { field: 'lab_type', operator: 'equals', value: 'Wet Lab' },
    fields: [
      { id: 'equipment_needed', name: 'Equipment Needed', type: 'multi-select' },
      { id: 'reagents', name: 'Reagents List', type: 'text' },
      { id: 'biosafety_level', name: 'Biosafety Level', type: 'select' }
    ]
  },
  {
    showIf: { field: 'human_subjects', operator: 'equals', value: true },
    fields: [
      { id: 'irb_number', name: 'IRB Approval Number', type: 'text', required: true },
      { id: 'consent_form', name: 'Consent Form', type: 'file' }
    ]
  }
];
```

---

### Phase 4: Community Templates (User-Generated)

**Allow users to create and share templates:**

#### A. Template Marketplace
```
Browse Templates:
┌────────────────────────────────────────┐
│ 🔬 Biomed Research (12 templates)     │
│   ├─ Molecular Biology Lab            │
│   ├─ Clinical Trial Management        │
│   ├─ Bioinformatics Pipeline          │
│   └─ Neuroscience Study               │
│                                        │
│ 💻 Computer Science (18 templates)    │
│   ├─ Web App Development              │
│   ├─ Machine Learning Research        │
│   ├─ Mobile App Development           │
│   └─ Open Source Project              │
│                                        │
│ ⚙️ Engineering (8 templates)          │
│   ├─ Hardware Product Development     │
│   ├─ Civil Engineering Project        │
│   └─ Robotics Project                 │
└────────────────────────────────────────┘

Template Details:
┌────────────────────────────────────────┐
│ Molecular Biology Lab                  │
│ by Dr. Sarah Chen (Stanford)           │
│ ⭐⭐⭐⭐⭐ (147 uses)                   │
├────────────────────────────────────────┤
│ Perfect for:                           │
│ • Cloning experiments                  │
│ • Protein expression                   │
│ • Western blot analysis                │
│                                        │
│ Includes:                              │
│ ✓ 15 custom fields                    │
│ ✓ 8-stage workflow                    │
│ ✓ 12 task templates                   │
│ ✓ Protocol checklist                  │
│                                        │
│ [Preview] [Use Template] [Customize]   │
└────────────────────────────────────────┘
```

#### B. Template Creation Flow
```
Create Template from Current Project:
┌────────────────────────────────────────┐
│ Save Project as Template               │
├────────────────────────────────────────┤
│ Template Name:                         │
│ [Neuroscience fMRI Study]              │
│                                        │
│ Category: [Biomed Research ▾]          │
│                                        │
│ Description:                           │
│ [Template for fMRI brain imaging      │
│  studies with human subjects...]       │
│                                        │
│ Include:                               │
│ ☑ Custom fields (8)                   │
│ ☑ Workflow (6 statuses)               │
│ ☑ Task templates (14)                 │
│ ☐ Actual task data (exclude)          │
│ ☑ Milestones (5)                      │
│                                        │
│ Visibility:                            │
│ ◉ Public (share with community)       │
│ ○ Private (only me)                   │
│ ○ Institution (UC Berkeley only)      │
│                                        │
│ [Cancel] [Create Template]             │
└────────────────────────────────────────┘
```

---

## Comparison: Hard-Coded vs. Template System

| Aspect | Hard-Coded Fields | Template System (Recommended) |
|--------|-------------------|-------------------------------|
| **Scalability** | ❌ Need code changes for each domain | ✅ Infinite domains, zero code changes |
| **Maintenance** | ❌ High (every domain = new code) | ✅ Low (templates are data, not code) |
| **Flexibility** | ❌ Users stuck with preset fields | ✅ Users can customize or create own |
| **User Experience** | ✅ Simple (no config needed) | ✅ Simple (AI suggests) + Flexible |
| **Time to Market** | ❌ Slow (implement per domain) | ✅ Fast (templates can be added instantly) |
| **Community Growth** | ❌ No user contribution | ✅ Users can share templates |
| **AI Opportunity** | ❌ No AI involvement | ✅ AI suggests + generates templates |
| **Competitive Moat** | ⚠️ Medium (others can copy) | ✅ Strong (template marketplace + AI) |

**Example: Adding Support for New Domain**

**Hard-Coded Approach:**
```
1. Write code for "Archeology" project type
2. Add specific fields: dig_site, artifacts_found, dating_method
3. Update database migrations
4. Update frontend forms
5. Update API validation
6. Write tests
7. Deploy (2-3 weeks of dev time)
```

**Template Approach:**
```
1. User (archeologist) creates project
2. User adds custom fields: dig_site, artifacts_found, dating_method
3. User clicks "Save as Template"
4. Template is now available to all archeology users
5. Total time: 30 minutes (no code changes!)
```

---

## Implementation Roadmap

### Phase 1: Flexible Base (Month 1-2)
**Goal:** Build generic custom field system

**Tasks:**
- [ ] Backend: Custom field definitions model
- [ ] Backend: Custom field values storage (JSONB)
- [ ] Backend: API for managing custom fields
- [ ] Frontend: Dynamic form renderer
- [ ] Frontend: Field type components (text, select, multi-select, date, checkbox, number)

**Deliverables:**
- Any project can have custom fields
- Users can manually add fields

### Phase 2: Template System (Month 2-3)
**Goal:** Build template infrastructure

**Tasks:**
- [ ] Backend: Template model
- [ ] Backend: Template CRUD API
- [ ] Backend: Template instantiation (apply to project)
- [ ] Frontend: Template browser
- [ ] Frontend: Template preview
- [ ] Frontend: Template application flow

**Deliverables:**
- Users can save projects as templates
- Users can apply templates to new projects
- 5-10 official templates (biomed, CS, engineering, humanities, creative)

### Phase 3: AI Integration (Month 3-4)
**Goal:** Add intelligent suggestions

**Tasks:**
- [ ] AI: Category detection from project name/description
- [ ] AI: Template recommendation engine
- [ ] AI: Smart field suggestions
- [ ] Frontend: AI suggestion UI
- [ ] Backend: AI workflow integration

**Deliverables:**
- AI detects project category automatically
- AI suggests relevant template
- AI suggests additional fields based on context

### Phase 4: Community Templates (Month 5-6)
**Goal:** Enable template sharing

**Tasks:**
- [ ] Backend: Template marketplace
- [ ] Backend: Template ratings/reviews
- [ ] Frontend: Template search/browse
- [ ] Frontend: Template details page
- [ ] Moderation: Template approval workflow

**Deliverables:**
- Public template marketplace
- Users can publish templates
- Template discovery and ratings

---

## Example: Biomed Wet Lab vs. Dry Lab Implementation

### User Experience Flow

**Step 1: Project Creation**
```
User: Creates project "CRISPR Knockout Study"
AI: Detects category = "Biomed Research"
AI: Suggests "Biomed Research Template"
```

**Step 2: Template Application**
```
User: Clicks "Use Template"
System: Adds custom fields:
  - Lab Type: [Select]
  - Biosafety Level: [Select]
  - Ethics Approval: [Checkbox]
  - Equipment Needed: [Multi-select]
  - Reagents: [Text]
```

**Step 3: User Selects Lab Type**
```
User: Selects "Lab Type: Wet Lab"

System: Shows wet lab-specific fields:
  ✓ Equipment Needed (microscope, centrifuge, etc.)
  ✓ Reagents (PBS, DMEM, etc.)
  ✓ Biosafety Level
  ✓ Protocol Checklist

System: Hides dry lab fields:
  ✗ Computational Resources
  ✗ Software Tools
  ✗ Database Access
```

**Step 4: Conditional Task Generation**
```
System: Generates tasks based on selection:

For Wet Lab:
  - Order reagents
  - Reserve equipment
  - Complete safety training
  - Prepare protocols

For Dry Lab (if selected instead):
  - Setup computational environment
  - Install analysis software
  - Download datasets
  - Configure pipeline
```

**Step 5: Dashboard Customization**
```
Dashboard shows relevant widgets:

Wet Lab Dashboard:
  - Equipment availability calendar
  - Reagent inventory tracker
  - Protocol completion checklist
  - Safety compliance status

Dry Lab Dashboard:
  - Computational job status
  - Dataset processing progress
  - Analysis pipeline stages
  - Code repository activity
```

---

## Backend Implementation Example

### Database Schema

```sql
-- Custom field definitions (schema)
CREATE TABLE custom_field_definitions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    field_id VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL, -- text, number, select, multi-select, date, checkbox
    required BOOLEAN DEFAULT false,
    options JSONB, -- For select/multi-select
    default_value TEXT,
    help_text TEXT,
    category VARCHAR(50), -- Group related fields
    show_if JSONB, -- Conditional display rules
    created_at TIMESTAMP DEFAULT NOW()
);

-- Custom field values (data)
-- Stored in projects.custom_fields JSONB column

-- Templates
CREATE TABLE project_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    field_definitions JSONB NOT NULL,
    default_workflow JSONB,
    task_templates JSONB,
    milestones JSONB,
    is_official BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Template usage tracking
CREATE TABLE template_usage (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES project_templates(id),
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    used_at TIMESTAMP DEFAULT NOW()
);
```

### Go Models

```go
// /backend/models/customFieldModel.go

type FieldDefinition struct {
    ID           string                 `json:"id"`
    Name         string                 `json:"name"`
    Type         string                 `json:"type"` // text, number, select, multi-select, date, checkbox
    Required     bool                   `json:"required"`
    Options      []string               `json:"options,omitempty"`
    DefaultValue string                 `json:"default_value,omitempty"`
    HelpText     string                 `json:"help_text,omitempty"`
    Category     string                 `json:"category,omitempty"`
    ShowIf       *ConditionalDisplay    `json:"show_if,omitempty"`
}

type ConditionalDisplay struct {
    Field    string      `json:"field"`
    Operator string      `json:"operator"` // equals, not_equals, contains, in
    Value    interface{} `json:"value"`
}

type ProjectTemplate struct {
    ID               uint           `gorm:"primaryKey"`
    Name             string         `json:"name"`
    Description      string         `json:"description"`
    Category         string         `json:"category"`
    FieldDefinitions datatypes.JSON `json:"field_definitions"`
    DefaultWorkflow  datatypes.JSON `json:"default_workflow"`
    TaskTemplates    datatypes.JSON `json:"task_templates"`
    Milestones       datatypes.JSON `json:"milestones"`
    IsOfficial       bool           `json:"is_official"`
    CreatedBy        uint           `json:"created_by"`
    Public           bool           `json:"public"`
    UsageCount       int            `json:"usage_count"`
    RatingAvg        float64        `json:"rating_avg"`
    RatingCount      int            `json:"rating_count"`
    CreatedAt        time.Time      `json:"created_at"`
    UpdatedAt        time.Time      `json:"updated_at"`
}
```

### API Endpoints

```go
// Template Management
POST   /api/templates                    - Create template
GET    /api/templates                    - List templates (with filters)
GET    /api/templates/:id                - Get template details
PUT    /api/templates/:id                - Update template
DELETE /api/templates/:id                - Delete template
POST   /api/templates/:id/apply          - Apply template to project
POST   /api/templates/:id/rate           - Rate template

// Project Custom Fields
GET    /api/projects/:id/fields          - Get field definitions
POST   /api/projects/:id/fields          - Add custom field
PUT    /api/projects/:id/fields/:fieldId - Update field definition
DELETE /api/projects/:id/fields/:fieldId - Delete field

// AI-Powered
POST   /api/ai/detect-category           - Detect project category from title/desc
POST   /api/ai/suggest-template          - Suggest template based on project
POST   /api/ai/suggest-fields            - Suggest additional fields
```

---

## Frontend Implementation Example

### Dynamic Form Component

```typescript
// /frontend/src/components/project/Forms/DynamicFieldRenderer.tsx

interface DynamicFieldRendererProps {
  fieldDef: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  allValues: Record<string, any>; // For conditional display
}

const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  fieldDef,
  value,
  onChange,
  allValues
}) => {
  // Check if field should be displayed based on conditions
  const shouldDisplay = useMemo(() => {
    if (!fieldDef.showIf) return true;

    const { field, operator, value: conditionValue } = fieldDef.showIf;
    const actualValue = allValues[field];

    switch (operator) {
      case 'equals':
        return actualValue === conditionValue;
      case 'not_equals':
        return actualValue !== conditionValue;
      case 'contains':
        return Array.isArray(actualValue) && actualValue.includes(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(actualValue);
      default:
        return true;
    }
  }, [fieldDef.showIf, allValues]);

  if (!shouldDisplay) return null;

  // Render based on field type
  switch (fieldDef.type) {
    case 'text':
      return (
        <TextField
          label={fieldDef.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={fieldDef.required}
          helperText={fieldDef.helpText}
          fullWidth
        />
      );

    case 'select':
      return (
        <FormControl fullWidth required={fieldDef.required}>
          <InputLabel>{fieldDef.name}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {fieldDef.options?.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {fieldDef.helpText && <FormHelperText>{fieldDef.helpText}</FormHelperText>}
        </FormControl>
      );

    case 'multi-select':
      return (
        <FormControl fullWidth required={fieldDef.required}>
          <InputLabel>{fieldDef.name}</InputLabel>
          <Select
            multiple
            value={value || []}
            onChange={(e) => onChange(e.target.value)}
            renderValue={(selected) => (selected as string[]).join(', ')}
          >
            {fieldDef.options?.map(option => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={value?.includes(option)} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
            />
          }
          label={fieldDef.name}
        />
      );

    case 'date':
      return (
        <TextField
          type="date"
          label={fieldDef.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={fieldDef.required}
          helperText={fieldDef.helpText}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      );

    case 'number':
      return (
        <TextField
          type="number"
          label={fieldDef.name}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          required={fieldDef.required}
          helperText={fieldDef.helpText}
          fullWidth
        />
      );

    default:
      return null;
  }
};
```

### AI Template Suggestion Component

```typescript
// /frontend/src/components/project/Forms/AITemplateSuggestion.tsx

const AITemplateSuggestion: React.FC<{
  projectTitle: string;
  projectDescription: string;
  onApplyTemplate: (templateId: number) => void;
}> = ({ projectTitle, projectDescription, onApplyTemplate }) => {
  const [suggestion, setSuggestion] = useState<TemplateSuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const detectAndSuggest = async () => {
      if (!projectTitle) return;

      setLoading(true);
      try {
        // 1. Detect category
        const categoryResponse = await fetch('/api/ai/detect-category', {
          method: 'POST',
          body: JSON.stringify({ title: projectTitle, description: projectDescription })
        });
        const { category, confidence } = await categoryResponse.json();

        // 2. Get template suggestions
        const templateResponse = await fetch('/api/ai/suggest-template', {
          method: 'POST',
          body: JSON.stringify({ category, title: projectTitle })
        });
        const templates = await templateResponse.json();

        setSuggestion({
          category,
          confidence,
          templates: templates.slice(0, 3) // Top 3
        });
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timer = setTimeout(detectAndSuggest, 1000);
    return () => clearTimeout(timer);
  }, [projectTitle, projectDescription]);

  if (loading) return <Skeleton variant="rectangular" height={200} />;
  if (!suggestion) return null;

  return (
    <Card sx={{ mt: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SmartToyIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            AI-Detected Category: {suggestion.category}
          </Typography>
          <Chip
            label={`${(suggestion.confidence * 100).toFixed(0)}% confident`}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>

        <Typography variant="body2" sx={{ mb: 2 }}>
          We recommend these templates for your project:
        </Typography>

        <Stack spacing={2}>
          {suggestion.templates.map(template => (
            <Card key={template.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">{template.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={`${template.usageCount} uses`} size="small" sx={{ mr: 1 }} />
                  <Chip label={`⭐ ${template.ratingAvg.toFixed(1)}`} size="small" />
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => onApplyTemplate(template.id)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Button
          variant="text"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => setSuggestion(null)}
        >
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
};
```

---

## AI Prompt Examples

### Category Detection Prompt
```
You are a project categorization assistant. Analyze the project title and description, then determine the most appropriate category.

Categories:
- biomed: Biological, medical, life sciences research
- engineering: Hardware, software, or systems engineering
- cs: Computer science, software development
- humanities: History, literature, philosophy, languages
- social_science: Psychology, sociology, economics
- creative: Art, design, media production
- education: Teaching, curriculum development
- business: Marketing, finance, operations
- general: Other/uncategorized

Project Title: "{title}"
Project Description: "{description}"

Respond in JSON:
{
  "category": "biomed",
  "confidence": 0.95,
  "reasoning": "Contains keywords like 'CRISPR', 'gene editing', 'therapy' indicating biomedical research",
  "alternative_categories": ["medical"]
}
```

### Field Suggestion Prompt
```
You are a project setup assistant. Based on the project category and details, suggest relevant custom fields that would be useful for tracking this project.

Project Category: {category}
Project Title: {title}
Project Description: {description}

Suggest 5-10 custom fields that would be most useful. For each field, specify:
- Field ID (snake_case)
- Field name (human-readable)
- Field type (text, select, multi-select, checkbox, date, number)
- Options (if select/multi-select)
- Help text
- Whether it's required

Respond in JSON array format.
```

---

## Success Metrics

### User Adoption
- % of projects using custom fields: Target 60%
- % of projects using templates: Target 40%
- % of projects with AI-detected category: Target 80%

### Template Ecosystem
- Number of official templates: Target 20 (5 per major category)
- Number of community templates: Target 100 in Year 1
- Template reuse rate: Target 3x (avg template used 3+ times)

### Domain Coverage
- Number of domains supported via templates: Target 15+
- User satisfaction with domain fit: Target 80%+

---

## Conclusion

### Why This Approach Wins

**1. Scalability**
- ✅ Support infinite domains without code changes
- ✅ Community creates templates faster than you could code them
- ✅ Template library grows organically

**2. Competitive Advantage**
- ✅ No other PM tool has AI-powered template suggestions
- ✅ Template marketplace = network effects (more users = more templates = more value)
- ✅ Domain-specific but not hard-coded = flexible AND intelligent

**3. User Experience**
- ✅ Smart defaults (AI suggests templates)
- ✅ Full flexibility (users can customize or create own)
- ✅ Progressive disclosure (only show relevant fields)
- ✅ Zero friction for common cases

**4. Business Model**
- ✅ Freemium: Basic templates free, premium templates paid
- ✅ Enterprise: Custom template creation service
- ✅ Marketplace: Template creators can monetize

**5. Strategic Moat**
- ✅ Template library = data moat (hard to replicate)
- ✅ AI integration = technical moat (requires AI infra)
- ✅ Community = social moat (users invested in ecosystem)

### Avoid These Traps

**❌ Hard-coding domain fields:**
- Results in: Maintenance nightmare, can't scale, slow to add domains
- Instead: Flexible custom fields + templates

**❌ Making everything mandatory:**
- Results in: Overwhelming new users, high friction
- Instead: Progressive disclosure, optional fields

**❌ No defaults (fully manual):**
- Results in: Blank slate problem, users don't know what to add
- Instead: AI suggests templates, smart defaults

**❌ Over-engineering early:**
- Results in: Slow to ship, complex UI
- Instead: Start simple (Phase 1), add AI later (Phase 2-3)

### Final Recommendation

**Phase 1 (MVP):** Custom fields system + 5 official templates
**Phase 2 (Growth):** AI suggestions + template browser
**Phase 3 (Scale):** Community templates + marketplace

**Timeline:** 4-6 months to full template system
**Priority:** HIGH (differentiator for education/research markets)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Decision:** Hybrid AI-Powered Template System (NOT hard-coded)
