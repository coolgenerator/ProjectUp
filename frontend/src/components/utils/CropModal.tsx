import React, { useState } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../utils/getCroppedImage";

interface CropModalProps {
    tempCover: string;
    handleCropSave: (file: File, croppedImageUrl: string) => void;
    handleCancelCrop: () => void;
}

const CropModal: React.FC<CropModalProps> = ({ tempCover, handleCropSave, handleCancelCrop }) => {
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    const handleCropComplete = (_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSave = async () => {
        if (!tempCover) return;

        try {
            // Crop the image and get the result URL
            const croppedImageUrl = await getCroppedImg(tempCover, croppedAreaPixels);
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], "cropped-cover.jpg", { type: blob.type });

            // Pass the cropped image back to CoverSelector
            handleCropSave(file, croppedImageUrl);
        } catch (err) {
            console.error("Failed to crop the image", err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-4 rounded shadow-lg w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Crop Image</h2>
                <div className="relative w-full h-64">
                    <Cropper
                        image={tempCover || undefined}
                        crop={crop}
                        zoom={zoom}
                        aspect={6 / 4} // Square aspect ratio
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={handleCancelCrop}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CropModal;