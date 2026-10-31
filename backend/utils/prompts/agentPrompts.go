package prompts

// ProjectIdeaPrompt is a template for generating project ideas
const ProjectIdeaPrompt = `You are a project idea generator helping users find projects that match their interests, skills, and goals.

TASK: Generate 3-5 unique project ideas based on the following information:

Skills: %s
Interests: %s
Fun & Interesting Things (including URLs and images that will be automatically analyzed): %s
Additional Context: %s

Preferred Difficulty Level: %s
Estimated Time to Complete: %s

INSTRUCTIONS:
1. Create diverse projects that directly relate to the user's skills, interests, and goals
2. Projects can be coding-related OR non-coding (hobby development, skill learning, creative pursuits, etc.)
3. If the preferred difficulty level is not "Any", prioritize projects at that level
4. If the estimated time is not "Any", suggest projects that can be completed within that timeframe
5. Incorporate insights from any URLs or images provided in the Fun & Interesting section
6. Focus on practical, well-scoped projects with clear goals and outcomes
7. IMPORTANT: Ensure each project uses a DIFFERENT set of technologies - avoid suggesting the same technologies across multiple projects
8. For technology-based projects, suggest a mix of frontend, backend, database, and other relevant tools that complement each other

For each project idea, include EXACTLY these seven elements:
1. Title - A concise name for the project
2. Description - A brief explanation of the project (2-3 sentences)
3. Difficulty - MUST be exactly one of these three options: "Beginner", "Intermediate", or "Advanced"
4. EstimatedTime - How long it would take to complete (e.g., "1-2 weeks", "3-4 weeks", etc.)
5. KeyTechnologies - An array of 3-5 technologies, tools, or materials needed (MUST BE DIVERSE ACROSS PROJECTS)
6. KeyFeatures - An array of 3-5 main features or components of the project
7. LearningOutcomes - An array of 3-5 skills or knowledge the user will gain

RESPONSE FORMAT:
Your response MUST be a valid JSON object with the exact structure shown below. Do not include any text before or after the JSON.

{
  "projectIdeas": [
    {
      "title": "Project Title",
      "description": "Brief description of the project.",
      "difficulty": "Beginner",
      "estimatedTime": "1-2 weeks",
      "keyTechnologies": ["React", "Node.js", "MongoDB"],
      "keyFeatures": ["User authentication", "Real-time updates", "Responsive design"],
      "learningOutcomes": ["Frontend development", "Database design", "API integration"]
    },
    {
      "title": "Non-Coding Project Example",
      "description": "Brief description of a non-coding project.",
      "difficulty": "Intermediate",
      "estimatedTime": "3-4 weeks",
      "keyTechnologies": ["Digital camera", "Editing software", "Lighting equipment"],
      "keyFeatures": ["Portrait collection", "Post-processing techniques", "Online portfolio"],
      "learningOutcomes": ["Composition skills", "Lighting techniques", "Visual storytelling"]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. The field name MUST be "projectIdeas" (CamelCase, plural) - not "projects", "ideas", or "project_ideas"
2. Each project MUST have all seven required fields with correct naming
3. The "difficulty" field MUST be exactly "Beginner", "Intermediate", or "Advanced"
4. All array fields MUST be arrays, even if there's only one item
5. All strings must be properly escaped if they contain quotes
6. The response MUST be a valid JSON that can be parsed with a standard JSON parser
7. Consider both coding AND non-coding projects based on the user's interests and goals
8. IMPORTANT: Make sure the keyTechnologies between different project ideas are substantially different - don't suggest the same tech stack for multiple projects
9. For software projects, if suggesting multiple web projects, use different technology stacks (e.g., MERN, LAMP, Python/Django, Vue/Laravel, etc.)

DO NOT include any explanations, notes, or text outside of the JSON structure.
`

// BasicRoadmapPrompt is the template for generating project roadmap steps without resources
const BasicRoadmapPrompt = `
Generate a detailed roadmap for this project idea: %s

Project description: %s

The roadmap should include 5-7 logical steps to complete the project. Focus only on the steps themselves, not the resources.

Each step should include:
1. A clear title describing the step
2. A detailed description of what needs to be accomplished in this step

Format the response as a JSON object with a "roadmap" object containing an array of "steps".
Each step should have the following structure:
{
  "title": "Step Title",
  "description": "Detailed step description"
}

Do not include any resources or learning materials in this response.
`

// RoadmapResourcesPrompt is the template for generating resources for roadmap steps
const RoadmapResourcesPrompt = `
Generate learning resources for the following roadmap steps for this project: %s

Project description: %s

Roadmap steps:
%s

For each step in the roadmap, provide 2-3 high-quality learning resources that would help someone complete that step.
Each resource should be relevant, accessible, and specific to the technologies or skills needed for that step.

Format the response as a JSON object with a "stepResources" array.
Each item in the array should have the following structure:
{
  "stepTitle": "The exact title of the step from the roadmap",
  "resources": [
    {
      "title": "Resource Title",
      "url": "https://example.com/resource",
      "type": "Article|Video|Course|Documentation"
    }
  ]
}

URL VALIDATION REQUIREMENTS:
- CRITICALLY IMPORTANT: Each URL must be valid, accessible, and directly related to the step
- For each URL, mentally verify it would be a working link - do not include uncertain URLs
- For documentation links, always link to specific sub-pages relevant to the topic, not just home pages
- Double-check all YouTube URLs to ensure they follow the correct format (youtube.com/watch?v=VALID_ID)
- If you're unsure about a specific URL, provide an alternative from a well-known platform
- For each resource, provide enough context in the title that users could find it again if the URL becomes invalid
- NEVER include placeholder, example, or hypothetical URLs like "example.com" or "somesite.org"
- Prefer URLs from established platforms like GitHub, MDN, YouTube, W3Schools, official documentation sites

If you suspect a URL might be outdated or inaccessible, provide an alternative resource as a backup.
`

// ProjectRoadmapPrompt is a template for generating a project roadmap
const ProjectRoadmapPrompt = `Generate a detailed roadmap for implementing the project described below:

Project Name: %s
Project Description: %s
Difficulty Level: %s
Key Features: %s

Your roadmap should break down the project into 5-8 logical steps. Each step should include:
- A clear title describing the step
- A detailed description of what to accomplish in this step
- **An estimated time to complete this step** (be realistic - hours, days, or weeks)
- 2-3 learning resources including at least one video tutorial when possible

Format your response as a valid JSON object with EXACTLY this structure:
{
  "roadmap": {
    "steps": [
      {
        "title": "Step 1: Project Setup",
        "description": "Detailed explanation of what to do in this step",
        "timeEstimate": "2-3 days",
        "resources": [
          {
            "title": "Video Tutorial: How to Set Up the Project",
            "url": "https://www.youtube.com/watch?v=example",
            "type": "Video"
          },
          {
            "title": "Official Documentation Guide",
            "url": "https://example.com/docs",
            "type": "Documentation"
          },
          {
            "title": "Step-by-Step Written Tutorial",
            "url": "https://example.com/tutorial",
            "type": "Tutorial"
          }
        ]
      }
    ]
  }
}

RESOURCES REQUIREMENTS:
- MANDATORY: Include at least one video tutorial (YouTube, Vimeo, etc.) for each step if available 
- MANDATORY: Only include links to real, accessible web pages - VERIFY each URL would work
- NEVER include URLs that return 404 errors or placeholder URLs
- Prefer tutorials from major platforms like YouTube, freeCodeCamp, Pluralsight, Udemy, etc.
- Include a mix of video and written tutorials for different learning styles
- Always include official documentation for technologies when available
- For each step, provide resources that cover ALL aspects of that specific step
- Select recently updated resources (within last 2-3 years) when possible

LINK VALIDATION REQUIREMENTS:
- CRITICALLY IMPORTANT: Every URL must be carefully validated to ensure it's a legitimate, working resource
- DO NOT include any made-up or placeholder URLs
- All YouTube links must follow the format: https://www.youtube.com/watch?v=VALID_ID 
- All documentation links should point to specific, relevant pages (not just homepage)
- Mentally check each URL you provide - if you're uncertain about a URL's validity, find an alternative
- For official documentation, use the current version URL structure
- If you're providing a GitHub repo, ensure it's an active, maintained project with recent commits
- For any resource that seems questionable or might be outdated, provide an alternative resource
- Add a descriptive title for each resource that would help users find the content even if the URL changes

URL DOUBLE-CHECK PROCEDURE:
1. After listing all resources, review each URL for accuracy and completeness
2. For any URL you're not 100% confident about, provide an alternative source
3. For YouTube videos, the URL must include a video ID (e.g., youtube.com/watch?v=abc123)
4. For tutorials, prefer resources from well-established platforms you know exist
5. For any URL that isn't from a well-known site (YouTube, GitHub, official docs), double-check its likely validity

IMPORTANT FORMATTING INSTRUCTIONS:
1. Return ONLY the JSON object without any explanation or additional text
2. Ensure all JSON is properly formatted with correct quotes, commas, and brackets
3. Each step MUST include a timeEstimate field with a realistic time range
4. Each step MUST have 2-3 resources WITH AT LEAST ONE VIDEO tutorial
5. Make sure all URLs actually point to real, accessible resources
6. Include the step number in each title (e.g., "Step 1: Project Setup")
7. Use specific, descriptive titles for steps - NO placeholders

The roadmap should cover the complete journey from setup to completion, including:
- Project setup and initial configuration
- Core feature implementation steps
- Testing and debugging
- Final deployment or completion steps

REMEMBER: Your response MUST be valid, parseable JSON and MUST follow the structure above EXACTLY.
`

// EnhancedRoadmapPrompt is a template for generating an enhanced project roadmap with curriculum alignment and checklist
const EnhancedRoadmapPrompt = `Generate a comprehensive roadmap, curriculum alignment, and checklist for the project described below:

Project Name: %s
Project Description: %s
Difficulty Level: %s
Key Features: %s
Project Type: %s

YOUR TASK HAS THREE PARTS:

PART 1: ROADMAP
Create a detailed roadmap with 5-8 logical steps. Each step should include:
- Clear descriptive title
- Detailed explanation
- Estimated time to complete
- 2-3 learning resources (including videos when possible)

PART 2: CURRICULUM ALIGNMENT
Analyze how this project aligns with academic curriculum and learning paths:
- Identify 3-5 main topics from curriculum that this project covers
- Categorize the project into broader educational categories
- List 3-5 specific skills that will be developed through this project

PART 3: PROJECT CHECKLIST
Create a comprehensive checklist of 10-15 specific items that must be completed for the project:
- Include requirements, setup steps, and testing/validation
- Categorize each item (e.g., "Requirements", "Setup", "Testing")
- Assign priority level to each item ("High", "Medium", "Low")

FORMAT YOUR RESPONSE AS A VALID JSON OBJECT WITH THIS EXACT STRUCTURE:
{
  "roadmap": {
    "steps": [
      {
        "title": "Step 1: Project Setup",
        "description": "Detailed description of setup process",
        "timeEstimate": "2-3 days",
        "resources": [
          {
            "title": "Setup Tutorial Video",
            "url": "https://example.com/tutorial",
            "type": "Video"
          },
          {
            "title": "Official Documentation",
            "url": "https://example.com/docs",
            "type": "Documentation"
          }
        ]
      }
    ]
  },
  "curriculumAlignment": {
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "categories": [
      {
        "name": "Category Name",
        "subcategories": ["Subcategory 1", "Subcategory 2"]
      }
    ],
    "skills": [
      {
        "name": "Skill Name",
        "description": "Brief description of this skill",
        "level": "Intermediate"
      }
    ]
  },
  "checklist": {
    "items": [
      {
        "description": "Item description",
        "category": "Requirements",
        "priority": "High"
      }
    ]
  }
}

RESOURCE URL VALIDATION - CRITICALLY IMPORTANT:
- Carefully verify every URL is valid, current, and accessible
- Never include placeholder URLs or questionable links
- For documentation, use specific section URLs, not just homepages
- YouTube links must include valid video IDs after "watch?v="
- GitHub links should point to specific repositories with recent activity
- For each URL you're uncertain about, provide an alternative resource option
- Double-check the format and structure of each URL to ensure it follows proper conventions
- If you're unsure about a specific URL's validity, use an alternative from a major platform
- Ensure each resource title is descriptive enough that users could find it again if the URL changes

IMPORTANT FORMATTING INSTRUCTIONS:
1. Return ONLY the JSON object without any explanation or additional text
2. Ensure all JSON is properly formatted with correct quotes, commas, and brackets
3. Each step MUST include a timeEstimate field
4. Categories in the checklist must be one of: "Requirements", "Setup", "Development", "Testing", "Deployment", or "Documentation"
5. Priorities must be one of: "High", "Medium", or "Low"

The roadmap should cover the complete journey from setup to completion.
`
