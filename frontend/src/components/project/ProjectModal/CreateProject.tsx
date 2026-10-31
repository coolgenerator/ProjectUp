import React, { useState } from "react";
import CoverSelector from "../../CoverSelector";
import AddMedia from "../../AddMedia";
import LocationSelector from "../../LocationSelector";
import { ProjectDetails } from "../../../types/project/projectDetails";
import { topicHierarchy, TopicCategory } from "../../../data/topicHierarchy";

interface CreateProjectProps {
    newProject: ProjectDetails;
    savedCover: string | null;
    errors: { [key: string]: string };
    coverRef: React.RefObject<HTMLInputElement>;
    nameRef: React.RefObject<HTMLInputElement>;
    topicRef: React.RefObject<HTMLDivElement>;
    descriptionRef: React.RefObject<HTMLInputElement>;
    typeRef: React.RefObject<HTMLInputElement>;
    startTimeRef: React.RefObject<HTMLInputElement>;
    schoolRef: React.RefObject<HTMLInputElement>;
    temporaryTopics: string[];
    topicInput: string;
    setTopicInput: (value: string) => void;
    handleInputChange: (field: string, value: any) => void;
    handleTopicSelect: (topic: string) => void;
    handleTopicRemove: (index: number) => void;
    handleCustomTopicAdd: () => void;
    handleCropSave: (file: File, croppedImageUrl: string, target: string) => void;
    handleUnsplashImageSelect: (file: File, url: string, target: string) => void;
    handleMediaUpdate: (media: File[], target: string) => void;
    newPost: boolean;
    setPostDetails: React.Dispatch<React.SetStateAction<any>>;
    isSchoolVerified?: boolean;
}

const CreateProject: React.FC<CreateProjectProps> = ({
    newProject,
    savedCover,
    errors,
    coverRef,
    nameRef,
    topicRef,
    descriptionRef,
    typeRef,
    startTimeRef,
    schoolRef,
    topicInput,
    setTopicInput,
    handleInputChange,
    handleTopicSelect,
    handleTopicRemove,
    handleCustomTopicAdd,
    handleCropSave,
    handleUnsplashImageSelect,
    handleMediaUpdate,
    newPost,
    setPostDetails,
    isSchoolVerified
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showSubcategories, setShowSubcategories] = useState(false);

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setShowSubcategories(true);
    };

    const handleSubcategorySelect = (subcategory: string) => {
        handleTopicSelect(subcategory);
        setShowSubcategories(false);
        setSelectedCategory(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-6">
                <div className="space-y-8">
                    {/* Cover Image Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6" data-tour="project-cover-section">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Project Cover</h3>
                        <div ref={coverRef}>
                            <label className="block font-medium text-gray-700 mb-2">
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
                    </section>

                    {/* Media Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Project Media</h3>
                        <AddMedia
                            target="project"
                            onMediaChange={handleMediaUpdate}
                        />
                    </section>

                    {/* Project Details Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Project Details</h3>
                        <div className="space-y-6">
                            {/* Project Name */}
                            <div ref={nameRef}>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Project Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter project name"
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Topics */}
                            <div ref={topicRef}>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Topics <span className="text-red-500">*</span>
                                </label>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-600 mb-2">Select a Category:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {topicHierarchy.map((category: TopicCategory) => (
                                            <button
                                                key={category.name}
                                                onClick={() => handleCategorySelect(category.name)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full transition-colors ${selectedCategory === category.name
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    }`}
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {showSubcategories && selectedCategory && (
                                    <div className="mb-4">
                                        <label className="block text-sm text-gray-600 mb-2">Select a Subcategory:</label>
                                        <div className="flex flex-wrap gap-2">
                                            {topicHierarchy
                                                .find((cat) => cat.name === selectedCategory)
                                                ?.subcategories.map((subcategory) => (
                                                    <button
                                                        key={subcategory}
                                                        onClick={() => handleSubcategorySelect(subcategory)}
                                                        className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                                                    >
                                                        {subcategory}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-sm text-gray-600 mb-2">Selected Topics:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {newProject.topic.map((topic, index) => (
                                            <div
                                                key={index}
                                                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-full flex items-center gap-2"
                                            >
                                                {topic}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTopicRemove(index)}
                                                    className="hover:text-red-200"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Add Custom Topic:</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={topicInput}
                                            onChange={(e) => setTopicInput(e.target.value)}
                                            placeholder="Type a custom topic"
                                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCustomTopicAdd}
                                            className="sm:px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                            <div ref={descriptionRef}>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                    placeholder="Describe your project..."
                                />
                                {errors.description && (
                                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                                )}
                            </div>

                            {/* Project Type */}
                            <div ref={typeRef}>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Project Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newProject.type}
                                    onChange={(e) => {
                                        handleInputChange("type", e.target.value);
                                        if (newPost) {
                                            setPostDetails((prev: any) => ({ ...prev, type: e.target.value }))
                                        }
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="" disabled>Select Project Type</option>
                                    <option value="Research">Research</option>
                                    <option value="School Work">School Work</option>
                                    <option value="Personal Project">Personal Project</option>
                                    <option value="Others">Others</option>
                                </select>
                                {newProject.type === "School Work" && (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <input
                                                ref={schoolRef}
                                                type="text"
                                                placeholder="School Name"
                                                value={newProject.school || ""}
                                                onChange={(e) => {
                                                    handleInputChange("school", e.target.value);
                                                    if (newPost) {
                                                        setPostDetails((prev: any) => ({ ...prev, school: e.target.value }))
                                                    }
                                                }}
                                                className={`w-full p-3 border ${errors.school ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                            />
                                            {newProject.school && (
                                                <div className="mt-1">
                                                    {isSchoolVerified ? (
                                                        <p className="text-sm text-green-600">
                                                            ✓ Using verified school: {newProject.school}
                                                        </p>
                                                    ) : (
                                                        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-md mt-2">
                                                            <p className="text-sm font-semibold text-amber-800">
                                                                School: {newProject.school} (not verified)
                                                            </p>
                                                            <p className="text-xs text-amber-700 mt-1">
                                                                Your project won't be visible to other members of your organization until you verify your school email.
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <a href="/edit-profile" className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors inline-flex items-center">
                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                    Go to My Profile
                                                                </a>
                                                                <a href="/edit-profile#school-email" className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full transition-colors inline-flex items-center">
                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    Verify School Email
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {errors.school && (
                                                <p className="text-red-500 text-sm mt-1">{errors.school}</p>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Class Name"
                                            value={newProject.class || ""}
                                            onChange={(e) => {
                                                handleInputChange("class", e.target.value)
                                                if (newPost) {
                                                    setPostDetails((prev: any) => ({ ...prev, class: e.target.value }))
                                                }
                                            }}
                                            className={`w-full p-3 border ${errors.class ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                        />
                                        {errors.class && (
                                            <p className="text-red-500 text-sm mt-1">{errors.class}</p>
                                        )}
                                    </div>
                                )}
                                {newProject.type === "Others" && (
                                    <input
                                        type="text"
                                        placeholder="Specify your project type"
                                        value={newProject.otherType || ""}
                                        onChange={(e) => {
                                            handleInputChange("otherType", e.target.value)
                                            if (newPost) {
                                                setPostDetails((prev: any) => ({ ...prev, otherType: e.target.value }))
                                            }
                                        }}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                                    />
                                )}
                                {errors.type && (
                                    <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                                )}
                            </div>

                            {/* Timeline Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Start Time */}
                                <div ref={startTimeRef}>
                                    <label className="block font-medium text-gray-700 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="startTime"
                                                    value="immediately"
                                                    checked={newProject.startTime === new Date().toISOString().split("T")[0]}
                                                    onChange={() => handleInputChange("startTime", "immediately")}
                                                    className="form-radio text-blue-500"
                                                />
                                                <span>Now</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="startTime"
                                                    value="specific"
                                                    checked={newProject.startTime !== new Date().toISOString().split("T")[0]}
                                                    onChange={() => handleInputChange("startTime", "")}
                                                    className="form-radio text-blue-500"
                                                />
                                                <span>Specify Date</span>
                                            </label>
                                        </div>
                                        {newProject.startTime !== new Date().toISOString().split("T")[0] && (
                                            <input
                                                type="date"
                                                value={newProject.startTime || ""}
                                                onChange={(e) => handleInputChange("startTime", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        )}
                                    </div>
                                    {errors.startTime && (
                                        <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                                    )}
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="block font-medium text-gray-700 mb-2">
                                        Deadline
                                    </label>
                                    <input
                                        type="date"
                                        value={newProject.deadline}
                                        onChange={(e) => handleInputChange("deadline", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Location
                                </label>
                                <LocationSelector
                                    value={newProject.location}
                                    onChange={(location) => handleInputChange("location", location)}
                                />
                            </div>

                            {/* Communication App */}
                            <div>
                                <label className="block font-medium text-gray-700 mb-2">
                                    Preferred Communication App
                                </label>
                                <input
                                    list="communication-apps"
                                    value={newProject.communicationApp}
                                    onChange={(e) => handleInputChange("communicationApp", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                            {/* If the type is "School Project", show additional fields */}
                            {(newProject.type === "School Project" || newProject.otherType === "School Project") && (
                                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default CreateProject;
