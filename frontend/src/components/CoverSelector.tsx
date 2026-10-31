import React, { useState } from "react";
import CropModal from "./utils/CropModal";
import UnsplashModal from "./utils/UnsplashModal";

interface CoverSelectorProps {
    coverRef: React.RefObject<HTMLDivElement>;
    savedCover: string | null;
    handleCropSave: (file: File, croppedImageUrl: string, target: string) => void;
    handleUnsplashImageSelect: (file: File, downloadLocation: string, target: string) => void;
    target: string;
    errors: {
        cover?: string;
    };
}

const CoverSelector: React.FC<CoverSelectorProps> = ({
    coverRef,
    savedCover,
    handleCropSave,
    handleUnsplashImageSelect,
    target,
    errors,
}) => {
    const [tempCover, setTempCover] = useState<string | null>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isUnsplashModalOpen, setIsUnsplashModalOpen] = useState(false);

    const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const tempImageUrl = URL.createObjectURL(file); // Generate temporary image URL
            setTempCover(tempImageUrl); // Set the temporary cover image
            setIsCropModalOpen(true); // Open crop modal
        }
        // Clear input value
        event.target.value = "";
    };

    const handleCroppedImage = (file: File, croppedImageUrl: string) => {
        // Pass the cropped image to the parent
        handleCropSave(file, croppedImageUrl, target);

        setTempCover(null); // Clear temp cover
        setIsCropModalOpen(false); // Close crop modal
    };
    return (
        <>
            <div className="mb-4" ref={coverRef}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setIsUnsplashModalOpen(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto min-w-[180px] text-center"
                    >
                        Select from Unsplash
                    </button>
                    <span className="self-center my-2 sm:my-0">Or</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="w-full sm:w-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
                {savedCover && (
                    <img
                        src={savedCover}
                        alt="Cover Preview"
                        className="mt-4 w-full max-w-sm rounded-lg shadow-lg"
                    />
                )}
                {isCropModalOpen && tempCover && (
                    <CropModal
                        tempCover={tempCover}
                        handleCropSave={handleCroppedImage}
                        handleCancelCrop={() => {
                            setTempCover(null);
                            setIsCropModalOpen(false);
                        }}
                    />
                )}
                {errors.cover && (
                    <p className="text-red-500 text-sm mt-1">{errors.cover}</p>
                )}
            </div>
            {isUnsplashModalOpen && (
                <UnsplashModal
                    handleUnsplashImageSelect={handleUnsplashImageSelect}
                    setIsUnsplashModalOpen={setIsUnsplashModalOpen}
                    target={target}
                />
            )

            }
        </>
    );
};

export default CoverSelector;
