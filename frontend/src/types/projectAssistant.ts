// Project Idea generated from user input
export interface ProjectIdea {
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    estimatedTime: string;
    estimatedHoursPerWeek?: string;
    keyTechnologies: string[];
    keyFeatures: string[];
    learningOutcomes: string[];
}

// NEW: AI-Generated Roadmap Structure
// This replaces the old roadmap-steps, curriculum, and checklist structure

export interface RoadmapSubtask {
    title: string;
    description: string;
    estimated_hours?: number;
}

export interface RoadmapTask {
    title: string;
    description: string;
    estimated_hours: number;
    priority: number; // 1-5 (1=urgent/highest, 5=backlog/lowest)
    subtasks: RoadmapSubtask[];
    dependencies: string[]; // Task titles this depends on
    tags: string[];
    assigned_to?: string[];
}

export interface RoadmapMilestone {
    title: string;
    description: string;
    tasks: RoadmapTask[];
    estimated_hours: number;
    priority: number; // 1-5 (1=urgent/highest, 5=backlog/lowest)
    start_offset_days?: number;
    duration_days?: number;
    status: string; // pending, in_progress, completed, cancelled
}

export interface RoadmapSection {
    name: string;
    description: string;
    order: number;
    color?: string;
    milestones: RoadmapMilestone[];
}

export interface ChallengeMitigation {
    challenge: string;
    mitigation: string;
}

export interface DecisionFramework {
    best_for: string;
    choose_if: string;
    avoid_if: string;
}

export interface ProjectProposal {
    title: string;
    description: string;
    approach: string;
    benefits: string[];

    // Enhanced fields
    challenges_with_mitigation?: ChallengeMitigation[];
    success_metrics?: string[];
    decision_framework?: DecisionFramework;
    alternatives_considered?: string;

    // Legacy field (deprecated)
    challenges?: string[];

    timeline?: string;
    resources_needed: string[];
    status: string; // draft, active, approved, rejected
}

export interface DependencyEdge {
    from_task: string;
    to_task: string;
    dependency_type: string;
}

// Main Enhanced Roadmap structure returned by AI
export interface EnhancedRoadmap {
    success: boolean;
    sections: RoadmapSection[];
    proposals: ProjectProposal[];
    total_estimated_hours: number;
    total_tasks: number;
    total_milestones: number;
    dependencies_graph: DependencyEdge[];
    metadata?: Record<string, any>;
    error_message?: string;
}

// User profile for project assistant
export interface UserProfile {
    skills: string[];
    interests: string[];
    goal?: string;
    reference?: string;
    estimatedTime?: string;
    customTimePeriod?: string;
    deadline?: string;
    hoursPerWeek?: string;
    customHoursPerWeek?: string;
    preferredDifficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Any';
    screenshots?: string[];
}

// Loading state for async operations
export interface LoadingState {
    loading: boolean;
    loadingStage: string;
    loadingProgress: number;
    loadingMessages: string[];
}

// Legacy types - kept for backward compatibility but deprecated
// TODO: Remove these after full migration
export interface RoadmapResource {
    title: string;
    url: string;
    type: 'Article' | 'Video' | 'Course' | 'Documentation' | 'Tutorial' | 'Guide' | 'Library' | 'Tool' | 'Framework';
}

export interface RoadmapStep {
    title: string;
    description: string;
    timeEstimate: string;
    resources: RoadmapResource[];
}

export interface Roadmap {
    steps: RoadmapStep[];
}

export interface ChecklistItem {
    description: string;
    category: 'Requirements' | 'Setup' | 'Development' | 'Testing' | 'Deployment' | 'Documentation';
    priority: 'High' | 'Medium' | 'Low';
}

export interface ProjectChecklist {
    items: ChecklistItem[];
}

export interface CurriculumSkill {
    name: string;
    level: string;
    description: string;
    relevanceScore: number;
}

export interface Category {
    name: string;
    subcategories: string[];
}

export interface CategoryBreakdown {
    name: string;
    percentage: number;
}

export interface LearningGoal {
    goal: string;
    description: string;
}

export interface CurriculumAlignment {
    topics: string[];
    skills: CurriculumSkill[];
    categories: Category[];
    categoryBreakdown: CategoryBreakdown[];
    learningGoals: LearningGoal[];
}
