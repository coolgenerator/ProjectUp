import React, { useEffect, useState, useRef } from 'react';
import CreateProjectModal from '../../project/CreateProjectModal';

// Legacy localStorage functions removed - roadmap storage now handled directly in RoadmapStep.tsx

// Define our own ProjectPreviewDetails to match what we use in our component
export interface ProjectPreviewDetails {
    title: string;
    description: string;
    projectType: string;
    location: string;
    startTime: string;
    endTime: string;
    cover: string | null;
    communicationApp: string;
    topic?: string[];
    media?: any[];
}

// For compatibility with CreateProject component
export interface ProjectDetails {
    post_id: number;
    cover: string | File | null;
    media: (string | File)[];
    type: string;
    topic: string[];
    name: string;
    startTime: string;
    deadline: string;
    location: string;
    communicationApp: string;
    description: string;
    otherApp: string;
    school: string;
    class: string;
    otherType: string;
    post?: any[];
    isPublished?: boolean;
}

export interface ProjectIdea {
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    keyTechnologies: string[];
    keyFeatures: string[];
    learningOutcomes: string[];
    topic?: string;
}

export interface ProjectPreviewProps {
    projectDetails: ProjectPreviewDetails;
    selectedIdea: ProjectIdea | null;
    isShowingPreview: boolean;
    setIsShowingPreview: (value: boolean) => void;
    onSuccess: (projectId: number, projectSid?: string) => void;
    createPostOption?: boolean;
    setCreatePostOption?: React.Dispatch<React.SetStateAction<boolean>>;
    setProjectDetails?: React.Dispatch<React.SetStateAction<ProjectPreviewDetails>>;
}

// Create a wrapper for CreateProjectModal to handle project creation events
const CustomCreateProjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    projectData: ProjectDetails;
    onSuccess: (projectId: number, projectSid?: string) => void;
}> = ({ isOpen, onClose, projectData, onSuccess }) => {
    // Track if project was already created to prevent duplicates
    const [projectCreated, setProjectCreated] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
    const processedRef = useRef(false);

    // In tutorial mode, pre-fill cover with a default image
    const isTutorialMode = new URLSearchParams(window.location.search).get('tutorial') === 'true';
    const [enhancedProjectData, setEnhancedProjectData] = useState(projectData);

    useEffect(() => {
        if (isTutorialMode && isOpen && !projectData.cover) {
            // Use a default Unsplash image for tutorial
            const defaultCover = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop';
            setEnhancedProjectData({
                ...projectData,
                cover: defaultCover
            });
        } else {
            setEnhancedProjectData(projectData);
        }
    }, [isTutorialMode, isOpen, projectData]);

    // Listen for the "saveAll" custom event which indicates both project and post are saved together
    useEffect(() => {
        const handleSaveAll = (event: CustomEvent) => {
            if (event.detail && event.detail.projectId && !processedRef.current) {
                const projectId = event.detail.projectId;
                const projectSid = event.detail.projectSid;
                console.log('Project and post saved together with ID:', projectId, 'SID:', projectSid);

                processedRef.current = true;
                onSuccess(projectId, projectSid);
            }
        };

        // Subscribe to custom event for combined save
        window.addEventListener('saveAll', handleSaveAll as EventListener);

        return () => {
            window.removeEventListener('saveAll', handleSaveAll as EventListener);
        };
    }, [onSuccess]);

    // Note: Roadmap storage is now handled in RoadmapStep.tsx after project creation
    // This component only handles project creation events and callbacks

    // Listen for project creation events
    useEffect(() => {
        // Listen for project creation events
        const handleProjectCreated = (event: CustomEvent) => {
            if (event.detail && event.detail.projectId) {
                const projectId = event.detail.projectId;
                const projectSid = event.detail.projectSid;
                console.log('Project created with ID:', projectId, 'SID:', projectSid);

                // Set the created project ID and mark as created
                setCreatedProjectId(projectId);
                setProjectCreated(true);

                // If the user saves both project and post, processedRef is set inside handleSaveAll
                // If they only save the project, we need to call onSuccess here
                if (!processedRef.current) {
                    processedRef.current = true;
                    onSuccess(projectId, projectSid);
                }
            }
        };

        // Subscribe to custom event for project creation
        window.addEventListener('projectCreated', handleProjectCreated as EventListener);

        return () => {
            // Ensure we call onSuccess if component unmounts with a created project
            if (createdProjectId && !processedRef.current) {
                processedRef.current = true;
                onSuccess(createdProjectId);
            }
            window.removeEventListener('projectCreated', handleProjectCreated as EventListener);
        };
    }, [createdProjectId, onSuccess]);

    // Handle animation when modal closes
    const [isExiting, setIsExiting] = useState(false);

    const handleModalClose = () => {
        // Start exiting animation
        setIsExiting(true);

        // Wait for animation to complete before actually closing
        setTimeout(() => {
            setIsExiting(false);
            onClose();
        }, 200);
    };

    // Prevent opening the modal if a project was already created
    if (projectCreated && !isOpen) {
        return null;
    }

    return (
        <div className={`transition-opacity duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            <CreateProjectModal
                isOpen={isOpen && !projectCreated}
                onClose={handleModalClose}
                projectData={enhancedProjectData}
            />
        </div>
    );
};

// Legacy setupPostRedirectAction removed - roadmap storage now handled in RoadmapStep.tsx

const ProjectPreview: React.FC<ProjectPreviewProps> = ({
    projectDetails: initialProjectDetails,
    selectedIdea,
    isShowingPreview,
    setIsShowingPreview,
    onSuccess,
    createPostOption: externalCreatePostOption,
    setProjectDetails: externalSetProjectDetails
}) => {
    // Track the project details in local state
    const [localProjectDetails, setLocalProjectDetails] = useState<ProjectPreviewDetails>(initialProjectDetails);

    // Use external or local state for project details
    const projectDetails = localProjectDetails;
    const setProjectDetails = externalSetProjectDetails || setLocalProjectDetails;

    // Update local state when initialProjectDetails changes
    useEffect(() => {
        setProjectDetails(initialProjectDetails);
    }, [initialProjectDetails, setProjectDetails]);

    // Generate default positions based on project details and selected idea
    const generateDefaultPositions = () => {
        const positions = [];

        // Add a developer position by default
        positions.push({
            name: "Developer",
            responsibility: "Implement core functionalities and features of the project",
            spots: 2
        });

        // Check if there are design-related topics
        const designTopics = ["Design", "UI", "UX", "User Interface", "User Experience"];
        const hasDesignTopic = selectedIdea?.keyTechnologies?.some((tech: string) =>
            designTopics.some(dt => tech.toLowerCase().includes(dt.toLowerCase()))
        );

        if (hasDesignTopic) {
            positions.push({
                name: "UI/UX Designer",
                responsibility: "Design user interfaces and improve user experience",
                spots: 1
            });
        }

        // Check if there are data-related topics
        const dataTopics = ["Data", "AI", "Machine Learning", "Analytics", "Data Science"];
        const hasDataTopic = selectedIdea?.keyTechnologies?.some((tech: string) =>
            dataTopics.some(dt => tech.toLowerCase().includes(dt.toLowerCase()))
        );

        if (hasDataTopic) {
            positions.push({
                name: "Data Scientist",
                responsibility: "Develop models and analyze data for the project",
                spots: 1
            });
        }

        // Add Project Manager if not already present
        if (!positions.some(p => p.name.toLowerCase().includes("manager"))) {
            positions.push({
                name: "Project Manager",
                responsibility: "Coordinate tasks and ensure project milestones are met",
                spots: 1
            });
        }

        // Ensure we have at least 2 positions
        if (positions.length < 2) {
            positions.push({
                name: "Designer",
                responsibility: "Create visual assets and UI components for the project",
                spots: 1
            });
        }

        return positions;
    };

    // Format project details for CreateProjectModal
    // The isPublished flag is set based on externalCreatePostOption
    // This controls whether the project should be published as a post when saved
    // If externalCreatePostOption is true, the project will be published as a post
    const projectData: ProjectDetails = {
        post_id: 0,
        name: projectDetails.title,
        type: "Personal Project",
        cover: projectDetails.cover,
        media: projectDetails.media || [],
        topic: selectedIdea?.keyTechnologies || [],
        startTime: projectDetails.startTime,
        deadline: "", // No deadline by default
        location: projectDetails.location || "Online",
        communicationApp: projectDetails.communicationApp,
        description: projectDetails.description,
        otherApp: "",
        school: "",
        class: "",
        otherType: "",
        // Add post data with correct property names following the PostDetails interface
        post: [{
            title: projectDetails.title,
            cover: projectDetails.cover,
            media: projectDetails.media || [],
            startDate: projectDetails.startTime,
            deadline: "", // No deadline by default
            location: projectDetails.location || "Online",
            topic: selectedIdea?.keyTechnologies || [],
            description: projectDetails.description,
            otherType: "",
            positions: generateDefaultPositions(),
            questions: [{ type: 0, text: "Why would you like to join?", choices: [] }],
            visibility: null, // Let user select their preferred visibility option
        }],
        isPublished: !!externalCreatePostOption
    };

    // Log the data for debugging
    console.log('Initial Project Details:', initialProjectDetails);
    console.log('Project Details (used locally):', projectDetails);
    console.log('Project Data (sent to modal):', projectData);

    if (!isShowingPreview) return null;

    return (
        <div className="transition-opacity duration-300 ease-in-out">
            <CustomCreateProjectModal
                isOpen={isShowingPreview}
                onClose={() => setIsShowingPreview(false)}
                projectData={projectData}
                onSuccess={onSuccess}
            />
        </div>
    );
};

export default ProjectPreview; 