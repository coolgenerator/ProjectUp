import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import '../../components/project/AIProjectAssistantModal.css';

// Import components
import AnalyzeStep from '../../components/project/aiAssistant/AnalyzeStep';
import IdeasStep from '../../components/project/aiAssistant/IdeasStep';
import RoadmapStep from '../../components/project/aiAssistant/RoadmapStep';
import AddItemModal from '../../components/project/aiAssistant/AddItemModal';
import EditIdeaModal from '../../components/project/aiAssistant/EditIdeaModal';
import EditStepModal from '../../components/project/aiAssistant/EditStepModal';
import EditChecklistItemModal from '../../components/project/aiAssistant/EditChecklistItemModal';
import { ProjectTutorial } from '../../components/tutorial/ProjectTutorial';

// Import types
import {
    ProjectIdea,
    EnhancedRoadmap,
    UserProfile
} from '../../types/projectAssistant';

const { API_BASE_URL } = config;

const AIProjectAssistant: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize step from URL parameter, default to 'analyze'
    const urlStep = searchParams.get('step') as 'analyze' | 'ideas' | 'roadmap' | null;
    const initialStep = urlStep && ['analyze', 'ideas', 'roadmap'].includes(urlStep) ? urlStep : 'analyze';

    const [step, setStep] = useState<'analyze' | 'ideas' | 'roadmap' | 'curriculum' | 'checklist'>(initialStep);
    const [loading, setLoading] = useState(false);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([]);
    // Flag to track if ideas have been previously generated
    const [hasGeneratedIdeas, setHasGeneratedIdeas] = useState(false);
    const [selectedIdea, setSelectedIdea] = useState<ProjectIdea | null>(null);
    const [enhancedRoadmap, setEnhancedRoadmap] = useState<EnhancedRoadmap | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile>({ skills: [], interests: [] });
    // State variables for UI controls
    const [showAddSkillModal, setShowAddSkillModal] = useState(false);
    const [showAddInterestModal, setShowAddInterestModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedIdea, setEditedIdea] = useState<ProjectIdea | null>(null);
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
    const [editedStep, setEditedStep] = useState<any | null>(null);
    const [editingChecklistItemIndex, setEditingChecklistItemIndex] = useState<number | null>(null);
    const [editedChecklistItem, setEditedChecklistItem] = useState<ChecklistItem | null>(null);
    const [loadingStage, setLoadingStage] = useState<string>('');
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
    const [regenerationAdjustments, setRegenerationAdjustments] = useState<string>('');
    const [showSessionDialog, setShowSessionDialog] = useState(false);
    const [pendingSessionData, setPendingSessionData] = useState<any>(null);

    // Sync step state with URL parameter changes
    useEffect(() => {
        const urlStep = searchParams.get('step') as 'analyze' | 'ideas' | 'roadmap' | null;
        if (urlStep && ['analyze', 'ideas', 'roadmap'].includes(urlStep) && urlStep !== step) {
            console.log(`Syncing step from URL: ${urlStep}`);
            setStep(urlStep);
        }
    }, [searchParams]);

    // Load workflow session from backend on mount
    useEffect(() => {
        const loadWorkflowSession = async () => {
            try {
                // Check if user wants a fresh start
                const isFresh = searchParams.get('fresh') === 'true';

                if (isFresh) {
                    // Clear session from backend
                    try {
                        await fetchWithAuth(`${API_BASE_URL}/api/ai-workflow-session`, {
                            method: 'DELETE'
                        });
                        console.log('✨ Session cleared for fresh start');
                    } catch (error) {
                        console.error('Error clearing session:', error);
                    }

                    // Remove the fresh parameter from URL
                    searchParams.delete('fresh');
                    setSearchParams(searchParams);
                    setIsLoadingSession(false);
                    return;
                }

                const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-workflow-session`);
                const data = await response.json();

                if (data.session && data.session.state_data) {
                    const stateData = data.session.state_data;

                    // Check if there's any existing data
                    const hasExistingData = stateData.project_ideas || stateData.selected_idea || stateData.enhanced_roadmap;

                    if (hasExistingData) {
                        // Show confirmation dialog
                        setPendingSessionData(stateData);
                        setShowSessionDialog(true);
                        setIsLoadingSession(false);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading workflow session:', error);
            } finally {
                setIsLoadingSession(false);
            }
        };

        loadWorkflowSession();
    }, []);

    // Validate step and redirect to 'analyze' if required data is missing
    useEffect(() => {
        // Only validate after session has loaded
        if (isLoadingSession) return;

        // Skip validation in tutorial mode - mock data will be generated
        const isTutorial = searchParams.get('tutorial') === 'true';
        if (isTutorial) return;

        let shouldRedirect = false;
        let redirectReason = '';

        // Validate 'ideas' step - requires project ideas
        if (step === 'ideas' && (!projectIdeas || projectIdeas.length === 0)) {
            shouldRedirect = true;
            redirectReason = 'No project ideas available';
        }

        // Validate 'roadmap' step - requires selected idea
        if (step === 'roadmap' && !selectedIdea) {
            shouldRedirect = true;
            redirectReason = 'No project idea selected';
        }

        if (shouldRedirect) {
            console.log(`Redirecting to analyze step: ${redirectReason}`);
            setStep('analyze');
            setSearchParams({ step: 'analyze' });
        }
    }, [isLoadingSession, step, projectIdeas, selectedIdea, setSearchParams, searchParams]);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/get-user-profile`);
                const data = await response.json();

                // Process skills to handle both string arrays and object arrays
                let processedSkills: string[] = [];
                if (Array.isArray(data.skills)) {
                    processedSkills = data.skills.map((skill: any) => {
                        // If skill is an object with id, name and other properties, extract the name
                        if (typeof skill === 'object' && skill !== null) {
                            return skill.custom_name || skill.name || 'Unknown Skill';
                        }
                        // If it's already a string, use it directly
                        return String(skill);
                    });
                }

                // Process interests to handle both string arrays and object arrays
                let processedInterests: string[] = [];
                if (Array.isArray(data.interests)) {
                    processedInterests = data.interests.map((interest: any) => {
                        // If interest is an object with id, name and other properties, extract the name
                        if (typeof interest === 'object' && interest !== null) {
                            return interest.custom_name || interest.name || 'Unknown Interest';
                        }
                        // If it's already a string, use it directly
                        return String(interest);
                    });
                }

                setUserProfile({
                    skills: processedSkills,
                    interests: processedInterests,
                    goal: data.goal || '',
                    reference: data.reference || '',
                    estimatedTime: data.estimatedTime || '',
                    hoursPerWeek: data.hoursPerWeek || '',
                    preferredDifficulty: data.preferredDifficulty || 'Any',
                    customTimePeriod: data.customTimePeriod || '',
                    deadline: data.deadline || '',
                    customHoursPerWeek: data.customHoursPerWeek || ''
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };

        fetchUserProfile();
    }, []);

    // Auto-save workflow state when important data changes
    useEffect(() => {
        if (!isLoadingSession && step) {
            // Debounce saves to avoid too many requests
            const timeoutId = setTimeout(() => {
                saveWorkflowSession(step);
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [projectIdeas, selectedIdea, enhancedRoadmap, hasGeneratedIdeas, step, isLoadingSession]);

    // Handle tutorial mode - always use mock data
    useEffect(() => {
        const isTutorial = searchParams.get('tutorial') === 'true';
        const currentStep = searchParams.get('step');

        // Always generate sample ideas in tutorial mode when on ideas page
        if (isTutorial && currentStep === 'ideas') {
            // Always use sample project ideas for tutorial, override any existing data
            const sampleIdeas: ProjectIdea[] = [
                {
                    title: "Study Habit Tracker Mobile App",
                    description: "Build a mobile app that helps students track their study habits and improve productivity through gamification and AI-powered recommendations.",
                    difficulty: "Intermediate",
                    estimatedTime: "6-8 weeks",
                    keyTechnologies: ["React Native", "Node.js", "MongoDB", "AI/ML APIs"],
                    keyFeatures: [
                        "Study session tracking with timer",
                        "Gamification with points and achievements",
                        "AI-powered study recommendations",
                        "Progress analytics and insights",
                        "Social features to compete with friends"
                    ],
                    learningOutcomes: [
                        "Mobile app development with React Native",
                        "Backend API design with Node.js",
                        "Database management with MongoDB",
                        "AI integration for personalized recommendations",
                        "User experience and gamification design"
                    ]
                },
                {
                    title: "AI-Powered Flashcard Generator",
                    description: "Create an educational app that automatically generates flashcards from study materials using AI, helping students learn more efficiently.",
                    difficulty: "Intermediate",
                    estimatedTime: "4-6 weeks",
                    keyTechnologies: ["React", "Python", "OpenAI API", "PostgreSQL"],
                    keyFeatures: [
                        "Upload PDFs or paste text content",
                        "AI-generated flashcards with questions",
                        "Spaced repetition learning algorithm",
                        "Track learning progress",
                        "Export flashcards to Anki format"
                    ],
                    learningOutcomes: [
                        "Natural language processing with AI",
                        "React frontend development",
                        "Backend development with Python",
                        "Working with AI APIs",
                        "Learning algorithm implementation"
                    ]
                },
                {
                    title: "Student Productivity Dashboard",
                    description: "Develop a comprehensive dashboard that integrates calendar, tasks, notes, and study analytics to help students stay organized and productive.",
                    difficulty: "Beginner",
                    estimatedTime: "3-4 weeks",
                    keyTechnologies: ["React", "TypeScript", "Firebase", "Chart.js"],
                    keyFeatures: [
                        "Calendar integration with Google Calendar",
                        "Task management with deadlines",
                        "Note-taking with rich text editor",
                        "Study time tracking and analytics",
                        "Customizable widgets and themes"
                    ],
                    learningOutcomes: [
                        "React and TypeScript fundamentals",
                        "Firebase authentication and database",
                        "Data visualization with charts",
                        "Third-party API integration",
                        "Responsive web design"
                    ]
                }
            ];

            // Always override with tutorial data in tutorial mode
            setProjectIdeas(sampleIdeas);
            setHasGeneratedIdeas(true);
            // Auto-select the first idea
            setSelectedIdea(sampleIdeas[0]);
        }

        // Always generate mock roadmap when on roadmap page in tutorial mode
        if (isTutorial && currentStep === 'roadmap') {
            const mockRoadmap: EnhancedRoadmap = {
                success: true,
                sections: [
                    {
                        name: "Phase 1: Setup & Foundation",
                        description: "Set up your development environment and project foundation",
                        order: 0,
                        milestones: [
                            {
                                title: "Development Environment Setup",
                                description: "Install and configure all necessary tools and dependencies",
                                tasks: [
                                    {
                                        title: "Install React Native and dependencies",
                                        description: "Set up React Native CLI, Node.js, and mobile emulators",
                                        estimated_hours: 3,
                                        priority: 5,
                                        subtasks: [
                                            "Install Node.js and npm",
                                            "Install React Native CLI",
                                            "Set up Android Studio or Xcode"
                                        ],
                                        dependencies: [],
                                        tags: ["setup", "environment"]
                                    },
                                    {
                                        title: "Initialize project structure",
                                        description: "Create the basic project structure and configuration",
                                        estimated_hours: 2,
                                        priority: 4,
                                        subtasks: [
                                            "Create new React Native project",
                                            "Set up folder structure",
                                            "Configure ESLint and Prettier"
                                        ],
                                        dependencies: [],
                                        tags: ["setup", "configuration"]
                                    }
                                ],
                                estimated_hours: 5,
                                priority: 5,
                                status: "pending"
                            }
                        ]
                    },
                    {
                        name: "Phase 2: Core Features",
                        description: "Build the main features of your study tracker app",
                        order: 1,
                        milestones: [
                            {
                                title: "Study Session Tracking",
                                description: "Implement timer and session tracking functionality",
                                tasks: [
                                    {
                                        title: "Build timer component",
                                        description: "Create a study session timer with start/stop/pause",
                                        estimated_hours: 4,
                                        priority: 5,
                                        subtasks: [
                                            "Design timer UI",
                                            "Implement timer logic",
                                            "Add notifications"
                                        ],
                                        dependencies: [],
                                        tags: ["feature", "ui"]
                                    }
                                ],
                                estimated_hours: 4,
                                priority: 4,
                                status: "pending"
                            }
                        ]
                    },
                    {
                        name: "Phase 3: AI Integration",
                        description: "Add AI-powered recommendations and insights",
                        order: 2,
                        milestones: [
                            {
                                title: "AI Recommendations Engine",
                                description: "Integrate AI APIs for personalized study recommendations",
                                tasks: [
                                    {
                                        title: "Connect to AI API",
                                        description: "Set up and configure AI service integration",
                                        estimated_hours: 6,
                                        priority: 3,
                                        subtasks: [
                                            "Choose AI provider",
                                            "Set up API credentials",
                                            "Implement recommendation logic"
                                        ],
                                        dependencies: [],
                                        tags: ["ai", "integration"]
                                    }
                                ],
                                estimated_hours: 6,
                                priority: 3,
                                status: "pending"
                            }
                        ]
                    }
                ],
                proposals: [
                    {
                        title: "Mobile-First Development Approach",
                        description: "Build the study habit tracker as a mobile-first application using React Native for cross-platform compatibility",
                        approach: "## Development Approach\n\nWe'll use React Native to build a cross-platform mobile application that works on both iOS and Android. This approach allows us to:\n\n- Share code between platforms (80-90% code reuse)\n- Leverage existing React knowledge\n- Access native device features through React Native APIs\n- Maintain a single codebase for faster iterations",
                        benefits: [
                            "Faster time to market with cross-platform development",
                            "Cost-effective solution by maintaining a single codebase",
                            "Access to native device features like notifications and timers",
                            "Large ecosystem of React Native libraries and components",
                            "Hot reloading for rapid development and testing"
                        ],
                        challenges_with_mitigation: [
                            {
                                challenge: "Performance concerns with complex animations",
                                mitigation: "Use native modules for performance-critical features and optimize rendering with React.memo and useMemo"
                            },
                            {
                                challenge: "Platform-specific UI/UX differences",
                                mitigation: "Use platform-specific components and styling where needed, test on both platforms regularly"
                            },
                            {
                                challenge: "Debugging across different devices",
                                mitigation: "Set up comprehensive error logging with Sentry, use React Native Debugger, and maintain device testing lab"
                            }
                        ],
                        success_metrics: [
                            "App launches successfully on both iOS and Android within 2 seconds",
                            "90% code sharing between platforms achieved",
                            "User engagement rate of 60% returning daily within first month",
                            "Average study session duration of 25+ minutes",
                            "4+ star rating on both app stores within 3 months"
                        ],
                        decision_framework: {
                            best_for: "Students who want to build cross-platform mobile development skills and create a functional app quickly",
                            choose_if: "You have React experience, want to target both iOS and Android users, and prefer a single codebase",
                            avoid_if: "You need maximum native performance, require extensive platform-specific features, or want to focus on only one platform"
                        },
                        alternatives_considered: "## Alternative Approaches\n\n**Native Development (Swift/Kotlin):**\n- Pros: Best performance, full access to platform features\n- Cons: Need separate codebases, longer development time, steeper learning curve\n\n**Flutter:**\n- Pros: Great performance, beautiful UI components\n- Cons: Dart language learning curve, smaller ecosystem than React\n\n**Progressive Web App (PWA):**\n- Pros: No app store approval, works on all platforms\n- Cons: Limited offline capabilities, no native features like notifications",
                        resources_needed: [
                            "React Native development environment (Node.js, Xcode for iOS, Android Studio)",
                            "Physical devices or emulators for testing (iOS and Android)",
                            "Backend server with Node.js and MongoDB",
                            "AI/ML API subscription (OpenAI, Google Vertex AI, or similar)",
                            "Cloud storage for user data (Firebase or AWS)",
                            "Push notification service (Firebase Cloud Messaging)",
                            "Analytics platform (Google Analytics or Mixpanel)"
                        ],
                        timeline: "## Implementation Timeline\n\n**Weeks 1-2: Setup & Foundation**\n- Environment setup and project initialization\n- Basic navigation and screen structure\n- Database schema design\n\n**Weeks 3-4: Core Features**\n- Study timer implementation\n- Session tracking and storage\n- Basic analytics dashboard\n\n**Weeks 5-6: Gamification & AI**\n- Points and achievement system\n- AI recommendation engine integration\n- Social features (optional)\n\n**Weeks 7-8: Testing & Polish**\n- Bug fixes and performance optimization\n- User testing and feedback incorporation\n- App store submission preparation"
                    }
                ],
                total_estimated_hours: 15,
                total_tasks: 3,
                total_milestones: 3,
                dependencies_graph: []
            };

            // Always override with mock data in tutorial mode
            setEnhancedRoadmap(mockRoadmap);
        }
    }, [searchParams]);

    // Save workflow session to backend
    const saveWorkflowSession = async (currentStep: string) => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/ai-workflow-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    step: currentStep,
                    project_ideas: projectIdeas.length > 0 ? JSON.stringify(projectIdeas) : null,
                    selected_idea: selectedIdea ? JSON.stringify(selectedIdea) : null,
                    enhanced_roadmap: enhancedRoadmap ? JSON.stringify(enhancedRoadmap) : null,
                    has_generated_ideas: hasGeneratedIdeas
                })
            });
        } catch (error) {
            console.error('Error saving workflow session:', error);
        }
    };

    // Handle continuing with existing session
    const handleContinueSession = () => {
        if (!pendingSessionData) return;

        // Restore project ideas if available
        if (pendingSessionData.project_ideas) {
            try {
                const ideas = typeof pendingSessionData.project_ideas === 'string'
                    ? JSON.parse(pendingSessionData.project_ideas)
                    : pendingSessionData.project_ideas;
                setProjectIdeas(ideas);
            } catch (e) {
                console.error('Error parsing project ideas:', e);
            }
        }

        // Restore selected idea if available
        if (pendingSessionData.selected_idea) {
            try {
                const idea = typeof pendingSessionData.selected_idea === 'string'
                    ? JSON.parse(pendingSessionData.selected_idea)
                    : pendingSessionData.selected_idea;
                setSelectedIdea(idea);
            } catch (e) {
                console.error('Error parsing selected idea:', e);
            }
        }

        // Restore enhanced roadmap if available
        if (pendingSessionData.enhanced_roadmap) {
            try {
                const roadmap = typeof pendingSessionData.enhanced_roadmap === 'string'
                    ? JSON.parse(pendingSessionData.enhanced_roadmap)
                    : pendingSessionData.enhanced_roadmap;
                console.log('📋 Loading enhanced roadmap from session:', roadmap);
                setEnhancedRoadmap(roadmap);
            } catch (e) {
                console.error('Error parsing enhanced roadmap:', e);
            }
        }

        // Restore hasGeneratedIdeas flag
        if (pendingSessionData.has_generated_ideas) {
            setHasGeneratedIdeas(true);
        }

        setShowSessionDialog(false);
        setPendingSessionData(null);
    };

    // Handle starting fresh (clear session)
    const handleStartFresh = async () => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/ai-workflow-session`, {
                method: 'DELETE'
            });
            console.log('✨ Session cleared for fresh start');
        } catch (error) {
            console.error('Error clearing session:', error);
        }

        setShowSessionDialog(false);
        setPendingSessionData(null);
        setProjectIdeas([]);
        setSelectedIdea(null);
        setEnhancedRoadmap(null);
        setHasGeneratedIdeas(false);
        setStep('analyze');
        setSearchParams({ step: 'analyze' });
    };

    // Navigation functions
    const goToStep = (nextStep: 'analyze' | 'ideas' | 'roadmap' | 'curriculum' | 'checklist') => {
        // If moving from roadmap to ideas, clear any loading state
        if (step === 'roadmap' && nextStep === 'ideas' || step === 'ideas' && nextStep === 'analyze') {
            setLoading(false);
            setLoadingProgress(0);
            setLoadingStage('');
            setLoadingMessages([]);
        }

        // Scroll to top for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Change the step
        setStep(nextStep);

        // Update URL parameter
        setSearchParams({ step: nextStep });

        // Save to backend
        saveWorkflowSession(nextStep);
    };

    const handleAddSkill = async (skill: string) => {
        if (!skill.trim()) return;

        const updatedSkills = [...userProfile.skills, skill];
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/update-skills`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ skills: updatedSkills })
            });

            if (!response.ok) {
                throw new Error('Failed to update skills');
            }

            setUserProfile(prev => ({
                ...prev,
                skills: updatedSkills
            }));
            setShowAddSkillModal(false);
        } catch (error) {
            console.error('Error updating skills:', error);
        }
    };

    const handleAddInterest = async (interest: string) => {
        if (!interest.trim()) return;

        const updatedInterests = [...userProfile.interests, interest];
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/update-interests`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ interests: updatedInterests })
            });

            if (!response.ok) {
                throw new Error('Failed to update interests');
            }

            setUserProfile(prev => ({
                ...prev,
                interests: updatedInterests
            }));
            setShowAddInterestModal(false);
        } catch (error) {
            console.error('Error updating interests:', error);
        }
    };

    const analyzeInterests = async () => {
        // Check if in tutorial mode - skip actual API call
        const isTutorial = searchParams.get('tutorial') === 'true';

        if (isTutorial) {
            // In tutorial mode, just navigate to ideas page immediately
            // Mock ideas will be auto-generated by the useEffect
            goToStep('ideas');
            return;
        }

        // Scroll to top immediately when starting analysis
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setLoading(true);
        setLoadingStage('Preparing analysis');
        setLoadingProgress(0);
        setLoadingMessages([]);

        const updateProgress = () => {
            const stages = [
                { message: 'Analyzing skills and interests...', progress: 15 },
                { message: 'Processing fun & interesting inputs...', progress: 30 },
                { message: 'Searching for relevant project domains...', progress: 45 },
                { message: 'Evaluating difficulty and timeframe constraints...', progress: 60 },
                { message: 'Generating personalized project ideas...', progress: 75 },
                { message: 'Finalizing project recommendations...', progress: 90 },
            ];

            let currentStage = 0;

            const progressInterval = setInterval(() => {
                if (currentStage < stages.length) {
                    const stage = stages[currentStage];
                    setLoadingStage(stage.message);
                    setLoadingProgress(stage.progress);
                    setLoadingMessages(prev => [...prev, stage.message]);
                    currentStage++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 1500);

            return progressInterval;
        };

        const progressInterval = updateProgress();

        try {
            // Determine the timeframe to send
            let timeframeToSend = '';

            if (userProfile.estimatedTime === 'Custom' && userProfile.customTimePeriod) {
                // Use the custom time period from the profile
                timeframeToSend = userProfile.customTimePeriod;
            } else if (userProfile.estimatedTime === 'By Deadline' && userProfile.deadline) {
                // Use the deadline from the profile
                const deadlineDate = new Date(userProfile.deadline);
                const today = new Date();
                const diffTime = Math.abs(deadlineDate.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 14) {
                    timeframeToSend = '1-2 weeks';
                } else if (diffDays <= 30) {
                    timeframeToSend = '3-4 weeks';
                } else if (diffDays <= 90) {
                    timeframeToSend = '1-3 months';
                } else if (diffDays <= 180) {
                    timeframeToSend = '3-6 months';
                } else {
                    timeframeToSend = '6+ months';
                }
            } else if (userProfile.estimatedTime && userProfile.estimatedTime !== 'Custom' && userProfile.estimatedTime !== 'By Deadline') {
                timeframeToSend = userProfile.estimatedTime;
            } else {
                timeframeToSend = 'Any';
            }

            // Use the selected difficulty or the one from the user profile
            const difficultyToSend = userProfile.preferredDifficulty || 'Any';

            // Call AI agent directly instead of backend - use environment variable or fallback to localhost for dev
            const AI_AGENT_URL = config.AI_AGENT_URL;
            const requestBody = {
                skills: userProfile.skills,
                interests: userProfile.interests,
                goal: userProfile.goal || '',
                reference: userProfile.reference || '',
                hoursPerWeek: userProfile.hoursPerWeek === 'Custom' ? userProfile.customHoursPerWeek : userProfile.hoursPerWeek || '',
                preferredDifficulty: difficultyToSend,
                preferredTimeframe: timeframeToSend,
                deadline: userProfile.deadline || '',
                customTimePeriod: userProfile.customTimePeriod || '',
                numIdeas: 5, // Request 5 ideas by default
            };

            console.log('🚀 Calling AI Agent at:', `${AI_AGENT_URL}/ai-api/agents/project-ideas`);
            console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${AI_AGENT_URL}/ai-api/agents/project-ideas?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify(requestBody),
            });

            clearInterval(progressInterval);
            setLoadingProgress(100);
            setLoadingStage('Completing analysis');

            const data = await response.json();
            console.log('📦 Raw response from AI Agent:', data);
            console.log('🎯 Response type:', typeof data.response);

            // Handle both structured and stringified JSON responses
            let ideas;
            if (data.response && typeof data.response === 'object' && data.response.projectIdeas) {
                // Response is already a structured object
                ideas = data.response.projectIdeas;
            } else if (data.response && typeof data.response === 'string') {
                // Response is a JSON string that needs to be parsed
                try {
                    const parsedResponse = JSON.parse(data.response);
                    ideas = parsedResponse.projectIdeas || [];
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    diagnoseJsonError(data.response, parseError as Error);
                    // Try to fix common JSON issues and parse again
                    try {
                        const cleanedJson = data.response
                            // Fix missing commas between array elements
                            .replace(/}(\s*){/g, '},{')
                            .replace(/](\s*)\[/g, '],[')
                            .replace(/}(\s*)\[/g, '},[')
                            .replace(/](\s*){/g, '],[')
                            // Fix trailing commas
                            .replace(/,(\s*)([\]}])/g, '$2')
                            // Replace any invalid control characters
                            .replace(/[\u0000-\u001F]+/g, '');

                        // When all else fails, try a regex extraction
                        if (cleanedJson.includes('"projectIdeas"')) {
                            try {
                                // Extract the project ideas array manually as a last resort
                                const ideasMatch = cleanedJson.match(/"projectIdeas"\s*:\s*(\[[\s\S]*?\])/);
                                if (ideasMatch && ideasMatch[1]) {
                                    const ideasArray = JSON.parse(ideasMatch[1]);
                                    ideas = ideasArray;
                                } else {
                                    throw new Error('Could not extract projectIdeas array');
                                }
                            } catch (regexError) {
                                console.error('Error extracting project ideas with regex:', regexError);
                                throw new Error('Could not parse project ideas data');
                            }
                        } else {
                            // Try parsing the cleaned JSON
                            const parsedResponse = JSON.parse(cleanedJson);
                            ideas = parsedResponse.projectIdeas || [];
                        }
                    } catch (secondAttemptError) {
                        console.error('Error on second parsing attempt:', secondAttemptError);
                        console.error('Problematic JSON:', data.response);
                        throw new Error('Server returned invalid JSON structure that could not be repaired');
                    }
                }
            } else {
                console.error('Server returned unexpected response format:', data);
                // Handle the case where the server returns a valid response but without projectIdeas field
                if (data.response && typeof data.response === 'object') {
                    // Try to extract project ideas from unexpected response formats
                    if (Array.isArray(data.response)) {
                        // If the response is an array, treat it as project ideas
                        ideas = data.response;
                    } else if (Object.keys(data.response).length > 0) {
                        // Check if the response itself looks like a project idea
                        const possibleIdea = data.response;
                        if (possibleIdea.title && possibleIdea.description) {
                            // Convert single idea to array
                            ideas = [possibleIdea];
                        } else {
                            // Look for any arrays in the response that might contain ideas
                            for (const key in possibleIdea) {
                                if (Array.isArray(possibleIdea[key]) && possibleIdea[key].length > 0) {
                                    // Check if the first item has title and description
                                    const firstItem = possibleIdea[key][0];
                                    if (firstItem && typeof firstItem === 'object' && firstItem.title && firstItem.description) {
                                        ideas = possibleIdea[key];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // If we still couldn't find ideas, throw an error
                    if (!ideas) {
                        throw new Error('Server returned unexpected JSON structure');
                    }
                } else {
                    throw new Error('Server returned unexpected JSON structure');
                }
            }

            if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
                throw new Error('No project ideas found in the response');
            }

            console.log('✅ Parsed ideas:', ideas.map(idea => ({ title: idea.title, desc: idea.description?.substring(0, 50) })));

            // Clean up potentially corrupted project ideas
            const cleanedIdeas = ensureCompleteProjectIdeas(ideas);

            console.log('🧹 Cleaned ideas:', cleanedIdeas.map(idea => ({ title: idea.title, desc: idea.description?.substring(0, 50) })));

            setProjectIdeas(cleanedIdeas);
            setHasGeneratedIdeas(true); // Set flag that ideas have been generated

            console.log('💾 State updated with', cleanedIdeas.length, 'ideas');

            // Explicitly scroll to top before transitioning to the ideas step
            window.scrollTo({ top: 0, behavior: 'auto' });
            goToStep('ideas');
        } catch (error) {
            clearInterval(progressInterval);
            setLoadingStage('Error occurred');
            console.error('Error analyzing interests:', error);

            // Create fallback project ideas if the request fails
            setProjectIdeas([
                {
                    title: "Error Generating Ideas",
                    description: "We encountered an error while generating project ideas. Please try again or adjust your inputs.",
                    difficulty: "Beginner" as const,
                    estimatedTime: "N/A",
                    keyTechnologies: ["Error"],
                    keyFeatures: ["Please try again"],
                    learningOutcomes: ["Try refreshing the page or changing your inputs"]
                }
            ]);

            // Still set the flag that we tried to generate ideas
            setHasGeneratedIdeas(true);

            // Still move to ideas screen to show the error
            goToStep('ideas');
        } finally {
            setLoading(false);
            setLoadingProgress(0);
            setLoadingStage('');
        }
    };

    // Helper function to diagnose JSON parsing errors
    const diagnoseJsonError = (jsonStr: string, error: Error) => {
        // Extract position from error message if available
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch && posMatch[1]) {
            const errorPos = parseInt(posMatch[1]);
            // Log a slice of the string around the error position
            const start = Math.max(0, errorPos - 30);
            const end = Math.min(jsonStr.length, errorPos + 30);
            console.error(`JSON Error around position ${errorPos}:`);
            console.error(jsonStr.slice(start, end));
            console.error(' '.repeat(Math.min(30, errorPos - start)) + '^');

            // Try to identify what might be wrong
            const beforeError = jsonStr.slice(Math.max(0, errorPos - 10), errorPos);
            const afterError = jsonStr.slice(errorPos, Math.min(jsonStr.length, errorPos + 10));
            console.error(`Context: "${beforeError}👉${afterError}"`);
        } else {
            // If we can't get the position, just log the first ~100 chars
            console.error('JSON Error, first 100 characters:');
            console.error(jsonStr.slice(0, 100) + '...');
        }
    };

    // Add a new helper function to clean up potentially corrupt project ideas
    const ensureCompleteProjectIdeas = (ideas: any[]): ProjectIdea[] => {
        return ideas.map(idea => {
            // Ensure all required fields exist
            const cleanedIdea: ProjectIdea = {
                title: idea.title || "Untitled Project",
                description: idea.description || "No description available",
                difficulty: (idea.difficulty as "Beginner" | "Intermediate" | "Advanced") || "Intermediate",
                estimatedTime: idea.estimatedTime || "Unknown",
                estimatedHoursPerWeek: idea.estimatedHoursPerWeek || "",
                keyTechnologies: Array.isArray(idea.keyTechnologies) ? idea.keyTechnologies : ["Not specified"],
                keyFeatures: Array.isArray(idea.keyFeatures) ? idea.keyFeatures : ["Not specified"],
                learningOutcomes: Array.isArray(idea.learningOutcomes) ? idea.learningOutcomes : ["Not specified"]
            };

            // Make sure all array properties are properly formatted arrays
            if (cleanedIdea.keyTechnologies.length === 0) cleanedIdea.keyTechnologies = ["Not specified"];
            if (cleanedIdea.keyFeatures.length === 0) cleanedIdea.keyFeatures = ["Not specified"];
            if (cleanedIdea.learningOutcomes.length === 0) cleanedIdea.learningOutcomes = ["Not specified"];

            // Set reasonable defaults for estimatedHoursPerWeek based on difficulty if not present
            if (!cleanedIdea.estimatedHoursPerWeek) {
                switch (cleanedIdea.difficulty) {
                    case "Beginner":
                        cleanedIdea.estimatedHoursPerWeek = "3-5 hours/week";
                        break;
                    case "Intermediate":
                        cleanedIdea.estimatedHoursPerWeek = "5-8 hours/week";
                        break;
                    case "Advanced":
                        cleanedIdea.estimatedHoursPerWeek = "8-12 hours/week";
                        break;
                    default:
                        cleanedIdea.estimatedHoursPerWeek = "4-8 hours/week";
                }
            }

            return cleanedIdea;
        });
    };

    const handleSkipToRoadmap = async () => {
        // Create a project idea directly from the user's goal
        const directIdea: ProjectIdea = {
            title: userProfile.goal || 'My Project',
            description: userProfile.goal || 'Custom project based on specific requirements',
            difficulty: userProfile.preferredDifficulty || 'Intermediate',
            estimatedTime: userProfile.estimatedTime || '4-8 weeks',
            estimatedHoursPerWeek: userProfile.hoursPerWeek || '5-10 hours/week',
            keyTechnologies: userProfile.skills || [],
            keyFeatures: [], // Will be inferred by AI during roadmap generation
            learningOutcomes: userProfile.interests || []
        };

        // Set this as the selected idea
        setSelectedIdea(directIdea);

        // Save to session
        await saveWorkflowSession('roadmap');

        // Generate roadmap immediately
        await generateRoadmap(directIdea);
    };

    const generateRoadmap = async (idea: ProjectIdea) => {
        // Check if in tutorial mode - always use mock roadmap
        const isTutorial = searchParams.get('tutorial') === 'true';

        if (isTutorial) {
            // Always create mock roadmap for tutorial, even if existing data is present
            const mockRoadmap: EnhancedRoadmap = {
                success: true,
                sections: [
                    {
                        name: "Phase 1: Setup & Foundation",
                        description: "Set up your development environment and project foundation",
                        order: 0,
                        milestones: [
                            {
                                title: "Development Environment Setup",
                                description: "Install and configure all necessary tools and dependencies",
                                tasks: [
                                    {
                                        title: "Install React Native and dependencies",
                                        description: "Set up React Native CLI, Node.js, and mobile emulators",
                                        estimated_hours: 3,
                                        priority: 5,
                                        subtasks: [
                                            "Install Node.js and npm",
                                            "Install React Native CLI",
                                            "Set up Android Studio or Xcode"
                                        ],
                                        dependencies: [],
                                        tags: ["setup", "environment"]
                                    },
                                    {
                                        title: "Initialize project structure",
                                        description: "Create the basic project structure and configuration",
                                        estimated_hours: 2,
                                        priority: 4,
                                        subtasks: [
                                            "Create new React Native project",
                                            "Set up folder structure",
                                            "Configure ESLint and Prettier"
                                        ],
                                        dependencies: [],
                                        tags: ["setup", "configuration"]
                                    }
                                ],
                                estimated_hours: 5,
                                priority: 5,
                                status: "pending"
                            }
                        ]
                    },
                    {
                        name: "Phase 2: Core Features",
                        description: "Build the main features of your study tracker app",
                        order: 1,
                        milestones: [
                            {
                                title: "Study Session Tracking",
                                description: "Implement timer and session tracking functionality",
                                tasks: [
                                    {
                                        title: "Build timer component",
                                        description: "Create a study session timer with start/stop/pause",
                                        estimated_hours: 4,
                                        priority: 5,
                                        subtasks: [
                                            "Design timer UI",
                                            "Implement timer logic",
                                            "Add notifications"
                                        ],
                                        dependencies: [],
                                        tags: ["feature", "ui"]
                                    }
                                ],
                                estimated_hours: 4,
                                priority: 4,
                                status: "pending"
                            }
                        ]
                    },
                    {
                        name: "Phase 3: AI Integration",
                        description: "Add AI-powered recommendations and insights",
                        order: 2,
                        milestones: [
                            {
                                title: "AI Recommendations Engine",
                                description: "Integrate AI APIs for personalized study recommendations",
                                tasks: [
                                    {
                                        title: "Connect to AI API",
                                        description: "Set up and configure AI service integration",
                                        estimated_hours: 6,
                                        priority: 3,
                                        subtasks: [
                                            "Choose AI provider",
                                            "Set up API credentials",
                                            "Implement recommendation logic"
                                        ],
                                        dependencies: [],
                                        tags: ["ai", "integration"]
                                    }
                                ],
                                estimated_hours: 6,
                                priority: 3,
                                status: "pending"
                            }
                        ]
                    }
                ],
                proposals: [
                    {
                        title: "Mobile-First Development Approach",
                        description: "Build the study habit tracker as a mobile-first application using React Native for cross-platform compatibility",
                        approach: "## Development Approach\n\nWe'll use React Native to build a cross-platform mobile application that works on both iOS and Android. This approach allows us to:\n\n- Share code between platforms (80-90% code reuse)\n- Leverage existing React knowledge\n- Access native device features through React Native APIs\n- Maintain a single codebase for faster iterations",
                        benefits: [
                            "Faster time to market with cross-platform development",
                            "Cost-effective solution by maintaining a single codebase",
                            "Access to native device features like notifications and timers",
                            "Large ecosystem of React Native libraries and components",
                            "Hot reloading for rapid development and testing"
                        ],
                        challenges_with_mitigation: [
                            {
                                challenge: "Performance concerns with complex animations",
                                mitigation: "Use native modules for performance-critical features and optimize rendering with React.memo and useMemo"
                            },
                            {
                                challenge: "Platform-specific UI/UX differences",
                                mitigation: "Use platform-specific components and styling where needed, test on both platforms regularly"
                            },
                            {
                                challenge: "Debugging across different devices",
                                mitigation: "Set up comprehensive error logging with Sentry, use React Native Debugger, and maintain device testing lab"
                            }
                        ],
                        success_metrics: [
                            "App launches successfully on both iOS and Android within 2 seconds",
                            "90% code sharing between platforms achieved",
                            "User engagement rate of 60% returning daily within first month",
                            "Average study session duration of 25+ minutes",
                            "4+ star rating on both app stores within 3 months"
                        ],
                        decision_framework: {
                            best_for: "Students who want to build cross-platform mobile development skills and create a functional app quickly",
                            choose_if: "You have React experience, want to target both iOS and Android users, and prefer a single codebase",
                            avoid_if: "You need maximum native performance, require extensive platform-specific features, or want to focus on only one platform"
                        },
                        alternatives_considered: "## Alternative Approaches\n\n**Native Development (Swift/Kotlin):**\n- Pros: Best performance, full access to platform features\n- Cons: Need separate codebases, longer development time, steeper learning curve\n\n**Flutter:**\n- Pros: Great performance, beautiful UI components\n- Cons: Dart language learning curve, smaller ecosystem than React\n\n**Progressive Web App (PWA):**\n- Pros: No app store approval, works on all platforms\n- Cons: Limited offline capabilities, no native features like notifications",
                        resources_needed: [
                            "React Native development environment (Node.js, Xcode for iOS, Android Studio)",
                            "Physical devices or emulators for testing (iOS and Android)",
                            "Backend server with Node.js and MongoDB",
                            "AI/ML API subscription (OpenAI, Google Vertex AI, or similar)",
                            "Cloud storage for user data (Firebase or AWS)",
                            "Push notification service (Firebase Cloud Messaging)",
                            "Analytics platform (Google Analytics or Mixpanel)"
                        ],
                        timeline: "## Implementation Timeline\n\n**Weeks 1-2: Setup & Foundation**\n- Environment setup and project initialization\n- Basic navigation and screen structure\n- Database schema design\n\n**Weeks 3-4: Core Features**\n- Study timer implementation\n- Session tracking and storage\n- Basic analytics dashboard\n\n**Weeks 5-6: Gamification & AI**\n- Points and achievement system\n- AI recommendation engine integration\n- Social features (optional)\n\n**Weeks 7-8: Testing & Polish**\n- Bug fixes and performance optimization\n- User testing and feedback incorporation\n- App store submission preparation"
                    }
                ],
                total_estimated_hours: 15,
                total_tasks: 3,
                total_milestones: 3,
                dependencies_graph: []
            };

            setEnhancedRoadmap(mockRoadmap);
            window.localStorage.setItem('hasGeneratedRoadmap', 'true');

            // Navigate to roadmap immediately
            setTimeout(() => {
                goToStep('roadmap');
            }, 300);
            return;
        }

        setLoading(true);
        setLoadingStage('Generating comprehensive roadmap...');
        setLoadingProgress(0);
        setLoadingMessages([]);

        // Save the fact that we've generated a roadmap
        window.localStorage.setItem('hasGeneratedRoadmap', 'true');

        const updateProgress = () => {
            const stages = [
                { message: 'Analyzing project requirements...', progress: 15 },
                { message: 'Generating sections and phases...', progress: 30 },
                { message: 'Creating milestones...', progress: 50 },
                { message: 'Breaking down into tasks...', progress: 70 },
                { message: 'Analyzing task dependencies...', progress: 85 },
                { message: 'Creating strategic proposals...', progress: 95 },
            ];

            let currentStage = 0;

            const progressInterval = setInterval(() => {
                if (currentStage < stages.length) {
                    const stage = stages[currentStage];
                    setLoadingStage(stage.message);
                    setLoadingProgress(stage.progress);
                    setLoadingMessages(prev => [...prev, stage.message]);
                    currentStage++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 2000);

            return progressInterval;
        };

        const progressInterval = updateProgress();

        try {
            // Parse estimated time
            let durationWeeks = 12; // default
            const timeMatch = idea.estimatedTime.match(/(\d+)/);
            if (timeMatch) {
                durationWeeks = parseInt(timeMatch[1]);
            }

            const AI_AGENT_URL = config.AI_AGENT_URL;

            // Single API call to new endpoint
            const response = await fetch(`${AI_AGENT_URL}/ai-api/project-roadmap/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: `temp_${Date.now()}`,
                    project_title: idea.title,
                    project_description: idea.description,
                    difficulty_level: idea.difficulty.toLowerCase(),
                    duration_weeks: durationWeeks,
                    team_size: 1,
                    key_features: idea.keyFeatures || [],
                    tech_stack: idea.keyTechnologies || [],
                    project_type: 'Personal Project',
                    generate_proposals: true,
                    generate_dependencies: true
                })
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error(`Failed to generate roadmap: ${response.statusText}`);
            }

            const roadmapData: EnhancedRoadmap = await response.json();

            console.log('🗺️ Received roadmap data:', roadmapData);
            console.log('🗺️ Success flag:', roadmapData.success);
            console.log('🗺️ Sections count:', roadmapData.sections?.length);

            if (!roadmapData.success) {
                throw new Error(roadmapData.error_message || 'Failed to generate roadmap');
            }

            setLoadingProgress(100);
            setLoadingStage('Roadmap generation complete!');
            setLoadingMessages(prev => [...prev, 'Roadmap ready!']);

            // Set the enhanced roadmap
            setEnhancedRoadmap(roadmapData);
            console.log('🗺️ Enhanced roadmap state set');

            // Save to backend session
            await saveWorkflowSession('roadmap');

            // Navigate to roadmap view
            setTimeout(() => {
                setLoading(false);
                goToStep('roadmap');
            }, 500);

        } catch (error) {
            console.error('Error generating roadmap:', error);
            clearInterval(progressInterval);
            setLoading(false);
            setLoadingStage('Error occurred');
            setLoadingMessages(prev => [...prev, error instanceof Error ? error.message : 'Failed to generate roadmap. Please try again.']);

            // Create fallback roadmap
            const fallbackRoadmap: EnhancedRoadmap = {
                success: true,
                sections: [{
                    name: "Project Setup",
                    description: "Initial project setup and planning",
                    order: 0,
                    milestones: [{
                        title: "Environment Setup",
                        description: "Set up development environment",
                        tasks: [{
                            title: "Install dependencies",
                            description: "Install required tools and libraries",
                            estimated_hours: 2,
                            priority: 5,
                            subtasks: [],
                            dependencies: [],
                            tags: ["setup"]
                        }],
                        estimated_hours: 2,
                        priority: 4,
                        status: "pending"
                    }]
                }],
                proposals: [],
                total_estimated_hours: 2,
                total_tasks: 1,
                total_milestones: 1,
                dependencies_graph: []
            };

            setEnhancedRoadmap(fallbackRoadmap);
            goToStep('roadmap');
        }
    };

    const startEditingStep = (stepIndex: number) => {
        if (!enhancedRoadmap) return;
        setEditingStepIndex(stepIndex);
        setEditedStep({ ...enhancedRoadmap.roadmap.steps[stepIndex] });
    };

    const cancelEditingStep = () => {
        setEditingStepIndex(null);
        setEditedStep(null);
    };

    const saveEditedStep = () => {
        if (!enhancedRoadmap || editingStepIndex === null || !editedStep) return;

        const updatedSteps = [...enhancedRoadmap.roadmap.steps];
        updatedSteps[editingStepIndex] = editedStep;

        const updatedRoadmap = {
            ...enhancedRoadmap,
            roadmap: {
                ...enhancedRoadmap.roadmap,
                steps: updatedSteps
            }
        };

        setEnhancedRoadmap(updatedRoadmap);
        setRoadmap(updatedRoadmap.roadmap);
        setEditingStepIndex(null);
        setEditedStep(null);
    };

    const startEditingChecklistItem = (itemIndex: number) => {
        if (!enhancedRoadmap) return;
        setEditingChecklistItemIndex(itemIndex);
        setEditedChecklistItem({ ...enhancedRoadmap.checklist.items[itemIndex] });
    };

    const cancelEditingChecklistItem = () => {
        setEditingChecklistItemIndex(null);
        setEditedChecklistItem(null);
    };

    const saveEditedChecklistItem = () => {
        if (!enhancedRoadmap || editingChecklistItemIndex === null || !editedChecklistItem) return;

        const updatedItems = [...enhancedRoadmap.checklist.items];
        updatedItems[editingChecklistItemIndex] = editedChecklistItem;

        const updatedRoadmap = {
            ...enhancedRoadmap,
            checklist: {
                ...enhancedRoadmap.checklist,
                items: updatedItems
            }
        };

        setEnhancedRoadmap(updatedRoadmap);
        setEditingChecklistItemIndex(null);
        setEditedChecklistItem(null);
    };

    const regenerateIdeas = async () => {
        // Scroll to top immediately when starting regeneration
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setLoading(true);
        setLoadingStage('Preparing to regenerate ideas');
        setLoadingProgress(0);
        setLoadingMessages([]);

        // Show progress animation with stages
        const updateProgress = () => {
            const stages = [
                { message: 'Analyzing previous suggestions...', progress: 15 },
                { message: 'Finding new creative directions...', progress: 30 },
                { message: 'Exploring alternative project domains...', progress: 45 },
                { message: 'Identifying unique technology combinations...', progress: 60 },
                { message: 'Generating fresh project ideas...', progress: 75 },
                { message: 'Finalizing new recommendations...', progress: 90 },
            ];

            let currentStage = 0;

            const progressInterval = setInterval(() => {
                if (currentStage < stages.length) {
                    const stage = stages[currentStage];
                    setLoadingStage(stage.message);
                    setLoadingProgress(stage.progress);
                    setLoadingMessages(prev => [...prev, stage.message]);
                    currentStage++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 1200); // Slightly faster than initial generation

            return progressInterval;
        };

        const progressInterval = updateProgress();

        try {
            // Determine the timeframe to send using the same logic as analyzeInterests
            let timeframeToSend = '';

            if (userProfile.estimatedTime === 'Custom' && userProfile.customTimePeriod) {
                // Use the custom time period from the profile
                timeframeToSend = userProfile.customTimePeriod;
            } else if (userProfile.estimatedTime === 'By Deadline' && userProfile.deadline) {
                // Use the deadline from the profile
                const deadlineDate = new Date(userProfile.deadline);
                const today = new Date();
                const diffTime = Math.abs(deadlineDate.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 14) {
                    timeframeToSend = '1-2 weeks';
                } else if (diffDays <= 30) {
                    timeframeToSend = '3-4 weeks';
                } else if (diffDays <= 90) {
                    timeframeToSend = '1-3 months';
                } else if (diffDays <= 180) {
                    timeframeToSend = '3-6 months';
                } else {
                    timeframeToSend = '6+ months';
                }
            } else if (userProfile.estimatedTime && userProfile.estimatedTime !== 'Custom' && userProfile.estimatedTime !== 'By Deadline') {
                timeframeToSend = userProfile.estimatedTime;
            } else {
                timeframeToSend = 'Any';
            }

            // Use the selected difficulty or the one from the user profile
            const difficultyToSend = userProfile.preferredDifficulty || 'Any';

            // Combine any user adjustments with the additional input
            const combinedReference = (userProfile.reference || '') +
                (regenerationAdjustments ? `\n\nAdjustments for new ideas: ${regenerationAdjustments}` : '') +
                "\n\nPlease generate different ideas than before.";

            // Call AI agent directly instead of backend - use environment variable or fallback to localhost for dev
            const AI_AGENT_URL = config.AI_AGENT_URL;
            const regenerateRequestBody = {
                skills: userProfile.skills,
                interests: userProfile.interests,
                goal: userProfile.goal || '',
                reference: combinedReference,
                hoursPerWeek: userProfile.hoursPerWeek === 'Custom' ? userProfile.customHoursPerWeek : userProfile.hoursPerWeek || '',
                preferredDifficulty: difficultyToSend,
                preferredTimeframe: timeframeToSend,
                deadline: userProfile.deadline || '',
                customTimePeriod: userProfile.customTimePeriod || '',
                numIdeas: 5, // Request 5 ideas by default
            };

            console.log('🔄 Regenerating ideas - Request body:', JSON.stringify(regenerateRequestBody, null, 2));

            const response = await fetch(`${AI_AGENT_URL}/ai-api/agents/project-ideas?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify(regenerateRequestBody),
            });

            clearInterval(progressInterval);
            setLoadingProgress(100);
            setLoadingStage('Completing regeneration');

            const data = await response.json();
            console.log('🔄 Regenerate - Raw response:', data);

            // Handle both structured and stringified JSON responses
            let ideas;
            if (data.response && typeof data.response === 'object' && data.response.projectIdeas) {
                // Response is already a structured object
                ideas = data.response.projectIdeas;
            } else if (data.response && typeof data.response === 'string') {
                // Response is a JSON string that needs to be parsed
                try {
                    const parsedResponse = JSON.parse(data.response);
                    ideas = parsedResponse.projectIdeas || [];
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    diagnoseJsonError(data.response, parseError as Error);
                    throw new Error('Server returned invalid JSON structure');
                }
            } else {
                console.error('Server returned unexpected response format:', data);
                // Add the same handling code as in analyzeInterests
                if (data.response && typeof data.response === 'object') {
                    // Try to extract project ideas from unexpected response formats
                    if (Array.isArray(data.response)) {
                        // If the response is an array, treat it as project ideas
                        ideas = data.response;
                    } else if (Object.keys(data.response).length > 0) {
                        // Check if the response itself looks like a project idea
                        const possibleIdea = data.response;
                        if (possibleIdea.title && possibleIdea.description) {
                            // Convert single idea to array
                            ideas = [possibleIdea];
                        } else {
                            // Look for any arrays in the response that might contain ideas
                            for (const key in possibleIdea) {
                                if (Array.isArray(possibleIdea[key]) && possibleIdea[key].length > 0) {
                                    // Check if the first item has title and description
                                    const firstItem = possibleIdea[key][0];
                                    if (firstItem && typeof firstItem === 'object' && firstItem.title && firstItem.description) {
                                        ideas = possibleIdea[key];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // If we still couldn't find ideas, throw an error
                    if (!ideas) {
                        throw new Error('Server returned unexpected JSON structure');
                    }
                } else {
                    throw new Error('Server returned unexpected JSON structure');
                }
            }

            if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
                throw new Error('No project ideas found in the response');
            }

            console.log('🔄 Regenerate - Parsed ideas:', ideas.map(idea => ({ title: idea.title, desc: idea.description?.substring(0, 50) })));

            // Clean up potentially corrupted project ideas
            const cleanedIdeas = ensureCompleteProjectIdeas(ideas);

            console.log('🔄 Regenerate - Setting state with', cleanedIdeas.length, 'ideas');

            setProjectIdeas(cleanedIdeas);
            setHasGeneratedIdeas(true);

            // Clear the regeneration adjustments after successful generation
            setRegenerationAdjustments('');
        } catch (error) {
            clearInterval(progressInterval);
            setLoadingStage('Error occurred');
            console.error('Error regenerating ideas:', error);

            // Create fallback project ideas if the request fails
            setProjectIdeas([
                {
                    title: "Error Regenerating Ideas",
                    description: "We encountered an error while regenerating project ideas. Please try again or adjust your inputs.",
                    difficulty: "Beginner" as const,
                    estimatedTime: "N/A",
                    keyTechnologies: ["Error"],
                    keyFeatures: ["Please try again"],
                    learningOutcomes: ["Try refreshing the page or changing your inputs"]
                }
            ]);
        } finally {
            setTimeout(() => {
                setLoading(false);
                setLoadingProgress(0);
                setLoadingStage('');
            }, 500); // Short delay to ensure user sees the completion
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditedIdea(null);
    };

    const saveEditedIdea = () => {
        if (editedIdea) {
            const updatedIdeas = projectIdeas.map(idea =>
                idea === selectedIdea ? editedIdea : idea
            );
            setProjectIdeas(updatedIdeas);
            setSelectedIdea(editedIdea);
            setIsEditing(false);
            setEditedIdea(null);
        }
    };

    // Show loading indicator while session is being loaded
    if (isLoadingSession) {
        return (
            <div className="container mx-auto py-6 px-4 max-w-6xl">
                <div className="flex justify-center items-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading your workflow session...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                    {step === 'analyze' && t('aiAssistant.steps.analyze')}
                    {step === 'ideas' && t('aiAssistant.steps.ideas')}
                    {step === 'roadmap' && t('aiAssistant.steps.roadmap')}
                </h1>
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                {step === 'analyze' && (
                    <>
                        <AnalyzeStep
                            profile={userProfile}
                            setProfile={setUserProfile}
                            onAnalyze={analyzeInterests}
                            onSkipToRoadmap={handleSkipToRoadmap}
                            loadingState={{
                                loading,
                                loadingStage,
                                loadingProgress,
                                loadingMessages
                            }}
                        />

                        {/* Show "Back to Ideas" button if ideas were previously generated */}
                        {hasGeneratedIdeas && projectIdeas.length > 0 && !loading && (
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => {
                                        window.scrollTo({ top: 0, behavior: 'auto' });
                                        goToStep('ideas');
                                    }}
                                    className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    {t('aiAssistant.buttons.backToIdeas')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {step === 'ideas' && (
                    <>
                        <IdeasStep
                            ideas={projectIdeas}
                            selectedIdea={selectedIdea}
                            onSelectIdea={setSelectedIdea}
                            onGenerateRoadmap={() => selectedIdea && generateRoadmap(selectedIdea)}
                            onRegenerateIdeas={regenerateIdeas}
                            isLoading={loading}
                            onPrevious={() => {
                                window.scrollTo({ top: 0, behavior: 'auto' });
                                goToStep('analyze');
                            }}
                            regenerationAdjustments={regenerationAdjustments}
                            setRegenerationAdjustments={setRegenerationAdjustments}
                            loadingProgress={loadingProgress}
                            loadingStage={loadingStage}
                            loadingMessages={loadingMessages}
                        />

                        {/* Show "Back to Roadmap" button if a roadmap was previously generated */}
                        {window.localStorage.getItem('hasGeneratedRoadmap') === 'true' && enhancedRoadmap && (
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => {
                                        window.scrollTo({ top: 0, behavior: 'auto' });
                                        goToStep('roadmap');
                                    }}
                                    className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    {t('aiAssistant.buttons.backToRoadmap')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {step === 'roadmap' && enhancedRoadmap && (
                    <RoadmapStep
                        enhancedRoadmap={enhancedRoadmap}
                        isLoading={loading}
                        onPrevious={() => {
                            window.scrollTo({ top: 0, behavior: 'auto' });
                            goToStep('ideas');
                        }}
                        loadingState={{
                            loadingStage,
                            loadingProgress,
                            loadingMessages
                        }}
                        selectedIdea={selectedIdea}
                    />
                )}
            </div>

            {/* Add Skill Modal */}
            <AddItemModal
                isOpen={showAddSkillModal}
                onClose={() => setShowAddSkillModal(false)}
                onAdd={handleAddSkill}
                title={t('aiAssistant.modals.addSkill.title')}
                placeholder={t('aiAssistant.modals.addSkill.placeholder')}
            />

            {/* Add Interest Modal */}
            <AddItemModal
                isOpen={showAddInterestModal}
                onClose={() => setShowAddInterestModal(false)}
                onAdd={handleAddInterest}
                title={t('aiAssistant.modals.addInterest.title')}
                placeholder={t('aiAssistant.modals.addInterest.placeholder')}
            />

            {/* Edit Idea Modal */}
            {isEditing && editedIdea && (
                <EditIdeaModal
                    editedIdea={editedIdea}
                    setEditedIdea={setEditedIdea}
                    cancelEditing={cancelEditing}
                    saveEditedIdea={saveEditedIdea}
                />
            )}

            {/* Edit Roadmap Step Modal */}
            {editingStepIndex !== null && roadmap && (
                <EditStepModal
                    step={editedStep}
                    setStep={setEditedStep}
                    cancelEditing={cancelEditingStep}
                    saveStep={saveEditedStep}
                />
            )}

            {/* Edit Checklist Item Modal */}
            {editingChecklistItemIndex !== null && enhancedRoadmap && editedChecklistItem && (
                <EditChecklistItemModal
                    editedChecklistItem={editedChecklistItem}
                    setEditedChecklistItem={setEditedChecklistItem}
                    cancelEditingChecklistItem={cancelEditingChecklistItem}
                    saveEditedChecklistItem={saveEditedChecklistItem}
                />
            )}

            {/* Project Tutorial Component */}
            <ProjectTutorial />

            {/* Session Continuation Dialog */}
            {showSessionDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center mb-4">
                            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3 mr-4">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {t('aiAssistant.dialog.existingSession.title') || 'Continue Your Project?'}
                            </h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {t('aiAssistant.dialog.existingSession.message') || 'You have an existing project draft. Would you like to continue where you left off or start fresh?'}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleContinueSession}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors duration-200"
                            >
                                {t('aiAssistant.dialog.existingSession.continue') || 'Continue Draft'}
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg font-semibold transition-colors duration-200"
                            >
                                {t('aiAssistant.dialog.existingSession.startFresh') || 'Start Fresh'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIProjectAssistant; 