import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../../store/store";
import { PostDetails, Question } from "../../../types/project/postDetails";
import { topicHierarchy, TopicCategory } from "../../../data/topicHierarchy";
import CoverSelector from "../../CoverSelector";
import AddMedia from "../../AddMedia";
import ApplicationQuestions from "../../ApplicationQuestions";
import LocationSelector from "../../LocationSelector";
import fetchWithAuth from "../../../hooks/fetchWithAuth";
import config from "../../../config";

const { API_BASE_URL } = config;

interface CreatePostProps {
    postDetails: PostDetails;
    savedPostCover: string | null;
    postErrors: { [key: string]: string };
    postCoverRef: React.RefObject<HTMLInputElement>;
    postTitleRef: React.RefObject<HTMLInputElement>;
    postPositionsRef: React.RefObject<HTMLDivElement>;
    postDescriptionRef: React.RefObject<HTMLInputElement>;
    postTypeRef: React.RefObject<HTMLInputElement>;
    postStartTimeRef: React.RefObject<HTMLInputElement>;
    handleInputChange: (field: string, value: any) => void;
    handleCropSave: (file: File, croppedImageUrl: string, target: string) => void;
    handleUnsplashImageSelect: (file: File, url: string, target: string) => void;
    handleMediaUpdate: (media: File[], target: string) => void;
    handleAddPosition: () => void;
    handleRemovePosition: (index: number) => void;
    handlePositionChange: (index: number, field: string, value: string | number) => void;
    setPostDetails: React.Dispatch<React.SetStateAction<PostDetails>>;
    topicInput: string;
    setTopicInput: React.Dispatch<React.SetStateAction<string>>;
}

const CreatePost: React.FC<CreatePostProps> = ({
    postDetails,
    savedPostCover,
    postErrors,
    postCoverRef,
    postTitleRef,
    postPositionsRef,
    postDescriptionRef,
    postStartTimeRef,
    handleInputChange,
    handleCropSave,
    handleUnsplashImageSelect,
    handleMediaUpdate,
    handleAddPosition,
    handleRemovePosition,
    handlePositionChange,
    setPostDetails,
    topicInput,
    setTopicInput
}) => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showSubcategories, setShowSubcategories] = useState(false);
    const user = useSelector((state: RootState) => state.auth.user);
    const [isSchoolEmailVerified, setIsSchoolEmailVerified] = useState(false);
    const [userSchool, setUserSchool] = useState<string | null>(null);

    // Fetch the user's profile to check school email verification status
    useEffect(() => {
        if (user?.id) {
            const fetchUserProfile = async () => {
                try {
                    const response = await fetchWithAuth(`${API_BASE_URL}/api/my-profile`);
                    if (response.ok) {
                        const data = await response.json();
                        setIsSchoolEmailVerified(data.user?.school_email_verified || false);
                        setUserSchool(data.user?.school || null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                }
            };

            fetchUserProfile();
        }
    }, [user?.id]);

    // Reset visibility setting if school/organization is selected but email isn't verified
    useEffect(() => {
        if (postDetails.visibility === 4 && !isSchoolEmailVerified) {
            handleInputChange("visibility", null);
        }
    }, [isSchoolEmailVerified, postDetails.visibility]);

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setShowSubcategories(true);
    };

    const handleSubcategorySelect = (subcategory: string) => {
        if (!postDetails.topic.includes(subcategory)) {
            setPostDetails(prev => ({
                ...prev,
                topic: [...prev.topic, subcategory]
            }));
        }
        setShowSubcategories(false);
        setSelectedCategory(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-6">
                <div className="space-y-6 sm:space-y-8">
                    {/* Warning Message */}
                    <div className="p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400">
                        <div className="flex flex-col sm:flex-row sm:items-start">
                            <div className="flex-shrink-0 mb-2 sm:mb-0 sm:mr-3">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-yellow-800">{t('posts.create.warning.title')}</h3>
                                <div className="mt-1 text-xs sm:text-sm text-yellow-700">
                                    <p>{t('posts.create.warning.intro')}</p>
                                    <ul className="list-disc list-inside mt-1">
                                        <li>{t('posts.create.warning.questions.unique')}</li>
                                        <li>{t('posts.create.warning.questions.share')}</li>
                                        <li>{t('posts.create.warning.questions.visibility')}</li>
                                    </ul>
                                    <p className="mt-1 italic text-xs">{t('posts.create.warning.disclaimer')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Post Title Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.postTitle')}</h3>
                        <div ref={postTitleRef}>
                            <label className="block font-medium text-gray-700 mb-2">
                                {t('posts.create.fields.title.label')} <span className="text-red-500">{t('posts.required')}</span>
                            </label>
                            <input
                                type="text"
                                value={postDetails.title}
                                onChange={(e) =>
                                    setPostDetails((prev) => ({ ...prev, title: e.target.value }))
                                }
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('posts.create.fields.title.placeholder')}
                            />
                            {postErrors.title && (
                                <p className="text-red-500 text-sm mt-1">{postErrors.title}</p>
                            )}
                        </div>
                    </section>

                    {/* Cover Image Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.postCover')}</h3>
                        <div ref={postCoverRef}>
                            <label className="block font-medium text-gray-700 mb-2">
                                {t('posts.create.fields.cover.label')} <span className="text-red-500">{t('posts.required')}</span>
                            </label>
                            <CoverSelector
                                coverRef={postCoverRef}
                                savedCover={savedPostCover}
                                handleCropSave={handleCropSave}
                                handleUnsplashImageSelect={handleUnsplashImageSelect}
                                target="post"
                                errors={postErrors}
                            />
                        </div>
                    </section>

                    {/* Media Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.postMedia')}</h3>
                        <AddMedia
                            target="post"
                            onMediaChange={handleMediaUpdate}
                        />
                    </section>

                    {/* Description Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.postDescription')}</h3>
                        <div ref={postDescriptionRef}>
                            <label className="block font-medium text-gray-700 mb-2">
                                {t('posts.create.fields.description.label')} <span className="text-red-500">{t('posts.required')}</span>
                            </label>
                            <textarea
                                value={postDetails.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder={t('posts.create.fields.description.placeholder')}
                            />
                            {postErrors.description && (
                                <p className="text-red-500 text-sm mt-1">{postErrors.description}</p>
                            )}
                        </div>
                    </section>

                    {/* Topics Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.topics')}</h3>
                        <div>
                            <label className="block font-medium text-gray-700 mb-2">
                                {t('posts.create.fields.topics.label')} <span className="text-red-500">{t('posts.required')}</span>
                            </label>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-2">{t('posts.create.fields.topics.selectCategory')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {topicHierarchy.map((category: TopicCategory) => (
                                        <button
                                            key={category.name}
                                            onClick={() => handleCategorySelect(category.name)}
                                            className={`px-4 py-2 rounded-full transition-colors ${selectedCategory === category.name
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
                                    <label className="block text-sm text-gray-600 mb-2">{t('posts.create.fields.topics.selectSubcategory')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {topicHierarchy
                                            .find((cat) => cat.name === selectedCategory)
                                            ?.subcategories.map((subcategory) => (
                                                <button
                                                    key={subcategory}
                                                    onClick={() => handleSubcategorySelect(subcategory)}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                                                >
                                                    {subcategory}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-2">{t('posts.create.fields.topics.selectedTopics')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {postDetails.topic.map((topic, index) => (
                                        <div
                                            key={index}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-full flex items-center gap-2"
                                        >
                                            {topic}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPostDetails(prev => ({
                                                        ...prev,
                                                        topic: prev.topic.filter((_, i) => i !== index)
                                                    }));
                                                }}
                                                className="hover:text-red-200"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-2">{t('posts.create.fields.topics.addCustom')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={topicInput}
                                        onChange={(e) => setTopicInput(e.target.value)}
                                        placeholder={t('posts.create.fields.topics.customPlaceholder')}
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (topicInput && !postDetails.topic.includes(topicInput)) {
                                                setPostDetails(prev => ({
                                                    ...prev,
                                                    topic: [...prev.topic, topicInput]
                                                }));
                                                setTopicInput("");
                                            }
                                        }}
                                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        {t('posts.create.fields.topics.add')}
                                    </button>
                                </div>
                            </div>
                            {postErrors.topic && (
                                <p className="text-red-500 text-sm mt-1">{postErrors.topic}</p>
                            )}
                        </div>
                    </section>

                    {/* Timeline Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.timeline')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Start Time */}
                            <div ref={postStartTimeRef}>
                                <label className="block font-medium text-gray-700 mb-2">
                                    {t('posts.create.fields.timeline.startTime')} <span className="text-red-500">{t('posts.required')}</span>
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                name="startTime"
                                                value="immediately"
                                                checked={postDetails.startDate === new Date().toISOString().split("T")[0]}
                                                onChange={() => handleInputChange("startDate", "immediately")}
                                                className="form-radio text-blue-500"
                                            />
                                            <span>{t('posts.create.fields.timeline.now')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                name="startTime"
                                                value="specific"
                                                checked={postDetails.startDate !== new Date().toISOString().split("T")[0]}
                                                onChange={() => handleInputChange("startDate", "")}
                                                className="form-radio text-blue-500"
                                            />
                                            <span>{t('posts.create.fields.timeline.specifyDate')}</span>
                                        </label>
                                    </div>
                                    {postDetails.startDate !== new Date().toISOString().split("T")[0] && (
                                        <input
                                            type="date"
                                            value={postDetails.startDate || ""}
                                            onChange={(e) => handleInputChange("startDate", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    )}
                                    {postErrors.startDate && (
                                        <p className="text-red-500 text-sm mt-1">{postErrors.startDate}</p>
                                    )}
                                </div>
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block font-medium text-gray-700 mb-2">
                                    {t('posts.create.fields.timeline.deadline')}
                                </label>
                                <input
                                    type="date"
                                    value={postDetails.deadline}
                                    onChange={(e) => handleInputChange("deadline", e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Location Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.location')}</h3>
                        <LocationSelector
                            value={postDetails.location}
                            onChange={(location) => handleInputChange("location", location)}
                        />
                    </section>

                    {/* Positions Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.positions')}</h3>
                        <div ref={postPositionsRef}>
                            <label className="block font-medium text-gray-700 mb-2">
                                {t('posts.create.fields.positions.label')} <span className="text-red-500">{t('posts.required')}</span>
                            </label>
                            <div className="space-y-3 sm:space-y-4">
                                {postDetails.positions.map((position, index) => (
                                    <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4">
                                            <div className="sm:col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('posts.create.fields.positions.namePlaceholder')}
                                                    value={position.name}
                                                    onChange={(e) =>
                                                        handlePositionChange(index, "name", e.target.value)
                                                    }
                                                    className={`w-full p-2 sm:p-3 border ${postErrors[`position_${index}_name`] ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                                />
                                                {postErrors[`position_${index}_name`] && (
                                                    <p className="text-red-500 text-xs mt-1">{postErrors[`position_${index}_name`]}</p>
                                                )}
                                            </div>
                                            <div className="sm:col-span-6">
                                                <textarea
                                                    placeholder={t('posts.create.fields.positions.responsibilitiesPlaceholder')}
                                                    value={position.responsibility}
                                                    onChange={(e) =>
                                                        handlePositionChange(index, "responsibility", e.target.value)
                                                    }
                                                    className={`w-full p-2 sm:p-3 border ${postErrors[`position_${index}_responsibility`] ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                                    rows={1}
                                                />
                                                {postErrors[`position_${index}_responsibility`] && (
                                                    <p className="text-red-500 text-xs mt-1">{postErrors[`position_${index}_responsibility`]}</p>
                                                )}
                                            </div>
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="number"
                                                    placeholder={t('posts.create.fields.positions.spotsPlaceholder')}
                                                    value={position.spots}
                                                    onChange={(e) =>
                                                        handlePositionChange(index, "spots", Number(e.target.value))
                                                    }
                                                    className={`w-full p-2 sm:p-3 border ${postErrors[`position_${index}_spots`] ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                                />
                                                {postErrors[`position_${index}_spots`] && (
                                                    <p className="text-red-500 text-xs mt-1">{postErrors[`position_${index}_spots`]}</p>
                                                )}
                                            </div>
                                            <div className="flex justify-end sm:col-span-1 sm:flex sm:items-center sm:justify-center">
                                                <button
                                                    onClick={() => handleRemovePosition(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleAddPosition}
                                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                                {t('posts.create.fields.positions.add')}
                            </button>
                            {postErrors.positions && (
                                <p className="text-red-500 text-sm mt-1">{postErrors.positions}</p>
                            )}
                        </div>
                    </section>

                    {/* Application Questions Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.applicationQuestions')}</h3>
                        <ApplicationQuestions
                            questions={postDetails.questions}
                            setQuestions={(updatedQuestions: Question[]) =>
                                setPostDetails((prev) => ({ ...prev, questions: updatedQuestions }))
                            }
                        />
                    </section>

                    {/* Visibility Section */}
                    <section className="bg-gray-50 rounded-lg p-3 sm:p-6" data-tour="visibility-section">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">{t('posts.create.sections.visibility')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-2">
                                    {t('posts.create.fields.visibility.label')} <span className="text-red-500">{t('posts.required')}</span>
                                </label>
                                <select
                                    value={postDetails.visibility || ""}
                                    onChange={(e) => handleInputChange("visibility", e.target.value ? Number(e.target.value) : null)}
                                    className={`w-full p-2 sm:p-3 border ${postErrors.visibility ? "border-red-500" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                >
                                    <option value="" disabled>{t('posts.create.fields.visibility.selectOption')}</option>
                                    <option value="1">{t('posts.create.fields.visibility.private')}</option>
                                    <option value="2">{t('posts.create.fields.visibility.public')}</option>
                                    <option value="3">{t('posts.create.fields.visibility.local')}</option>
                                    {isSchoolEmailVerified && userSchool && (
                                        <option value="4">{t('posts.create.fields.visibility.organization', { school: userSchool })}</option>
                                    )}
                                </select>
                                {!isSchoolEmailVerified && (
                                    <p className="text-amber-600 text-sm mt-2">
                                        {t('posts.create.fields.visibility.verifyEmail')}
                                    </p>
                                )}
                                {postErrors.visibility && (
                                    <p className="text-red-500 text-sm mt-1">{postErrors.visibility}</p>
                                )}

                                <div className="mt-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={postDetails.publishProject || false}
                                            onChange={(e) => handleInputChange("publishProject", e.target.checked)}
                                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            {t('posts.create.fields.visibility.publishProject')}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg flex items-start">
                                <div className="flex-shrink-0 mr-3">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-yellow-800">{t('posts.create.visibilityInfo.title')}</h4>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        {t('posts.create.visibilityInfo.intro')}
                                    </p>
                                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                                        <li>{t('posts.create.visibilityInfo.options.private')}</li>
                                        <li>{t('posts.create.visibilityInfo.options.public')}</li>
                                        <li>{t('posts.create.visibilityInfo.options.local')}</li>
                                        <li>{t('posts.create.visibilityInfo.options.organization')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
