import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Workspace } from '../../types/project/projectDetails';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import IconPicker, { ICON_OPTIONS } from '../shared/IconPicker';

interface Category {
    name: string;
    color: string;
}

interface ProjectWorkspacesProps {
    projectId: string;
    isAdmin: boolean;
}

// 20 predefined colors for categories
const CATEGORY_COLORS = [
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Sky', value: '#0EA5E9' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Violet', value: '#8B5CF6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Fuchsia', value: '#D946EF' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Slate', value: '#64748B' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Zinc', value: '#71717A' },
];

const ProjectWorkspaces: React.FC<ProjectWorkspacesProps> = ({ projectId, isAdmin }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('category');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editedCategoryName, setEditedCategoryName] = useState('');
    const [editedCategoryColor, setEditedCategoryColor] = useState('#3B82F6');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState<Partial<Workspace>>({
        title: '',
        description: '',
        url: '',
        category: '',
        icon: 'none',
        sort_order: 0,
    });

    useEffect(() => {
        fetchWorkspaces();
    }, [projectId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false);
                setEditingCategory(null);
            }
        };

        if (showCategoryDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showCategoryDropdown]);

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/workspaces`);

            if (response.ok) {
                const data = await response.json();
                const workspacesList = data.workspaces || [];
                setWorkspaces(workspacesList);

                // Extract unique categories
                const categorySet = new Set<string>();
                workspacesList.forEach((w: Workspace) => {
                    if (w.category) {
                        categorySet.add(w.category);
                    }
                });
                const uniqueCategoryNames = Array.from(categorySet);
                setCategories(uniqueCategoryNames.map((name, index) => ({
                    name,
                    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].value
                })));
            }
        } catch (error) {
            console.error('Error fetching workspaces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            alert('Please enter a work tool name');
            return;
        }

        try {
            const url = editingId
                ? `/api/project/${projectId}/workspaces/${editingId}`
                : `/api/project/${projectId}/workspaces`;

            const response = await fetchWithAuth(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchWorkspaces();
                resetForm();
            } else {
                const errorData = await response.json();
                console.error('Save error:', errorData);
                alert(`Error: ${errorData.error || 'Failed to save workspace'}`);
            }
        } catch (error) {
            console.error('Error saving workspace:', error);
            alert('Error saving workspace');
        }
    };

    const handleDelete = async (workspaceId: number) => {
        if (!confirm('Are you sure you want to delete this workspace?')) return;

        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/workspaces/${workspaceId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchWorkspaces();
            }
        } catch (error) {
            console.error('Error deleting workspace:', error);
        }
    };

    const handleEdit = (workspace: Workspace) => {
        setEditingId(workspace.workspace_id || null);
        setFormData({
            title: workspace.title,
            description: workspace.description || '',
            url: workspace.url || '',
            category: workspace.category || '',
            icon: workspace.icon || 'none',
            sort_order: workspace.sort_order || 0,
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            url: '',
            category: '',
            icon: 'none',
            sort_order: 0,
        });
        setEditingId(null);
        setIsModalOpen(false);
        setIsAddingCategory(false);
        setNewCategoryName('');
        setNewCategoryColor('#3B82F6');
    };

    const handleAddCategory = () => {
        if (newCategoryName.trim() && !categories.find(c => c.name === newCategoryName.trim())) {
            setCategories([...categories, { name: newCategoryName.trim(), color: newCategoryColor }]);
            setFormData({ ...formData, category: newCategoryName.trim() });
            setIsAddingCategory(false);
            setNewCategoryName('');
            setNewCategoryColor('#3B82F6');
        }
    };

    const handleEditCategory = (oldCategory: Category) => {
        setEditingCategory(oldCategory.name);
        setEditedCategoryName(oldCategory.name);
        setEditedCategoryColor(oldCategory.color);
    };

    const handleSaveEditedCategory = () => {
        if (editingCategory && editedCategoryName.trim()) {
            const updatedCategories = categories.map(cat =>
                cat.name === editingCategory ? { name: editedCategoryName.trim(), color: editedCategoryColor } : cat
            );
            setCategories(updatedCategories);
            if (formData.category === editingCategory) {
                setFormData({ ...formData, category: editedCategoryName.trim() });
            }
        }
        setEditingCategory(null);
        setEditedCategoryName('');
    };

    const handleDeleteCategory = (categoryName: string) => {
        setCategories(categories.filter(cat => cat.name !== categoryName));
        if (formData.category === categoryName) {
            setFormData({ ...formData, category: '' });
        }
    };

    const handleSelectCategory = (categoryName: string) => {
        setFormData({ ...formData, category: categoryName });
        setShowCategoryDropdown(false);
    };

    const getFilteredAndSortedWorkspaces = () => {
        let filtered = workspaces;

        if (filterCategory !== 'all') {
            filtered = filtered.filter(w => w.category === filterCategory);
        }

        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'category':
                    return (a.category || '').localeCompare(b.category || '');
                case 'name':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return sorted;
    };

    const getWorkspacesByCategory = () => {
        const filtered = getFilteredAndSortedWorkspaces();
        const grouped: { [key: string]: Workspace[] } = {};

        filtered.forEach(workspace => {
            const category = workspace.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(workspace);
        });

        return grouped;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading workspaces...</span>
            </div>
        );
    }

    const groupedWorkspaces = getWorkspacesByCategory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1800px] mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">Work Tools</h2>
                            <p className="text-sm text-slate-600 mt-1">Connect collaboration tools where your team actively works (Figma, Notion, GitHub, Slack, etc.)</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded hover:from-cyan-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Work Tool
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Sort Controls */}
                {workspaces.length > 0 && (
                    <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Sort By */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="category">Category</option>
                                <option value="name">Name</option>
                                <option value="type">Type</option>
                            </select>
                        </div>

                        {/* Filter by Category */}
                        {categories.length > 0 && (
                            <>
                                <div className="h-6 w-px bg-gray-300"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Category:</span>
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="text-sm px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(cat => (
                                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Reset Filters */}
                        {(filterCategory !== 'all' || sortBy !== 'category') && (
                            <button
                                onClick={() => {
                                    setFilterCategory('all');
                                    setSortBy('category');
                                }}
                                className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Workspaces List */}
            {workspaces.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No work tools yet</h3>
                    <p className="text-gray-600 mb-4">
                        {isAdmin ? 'Connect your team\'s collaboration tools (Figma, Notion, GitHub, Slack, etc.)' : 'No work tools have been added to this project'}
                    </p>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add First Work Tool
                        </button>
                    )}
                </div>
            ) : Object.keys(groupedWorkspaces).length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No work tools match your filters</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
                    <button
                        onClick={() => {
                            setFilterCategory('all');
                            setSortBy('category');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedWorkspaces).map(([category, categoryWorkspaces]) => {
                        const categoryObj = categories.find(c => c.name === category);
                        return (
                            <div key={category}>
                                {/* Category Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-1 h-6 rounded-full"
                                        style={{ backgroundColor: categoryObj?.color || '#6B7280' }}
                                    ></div>
                                    <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                                    <span className="text-sm text-gray-500">({categoryWorkspaces.length})</span>
                                </div>

                                {/* Workspaces Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryWorkspaces.map((workspace) => {
                                        const CardWrapper = workspace.url ? 'a' : 'div';
                                        const cardProps = workspace.url ? {
                                            href: workspace.url,
                                            target: '_blank',
                                            rel: 'noopener noreferrer',
                                            className: 'block'
                                        } : {};

                                        return (
                                            <CardWrapper key={workspace.workspace_id} {...cardProps}>
                                                <div
                                                    className={`group relative bg-white rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 p-5 ${workspace.url ? 'cursor-pointer' : ''}`}
                                                >
                                                    {/* Tool Icon */}
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                            {workspace.icon && workspace.icon !== 'none' && (() => {
                                                                if (workspace.icon === 'custom' && workspace.color) {
                                                                    return <img src={workspace.color} alt="" className="w-8 h-8 object-cover rounded" />;
                                                                }
                                                                const iconData = ICON_OPTIONS.find(icon => icon.name === workspace.icon);
                                                                return iconData?.svg ? (
                                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconData.svg }} />
                                                                ) : null;
                                                            })()}
                                                            {(!workspace.icon || workspace.icon === 'none') && (
                                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-semibold text-gray-900 truncate">{workspace.title}</h4>
                                                                {workspace.url && (
                                                                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            {workspace.category && (
                                                                <p className="text-xs text-gray-500">{workspace.category}</p>
                                                            )}
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleEdit(workspace);
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    {workspace.description && (
                                                        <p className="text-sm text-gray-600 line-clamp-2">{workspace.description}</p>
                                                    )}
                                                </div>
                                            </CardWrapper>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingId ? 'Edit Work Tool' : 'Add New Work Tool'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name *</label>
                                <input
                                    type="text"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Notion, Figma, GitHub"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="What is this tool used for?"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link (URL)</label>
                                <input
                                    type="url"
                                    value={formData.url || ''}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://notion.so/workspace or https://figma.com/file/..."
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Add a link to quickly access this tool</p>
                            </div>

                            <IconPicker
                                selectedIcon={formData.icon || 'none'}
                                selectedIconUrl={formData.icon === 'custom' ? (formData.color || undefined) : undefined}
                                onSelect={(iconName, iconUrl) => setFormData({
                                    ...formData,
                                    icon: iconName,
                                    color: iconName === 'custom' ? iconUrl : formData.color
                                })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
                                    >
                                        <span className={`flex items-center gap-2 ${formData.category ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {formData.category && (() => {
                                                const categoryObj = categories.find(c => c.name === formData.category);
                                                return categoryObj ? (
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: categoryObj.color }}
                                                    />
                                                ) : null;
                                            })()}
                                            {formData.category || 'Select a category...'}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showCategoryDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                            {categories.length > 0 && (
                                                <div className="py-1">
                                                    {categories.map((cat) => (
                                                        <div
                                                            key={cat.name}
                                                            className="group hover:bg-gray-50"
                                                        >
                                                            {editingCategory === cat.name ? (
                                                                <div className="px-3 py-2 space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editedCategoryName}
                                                                        onChange={(e) => setEditedCategoryName(e.target.value)}
                                                                        className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleSaveEditedCategory();
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingCategory(null);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {CATEGORY_COLORS.map(color => (
                                                                            <button
                                                                                key={color.value}
                                                                                type="button"
                                                                                onClick={() => setEditedCategoryColor(color.value)}
                                                                                className={`w-6 h-6 rounded-full border-2 ${editedCategoryColor === color.value ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200'}`}
                                                                                style={{ backgroundColor: color.value }}
                                                                                title={color.name}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleSaveEditedCategory}
                                                                            className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingCategory(null)}
                                                                            className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between px-3 py-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectCategory(cat.name)}
                                                                        className="flex-1 text-left flex items-center gap-2"
                                                                    >
                                                                        <span
                                                                            className="w-3 h-3 rounded-full"
                                                                            style={{ backgroundColor: cat.color }}
                                                                        />
                                                                        {formData.category === cat.name && (
                                                                            <span className="text-blue-600">✓</span>
                                                                        )}
                                                                        <span>{cat.name}</span>
                                                                    </button>
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleEditCategory(cat);
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                                            title="Edit category"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (confirm(`Delete category "${cat.name}"?`)) {
                                                                                    handleDeleteCategory(cat.name);
                                                                                }
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                                            title="Delete category"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="border-t border-gray-200 p-2">
                                                {!isAddingCategory ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingCategory(true)}
                                                        className="w-full px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium text-left flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Add new category
                                                    </button>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            placeholder="Category name..."
                                                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddCategory();
                                                                } else if (e.key === 'Escape') {
                                                                    setIsAddingCategory(false);
                                                                    setNewCategoryName('');
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex gap-2 flex-wrap">
                                                            {CATEGORY_COLORS.map(color => (
                                                                <button
                                                                    key={color.value}
                                                                    type="button"
                                                                    onClick={() => setNewCategoryColor(color.value)}
                                                                    className={`w-6 h-6 rounded-full border-2 ${newCategoryColor === color.value ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200'}`}
                                                                    style={{ backgroundColor: color.value }}
                                                                    title={color.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleAddCategory}
                                                                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsAddingCategory(false);
                                                                    setNewCategoryName('');
                                                                    setNewCategoryColor('#3B82F6');
                                                                }}
                                                                className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow-md"
                                >
                                    {editingId ? 'Update Work Tool' : 'Add Work Tool'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-300"
                                >
                                    Cancel
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingId) {
                                                handleDelete(editingId);
                                                resetForm();
                                            }
                                        }}
                                        className="ml-auto px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            </div>
        </div>
    );
};

export default ProjectWorkspaces;
