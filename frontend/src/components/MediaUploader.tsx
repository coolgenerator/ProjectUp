import React from "react";

interface MediaUploaderProps {
    handleMediaChange: (files: FileList | null, target: string) => void;
    mediaPreviews: string[];
    mediaFiles: File[];
    removeMedia: (index: number, target: string) => void;
    target: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
    handleMediaChange,
    mediaPreviews,
    mediaFiles,
    removeMedia,
    target,
}) => {
    return (
        <div>
            <label className="block font-bold mb-2">Add Media (Images/Short Videos)</label>
            <div className="flex items-center gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => document.getElementById(`${target}-media-upload`)?.click()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Add Files
                </button>
                <p className="text-sm text-gray-500">Accepted formats: images, short videos.</p>
            </div>
            <input
                id={`${target}-media-upload`}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleMediaChange(e.target.files, target)}
                className="hidden"
            />

            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                            {mediaFiles[index].type.startsWith("image") ? (
                                <img
                                    src={preview}
                                    alt={`Media Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded"
                                />
                            ) : (
                                <video
                                    controls
                                    className="w-full h-32 object-cover rounded"
                                >
                                    <source src={preview} type={mediaFiles[index].type} />
                                </video>
                            )}
                            <button
                                onClick={() => removeMedia(index, target)}
                                className="absolute top-2 right-2 bg-red-500 text-white text-sm p-1 rounded-full hover:bg-red-600"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MediaUploader;
