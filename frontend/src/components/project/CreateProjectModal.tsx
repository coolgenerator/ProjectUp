import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store.ts";
import config from "../../config.ts"
import { PostDetails } from "../../types/project/postDetails.ts";
import { ProjectDetails } from "../../types/project/projectDetails.ts"
import fetchWithAuth from "../../hooks/fetchWithAuth.tsx";
import CreateProject from "./ProjectModal/CreateProject.tsx";
import CreatePost from "./ProjectModal/CreatePost.tsx";

const { API_BASE_URL, AWS_BASE_URL } = config;

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectData?: ProjectDetails | null;
    roadmap?: any[];
    checklist?: any[];
    curriculum?: any;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, projectData, roadmap = [], checklist = [], curriculum = null }) => {
    const { shortId } = useParams();
    const isUpdating = !!shortId;
    // Project states
    const [step, setStep] = useState(1); // Track steps
    const [savedCover, setSavedCover] = useState<string | null>(null);
    const [errors, setErrors] = useState<{
        [key: string]: string;
    }>({});
    // Add submission lock to prevent duplicate creation
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    // Reset lock when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setIsSubmitting(false);
            setHasSubmitted(false);
        }
    }, [isOpen]);
    const coverRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const topicRef = useRef<HTMLDivElement>(null);
    const descriptionRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLInputElement>(null);
    const startTimeRef = useRef<HTMLInputElement>(null);
    const schoolRef = useRef<HTMLInputElement>(null);
    const user = useSelector((state: RootState) => state.auth.user);
    const [newPost, setNewPost] = useState(true);
    const [userSchool, setUserSchool] = useState<string | null>(null);
    const [isSchoolVerified, setIsSchoolVerified] = useState(false);
    const [temporaryTopics] = useState<string[]>([
        "AI",
        "IoT",
        "Healthcare",
        "Education",
        "Sustainability",
        "Data Science",
        "Quantum Computing",
        "Robotics",
        "Business",
        "Design",
        "Algorithm",
    ]);
    const [topicInput, setTopicInput] = useState("");

    const [newProject, setNewProject] = useState<ProjectDetails>({
        post_id: projectData?.post_id || 0,
        cover: projectData?.cover ? AWS_BASE_URL + projectData.cover : null,
        media: projectData?.media?.map(m => (typeof m === "string" ? AWS_BASE_URL + m : m)) || [],
        type: projectData?.type || "",
        topic: projectData?.topic || [],
        name: projectData?.name || "",
        startTime: projectData?.startTime || new Date().toISOString().split("T")[0],
        deadline: projectData?.deadline || "",
        location: projectData?.location || "",
        communicationApp: projectData?.communicationApp || "",
        description: projectData?.description || "",
        otherApp: projectData?.otherApp || "",
        school: projectData?.school || "",
        class: projectData?.class || "",
        otherType: projectData?.otherType || ""
    });

    // Fetch user profile to get school information
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/api/my-profile`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.user?.school) {
                        setUserSchool(data.user.school);
                        setIsSchoolVerified(!!data.user.school_email_verified);

                        // If creating a new project, automatically set the school but only if verified
                        if (!isUpdating && !projectData?.school && data.user.school_email_verified) {
                            setNewProject(prev => ({
                                ...prev,
                                school: data.user.school
                            }));
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };

        if (user?.id) {
            fetchUserProfile();
        }
    }, [user?.id, isUpdating, projectData?.school]);

    useEffect(() => {
        if (projectData?.cover) {
            setSavedCover(AWS_BASE_URL + projectData.cover);
        }
        if (projectData?.post?.[0]?.cover) {
            setSavedPostCover(AWS_BASE_URL + projectData.post[0].cover);
        }
    }, [projectData]);

    // Post states
    const [savedPostCover, setSavedPostCover] = useState<string | null>(null);
    const postStartTimeRef = useRef<HTMLInputElement>(null);
    const postCoverRef = useRef<HTMLInputElement>(null);
    const postPositionsRef = useRef<HTMLDivElement>(null);
    const postTitleRef = useRef<HTMLInputElement>(null);
    const postTypeRef = useRef<HTMLInputElement>(null);
    const postDescriptionRef = useRef<HTMLInputElement>(null);
    const [postErrors, setPostErrors] = useState<{
        [key: string]: string;
    }>({});

    // Check if in tutorial mode
    const isTutorialMode = new URLSearchParams(window.location.search).get('tutorial') === 'true';

    const [postDetails, setPostDetails] = useState<PostDetails>({
        title: projectData?.post?.[0]?.title || (isTutorialMode ? "Join Our Study Habit Tracker Team!" : ""),
        cover: projectData?.post?.[0]?.cover ? AWS_BASE_URL + projectData.post[0].cover : null,
        media: projectData?.post?.[0]?.media?.map(m => (typeof m === "string" ? AWS_BASE_URL + m : m)) || [],
        startDate: projectData?.post?.[0]?.startDate || new Date().toISOString().split("T")[0],
        deadline: projectData?.post?.[0]?.deadline || "",
        location: projectData?.post?.[0]?.location || (isTutorialMode ? "Remote" : ""),
        topic: projectData?.post?.[0]?.topic || (isTutorialMode ? ["Mobile Development", "Education Technology"] : []),
        description: projectData?.post?.[0]?.description || (isTutorialMode ? "Looking for talented developers to help build a mobile app that helps students track study habits and improve productivity." : ""),
        otherType: projectData?.post?.[0]?.otherType || "",
        positions: projectData?.post?.[0]?.positions || (isTutorialMode ? [
            { name: "Frontend Developer", responsibility: "Build React Native mobile UI components", spots: 2 },
            { name: "Backend Developer", responsibility: "Develop Node.js API and database", spots: 1 }
        ] : [{ name: "", responsibility: "", spots: 1 }]),
        questions: projectData?.post?.[0]?.questions || [{ type: 0, text: "Why would you like to join?", choices: [] }],
        visibility: projectData?.post?.[0]?.visibility || (isTutorialMode ? 2 : null), // Default to "Public" in tutorial mode
        publishProject: projectData?.isPublished || false,
    });

    const handlePostProject = async (e: React.FormEvent, action: "save" | "post" | "next"): Promise<string | null> => {
        try {
            // Prevent duplicate submissions
            if (isSubmitting || hasSubmitted) {
                console.log("Submission already in progress or completed");
                return null;
            }

            if (action === "save" || action === "post") {
                setIsSubmitting(true);
            }

            console.log("Action:", action);
            console.log("Initial New Project State:", JSON.stringify(newProject, null, 2));

            // Validate fields
            const validationErrors = validateFields();
            if (Object.keys(validationErrors).length > 0) {
                handleScrollToError(validationErrors);
                setIsSubmitting(false);
                return null; // Stop submission if there are validation errors
            }

            // Ensure required defaults
            const updatedNewProject = {
                ...newProject,
                type: newProject.type || newProject.otherType,
                communicationApp: newProject.communicationApp || newProject.otherApp,
            };
            setNewProject(updatedNewProject); // Update state to reflect defaults

            if (action === "save" || action === "post") {
                e.preventDefault();
                const formData = new FormData();
                formData.append("id", user?.id?.toString() || "");

                // Add newProject fields to formData
                Object.entries(updatedNewProject).forEach(([key, value]) => {
                    if (value instanceof File) formData.append(key, value);
                    else if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
                    else formData.append(key, value as string);
                });

                console.log("FormData Entries:");
                formData.forEach((value, key) => {
                    console.log(`${key}:`, value);
                });

                const apiUrl = isUpdating
                    ? `${API_BASE_URL}/api/update-project/${shortId}`  // Update project using sid
                    : `${API_BASE_URL}/api/projects/create`;  // Create new project

                const method = isUpdating ? "PUT" : "POST"; // Use PUT for updates

                const response = await fetchWithAuth(apiUrl, {
                    method,
                    body: formData,
                });

                if (!response.ok) {
                    setIsSubmitting(false);
                    throw new Error("Failed to save project");
                }
                const res = await response.json();

                if (action === "save") {
                    // Dispatch custom event when project is created
                    window.dispatchEvent(new CustomEvent('projectCreated', {
                        detail: {
                            projectId: res.project.project_id,
                            projectSid: res.project.sid
                        }
                    }));
                    setHasSubmitted(true);
                    alert("Project saved successfully. You can find it under My > Projects.");
                    onClose();
                }

                console.log("Response from Server:", res);
                console.log("Project ID: ", res.project.project_id);
                return res.project.project_id;
            } else if (action === "next") {
                setStep(2); // Move to step 2
                setNewPost(false);
                // Explicitly sync topics from project to post
                setPostDetails(prev => ({
                    ...prev,
                    topic: [...newProject.topic]
                }));
            }
        } catch (error) {
            setIsSubmitting(false);
            console.error("Failed to save project:", error);
        }
        return null;
    };

    const handleSaveAll = async (e: React.FormEvent) => {
        // In tutorial mode, skip actual project creation
        if (isTutorialMode) {
            // Dispatch custom event to simulate success without creating project
            const event = new CustomEvent('saveAll', {
                detail: {
                    projectId: 999999, // Fake ID for tutorial
                    projectSid: 'tutorial-project'
                }
            });
            window.dispatchEvent(event);
            return;
        }
        try {
            // Prevent duplicate submissions
            if (isSubmitting || hasSubmitted) {
                console.log("Submission already in progress or completed");
                return;
            }

            setIsSubmitting(true);
            e.preventDefault();

            // Step 1: Validate project data
            const validationErrors = validateFields();
            if (Object.keys(validationErrors).length > 0) {
                handleScrollToError(validationErrors);
                setIsSubmitting(false);
                return;
            }

            // Step 2: Validate post data
            const postValidationErrors = postValidateFields();
            if (Object.keys(postValidationErrors).length > 0) {
                handlePostScrollToError(postValidationErrors);
                setIsSubmitting(false);
                return;
            }

            // Step 3: Prepare the request data for the combined endpoint
            // Include all fields from both projectDetails and postDetails
            const requestData = {
                // From ProjectDetails
                post_id: newProject.post_id || 0,
                name: newProject.name,
                title: newProject.name, // For the backend API compatibility
                type: newProject.type,
                projectType: newProject.type || newProject.otherType || "",
                topic: newProject.topic,
                topicStr: newProject.topic.join(", "), // For the backend API compatibility
                startTime: newProject.startTime,
                deadline: newProject.deadline,
                location: newProject.location || "Online",
                communicationApp: newProject.communicationApp || newProject.otherApp || "",
                description: newProject.description,
                otherApp: newProject.otherApp,
                school: newProject.school || "",
                class: newProject.class || "",
                otherType: newProject.otherType,
                isPublished: postDetails.publishProject || false,
                cover: savedCover, // This should be the URL if already uploaded
                media: newProject.media, // This will include the media files or URLs

                // Post-related flags
                createPost: true,

                // From PostDetails
                post: [{
                    title: postDetails.title,
                    cover: savedPostCover,
                    media: postDetails.media,
                    startDate: postDetails.startDate || newProject.startTime, // Use project startTime as fallback
                    deadline: postDetails.deadline || newProject.deadline, // Use project deadline as fallback
                    location: postDetails.location || newProject.location || "Online",
                    topic: postDetails.topic,
                    description: postDetails.description,
                    otherType: postDetails.otherType,
                    positions: postDetails.positions || [],
                    questions: postDetails.questions || [],
                    visibility: postDetails.visibility !== null ? postDetails.visibility : 2, // Default to public if not set
                    publishProject: postDetails.publishProject || false
                }],

                // Use the roadmap, checklist, and curriculum passed from props
                roadmap: roadmap || [],
                checklist: checklist || [],
                curriculum: curriculum || null
            };

            console.log("Saving project and post with data:", requestData);
            console.log("Roadmap, checklist, curriculum data:", { roadmap, checklist, curriculum });

            // Step 4: Send the API request
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/save-all`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            // Step 5: Handle the response
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Save error:", errorText);
                setIsSubmitting(false);
                throw new Error(`Failed to save project and post: ${response.status} ${errorText}`);
            }

            // Log the raw response for debugging
            const rawResponseText = await response.text();
            console.log("Raw response:", rawResponseText);

            // Parse the response text into JSON
            let result;
            try {
                result = JSON.parse(rawResponseText);
                console.log("Parsed result:", result);
            } catch (parseError) {
                console.error("Failed to parse response as JSON:", parseError);
                setIsSubmitting(false);
                throw new Error("Invalid JSON response from server");
            }

            // Mark as submitted to prevent duplicates
            setHasSubmitted(true);

            // Dispatch custom saveAll event with the new project ID and SID
            if (result.project && result.project.projectID) {
                window.dispatchEvent(new CustomEvent('saveAll', {
                    detail: {
                        projectId: result.project.projectID,
                        projectSid: result.project.sid
                    }
                }));

                alert("Project and Post saved successfully!");
                onClose();
                window.location.href = '/my-projects';
            } else if (result.projectId) {
                // Alternative: check if projectId is directly in the result
                window.dispatchEvent(new CustomEvent('saveAll', {
                    detail: {
                        projectId: result.projectId,
                        projectSid: result.sid
                    }
                }));

                alert("Project and Post saved successfully!");
                onClose();
                window.location.href = '/my-projects';
            } else {
                console.error("Response missing project ID:", result);
                throw new Error("Invalid response format: missing project ID");
            }
        } catch (error) {
            setIsSubmitting(false);
            console.error("Error saving project and post:", error);
            alert(`An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    const postValidateFields = () => {
        const newErrors: { [key: string]: string } = {};

        // Skip cover validation in tutorial mode
        if (!postDetails.cover && !isTutorialMode) newErrors.cover = "Cover image is required.";
        if (!postDetails.title) newErrors.title = "Post title is required.";
        if (!postDetails.topic.length) newErrors.topic = "At least one topic is required.";
        if (
            postDetails.positions.length === 0 ||
            postDetails.positions.every(position =>
                !position.name.trim() &&
                !position.responsibility.trim() &&
                position.spots <= 0
            )
        ) {
            newErrors.positions = "At least one valid position is required.";
        } else {
            // Check each position for required fields
            let hasPositionError = false;
            postDetails.positions.forEach((position, index) => {
                if (!position.name.trim()) {
                    newErrors[`position_${index}_name`] = "Position name is required";
                    hasPositionError = true;
                }
                if (!position.responsibility.trim()) {
                    newErrors[`position_${index}_responsibility`] = "Responsibility is required";
                    hasPositionError = true;
                }
                if (position.spots <= 0) {
                    newErrors[`position_${index}_spots`] = "Spots must be greater than 0";
                    hasPositionError = true;
                }
            });
            if (hasPositionError) {
                newErrors.positions = "Please fix the errors in your positions";
            }
        }

        if (!postDetails.description) newErrors.description = "Description is required.";
        if (!postDetails.startDate) newErrors.startDate = "Start date is required.";
        if (!postDetails.visibility) newErrors.visibility = "Visibility setting is required.";
        if (postDetails.deadline && postDetails.startDate && postDetails.deadline < postDetails.startDate) {
            newErrors.deadline = "Deadline must be later than Start Date.";
        }

        setPostErrors(newErrors);

        return newErrors;
    };

    const handlePostScrollToError = (errors: { [key: string]: string }) => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length === 0) return;

        if (errors.cover) postCoverRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.title) postTitleRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.positions || errorKeys.some(key => key.startsWith('position_'))) postPositionsRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.description) postDescriptionRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.type) postTypeRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.startDate || errors.deadline) postStartTimeRef.current?.scrollIntoView({ behavior: "smooth" });
        else {
            // If none of the above, scroll to the first form element as a fallback
            postCoverRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleTopicSelect = (topic: string) => {
        if (!newProject.topic.includes(topic)) {
            setNewProject((prev) => ({
                ...prev,
                topic: [...prev.topic, topic],
            }));

            // Sync with postDetails if we're in step 1, regardless of newPost value
            if (step === 1) {
                setPostDetails(prev => ({
                    ...prev,
                    topic: [...prev.topic, topic]
                }));
            }
        }
    };

    const handleTopicRemove = (index: number) => {
        setNewProject((prev) => ({
            ...prev,
            topic: prev.topic.filter((_, i) => i !== index),
        }));

        // Sync with postDetails if we're in step 1, regardless of newPost value
        if (step === 1) {
            setPostDetails((prev) => ({
                ...prev,
                topic: prev.topic.filter((_, i) => i !== index)
            }));
        }
    };

    const handleCustomTopicAdd = () => {
        if (topicInput && !newProject.topic.includes(topicInput)) {
            setNewProject((prev) => ({
                ...prev,
                topic: [...prev.topic, topicInput],
            }));

            // Sync with postDetails if we're in step 1, regardless of newPost value
            if (step === 1) {
                setPostDetails(prev => ({
                    ...prev,
                    topic: [...prev.topic, topicInput]
                }));
            }

            setTopicInput("");
        }
    };

    const handleInputChange = (field: string, value: any) => {
        if (step === 1) {
            setNewProject((prev) => {
                if (field === "startTime") {
                    if (value === "immediately") {
                        const today = new Date().toISOString().split("T")[0];
                        return { ...prev, startTime: today, deadline: prev.deadline < today ? "" : prev.deadline };
                    }
                    return { ...prev, startTime: value };
                }

                if (field === "deadline") {
                    if (value && prev.startTime && value <= prev.startTime) {
                        alert("Deadline must be later than the Start Time.");
                        return prev;
                    }
                    return { ...prev, deadline: value };
                }

                // If changing project type to "School Work" and user has a verified school, auto-fill it
                if (field === "type" && value === "School Work" && userSchool && isSchoolVerified) {
                    return { ...prev, [field]: value, school: userSchool };
                }

                return { ...prev, [field]: value };
            });
            if (newPost) {
                setPostDetails((prev) => {
                    if (field === "name") {
                        return { ...prev, title: value };
                    }
                    // If changing project type to "School Work" and user has a verified school, auto-fill it
                    if (field === "type" && value === "School Work" && userSchool && isSchoolVerified) {
                        return { ...prev, [field]: value, school: userSchool };
                    }
                    return { ...prev, [field]: value };
                });
            }
        } else if (step === 2) {
            setPostDetails((prev) => {
                if (field === "startDate") {
                    if (value === "immediately") {
                        const today = new Date().toISOString().split("T")[0];
                        return { ...prev, startDate: today, deadline: prev.deadline < today ? "" : prev.deadline };
                    }
                    return { ...prev, startDate: value };
                }

                if (field === "deadline") {
                    if (value && prev.startDate && value <= prev.startDate) {
                        alert("Deadline must be later than the Start Date.");
                        return prev;
                    }
                    return { ...prev, deadline: value };
                }

                return { ...prev, [field]: value };
            });
        }
    };

    const handleAddPosition = () => {
        setPostDetails((prev) => ({
            ...prev,
            positions: [...prev.positions, { name: "", responsibility: "", spots: 1 }],
        }));
    };

    const handleRemovePosition = (index: number) => {
        setPostDetails((prev) => ({
            ...prev,
            positions: prev.positions.filter((_, i) => i !== index),
        }));
    };

    const handlePositionChange = (index: number, field: string, value: string | number) => {
        setPostDetails((prev) => {
            const updatedPositions = [...prev.positions];
            updatedPositions[index] = { ...updatedPositions[index], [field]: value };
            return { ...prev, positions: updatedPositions };
        });
    };

    const handleCropSave = async (file: File, croppedImageUrl: string, target: string) => {
        try {
            if (target === "project") {
                setNewProject((prev) => ({
                    ...prev,
                    cover: file,
                }));
                setSavedCover(croppedImageUrl);
                if (newPost) {
                    setPostDetails((prev) => ({
                        ...prev,
                        cover: file,
                    }));
                    setSavedPostCover(croppedImageUrl);
                }
            } else {
                setPostDetails((prev) => ({
                    ...prev,
                    cover: file,
                }));
                setSavedPostCover(croppedImageUrl);
            }
        } catch (err) {
            console.error("Failed to crop the image", err);
        }
    };

    const handleMediaUpdate = (media: File[], target: string) => {
        if (target === "project") {
            setNewProject((prev) => ({
                ...prev,
                media
            }));
            if (newPost) {
                setPostDetails((prev) => ({
                    ...prev,
                    media
                }));
            }
        } else {
            setPostDetails((prev) => ({
                ...prev,
                media
            }));
        }
    }

    const handleUnsplashImageSelect = (file: File, url: string, target: string) => {
        if (target === "project") {
            setNewProject((prev) => ({
                ...prev,
                cover: file,
            }));
            setSavedCover(url);
            if (newPost) {
                setPostDetails((prev) => ({
                    ...prev,
                    cover: file,
                }));
                setSavedPostCover(url);
            }
        } else {
            setPostDetails((prev) => ({
                ...prev,
                cover: file,
            }));
            setSavedPostCover(url);
        }
    }

    const validateFields = () => {
        const newErrors: { [key: string]: string } = {};

        // Skip cover validation in tutorial mode
        if (!newProject.cover && !isTutorialMode) newErrors.cover = "Cover image is required.";
        if (!newProject.name) newErrors.name = "Project name is required.";
        if (!newProject.type && !newProject.otherType) newErrors.type = "Project type is required.";
        if (!newProject.topic.length) newErrors.topic = "At least one topic is required.";
        if (!newProject.description) newErrors.description = "Description is required.";
        if (!newProject.startTime) newErrors.startTime = "Start time is required.";
        if (newProject.deadline && newProject.startTime && newProject.deadline <= newProject.startTime) {
            newErrors.deadline = "Deadline must be later than Start Time.";
        }

        // Check for school name when project type is School Work
        if (newProject.type === "School Work" && !newProject.school) {
            newErrors.school = "School name is required for school projects.";
        }

        setErrors(newErrors);

        return newErrors;
    };

    const handleScrollToError = (errors: { [key: string]: string }) => {
        if (errors.cover) coverRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.name) nameRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.topic) topicRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.description) descriptionRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.type) typeRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.startTime) startTimeRef.current?.scrollIntoView({ behavior: "smooth" });
        else if (errors.school) schoolRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    if (!isOpen) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div
                        className="flex min-h-screen items-center justify-center p-0 text-center sm:p-0"
                        aria-labelledby="modal-title"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity animate-[fade-in_0.2s_ease-in-out]"
                            aria-hidden="true"
                        ></div>

                        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle animate-[slide-up_0.3s_ease-out]">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 sm:px-6 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">
                                    {projectData ? "Edit Project" : "Create New Project"}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="text-white hover:text-gray-200 focus:outline-none"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="bg-white px-2 sm:px-6 pt-5 pb-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                                {/* Step Indicator */}
                                <div className="mb-6">
                                    <div className="flex justify-center items-center space-x-4">
                                        <div
                                            className={`flex flex-col items-center ${step === 1 ? "text-blue-600" : "text-gray-400"
                                                }`}
                                        >
                                            <div
                                                className={`rounded-full flex items-center justify-center w-8 h-8 text-sm font-bold ${step === 1
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-600"
                                                    }`}
                                            >
                                                1
                                            </div>
                                            <span className="mt-1 text-xs sm:text-sm font-medium">Project Details</span>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-gray-200 max-w-[100px]"></div>
                                        <div
                                            className={`flex flex-col items-center ${step === 2 ? "text-blue-600" : "text-gray-400"
                                                }`}
                                        >
                                            <div
                                                className={`rounded-full flex items-center justify-center w-8 h-8 text-sm font-bold ${step === 2
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-600"
                                                    }`}
                                            >
                                                2
                                            </div>
                                            <span className="mt-1 text-xs sm:text-sm font-medium">Post Details</span>
                                        </div>
                                    </div>
                                </div>

                                {step === 1 ? (
                                    <CreateProject
                                        newProject={newProject}
                                        savedCover={savedCover}
                                        errors={errors}
                                        coverRef={coverRef}
                                        nameRef={nameRef}
                                        topicRef={topicRef}
                                        descriptionRef={descriptionRef}
                                        typeRef={typeRef}
                                        startTimeRef={startTimeRef}
                                        schoolRef={schoolRef}
                                        temporaryTopics={temporaryTopics}
                                        topicInput={topicInput}
                                        setTopicInput={setTopicInput}
                                        handleInputChange={handleInputChange}
                                        handleTopicSelect={handleTopicSelect}
                                        handleTopicRemove={handleTopicRemove}
                                        handleCustomTopicAdd={handleCustomTopicAdd}
                                        handleCropSave={handleCropSave}
                                        handleUnsplashImageSelect={handleUnsplashImageSelect}
                                        handleMediaUpdate={handleMediaUpdate}
                                        newPost={newPost}
                                        setPostDetails={setPostDetails}
                                        isSchoolVerified={isSchoolVerified}
                                    />
                                ) : (
                                    // Step 2 content
                                    <CreatePost
                                        postDetails={postDetails}
                                        savedPostCover={savedPostCover}
                                        postErrors={postErrors}
                                        postCoverRef={postCoverRef}
                                        postTitleRef={postTitleRef}
                                        postPositionsRef={postPositionsRef}
                                        postDescriptionRef={postDescriptionRef}
                                        postTypeRef={postTypeRef}
                                        postStartTimeRef={postStartTimeRef}
                                        handleInputChange={handleInputChange}
                                        handleCropSave={handleCropSave}
                                        handleUnsplashImageSelect={handleUnsplashImageSelect}
                                        handleMediaUpdate={handleMediaUpdate}
                                        handleAddPosition={handleAddPosition}
                                        handleRemovePosition={handleRemovePosition}
                                        handlePositionChange={handlePositionChange}
                                        setPostDetails={setPostDetails}
                                        topicInput={topicInput}
                                        setTopicInput={setTopicInput}
                                    />
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                {step === 1 ? (
                                    <>
                                        <button
                                            data-tour="save-create-post-button"
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={(e) => handlePostProject(e, "next")}
                                        >
                                            Save & Create Post
                                        </button>
                                        <button
                                            data-tour="save-project-button"
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-blue-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={(e) => handlePostProject(e, "save")}
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            data-tour="save-all-button"
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={handleSaveAll}
                                        >
                                            Save All
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={() => setStep(1)}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CreateProjectModal;
