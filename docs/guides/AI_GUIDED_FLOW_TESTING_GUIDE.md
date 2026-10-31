# AI-Guided Project Creation - Testing Guide

## Overview

This guide helps you test the new AI-guided course project creation flow that was implemented as a prototype. The new flow transforms the project creation experience from "I don't know what to build" to a complete project plan through progressive AI guidance.

---

## What Was Implemented

### Complete Stack

**Backend (Go)**:
- ✅ `aiPrompts.go` - 3 sophisticated Chinese prompt templates
- ✅ 3 new API endpoints for progressive AI guidance
- ✅ Routes configured in `projectRouter.go`

**Frontend (React/TypeScript)**:
- ✅ `CourseRequirementsInput.tsx` - Course info and requirements input
- ✅ `AITopicSuggestions.tsx` - Display 3-5 AI-suggested topics with cards
- ✅ `TopicElaboration.tsx` - Detailed project elaboration (collapsible sections)
- ✅ `AIProjectDetailsGenerator.tsx` - Name, description, and tags generation
- ✅ `CourseProjectFlowV2.tsx` - Main orchestrator integrating all steps

**Integration**:
- ✅ Integrated into `OnboardingWizard.tsx` - Course scenario uses new flow by default

---

## New Flow vs. Old Flow

### Old Flow (CourseProjectFlowWithAI)
```
1. User fills basic info (already has project idea)
2. User fills course details
3. User fills timeline
4. User fills team
5. [Optional] AI generates task board
6. Preview and create
```

**Problem**: User must already know what project to build.

### New Flow (CourseProjectFlowV2) ✨
```
1. Requirements → User provides course requirements/syllabus
   ↓ AI analyzes
2. AI Topics → AI suggests 3-5 project topics
   ↓ User selects
3. Elaboration → AI elaborates with features, architecture, milestones
   ↓ User reviews
4. Details → AI generates name options, description, tags
   ↓ User finalizes
5. AI Plan → AI generates complete project board
   ↓ Auto-generated
6. Timeline → User sets dates
   ↓
7. Team → User adds team members
   ↓
8. Preview → Final review and create
```

**Benefits**: Starts from constraints, AI guides every step, progressive refinement.

---

## Prerequisites

### 1. AI Provider Setup

Set at least one AI API key:

```bash
# Recommended: Groq (fastest and cheapest)
export GROQ_API_KEY="gsk_xxxxxxxxxxxxx"

# Or OpenAI
export OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# Or Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxx"
```

The system automatically uses the first available provider: Groq → OpenAI → Claude.

### 2. Start Services

```bash
# Terminal 1: Backend
cd backend
go run main.go

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3. Access the Application

Navigate to: `http://localhost:5173`

---

## Testing Checklist

### Test Case 1: Complete Happy Path

**Objective**: Test the entire flow from start to finish.

**Steps**:

1. **Navigate to Create Project**
   - Click "Create a Project" button
   - Or go to `http://localhost:5173/create-project`

2. **Select Course Scenario**
   - Click on "Course Group Project" card
   - Verify it goes to requirements input (not basic info)

3. **Step 1: Course Requirements** ✅
   - Fill in course information:
     - Course Name: "Web Development"
     - School: "UC San Diego"
     - Course Code: "CSE 110" (optional)
   - Paste requirements (test input):
     ```
     Build a full-stack web application for a real-world problem.
     Requirements:
     - Must include user authentication
     - Database integration
     - RESTful API
     - Responsive frontend
     - 10-week timeline
     - Work in teams of 4-5 students
     - Final presentation and demo required
     ```
   - Set constraints:
     - Team Size: 4
     - Duration: 10 weeks
     - Required Tech: Add "React", "Node.js", "MongoDB"
   - Click "Continue with AI Suggestions"
   - **Expected**: Loading screen → "AI is analyzing your course..."

4. **Step 2: AI Topic Suggestions** ✅
   - Wait for AI to generate topics (10-30 seconds)
   - **Expected**: 3-5 project topic cards displayed
   - Verify each card shows:
     - Project name and tagline
     - Description
     - Difficulty badge (beginner/intermediate/advanced)
     - Estimated weeks
     - Suggested tech stack (chips/tags)
     - Key features (3+ bullet points)
     - Alignment reason (why it fits the course)
   - Verify "Define My Own Project" card is present
   - Click on one topic card to select it
   - **Expected**: Card gets blue border and checkmark
   - Click "Continue with Selected Topic"
   - **Expected**: Loading screen → "AI is elaborating..."

5. **Step 3: Topic Elaboration** ✅
   - Wait for elaboration (10-30 seconds)
   - **Expected**: Detailed elaboration with collapsible sections
   - Verify all sections are present:
     - 📖 Project Background
     - 🎯 Project Objectives
     - ⭐ Core Features (MVP)
     - ✨ Enhanced Features (Optional)
     - 🏗️ Technical Architecture
     - 🎯 Project Milestones
     - ✅ Success Criteria
     - ⚠️ Challenges & Risk Mitigation
   - Expand and collapse sections
   - Verify content quality:
     - Features have descriptions and implementation notes
     - Architecture includes frontend, backend, database with rationale
     - Milestones have goals and deliverables
   - Click "Looks Good, Continue"
   - **Expected**: Loading screen → "AI is crafting details..."

6. **Step 4: Project Details** ✅
   - Wait for details generation (5-15 seconds)
   - **Expected**: 3 name options displayed
   - Verify each name option shows:
     - Project name
     - Rationale for naming
   - Click on different name options
   - Verify selection highlighting works
   - OR select "Use my own name" and enter custom name
   - Verify description is pre-filled
   - Edit description if needed
   - Verify tags are pre-filled
   - Add/remove tags
   - Check preview card updates in real-time
   - Click "Generate Full Project Plan"
   - **Expected**: Loading screen → "Generating complete project plan..."

7. **Step 5: AI Plan Generation** ✅
   - Wait for plan generation (15-45 seconds)
   - **Expected**: Automatically proceeds to timeline step
   - Note: Plan is generated in background

8. **Step 6: Timeline** ✅
   - Verify duration is pre-filled from topic suggestion
   - Set start date
   - Set deadline (optional)
   - Adjust duration if needed
   - Click "Next"

9. **Step 7: Team** ✅
   - Add team members (registered users or placeholders)
   - Assign roles
   - Click "Next"

10. **Step 8: Preview** ✅
    - Verify all information is displayed:
      - Project name
      - Description
      - Tags
      - Course information (name, school, code)
      - Timeline
      - Team members
    - Verify AI board confirmation box is shown:
      - Should display: "AI-Generated Project Plan Ready"
      - Shows counts: X phases, Y tasks, Z milestones
    - Click "✨ Create Project"
    - **Expected**: Success toast, redirect to project page

**Success Criteria**:
- ✅ Entire flow completes without errors
- ✅ AI generates reasonable, high-quality suggestions
- ✅ All data is saved correctly
- ✅ Project is created with AI-generated board

---

### Test Case 2: Skip AI and Create Manually

**Objective**: Test the "Define My Own Project" option.

**Steps**:

1. Follow Test Case 1 steps 1-3
2. At AI Topic Suggestions step:
   - Click on "Define My Own Project" card
   - Click "Skip AI & Create Manually"
3. **Expected**: Jump directly to Timeline step
4. Complete Timeline, Team, Preview steps normally
5. **Expected**: Project created without AI board

**Success Criteria**:
- ✅ Can skip all AI steps
- ✅ Project creation still works
- ✅ No AI board in metadata

---

### Test Case 3: Navigation - Back Buttons

**Objective**: Verify all back buttons work correctly.

**Steps**:

1. Start flow and reach "AI Topics" step
2. Click "← Back to Requirements"
3. **Expected**: Returns to requirements input with data preserved
4. Continue to "Elaboration" step
5. Click "← Back to Topics"
6. **Expected**: Returns to topic suggestions
7. Continue to "Details" step
8. Click "← Back to Elaboration"
9. **Expected**: Returns to elaboration
10. Continue to "Timeline" step
11. Click "← Back"
12. **Expected**: Returns to details
13. Test back buttons for Team and Preview steps

**Success Criteria**:
- ✅ All back buttons work
- ✅ Data is preserved when going back
- ✅ No errors when navigating backwards

---

### Test Case 4: Error Handling

**Objective**: Test error scenarios.

**Steps**:

#### 4.1 No AI API Key
1. Stop backend
2. Unset all AI API keys:
   ```bash
   unset GROQ_API_KEY
   unset OPENAI_API_KEY
   unset ANTHROPIC_API_KEY
   ```
3. Restart backend
4. Try to use AI Topics step
5. **Expected**: Error message "AI service not available"
6. Verify "Try Again" and "Go Back" buttons work

#### 4.2 Invalid Course Requirements
1. At Requirements step, enter minimal/invalid data
2. Try to continue with empty fields
3. **Expected**: Continue button is disabled
4. **Expected**: Required fields are indicated

#### 4.3 Network Issues
1. Disconnect internet or block API calls
2. Try AI generation
3. **Expected**: Error toast and error screen
4. **Expected**: Can retry or go back

**Success Criteria**:
- ✅ Errors are handled gracefully
- ✅ User can recover from errors
- ✅ No crashes or white screens

---

### Test Case 5: Validation and Edge Cases

**Objective**: Test input validation and edge cases.

**Steps**:

#### 5.1 Very Long Requirements
- Paste a 5000+ word course syllabus
- **Expected**: AI processes it (may be slow)
- **Expected**: No character limit errors

#### 5.2 Special Characters
- Use Chinese characters, emojis, special symbols
- **Expected**: All inputs handle special characters

#### 5.3 Extreme Constraints
- Set team size to 1
- Set duration to 1 week
- **Expected**: AI adjusts suggestions accordingly

#### 5.4 No Required Tech
- Leave required tech empty
- **Expected**: AI suggests appropriate tech stacks

**Success Criteria**:
- ✅ All edge cases handled
- ✅ No validation errors for reasonable inputs
- ✅ AI adapts to constraints

---

### Test Case 6: UI/UX Verification

**Objective**: Verify user experience quality.

**Checklist**:

1. **Loading States** ✅
   - [ ] All AI steps show loading animations
   - [ ] Loading messages are clear and informative
   - [ ] Progress indicators match current operation

2. **Visual Design** ✅
   - [ ] Topic cards are visually appealing
   - [ ] Selected states are clear (blue border, checkmark)
   - [ ] Colors and gradients are consistent
   - [ ] Icons are meaningful and appropriate

3. **Information Hierarchy** ✅
   - [ ] Most important info is prominent
   - [ ] Collapsible sections work smoothly
   - [ ] Text is readable (font size, contrast)

4. **Responsive Design** ✅
   - [ ] Works on laptop/desktop (1920x1080, 1366x768)
   - [ ] Grid layouts adapt appropriately
   - [ ] No horizontal scrolling (except intentional)

5. **Animations** ✅
   - [ ] Transitions are smooth (not too fast/slow)
   - [ ] Expand/collapse animations work
   - [ ] Page transitions don't cause flickering

6. **Accessibility** ✅
   - [ ] Can navigate with keyboard (Tab key)
   - [ ] Focus indicators are visible
   - [ ] Buttons have clear hover states

---

## Sample Test Data

### Course Requirement Examples

#### Example 1: Web Development Course
```
Course: Advanced Web Development
School: Stanford University
Code: CS 142

Build a full-stack social networking application similar to Twitter or Instagram.

Requirements:
- User authentication and profiles
- Real-time updates (posts, likes, comments)
- Image upload and storage
- Responsive design
- RESTful API
- Database with proper schema design
- 12-week timeline
- Teams of 4-5 students
- Agile methodology with weekly sprints
- Final demo day presentation

Grading:
- Functionality: 40%
- Code quality: 20%
- UI/UX: 20%
- Presentation: 20%
```

#### Example 2: Machine Learning Course
```
Course: Applied Machine Learning
School: MIT
Code: 6.867

Develop an ML application that solves a real-world problem.

Requirements:
- Use at least 2 ML algorithms
- Real dataset (minimum 1000 samples)
- Data preprocessing pipeline
- Model evaluation and comparison
- Interactive demo/web interface
- 10-week timeline
- Teams of 3-4 students
- Must include: data analysis, feature engineering, model training, deployment

Deliverables:
- Proposal (Week 2)
- Midterm report (Week 5)
- Final demo (Week 10)
- Technical paper (Week 10)
```

#### Example 3: Mobile App Development
```
Course: Mobile Application Development
School: UC Berkeley
Code: CS 194

Create a cross-platform mobile app for iOS and Android.

Requirements:
- React Native or Flutter
- At least 5 major features
- Backend API integration
- Local storage
- Push notifications
- User onboarding flow
- 8-week timeline
- Teams of 4 students
- Weekly progress demos

Technical Requirements:
- Clean code with comments
- Unit tests (>70% coverage)
- CI/CD pipeline
- App store submission ready
```

---

## Troubleshooting

### Problem: "AI service not available"

**Cause**: No AI API key configured.

**Solution**:
```bash
# Set one of these
export GROQ_API_KEY="your_key"
export OPENAI_API_KEY="your_key"
export ANTHROPIC_API_KEY="your_key"

# Restart backend
cd backend && go run main.go
```

### Problem: AI generation takes too long (>60 seconds)

**Causes**:
- Using slow provider (Claude/OpenAI instead of Groq)
- Network latency
- Rate limiting

**Solutions**:
- Switch to Groq (fastest)
- Check network connectivity
- Wait a bit longer (may be processing complex request)

### Problem: AI returns invalid JSON

**Cause**: AI response not properly formatted.

**Solution**:
- Check backend logs for actual AI response
- May need to improve prompt or add JSON validation
- Retry the request

### Problem: Topics are not relevant to course

**Cause**: Requirements text is too vague or poorly structured.

**Solution**:
- Provide more detailed requirements
- Include specific course objectives
- Mention required technologies explicitly

### Problem: Frontend shows "undefined" or missing data

**Cause**: API response structure mismatch.

**Solution**:
- Check browser console for errors
- Verify backend response format matches frontend interface
- Add null checks in frontend code

---

## Performance Benchmarks

Expected response times (with Groq API):

| Step | Expected Time | Acceptable Range |
|------|---------------|------------------|
| Topic Suggestions | 10-15s | 5-30s |
| Topic Elaboration | 15-20s | 10-40s |
| Project Details | 5-10s | 3-20s |
| Full Plan Generation | 20-30s | 15-60s |

If times exceed acceptable range consistently:
1. Check AI provider (Groq is fastest)
2. Check network latency
3. Verify API key is valid
4. Check for rate limiting

---

## Known Limitations

1. **Single Scenario**: Only Course Project has the new flow
   - Research, Product, Personal still use old flow
   - Will be extended later

2. **No Iterative Refinement**: Can't regenerate parts
   - If unhappy with topics, must go back to requirements
   - Cannot ask AI to refine specific sections

3. **No Real-Time Editing**: Must go through steps sequentially
   - Cannot edit earlier steps after proceeding
   - Back button works, but may lose unsaved changes

4. **English UI with Chinese AI**: UI is in English, AI responses in Chinese
   - May update to match user locale later

5. **No Board Preview**: Don't see generated board before creating
   - Only see phase/task count in preview
   - Full board visible after project creation

---

## Next Steps After Testing

### If Testing Succeeds ✅

1. **Extend to Other Scenarios**:
   - Create `ResearchProjectFlowV2.tsx`
   - Create `ProductProjectFlowV2.tsx`
   - Create `PersonalProjectFlowV2.tsx`

2. **Add Iterative Refinement**:
   - "Regenerate" button at each AI step
   - Edit and re-generate specific sections

3. **Board Preview**:
   - Show full generated board in preview step
   - Allow editing tasks/phases before creation

4. **User Feedback Collection**:
   - Add rating system for AI suggestions
   - Collect analytics on step completion rates

5. **Performance Optimization**:
   - Cache AI responses
   - Parallel API calls where possible
   - Reduce token usage in prompts

### If Issues Found ❌

1. Document all issues in testing log
2. Prioritize critical bugs vs. enhancements
3. Fix critical bugs first (crashes, data loss)
4. Iterate on UX improvements
5. Re-test after fixes

---

## Testing Log Template

Copy this for your testing session:

```
Date: [YYYY-MM-DD]
Tester: [Your Name]
Environment: [Development/Staging]
AI Provider: [Groq/OpenAI/Claude]

=== Test Case 1: Complete Happy Path ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
-
Notes:
-

=== Test Case 2: Skip AI ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
Notes:
-

=== Test Case 3: Navigation ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
Notes:
-

=== Test Case 4: Error Handling ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
Notes:
-

=== Test Case 5: Validation ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
Notes:
-

=== Test Case 6: UI/UX ===
Status: [ ] Pass [ ] Fail [ ] Partial
Issues:
-
Notes:
-

=== Overall Assessment ===
Ready for Production: [ ] Yes [ ] No [ ] Needs Minor Fixes
Critical Issues: [Number]
Enhancement Ideas:
-
-

Next Actions:
1.
2.
3.
```

---

## Success Metrics

The prototype is considered successful if:

✅ **Functional**:
- 90%+ completion rate for happy path test
- All error scenarios handled gracefully
- Data persists correctly throughout flow

✅ **Quality**:
- AI suggestions are relevant and useful
- Response times are acceptable (<60s per step)
- No crashes or data loss

✅ **UX**:
- Users can complete flow without confusion
- Loading states are clear
- Navigation is intuitive

✅ **Technical**:
- Backend endpoints return proper JSON
- Frontend handles all API responses
- No console errors in browser

---

**Happy Testing!** 🚀

Report issues or feedback in the testing log above.
