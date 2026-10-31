import React, { useState } from 'react';

interface TagSelectorProps {
    label: string; // Label for the input field
    suggestions: string[]; // List of predefined suggestions
    selectedTags: string[]; // Selected tags
    onAddTag: (tag: string) => void; // Function to add a tag
    onRemoveTag: (tag: string) => void; // Function to remove a tag
    placeholder?: string; // Optional placeholder for input
    bubbleColor?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
    label,
    suggestions,
    selectedTags = [], // Add default empty array
    onAddTag,
    onRemoveTag,
    placeholder = 'Add your own...',
    bubbleColor = 'bg-blue-200',
}) => {
    const [customTag, setCustomTag] = useState<string>('');

    // Ensure selectedTags is always an array
    const safeSelectedTags = Array.isArray(selectedTags) ? selectedTags : [];

    const handleAddTag = () => {
        if (customTag && !safeSelectedTags.includes(customTag)) {
            onAddTag(customTag);
            setCustomTag(''); // Clear the input field
        }
    };

    return (
        <div>
            <label className="block mb-2">{label}</label>
            {/* Render the suggestions */}
            <div className="flex flex-wrap gap-2 mb-2">
                {suggestions.map((suggestion, index) => (
                    <span
                        key={index}
                        className={`cursor-pointer px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-800 hover:bg-gray-300 ${safeSelectedTags.includes(suggestion) ? bubbleColor : ''
                            }`}
                        onClick={() => {
                            if (!safeSelectedTags.includes(suggestion)) {
                                onAddTag(suggestion);
                            } else {
                                onRemoveTag(suggestion);
                            }
                        }}
                    >
                        {suggestion}
                    </span>
                ))}
            </div>
            {/* Input field for custom tags */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    className="border p-2 w-full rounded"
                />
                <button
                    type="button"
                    onClick={handleAddTag}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#007BFF',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Add
                </button>
            </div>
            {/* Display selected tags */}
            <div className="flex flex-wrap gap-2 mt-2">
                {safeSelectedTags.map((tag, index) => (
                    <div
                        key={index}
                        className={`bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center space-x-2 ${bubbleColor}`}
                    >
                        <span>{tag}</span>
                        <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => onRemoveTag(tag)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TagSelector;
