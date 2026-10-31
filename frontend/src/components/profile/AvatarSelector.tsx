import React, { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/getCroppedImage';
import { dicebearStyles } from './datasets/createProfileData';
import type { FormData } from '../../types/profile/formData';

interface AvatarSelectorProps {
    croppedImage: string | null;
    setCroppedImage: React.Dispatch<React.SetStateAction<string | null>>;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    avatarUrl: string | File | null;
}

// Add gender options for avatar generation
type GenderOption = 'neutral' | 'male' | 'female';

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
    croppedImage,
    setCroppedImage,
    setFormData,
    avatarUrl,
}) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [selectedGender, setSelectedGender] = useState<GenderOption>('neutral');

    useEffect(() => {
        if (typeof avatarUrl === "string" && !croppedImage) {
            setCroppedImage(avatarUrl);
        }
    }, [avatarUrl, croppedImage, setCroppedImage]);

    const handleAvatarSelect = (style: string) => {
        // Some styles support gender parameters
        let genderParam = '';

        // Styles that support gender parameters
        const genderSupportedStyles = ['adventurer', 'big-ears', 'bottts', 'personas'];

        if (genderSupportedStyles.includes(style)) {
            if (selectedGender === 'male') {
                genderParam = '?gender=male';
            } else if (selectedGender === 'female') {
                genderParam = '?gender=female';
            }
        }

        const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg${genderParam}`;
        setSelectedAvatar(avatarUrl);
        setCroppedImage(avatarUrl);
        setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
    };

    const handleGenderChange = (gender: GenderOption) => {
        setSelectedGender(gender);

        // If an avatar is already selected, update it with the new gender
        if (selectedAvatar) {
            const style = selectedAvatar.split('/')[4].split('?')[0];
            handleAvatarSelect(style);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFormData((prev) => ({ ...prev, avatar: file })); // Store the file
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setIsModalOpen(true); // Open the modal when an image is selected
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCrop = async (e?: React.FormEvent) => {
        if (e) e.preventDefault(); // Prevent form submission if triggered in a form
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
            setCroppedImage(croppedImg);
            setIsModalOpen(false); // Close the modal after cropping
            setFormData((prev) => ({
                ...prev,
                avatar: croppedImg, // Save the cropped image URL or base64
            }));
        } catch (error) {
            console.error('Crop failed', error);
        }
    };

    return (
        <div>
            <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300">
                    {croppedImage ? (
                        <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300">
                            <img
                                src={croppedImage}
                                alt="Cropped Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gray-200"></div>
                    )}
                </div>
            </div>

            {/* Gender Selection */}
            <div className="my-4">
                <h3 className="text-sm font-medium mb-2">Select Avatar Style</h3>
                <div className="flex space-x-4">
                    <button
                        onClick={() => handleGenderChange('neutral')}
                        className={`px-4 py-2 rounded-lg ${selectedGender === 'neutral'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        Neutral
                    </button>
                    <button
                        onClick={() => handleGenderChange('male')}
                        className={`px-4 py-2 rounded-lg ${selectedGender === 'male'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        Male
                    </button>
                    <button
                        onClick={() => handleGenderChange('female')}
                        className={`px-4 py-2 rounded-lg ${selectedGender === 'female'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        Female
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Note: Gender selection affects some avatar styles.
                </p>
            </div>

            {/* Predefined Avatars */}
            <div className="flex-1">
                <h2 className="text-2xl font-bold mb-6">Choose Your Avatar</h2>
                <div className="grid grid-cols-8 gap-1">
                    {dicebearStyles.map((style, index) => (
                        <div
                            key={index}
                            className={`border-2 rounded p-2 cursor-pointer ${selectedAvatar?.includes(`/${style}/`) ? 'border-blue-500' : 'border-transparent'
                                }`}
                            onClick={() => handleAvatarSelect(style)}
                        >
                            <img
                                src={`https://api.dicebear.com/9.x/${style}/svg`}
                                alt={style}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* OR Divider */}
            <div className="text-center my-4 text-gray-500">OR</div>

            {/* Upload Custom Image */}
            <div className="flex flex-col items-center">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mb-4"
                />
            </div>

            {/* Modal for Cropping */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg w-96 relative">
                        <h3 className="text-lg font-bold mb-4">Crop Your Avatar</h3>

                        <div className="relative w-full h-64">
                            <Cropper
                                image={imageSrc || ''}
                                crop={crop}
                                zoom={zoom}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                cropShape="rect"
                                cropSize={{ width: 200, height: 200 }}
                                showGrid={false}
                                onCropComplete={handleCropComplete}
                            />
                            {/* Circular Overlay */}
                            <div
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                style={{
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    width: '200px',
                                    height: '200px',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}
                            ></div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 flex justify-between">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCrop}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AvatarSelector;
