import React, { useState, useEffect } from 'react';

interface Avatar {
    id: string;
    url: string;
    name: string;
}

interface AvatarSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (avatarUrl: string) => void;
    currentAvatar?: string | null;
    firstName?: string;
    lastName?: string;
}

type TabType = 'dicebear' | 'initials' | 'avataaars' | 'ai' | 'bitmoji' | 'robohash' | 'local';

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentAvatar,
    firstName = '',
    lastName = ''
}) => {
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('dicebear');
    const [avatars, setAvatars] = useState<Record<TabType, Avatar[]>>({
        dicebear: [],
        initials: [],
        avataaars: [],
        ai: [],
        bitmoji: [],
        robohash: [],
        local: []
    });
    const [loading, setLoading] = useState(true);

    // Update selectedAvatar when currentAvatar changes
    useEffect(() => {
        setSelectedAvatar(currentAvatar || null);
    }, [currentAvatar]);

    const fetchAvatars = async (tabName: TabType) => {
        try {
            let newAvatars: Avatar[] = [];

            switch (tabName) {
                case 'dicebear':
                    // Direct API call to DiceBear
                    const response = await fetch(`https://api.dicebear.com/6.x/adventurer/svg?seed=${Math.random()}`);
                    if (!response.ok) throw new Error('Failed to fetch DiceBear avatar');

                    newAvatars = Array.from({ length: 8 }, (_, i) => ({
                        id: `dicebear-${i}`,
                        url: `https://api.dicebear.com/6.x/adventurer/svg?seed=${i}`,
                        name: `Adventurer ${i + 1}`
                    }));
                    break;

                case 'initials':
                    // Direct API call to UI Avatars
                    const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                    const colors = ['5a67d8', '48bb78', 'ed8936', 'ed64a6', '667eea', 'f6ad55', '9f7aea'];

                    newAvatars = colors.map((color, i) => ({
                        id: `initial-${i}`,
                        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userInitials)}&background=${color}&color=ffffff&size=128&bold=true&font-size=0.5&length=2`,
                        name: `${userInitials} Style ${i + 1}`
                    }));
                    break;

                case 'robohash':
                    // Direct API call to RoboHash
                    newAvatars = Array.from({ length: 8 }, (_, i) => ({
                        id: `robot-${i}`,
                        url: `https://robohash.org/${i}?set=set${i % 5 + 1}&size=200x200`,
                        name: `Robot ${i + 1}`
                    }));
                    break;

                case 'avataaars':
                    // Direct API call to DiceBear Avataaars
                    newAvatars = Array.from({ length: 8 }, (_, i) => ({
                        id: `avataaars-${i}`,
                        url: `https://api.dicebear.com/6.x/avataaars/svg?seed=${i}`,
                        name: `Avataaars ${i + 1}`
                    }));
                    break;

                case 'ai':
                    // Direct API call to DiceBear Pixel Art
                    newAvatars = Array.from({ length: 8 }, (_, i) => ({
                        id: `pixel-${i}`,
                        url: `https://api.dicebear.com/6.x/pixel-art/svg?seed=${i}`,
                        name: `Pixel Art ${i + 1}`
                    }));
                    break;

                case 'bitmoji':
                    // Direct API call to DiceBear Bottts
                    newAvatars = Array.from({ length: 8 }, (_, i) => ({
                        id: `bottts-${i}`,
                        url: `https://api.dicebear.com/6.x/bottts/svg?seed=${i}`,
                        name: `Bot ${i + 1}`
                    }));
                    break;
            }

            // Verify each avatar URL is accessible
            const verifiedAvatars = await Promise.all(
                newAvatars.map(async (avatar) => {
                    try {
                        const response = await fetch(avatar.url);
                        if (!response.ok) {
                            console.error(`Failed to load avatar: ${avatar.url}`);
                            return null;
                        }
                        return avatar;
                    } catch (error) {
                        console.error(`Error loading avatar: ${avatar.url}`, error);
                        return null;
                    }
                })
            );

            // Filter out any failed avatars
            const validAvatars = verifiedAvatars.filter((avatar): avatar is Avatar => avatar !== null);

            setAvatars(prev => ({
                ...prev,
                [tabName]: validAvatars
            }));
            setLoading(false);
        } catch (error) {
            console.error("Error fetching avatars:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAvatars(activeTab);
        }
    }, [isOpen, activeTab, firstName, lastName]);

    const generateRandomAvatar = async () => {
        setIsGenerating(true);
        try {
            let randomAvatarUrl: string;

            switch (activeTab) {
                case 'local':
                    // For local tab, we'll trigger the file input
                    document.getElementById('avatar-upload')?.click();
                    setIsGenerating(false);
                    return;
                case 'dicebear':
                    randomAvatarUrl = `https://api.dicebear.com/6.x/adventurer/svg?seed=${Math.random()}`;
                    break;
                case 'initials':
                    const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                    const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                    randomAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userInitials)}&background=${randomColor}&color=ffffff&size=128&bold=true&font-size=0.5&length=2`;
                    break;
                case 'robohash':
                    randomAvatarUrl = `https://robohash.org/${Math.random()}?set=set${Math.floor(Math.random() * 5) + 1}&size=200x200`;
                    break;
                case 'avataaars':
                    randomAvatarUrl = `https://api.dicebear.com/6.x/avataaars/svg?seed=${Math.random()}`;
                    break;
                case 'ai':
                    randomAvatarUrl = `https://api.dicebear.com/6.x/pixel-art/svg?seed=${Math.random()}`;
                    break;
                case 'bitmoji':
                    randomAvatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${Math.random()}`;
                    break;
                default:
                    throw new Error('Invalid tab type');
            }

            // Verify the random avatar is accessible
            const response = await fetch(randomAvatarUrl);
            if (!response.ok) throw new Error('Failed to generate random avatar');

            setSelectedAvatar(randomAvatarUrl);
        } catch (error) {
            console.error('Error generating random avatar:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (selectedAvatar) {
            onSelect(selectedAvatar);
            onClose();
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                setSelectedAvatar(imageUrl);
                setAvatars(prev => ({
                    ...prev,
                    local: [{
                        id: 'local-avatar',
                        url: imageUrl,
                        name: 'Local Avatar'
                    }]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    const tabs: { id: TabType; name: string; icon: string }[] = [
        { id: 'local', name: 'Upload Photo', icon: '📤' },
        { id: 'dicebear', name: 'Fun Characters', icon: '🎨' },
        { id: 'initials', name: 'Letter Avatars', icon: '📝' },
        { id: 'avataaars', name: 'Cartoon Style', icon: '🎭' },
        { id: 'ai', name: 'Pixel Art', icon: '🎮' },
        { id: 'bitmoji', name: 'Emoji Style', icon: '😊' },
        { id: 'robohash', name: 'Robot Style', icon: '🤖' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-sky-500 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg sm:text-xl font-bold text-white">Choose Your Avatar</h3>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {/* Current Selection */}
                    <div className="mb-6">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">Current Selection</h4>
                        <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-500 overflow-hidden bg-gray-100 dark:bg-slate-700">
                                {selectedAvatar ? (
                                    <img
                                        src={selectedAvatar}
                                        alt="Selected Avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.error('Error loading avatar:', e);
                                            setSelectedAvatar(null);
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                                <button
                                    onClick={generateRandomAvatar}
                                    disabled={isGenerating}
                                    className="px-3 sm:px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {activeTab === 'local' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                )}
                                            </svg>
                                            {activeTab === 'local' ? 'Choose File' : 'Generate Random'}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedAvatar}
                                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-lg hover:from-blue-600 hover:to-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                >
                                    Confirm Selection
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 whitespace-nowrap transition-colors text-xs sm:text-sm ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white'
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Avatar Grid */}
                    <div>
                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">Choose from Collection</h4>
                        {loading ? (
                            <div className="flex justify-center items-center h-48">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : activeTab === 'local' ? (
                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg p-6">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="cursor-pointer flex flex-col items-center"
                                >
                                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-600">Click to upload your photo</span>
                                    <span className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                                </label>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {avatars[activeTab].map((avatar) => (
                                    <div
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.url)}
                                        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${selectedAvatar === avatar.url
                                            ? 'ring-4 ring-indigo-500 transform scale-105'
                                            : 'hover:ring-2 hover:ring-indigo-300'
                                            }`}
                                    >
                                        <img
                                            src={avatar.url}
                                            alt={avatar.name}
                                            className="w-full aspect-square object-cover"
                                            onError={(e) => {
                                                console.error('Error loading avatar:', e);
                                            }}
                                        />
                                        {selectedAvatar === avatar.url && (
                                            <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarSelectionModal; 