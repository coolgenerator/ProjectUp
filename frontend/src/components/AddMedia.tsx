import React, { useState } from "react";

interface AddMediaProps {
    target: string;
    onMediaChange: (media: File[], target: string) => void;
}

const AddMedia: React.FC<AddMediaProps> = ({
    target,
    onMediaChange,
}) => {
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const handleMediaChange = (files: FileList | null) => {
        if (!files) return;

        const newFiles = Array.from(files);

        // Update mediaFiles state
        const updatedFiles = [...mediaFiles, ...newFiles];
        setMediaFiles(updatedFiles);

        // Generate preview URLs for the new files
        const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
        const updatedPreviews = [...mediaPreviews, ...newPreviews];
        setMediaPreviews(updatedPreviews);

        // Notify the parent about the changes
        onMediaChange(updatedFiles, target);
    };


    const removeMedia = (index: number) => {
        const updatedFiles = [...mediaFiles];
        const updatedPreviews = [...mediaPreviews];

        updatedFiles.splice(index, 1);
        updatedPreviews.splice(index, 1);

        setMediaFiles(updatedFiles);
        setMediaPreviews(updatedPreviews);

        // Notify the parent about the changes
        onMediaChange(updatedFiles, target);
    };

    return (
        <div>
            <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleMediaChange(e.target.files)}
                className="text-sm text-gray-500"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                        {mediaFiles[index].type.startsWith("image") ? (
                            <img
                                src={preview}
                                alt={`Media Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded"
                            />
                        ) : (
                            <video controls className="w-full h-32 object-cover rounded">
                                <source src={preview} type={mediaFiles[index].type} />
                            </video>
                        )}
                        <button
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddMedia;
