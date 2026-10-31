import React, { useRef, useState, useEffect } from "react";
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../store/store';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import CoverSelector from "../../CoverSelector.tsx";
import AddMedia from "../../AddMedia.tsx";
import ApplicationQuestions from "../../ApplicationQuestions.tsx";
import { PostDetails, Question } from "../../../types/project/postDetails.ts";

type Position = PostDetails['positions'][0];

interface PostFormProps {
    postDetails: any;
    setPostDetails: React.Dispatch<React.SetStateAction<any>>;
    handleInputChange: (field: string, value: any) => void;
    handleSaveAll: (e: React.FormEvent) => void;
    handlePreviousStep: () => void;
    projectData?: any;
    onClose?: () => void;
}

const { API_BASE_URL } = config;

const PostForm: React.FC<PostFormProps> = ({ postDetails, setPostDetails, handleInputChange, handleSaveAll: parentHandleSaveAll, handlePreviousStep, projectData, onClose }) => {
    const { t } = useTranslation();
    const postTitleRef = useRef<HTMLInputElement>(null);
    const postCoverRef = useRef<HTMLDivElement>(null);
    const postDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const postStartTimeRef = useRef<HTMLDivElement>(null);
    const postPositionsRef = useRef<HTMLDivElement>(null);
    const [postErrors, setPostErrors] = useState<{
        [key: string]: string;
    }>({});
    const [savedPostCover, setSavedPostCover] = useState<string | null>(null);
    const user = useSelector((state: RootState) => state.auth.user);
    const [isSchoolEmailVerified, setIsSchoolEmailVerified] = useState(false);
    const [userSchool, setUserSchool] = useState<string>("");

    const handleScrollToError = () => {
        const errorRefs = {
            title: postTitleRef,
            cover: postCoverRef,
            description: postDescriptionRef,
            startDate: postStartTimeRef,
            positions: postPositionsRef
        };

        for (const [errorKey, ref] of Object.entries(errorRefs)) {
            if (postErrors[errorKey] && ref.current) {
                ref.current.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                break; // Only scroll to the first error
            }
        }
    };

    const handleAddPosition = () => {
        setPostDetails((prev: PostDetails) => ({
            ...prev,
            positions: [...prev.positions, { name: "", responsibility: "", spots: 1 }],
        }));
    };

    const handleRemovePosition = (index: number) => {
        setPostDetails((prev: PostDetails) => ({
            ...prev,
            positions: prev.positions.filter((_, i) => i !== index),
        }));
    };

    const handlePositionChange = (index: number, field: keyof Position, value: string | number) => {
        setPostDetails((prev: PostDetails) => {
            const updatedPositions = [...prev.positions];
            updatedPositions[index] = { ...updatedPositions[index], [field]: value };
            return { ...prev, positions: updatedPositions };
        });
    };

    const handleCropSave = (file: File, croppedImageUrl: string) => {
        setPostDetails((prev: PostDetails) => ({ ...prev, cover: file }));
        setSavedPostCover(croppedImageUrl);
    };

    const handleUnsplashImageSelect = (_file: File, downloadLocation: string, _target: string) => {
        setSavedPostCover(downloadLocation);
    };

    const handleMediaUpdate = (media: File[]) => {
        setPostDetails((prev: PostDetails) => ({ ...prev, media }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        // Validate required fields
        if (!postDetails.title?.trim()) {
            newErrors.title = t('posts.validation.titleRequired');
        }
        if (!postDetails.cover) {
            newErrors.cover = t('posts.validation.coverRequired');
        }
        if (!postDetails.description?.trim()) {
            newErrors.description = t('posts.validation.descriptionRequired');
        }
        if (!postDetails.startDate) {
            newErrors.startDate = t('posts.validation.startDateRequired');
        }
        if (!postDetails.positions?.length) {
            newErrors.positions = t('posts.validation.positionsRequired');
        }

        setPostErrors(newErrors);

        // If there are errors, scroll to the first one
        if (Object.keys(newErrors).length > 0) {
            handleScrollToError();
            return;
        }

        // If no errors, proceed with saving
        parentHandleSaveAll(e);
    };

    // Fetch the user's profile to check school email verification status
    useEffect(() => {
        if (user?.id) {
            const fetchUserProfile = async () => {
                try {
                    const response = await fetchWithAuth(`${API_BASE_URL}/api/my-profile`);
                    if (response.ok) {
                        const data = await response.json();
                        setIsSchoolEmailVerified(data.user?.school_email_verified || false);
                        // Set the user's school name if available
                        if (data.user?.school) {
                            setUserSchool(data.user.school);
                        }
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

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Step 2: Create a Post</h2>
            <form onSubmit={handleFormSubmit}>
                <div>
                    {/* Post Title */}
                    <div className="mb-4">
                        <label className="block mb-2 font-bold">
                            Post Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={postTitleRef}
                            type="text"
                            value={postDetails.title}
                            onChange={(e) =>
                                setPostDetails((prev: PostDetails) => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full p-2 border rounded"
                        />
                        {postErrors.title && (
                            <p className="text-red-500 text-sm mt-1">{postErrors.title}</p>
                        )}
                    </div>

                    {/* Upload Cover */}
                    <div className="mb-4" ref={postCoverRef}>
                        <label className="block mb-2 font-bold">
                            Choose Your Cover <span className="text-red-500">*</span>
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

                    {/* Upload Media */}
                    <div>
                        <label className="block font-bold mb-2">Add Media (Images/Short Videos)</label>
                        <AddMedia
                            target="post"
                            onMediaChange={handleMediaUpdate}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-bold mb-2">Description <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">Your post description will share with public.</p>
                        <textarea
                            ref={postDescriptionRef}
                            value={postDetails.description}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                        {postErrors.description && (
                            <p className="text-red-500 text-sm mt-1">{postErrors.description}</p>
                        )}
                    </div>

                    {/* Start Time */}
                    <div ref={postStartTimeRef}>
                        <label className="block font-bold mb-2">Start Time <span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-500 mb-1">Choose when would you like to post. You can select "Immediately" or specify a date.</p>
                        <div className="flex items-center space-x-4 mb-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="startTime"
                                    value="immediately"
                                    checked={postDetails.startDate === new Date().toISOString().split("T")[0]}
                                    onChange={() => handleInputChange("startDate", "immediately")}
                                    className="form-radio"
                                />
                                <span>Now</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="startTime"
                                    value="specific"
                                    checked={postDetails.startDate !== new Date().toISOString().split("T")[0]}
                                    onChange={() => handleInputChange("startDate", "")}
                                    className="form-radio"
                                />
                                <span>Specify Date</span>
                            </label>
                        </div>
                        {postDetails.startDate !== new Date().toISOString().split("T")[0] && (
                            <input
                                type="date"
                                value={postDetails.startDate || ""}
                                onChange={(e) => handleInputChange("startDate", e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        )}
                        {postErrors.startDate && (
                            <p className="text-red-500 text-sm mt-1">{postErrors.startDate}</p>
                        )}
                    </div>


                    {/* Deadline */}
                    <div>
                        <label className="block font-bold mb-2">Deadline</label>
                        <p className="text-sm text-gray-500 mb-1">Optionally provide the post end date.</p>
                        <input
                            type="date"
                            value={postDetails.deadline}
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
                            value={postDetails.location}
                            onChange={(e) => handleInputChange("location", e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {/* Positions */}
                    <div ref={postPositionsRef}>
                        <label className="block font-bold mb-2">
                            Positions <span className="text-red-500">*</span>
                        </label>
                        <p className="text-sm text-gray-500 mb-1">
                            Specify the roles needed for this project, their responsibilities, and the number of spots available.
                        </p>
                        {postDetails.positions.map((position: Position, index: number) => (
                            <div key={index} className="flex flex-wrap items-center space-x-4 mb-4 border p-4 rounded">
                                <input
                                    type="text"
                                    placeholder="Position Name"
                                    value={position.name}
                                    onChange={(e) =>
                                        handlePositionChange(index, "name", e.target.value)
                                    }
                                    className="w-1/4 p-2 border rounded"
                                />
                                <textarea
                                    placeholder="Responsibilities"
                                    value={position.responsibility}
                                    onChange={(e) =>
                                        handlePositionChange(index, "responsibility", e.target.value)
                                    }
                                    className="w-1/2 p-2 border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="Spots"
                                    value={position.spots}
                                    onChange={(e) =>
                                        handlePositionChange(index, "spots", Number(e.target.value))
                                    }
                                    className="w-1/6 p-2 border rounded"
                                />
                                <button
                                    onClick={() => handleRemovePosition(index)}
                                    className="text-red-500 hover:text-red-700 mt-2"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handleAddPosition}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Add A Position
                        </button>
                    </div>
                    {postErrors.positions && (
                        <p className="text-red-500 text-sm mt-1">{postErrors.positions}</p>
                    )}

                    {/* Questions */}
                    <ApplicationQuestions
                        questions={postDetails.questions}
                        setQuestions={(updatedQuestions: Question[]) =>
                            setPostDetails((prev: PostDetails) => ({ ...prev, questions: updatedQuestions }))
                        }
                    />

                    {/* Visibility */}
                    <div>
                        <label className="block font-bold mb-2">Visibility</label>
                        <p className="text-sm text-gray-500 mb-1">
                            Select who can view this post. Choose wisely to protect your ideas.
                        </p>
                        <select
                            value={postDetails.visibility}
                            onChange={(e) => handleInputChange("visibility", e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="1">Private (share through ref link)</option>
                            <option value="2">Public (everyone can view this)</option>
                            <option value="3">Local (visible to local people only)</option>
                            {isSchoolEmailVerified ? (
                                <option value="4">
                                    {userSchool ? `${userSchool} (visible to people in your organization)` : "Your School/Organization (visible to people in your school/org)"}
                                </option>
                            ) : null}
                        </select>
                        {!isSchoolEmailVerified && (
                            <p className="text-amber-600 text-sm mt-2">
                                To share with your school/organization, please verify your school email in your profile settings.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-between space-x-4">
                        <button
                            onClick={handlePreviousStep}
                            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        >
                            Previous Step
                        </button>
                        <button
                            type="submit"
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            {projectData?.post?.[0]?.title ? "Update Post" : "Save Post"}
                        </button>
                    </div>
                </div>
            </form>
            <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 mt-4"
            >
                Close
            </button>
        </div>
    );
};

export default PostForm;
