import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Resource } from '../../types/project/projectDetails';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import IconPicker, { ICON_OPTIONS } from '../shared/IconPicker';

interface Category {
    name: string;
    color: string;
}

interface ProjectResourcesProps {
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

const ProjectResources: React.FC<ProjectResourcesProps> = ({ projectId, isAdmin }) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('category');
    const [formData, setFormData] = useState<Partial<Resource>>({
        title: '',
        resource_type: 'link',
        url: '',
        description: '',
        category: '',
        tags: [],
        icon: 'none',
        file_path: undefined, // Store custom icon URL here
        sort_order: 0,
    });

    useEffect(() => {
        fetchResources();
    }, [projectId]);

    // Listen for resource updates from other components (e.g., ActionReviewModal)
    useEffect(() => {
        const handleResourcesUpdated = () => {
            console.log('[ProjectResources] Resources updated event received, refreshing...');
            fetchResources();
        };

        window.addEventListener('resources-updated', handleResourcesUpdated);

        return () => {
            window.removeEventListener('resources-updated', handleResourcesUpdated);
        };
    }, [projectId]);

    const fetchResources = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/resources`);
            if (response.ok) {
                const data = await response.json();
                const resourcesList = data.resources || [];
                setResources(resourcesList);

                // Extract unique categories
                const categorySet = new Set<string>();
                resourcesList.forEach((r: Resource) => {
                    if (r.category) {
                        categorySet.add(r.category);
                    }
                });
                const uniqueCategoryNames = Array.from(categorySet);
                setCategories(uniqueCategoryNames.map((name, index) => ({
                    name,
                    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].value
                })));
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            alert('Please enter a resource title');
            return;
        }

        if (isSaving) return; // Prevent duplicate submissions

        setIsSaving(true);
        try {
            const url = editingId
                ? `/project/${projectId}/resources/${editingId}`
                : `/project/${projectId}/resources`;

            const response = await fetchWithAuth(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchResources();
                resetForm();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to save resource'}`);
            }
        } catch (error) {
            console.error('Error saving resource:', error);
            alert('Error saving resource');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (resourceId: number) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/resources/${resourceId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchResources();
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
        }
    };

    const handleEdit = (resource: Resource) => {
        setEditingId(resource.resource_id || null);
        setFormData({
            title: resource.title,
            resource_type: resource.resource_type || 'link',
            url: resource.url || '',
            description: resource.description || '',
            category: resource.category || '',
            tags: resource.tags || [],
            icon: resource.icon || 'none',
            file_path: resource.icon === 'custom' ? resource.file_path : undefined,
            sort_order: resource.sort_order || 0,
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            resource_type: 'link',
            url: '',
            description: '',
            category: '',
            tags: [],
            icon: 'none',
            file_path: undefined,
            sort_order: 0,
        });
        setEditingId(null);
        setIsModalOpen(false);
    };

    const getFilteredAndSortedResources = () => {
        let filtered = resources;

        if (filterCategory !== 'all') {
            filtered = filtered.filter(r => r.category === filterCategory);
        }

        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'category':
                    return (a.category || '').localeCompare(b.category || '');
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'type':
                    return (a.resource_type || '').localeCompare(b.resource_type || '');
                default:
                    return 0;
            }
        });

        return sorted;
    };

    const getResourcesByCategory = () => {
        const filtered = getFilteredAndSortedResources();
        const grouped: { [key: string]: Resource[] } = {};

        filtered.forEach(resource => {
            const category = resource.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(resource);
        });

        return grouped;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading resources...</span>
            </div>
        );
    }

    const groupedResources = getResourcesByCategory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Filter, Sort Controls and Add Button */}
                {resources.length > 0 && (
                    <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-6">
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
                                <option value="title">Title</option>
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
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                                Reset Filters
                            </button>
                        )}

                        {/* Add Resource Button */}
                        {isAdmin && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Resource
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Resources List */}
            {resources.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No resources yet</h3>
                    <p className="text-gray-600 mb-4">
                        {isAdmin ? 'Get started by adding your first resource' : 'No resources have been added to this project'}
                    </p>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add First Resource
                        </button>
                    )}
                </div>
            ) : Object.keys(groupedResources).length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No resources match your filters</h3>
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
                    {Object.entries(groupedResources).map(([category, categoryResources]) => {
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
                                    <span className="text-sm text-gray-500">({categoryResources.length})</span>
                                </div>

                                {/* Resources Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryResources.map((resource) => (
                                        <div
                                            key={resource.resource_id}
                                            className="group relative bg-white rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 p-5"
                                        >
                                            {/* Resource Type Icon */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                                    resource.resource_type === 'link' ? 'bg-blue-100' :
                                                    resource.resource_type === 'file' ? 'bg-green-100' :
                                                    'bg-purple-100'
                                                }`}>
                                                    {resource.icon && resource.icon !== 'none' && (() => {
                                                        if (resource.icon === 'custom' && resource.file_path) {
                                                            return <img src={resource.file_path} alt="" className="w-8 h-8 object-cover rounded" />;
                                                        }
                                                        const iconData = ICON_OPTIONS.find(icon => icon.name === resource.icon);
                                                        return iconData?.svg ? (
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconData.svg }} />
                                                        ) : null;
                                                    })()}
                                                    {(!resource.icon || resource.icon === 'none') && (
                                                        resource.resource_type === 'link' ? (
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                            </svg>
                                                        ) : resource.resource_type === 'file' ? (
                                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                        )
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 truncate">{resource.title}</h4>
                                                    <p className="text-xs text-gray-500 capitalize">{resource.resource_type}</p>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(resource)}
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
                                            {resource.description && (
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                                            )}

                                            {/* URL */}
                                            {resource.url && (
                                                <a
                                                    href={resource.url.startsWith('http') ? resource.url : `https://${resource.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    <span className="truncate">View Resource</span>
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    ))}
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
                                    {editingId ? 'Edit Resource' : 'Add New Resource'}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.resource_type || 'link'}
                                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as 'link' | 'file' | 'document' | 'video' | 'other' })}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="link">Link</option>
                                    <option value="file">File</option>
                                    <option value="document">Document</option>
                                    <option value="video">Video</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                <input
                                    type="text"
                                    value={formData.url || ''}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="example.com/resource"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Documentation, Code, Design"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    list="categories"
                                />
                                <datalist id="categories">
                                    {categories.map(cat => (
                                        <option key={cat.name} value={cat.name} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <IconPicker
                                    selectedIcon={formData.icon || 'none'}
                                    selectedIconUrl={formData.icon === 'custom' ? (formData.file_path || undefined) : undefined}
                                    onSelect={(iconName, iconUrl) => setFormData({
                                        ...formData,
                                        icon: iconName,
                                        file_path: iconName === 'custom' ? iconUrl : formData.file_path
                                    })}
                                    label="Icon"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-6 py-2.5 font-medium rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center gap-2 ${
                                        isSaving
                                            ? 'bg-blue-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                                    } text-white`}
                                >
                                    {isSaving && (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    {isSaving ? 'Saving...' : (editingId ? 'Update Resource' : 'Create Resource')}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ProjectResources;
