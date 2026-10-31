import React, { useState } from 'react';
import { Block, BlockRequest } from '../../hooks/useBlocks';

interface ResourceBlockProps {
    block: Block;
    onEdit: (blockId: number, data: Partial<BlockRequest>) => Promise<boolean>;
    onDelete: (blockId: number) => Promise<boolean>;
}

const ResourceBlock: React.FC<ResourceBlockProps> = ({ block, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(block.title);
    const [url, setUrl] = useState(block.content?.url || '');
    const [category, setCategory] = useState(block.content?.category || '');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleContentChange = (field: string, value: string) => {
        if (field === 'title') setTitle(value);
        else if (field === 'url') {
            setUrl(value);
            setValidationError(null);
        }
        else if (field === 'category') setCategory(value);
    };

    const handleSave = async () => {
        // Validate URL is not empty
        if (!url.trim()) {
            setValidationError("URL is required");
            return;
        }

        const success = await onEdit(block.block_id, {
            title,
            content: {
                ...block.content,
                url,
                category
            }
        });

        if (success) {
            setIsEditing(false);
            setValidationError(null);
        }
    };

    const handleCancel = () => {
        setTitle(block.title);
        setUrl(block.content?.url || '');
        setCategory(block.content?.category || '');
        setIsEditing(false);
        setValidationError(null);
    };

    // Simple function to generate a category color
    const getCategoryColor = (category: string) => {
        if (!category) return '#6b7280'; // Default gray
        
        // Predefined colors for common categories
        const colorMap: { [key: string]: string } = {
            'documentation': '#3b82f6', // blue
            'tutorial': '#10b981', // green
            'video': '#ef4444', // red
            'article': '#8b5cf6', // purple
            'tool': '#f59e0b', // yellow
            'reference': '#06b6d4', // cyan
            'guide': '#ec4899', // pink
            'course': '#f97316', // orange
        };
        
        const lowerCategory = category.toLowerCase();
        if (colorMap[lowerCategory]) {
            return colorMap[lowerCategory];
        }
        
        // Generate color for unknown categories
        const hash = Array.from(category).reduce((acc, char) =>
            char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 55%)`;
    };

    const categoryColor = getCategoryColor(category);

    return (
        <div className="mb-3 rounded-xl shadow-sm bg-white hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-indigo-300 group">
            <div className="p-4 border-l-4 rounded-lg" style={{ borderLeftColor: categoryColor }}>
                {isEditing ? (
                    // Edit mode
                    <div className="flex flex-col space-y-2">
                        {/* Title field */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => handleContentChange("title", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            placeholder="Title"
                            className="font-bold text-lg outline-none bg-white hover:bg-gray-50 focus:bg-gray-50 px-3 py-2 rounded-lg w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        />

                        {/* URL field */}
                        <div className="flex items-center">
                            <span className="text-gray-500 mr-2 text-lg">🔗</span>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => handleContentChange("url", e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder="URL (required)"
                                className={`text-gray-700 outline-none bg-white hover:bg-gray-50 focus:bg-gray-50 px-3 py-2 rounded-lg w-full border transition-all ${
                                    validationError 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                                }`}
                            />
                        </div>

                        {/* Validation error message */}
                        {validationError && (
                            <div className="text-red-500 text-sm pl-8 flex items-center gap-1">
                                <span className="text-xs">⚠️</span>
                                {validationError}
                            </div>
                        )}

                        {/* Category field */}
                        <div className="flex items-center">
                            <span className="text-gray-500 mr-2 text-lg">📁</span>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => handleContentChange("category", e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder="Category (optional)"
                                className="text-gray-700 outline-none bg-white hover:bg-gray-50 focus:bg-gray-50 px-3 py-2 rounded-lg w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end space-x-2 pt-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-600 hover:to-purple-700 font-medium transition-all shadow-sm"
                            >
                                <span>✓</span>
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium transition-all"
                            >
                                <span>✕</span>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    // View mode
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">
                                {title || "Untitled"}
                            </h3>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-gray-500 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-all"
                                    title="Edit resource"
                                >
                                    <span className="text-sm">✏️</span>
                                </button>
                                <button
                                    onClick={() => onDelete(block.block_id)}
                                    className="text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-all"
                                    title="Delete resource"
                                >
                                    <span className="text-sm">🗑️</span>
                                </button>
                            </div>
                        </div>

                        {/* URL link */}
                        {url && (
                            <a
                                href={url.startsWith('http') ? url : `https://${url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center mt-1 text-sm transition-colors"
                            >
                                <span className="mr-1">🔗</span>
                                {url}
                            </a>
                        )}

                        {/* Category tag */}
                        {category && (
                            <div className="mt-3">
                                <span
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: `${categoryColor}15`,
                                        color: categoryColor,
                                        border: `1px solid ${categoryColor}40`
                                    }}
                                >
                                    {category}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface ResourcesBlockProps {
    blocks: Block[];
    onCreateBlock: (block: BlockRequest) => Promise<Block | null>;
    onUpdateBlock: (blockId: number, data: Partial<BlockRequest>) => Promise<boolean>;
    onDeleteBlock: (blockId: number) => Promise<boolean>;
    loading: boolean;
}

const ResourcesBlock: React.FC<ResourcesBlockProps> = ({
    blocks,
    onCreateBlock,
    onUpdateBlock,
    onDeleteBlock,
    loading
}) => {
    const handleAddResource = async () => {
        const newResourceBlock: BlockRequest = {
            type: 'link',
            title: 'New Resource',
            content: {
                url: '',
                category: '',
                description: ''
            }
        };

        await onCreateBlock(newResourceBlock);
    };

    // Sort blocks by title
    const sortedBlocks = [...blocks].sort((a, b) => a.title.localeCompare(b.title));

    // Group blocks by category
    const groupedBlocks: { [key: string]: Block[] } = {};

    sortedBlocks.forEach(block => {
        const category = block.content?.category || 'Uncategorized';
        if (!groupedBlocks[category]) {
            groupedBlocks[category] = [];
        }
        groupedBlocks[category].push(block);
    });

    // Sort categories alphabetically with "Uncategorized" at the end
    const sortedCategories = Object.keys(groupedBlocks).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="resources-block bg-white rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-xl">📚</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Resources</h2>
                </div>
                <button
                    onClick={handleAddResource}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    <span>➕</span>
                    Add Resource
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                        <span>Loading resources...</span>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && blocks.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-300 transition-all">
                    <div className="mb-4">
                        <span className="text-6xl opacity-50">📚</span>
                    </div>
                    <p className="text-gray-600 mb-4 text-lg font-medium">No resources added yet</p>
                    <p className="text-gray-500 mb-6 text-sm">Start building your resource library</p>
                    <button
                        onClick={handleAddResource}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md font-medium inline-flex items-center gap-2"
                    >
                        <span>➕</span>
                        Add your first resource
                    </button>
                </div>
            )}

            {/* Resources by category */}
            {!loading && blocks.length > 0 && (
                <div className="space-y-6">
                    {/* Stats Overview */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">Total Resources:</span>
                                <span className="text-2xl font-bold text-indigo-600">{blocks.length}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">Categories:</span>
                                <span className="text-lg font-semibold text-purple-600">{sortedCategories.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    {sortedCategories.map(category => (
                        <div key={category} className="">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center bg-gray-50 p-3 rounded-lg">
                                <span className="mr-2 text-xl">📁</span>
                                <span className="flex-1">{category}</span>
                                <span className="px-3 py-1 text-xs bg-white text-gray-600 rounded-full font-medium border border-gray-200">
                                    {groupedBlocks[category].length} {groupedBlocks[category].length === 1 ? 'resource' : 'resources'}
                                </span>
                            </h3>
                            <div className="space-y-2 ml-2">
                                {groupedBlocks[category].map(block => (
                                    <ResourceBlock
                                        key={block.block_id}
                                        block={block}
                                        onEdit={onUpdateBlock}
                                        onDelete={onDeleteBlock}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResourcesBlock; 