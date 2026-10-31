import React, { useRef, useState, useEffect } from "react";
import CoverSelector from "../../CoverSelector.tsx";
import AddMedia from "../../AddMedia.tsx";
import { ProjectDetails } from "../../../types/project/projectDetails.ts";
import config from "../../../config.ts";
import { PostDetails } from "../../../types/project/postDetails.ts";

const { AWS_BASE_URL } = config;

interface ProjectFormProps {
    setNewProject: React.Dispatch<React.SetStateAction<ProjectDetails>>;
    handleInputChange: (field: string, value: any) => void;
    handleNextStep: (e: React.FormEvent) => void;
    projectData?: ProjectDetails | null;
    onClose?: () => void;
    isUpdating?: boolean;
    newPost?: boolean;
    setPostDetails?: React.Dispatch<React.SetStateAction<PostDetails>>;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
    setNewProject,
    handleInputChange,
    handleNextStep,
    projectData,
    onClose,
    isUpdating = false,
    newPost = false,
    setPostDetails
}) => {
    const coverRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const topicRef = useRef<HTMLDivElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const typeRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [savedCover, setSavedCover] = useState<string | null>(null);

    const [topicInput, setTopicInput] = useState("");
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

    const project: ProjectDetails = {
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
    };

    useEffect(() => {
        if (projectData) {
            setSavedCover(projectData.cover ? AWS_BASE_URL + projectData.cover : null);
        }
    }, [projectData]);

    const handleCropSave = (file: File, croppedImageUrl: string) => {
        setNewProject((prev: ProjectDetails) => ({ ...prev, cover: file }));
        setSavedCover(croppedImageUrl);
    };

    const handleMediaUpdate = (media: File[]) => {
        setNewProject((prev: ProjectDetails) => ({ ...prev, media }));
    };

    const handleUnsplashImageSelect = (_file: File, downloadLocation: string, _target: string) => {
        setSavedCover(downloadLocation);
    };

    const handlePostProject = (e: React.FormEvent, action: "save" | "next") => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        // Validate required fields
        if (!project.name?.trim()) {
            newErrors.name = "Project name is required";
        }
        if (!project.cover) {
            newErrors.cover = "Cover image is required";
        }
        if (!project.description?.trim()) {
            newErrors.description = "Description is required";
        }
        if (!project.startTime) {
            newErrors.startTime = "Start time is required";
        }
        if (!project.type) {
            newErrors.type = "Project type is required";
        }
        if (!project.topic?.length) {
            newErrors.topic = "At least one topic is required";
        }

        setErrors(newErrors);

        // If there are errors, scroll to the first one
        if (Object.keys(newErrors).length > 0) {
            handleScrollToError();
            return;
        }

        // If no errors, proceed with the action
        if (action === "next") {
            handleNextStep(e);
        }
    };

    const handleTopicSelect = (topic: string) => {
        if (!project.topic.includes(topic)) {
            setNewProject((prev: ProjectDetails) => ({
                ...prev,
                topic: [...prev.topic, topic],
            }));
        }
    };

    const handleTopicRemove = (index: number) => {
        setNewProject((prev: ProjectDetails) => ({
            ...prev,
            topic: prev.topic.filter((_, i) => i !== index),
        }));
    };

    const handleCustomTopicAdd = () => {
        if (topicInput && !project.topic.includes(topicInput)) {
            setNewProject((prev: ProjectDetails) => ({
                ...prev,
                topic: [...prev.topic, topicInput],
            }));
            setTopicInput("");
        }
    };

    const handleScrollToError = () => {
        const errorRefs = {
            cover: coverRef,
            name: nameRef,
            topic: topicRef,
            description: descriptionRef,
            type: typeRef,
            startTime: startTimeRef
        };

        for (const [errorKey, ref] of Object.entries(errorRefs)) {
            if (errors[errorKey] && ref.current) {
                ref.current.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                break; // Only scroll to the first error
            }
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">step 1: Create a Project</h2>
            <p className="text-sm text-gray-500">Project details are visible exclusively to participants who have joined.</p>
            <br />
            <div className="space-y-4">
                {/* Upload Cover */}
                <div>
                    <label className="block mb-2 font-bold">
                        Choose Your Cover <span className="text-red-500">*</span>
                    </label>
                    <CoverSelector
                        coverRef={coverRef}
                        savedCover={savedCover}
                        handleCropSave={handleCropSave}
                        handleUnsplashImageSelect={handleUnsplashImageSelect}
                        target="project"
                        errors={errors}
                    />
                </div>

                {/* Upload Media */}
                <div>
                    <label className="block font-bold mb-2">Add Media (Images/Short Videos)</label>
                    <AddMedia
                        target="project"
                        onMediaChange={handleMediaUpdate}
                    />
                </div>

                {/* Project Details */}
                <div className="space-y-6">
                    {/* Project Name */}
                    <div>
                        <label className="block font-bold mb-2">Project Name <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">Enter the name of your project. Keep it concise and descriptive.</p>
                        <input
                            ref={nameRef}
                            type="text"
                            value={project.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Topics */}
                    <div ref={topicRef}>
                        <label className="block mb-2 font-bold">Topics <span className="text-red-500">*</span></label>
                        <div>
                            <label>Suggested Topics:</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                                {temporaryTopics.map((topic, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleTopicSelect(topic)}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: "16px",
                                            backgroundColor: "#007BFF",
                                            color: "white",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {topic}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label>Selected Topics:</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                                {project.topic.map((topic, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: "16px",
                                            backgroundColor: "#6c757d",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                        }}
                                    >
                                        {topic}
                                        <button
                                            type="button"
                                            onClick={() => handleTopicRemove(index)}
                                            style={{
                                                border: "none",
                                                background: "transparent",
                                                color: "white",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label>Add Custom Topic:</label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    type="text"
                                    value={topicInput}
                                    onChange={(e) => setTopicInput(e.target.value)}
                                    placeholder="Type a custom topic"
                                    style={{
                                        flex: "1",
                                        padding: "8px",
                                        borderRadius: "8px",
                                        border: "1px solid #ccc",
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleCustomTopicAdd}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        border: "none",
                                        backgroundColor: "#007BFF",
                                        color: "white",
                                        cursor: "pointer",
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                        {errors.topic && (
                            <p className="text-red-500 text-sm mt-1">{errors.topic}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-bold mb-2">Description <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">Provide a brief description of your project.</p>
                        <textarea
                            ref={descriptionRef}
                            value={project.description}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Project Type */}
                    <div ref={typeRef}>
                        <label className="block font-bold mb-2">Project Type <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">
                            Choose a type that best describes your project. If "School Work" is selected, provide additional details.
                        </p>
                        <select
                            value={project.type}
                            onChange={(e) => {
                                handleInputChange("type", e.target.value);
                                if (newPost && setPostDetails) {
                                    const selectedValue = e.target.value;
                                    setPostDetails((prev: PostDetails) => ({ ...prev, type: selectedValue }))
                                }
                            }}
                            className="w-full p-2 border rounded"
                        >
                            <option value="" disabled>Select Project Type</option>
                            <option value="Research">Research</option>
                            <option value="School Work">School Work</option>
                            <option value="Personal Project">Personal Project</option>
                            <option value="Others">Others</option>
                        </select>
                        {project.type === "School Work" && (
                            <div className="mt-4 space-y-2">
                                <input
                                    type="text"
                                    placeholder="School Name"
                                    value={project.school || ""}
                                    onChange={(e) => {
                                        handleInputChange("school", e.target.value);
                                        if (newPost && setPostDetails) {
                                            const selectedValue = e.target.value;
                                            setPostDetails((prev: PostDetails) => ({ ...prev, school: selectedValue }))
                                        }
                                    }}
                                    className="w-full p-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Class Name"
                                    value={project.class || ""}
                                    onChange={(e) => {
                                        handleInputChange("class", e.target.value)
                                        if (newPost && setPostDetails) {
                                            const selectedValue = e.target.value;
                                            setPostDetails((prev: PostDetails) => ({ ...prev, class: selectedValue }))
                                        }
                                    }}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        )}
                        {project.type === "Others" && (
                            <input
                                type="text"
                                placeholder="Specify your project type"
                                value={project.otherType || ""}
                                onChange={(e) => {
                                    handleInputChange("otherType", e.target.value)
                                    if (newPost && setPostDetails) {
                                        const selectedValue = e.target.value;
                                        setPostDetails((prev: PostDetails) => ({ ...prev, otherType: selectedValue }))
                                    }
                                }}
                                className="w-full p-2 border rounded mt-2"
                            />
                        )}
                        {errors.type && (
                            <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                        )}
                    </div>

                    {/* Start Time */}
                    <div ref={startTimeRef}>
                        <label className="block font-bold mb-2">Start Time <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">Choose when your project starts. You can select "Now" or specify a date.</p>
                        <div className="flex items-center space-x-4 mb-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="startTime"
                                    value="immediately"
                                    checked={project.startTime === new Date().toISOString().split("T")[0]}
                                    onChange={() => handleInputChange("startTime", "immediately")}
                                    className="form-radio"
                                />
                                <span>Now</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="startTime"
                                    value="specific"
                                    checked={project.startTime !== new Date().toISOString().split("T")[0]}
                                    onChange={() => handleInputChange("startTime", "")}
                                    className="form-radio"
                                />
                                <span>Specify Date</span>
                            </label>
                        </div>
                        {project.startTime !== new Date().toISOString().split("T")[0] && (
                            <input
                                type="date"
                                value={project.startTime || ""}
                                onChange={(e) => handleInputChange("startTime", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        )}
                        {errors.startTime && (
                            <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                        )}
                    </div>

                    {/* Deadline */}
                    <div>
                        <label className="block font-bold mb-2">Deadline</label>
                        <p className="text-sm text-gray-500 mb-1">Optionally provide the project's deadline.</p>
                        <input
                            type="date"
                            value={project.deadline}
                            onChange={(e) => handleInputChange("deadline", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block font-bold mb-2">Location</label>
                        <p className="text-sm text-gray-500 mb-1">Indicate if the project is specific to a location or online.</p>
                        <input
                            type="text"
                            value={project.location}
                            onChange={(e) => handleInputChange("location", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {/* Preferred Communication App */}
                    <div>
                        <label className="block font-bold mb-2">Preferred Communication App</label>
                        <p className="text-sm text-gray-500 mb-1">
                            Enter your preferred communication app or select one from the suggested options.
                        </p>
                        <input
                            list="communication-apps"
                            value={project.communicationApp}
                            onChange={(e) => handleInputChange("communicationApp", e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="e.g., Discord, Slack, Wechat"
                        />
                        <datalist id="communication-apps">
                            <option value="Discord" />
                            <option value="Slack" />
                            <option value="Instagram" />
                            <option value="Facebook" />
                            <option value="Wechat" />
                        </datalist>
                    </div>

                    {/* ... (existing project fields go here) */}
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={(e) => handlePostProject(e, "save")}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            {isUpdating ? "Update Project" : "Save for Later"}
                        </button>
                        <button
                            onClick={(e) => handlePostProject(e, "next")}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Step 2: Create a Post
                        </button>
                    </div>
                </div>

            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 mt-4"
                >
                    Close
                </button>
            )}
        </div>
    );
};

export default ProjectForm;
