import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Resource,
    Paper,
    ResourceQuota,
    getUserResources,
    createWebLink,
    uploadFile,
    updateResource,
    deleteResource,
    searchResources,
    getResourceQuota,
    loadPapers,
    formatFileSize,
} from '../../services/resourceServices';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import PDFViewer from '../../components/PDFViewer';

const { API_BASE_URL } = config;

const Resources: React.FC = () => {
        const navigate = useNavigate();
    const { t } = useTranslation();
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const authInit = useSelector((state: RootState) => state.auth.init);
    const token = useSelector((state: RootState) => state.auth.token);
    const [resources, setResources] = useState<Resource[]>([]);
    const [quota, setQuota] = useState<ResourceQuota | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'link' | 'file' | 'papers'>('all');
    const [page, setPage] = useState(1);
    const [totalResources, setTotalResources] = useState(0);

    // Dialog states
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>('');

    // Form states
    const [linkForm, setLinkForm] = useState({
        title: '',
        url: '',
        description: '',
        tags: ''
    });

    const [fileForm, setFileForm] = useState({
        file: null as File | null,
        title: '',
        description: '',
        tags: ''
    });

    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        tags: ''
    });

    // Force recalculate quota
    const handleRecalculateQuota = async () => {
        try {
            const { recalculateResourceQuota } = await import('../../services/resourceServices');
            const quotaData = await recalculateResourceQuota();
            console.log('Recalculated quota:', quotaData);
            setQuota(quotaData);
            toast.success('Storage quota recalculated successfully');
        } catch (error) {
            console.error('Failed to recalculate quota:', error);
            toast.error('Failed to recalculate storage quota');
        }
    };

    // Load resources and quota
        const loadResources = useCallback(async () => {
        try {
            setLoading(true);
            // For 'papers', load only PDF files (type='file')
            const resourceType = filterType === 'papers' ? 'file' : (filterType === 'all' ? undefined : filterType);
            const response = await getUserResources(page, 20, resourceType as 'link' | 'file' | undefined);

            // Filter out system-generated files (cropped images, etc.)
            const isSystemGenerated = (resource: Resource) => {
                const title = resource.title?.toLowerCase() || '';
                const fileName = resource.file_name?.toLowerCase() || '';

                // System-generated file patterns
                return (
                    title.startsWith('cropped image') ||
                    fileName.startsWith('crop-page') ||
                    title.includes('system-generated')
                );
            };

            // Filter to only user-uploaded files
            const userResources = (response.data || []).filter(r => !isSystemGenerated(r));

            // Filter to only PDFs if papers filter is active
            if (filterType === 'papers') {
                const pdfResources = userResources.filter(r => r.file_type?.includes('pdf'));
                setResources(pdfResources);
                setTotalResources(pdfResources.length);
            } else {
                setResources(userResources);
                setTotalResources(userResources.length);
            }
        } catch (error: any) {
            console.error('Failed to load resources:', error);
            // More detailed error message
            const errorMessage = error?.message || t('resources.errors.loadFailed');
            toast.error(`${t('resources.errors.loadFailed')}: ${errorMessage}`);
            // Set empty resources on error to avoid undefined issues
            setResources([]);
            setTotalResources(0);
        } finally {
            setLoading(false);
        }
    }, [page, filterType, t]);

    const loadQuota = async () => {
        try {
            const quotaData = await getResourceQuota();
            setQuota(quotaData);
        } catch (error) {
            console.error('Failed to load quota:', error);
            // Set default quota values if API fails
            setQuota({
                user_id: 0,
                user_tier: 'free',
                file_count: 0,
                max_file_count: 100,
                max_file_size: 10485760, // 10MB
                total_storage: 0,
                max_storage: 104857600, // 100MB
                updated_at: new Date().toISOString()
            });
        }
    };


    // Check authentication and load resources
        useEffect(() => {
        if (!authInit) {
            return;
        }

        if (!isAuthenticated) {
            toast.error(t('auth.pleaseLogin') || 'Please login to access resources');
            navigate('/login');
        } else {
            loadQuota();
            loadResources();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authInit, isAuthenticated, navigate, filterType, page, t]);

    // Listen for resource updates from other components (e.g., ActionReviewModal)
    useEffect(() => {
        const handleResourcesUpdated = () => {
            console.log('[Resources] Resources updated event received, refreshing...');
            loadResources();
            loadQuota(); // Also refresh quota to show updated storage
        };

        window.addEventListener('resources-updated', handleResourcesUpdated);

        return () => {
            window.removeEventListener('resources-updated', handleResourcesUpdated);
        };
    }, [loadResources]);

    // Handle search
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadResources();
            return;
        }

        try {
            setLoading(true);
            const results = await searchResources(searchQuery);
            setResources(results);
        } catch (error) {
            console.error('Search failed:', error);
            toast.error(t('resources.errors.searchFailed'));
        } finally {
            setLoading(false);
        }
    };

    // Handle create web link
    const handleCreateLink = async () => {
        try {
            const tags = linkForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            await createWebLink({
                title: linkForm.title,
                url: linkForm.url,
                description: linkForm.description,
                tags
            });

            toast.success(t('resources.success.linkAdded'));
            setLinkDialogOpen(false);
            setLinkForm({ title: '', url: '', description: '', tags: '' });
            loadResources();
        } catch (error: any) {
            toast.error(error.message || t('resources.errors.addLinkFailed'));
        }
    };

    // Handle file upload
    const handleFileUpload = async () => {
        if (!fileForm.file) {
            toast.error(t('resources.errors.selectFile'));
            return;
        }

        try {
            const tags = fileForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            await uploadFile(
                fileForm.file,
                fileForm.title || fileForm.file.name,
                fileForm.description,
                tags
            );

            toast.success(t('resources.success.fileUploaded'));
            setFileDialogOpen(false);
            setFileForm({ file: null, title: '', description: '', tags: '' });
            loadResources();
            loadQuota();
        } catch (error: any) {
            toast.error(error.message || t('resources.errors.uploadFailed'));
        }
    };

    // Handle update resource
    const handleUpdateResource = async () => {
        if (!selectedResource) return;

        try {
            const tags = editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            await updateResource(selectedResource.id, {
                title: editForm.title,
                description: editForm.description,
                tags
            });

            toast.success(t('resources.success.resourceUpdated'));
            setEditDialogOpen(false);
            setSelectedResource(null);
            loadResources();
        } catch (error) {
            toast.error(t('resources.errors.updateFailed'));
        }
    };

    // Handle delete resource
    const handleDeleteResource = async () => {
        if (!selectedResource) return;

        try {
            await deleteResource(selectedResource.id);
            toast.success(t('resources.success.resourceDeleted'));
            setDeleteDialogOpen(false);
            setSelectedResource(null);
            loadResources();
            if (selectedResource.type === 'file') {
                loadQuota();
            }
        } catch (error) {
            toast.error(t('resources.errors.deleteFailed'));
        }
    };

    // Open edit dialog
    const openEditDialog = (resource: Resource) => {
        setSelectedResource(resource);
        setEditForm({
            title: resource.title,
            description: resource.description || '',
            tags: resource.tags ? resource.tags.join(', ') : ''
        });
        setEditDialogOpen(true);
    };

    // Open delete dialog
    const openDeleteDialog = (resource: Resource) => {
        setSelectedResource(resource);
        setDeleteDialogOpen(true);
    };

    // Calculate storage percentage
    const storagePercentage = quota ? (quota.total_storage / quota.max_storage) * 100 : 0;

    // Get icon for resource type
    const getResourceIcon = (resource: Resource) => {
        if (resource.type === 'link') {
            return (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
            );
        }

        // File icon based on type
        const fileType = resource.file_type?.toLowerCase() || '';
        let iconColor = 'from-gray-400 to-gray-600';
        let icon = (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );

        if (fileType.includes('image')) {
            iconColor = 'from-purple-400 to-purple-600';
            icon = (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
        } else if (fileType.includes('pdf')) {
            iconColor = 'from-red-400 to-red-600';
        } else if (fileType.includes('video')) {
            iconColor = 'from-pink-400 to-pink-600';
            icon = (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            );
        } else if (fileType.includes('audio')) {
            iconColor = 'from-green-400 to-green-600';
            icon = (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
            );
        }

        return (
            <div className={`w-12 h-12 bg-gradient-to-br ${iconColor} rounded-lg flex items-center justify-center`}>
                {icon}
            </div>
        );
    };

    // Don't render while auth is initializing
    if (!authInit) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // If not authenticated, the useEffect will handle the redirect
    // But we still need to render something to avoid errors
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">{t('auth.redirectingToLogin')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('resources.title')}</h1>
                    <p className="text-gray-600">{t('resources.subtitle')}</p>
                </div>

                {/* Quota Display */}
                {quota && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">{t('resources.storageQuota')}</span>
                                        <button
                                            onClick={handleRecalculateQuota}
                                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Refresh storage quota"
                                        >
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    </div>
                                    <span className="text-sm text-gray-600">
                                        {formatFileSize(quota.total_storage)} / {formatFileSize(quota.max_storage)}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full transition-all duration-300 ${storagePercentage > 80 ? 'bg-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                            }`}
                                        style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                        {quota.file_count} / {quota.max_file_count} {t('resources.files').toLowerCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {t('resources.maxPerFile', { size: formatFileSize(quota.max_file_size) })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${quota.user_tier === 'premium'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}>
                                    {quota.user_tier === 'premium' ? `✨ ${t('resources.premium')}` : t('resources.free')}
                                </span>
                                {quota.user_tier === 'free' && (
                                    <button
                                        onClick={() => navigate('/pricing')}
                                        className="px-4 py-1 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                                    >
                                        {t('resources.upgrade')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions Bar */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex gap-2 flex-1">
                            <button
                                onClick={() => setLinkDialogOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {t('resources.buttons.addLink')}
                            </button>
                            <button
                                onClick={() => setFileDialogOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {t('resources.buttons.uploadFile')}
                            </button>
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterType === 'all'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {t('resources.filters.all')}
                            </button>
                            <button
                                onClick={() => setFilterType('link')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterType === 'link'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {t('resources.filters.links')}
                            </button>
                            <button
                                onClick={() => setFilterType('file')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterType === 'file'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {t('resources.filters.files')}
                            </button>
                            <button
                                onClick={() => setFilterType('papers')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterType === 'papers'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📚 Papers
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('resources.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Resources Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                                    <div className="flex-1">
                                        <div className="h-5 bg-gray-200 rounded mb-2" />
                                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                                    </div>
                                </div>
                                <div className="h-12 bg-gray-200 rounded mb-3" />
                                <div className="flex gap-2">
                                    <div className="h-6 bg-gray-200 rounded w-16" />
                                    <div className="h-6 bg-gray-200 rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : resources.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('resources.empty.title')}</h3>
                        <p className="text-gray-600 mb-6">{t('resources.empty.subtitle')}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setLinkDialogOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                            >
                                {t('resources.empty.addFirstLink')}
                            </button>
                            <button
                                onClick={() => setFileDialogOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                            >
                                {t('resources.empty.uploadFirstFile')}
                            </button>
                        </div>
                    </div>
                ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    <AnimatePresence>
                                        {resources.map((resource) => (
                                            <motion.div
                                                key={resource.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.2 }}
                                                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden group flex flex-col"
                                            >
                                                <div className="p-4 flex-1 flex flex-col">
                                                    {/* Header */}
                                                    <div className="flex items-start gap-3 mb-3">
                                                        {getResourceIcon(resource)}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-gray-900 truncate">
                                                                {resource.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500">
                                                                {resource.type === 'link' ? t('resources.types.webLink') : resource.file_name}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    {resource.description && (
                                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                            {resource.description}
                                                        </p>
                                                    )}

                                                    {/* File Info */}
                                                    {resource.type === 'file' && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                                            <span>{formatFileSize(resource.file_size || 0)}</span>
                                                            <span>•</span>
                                                            <span>{resource.file_type?.split('/')[1]?.toUpperCase() || t('resources.types.file')}</span>
                                                        </div>
                                                    )}

                                                    {/* Tags */}
                                                    {resource.tags && resource.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {resource.tags.slice(0, 3).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {resource.tags.length > 3 && (
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                                    +{resource.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (resource.type === 'link') {
                                                                        window.open(resource.url, '_blank');
                                                                    } else if (resource.type === 'file' && resource.file_type?.includes('pdf')) {
                                                                        // Open PDF in viewer using proxy URL with current token from Redux
                                                                        const proxyUrl = `${config.API_BASE_URL}/api/resources/${resource.id}/proxy${token ? `?token=${encodeURIComponent(token)}` : ''}`;
                                                                        setPdfUrl(proxyUrl);
                                                                        setPdfViewerOpen(true);
                                                                    } else if (resource.url) {
                                                                        // Download other files
                                                                        window.open(resource.url, '_blank');
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                                                            >
                                                                {resource.type === 'link' ? (
                                                                    <>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                        </svg>
                                                                        {t('resources.actions.open')}
                                                                    </>
                                                                ) : resource.file_type?.includes('pdf') ? (
                                                                    <>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                        View PDF
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                        </svg>
                                                                        {t('resources.actions.download')}
                                                                    </>
                                                                )}
                                                            </button>
                                                            {resource.file_type?.includes('pdf') && (
                                                                <button
                                                                    onClick={() => navigate(`/paper/${resource.id}`)}
                                                                    className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                                                                >
                                                                    <span>📖</span>
                                                                    Read Paper
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => openEditDialog(resource)}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteDialog(resource)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                )}

                {/* Dialogs */}
                {/* Add Link Dialog */}
                {linkDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('resources.dialogs.addLink.title')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.addLink.titleLabel')}</label>
                                    <input
                                        type="text"
                                        value={linkForm.title}
                                        onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.addLink.titlePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.addLink.urlLabel')}</label>
                                    <input
                                        type="url"
                                        value={linkForm.url}
                                        onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.addLink.urlPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.addLink.descriptionLabel')}</label>
                                    <textarea
                                        value={linkForm.description}
                                        onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        rows={3}
                                        placeholder={t('resources.dialogs.addLink.descriptionPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.addLink.tagsLabel')}</label>
                                    <input
                                        type="text"
                                        value={linkForm.tags}
                                        onChange={(e) => setLinkForm({ ...linkForm, tags: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.addLink.tagsPlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setLinkDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleCreateLink}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                                >
                                    {t('resources.buttons.addLink')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Upload File Dialog */}
                {fileDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('resources.dialogs.uploadFile.title')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.uploadFile.fileLabel')}</label>
                                    <label className="block">
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (quota && file.size > quota.max_file_size) {
                                                        toast.error(`File size exceeds limit of ${formatFileSize(quota.max_file_size)}`);
                                                        return;
                                                    }
                                                    setFileForm({ ...fileForm, file, title: file.name });
                                                }
                                            }}
                                        />
                                        <div className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors cursor-pointer text-center">
                                            {fileForm.file ? (
                                                <div>
                                                    <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-700">{fileForm.file.name}</p>
                                                    <p className="text-xs text-gray-500">{formatFileSize(fileForm.file.size)}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="text-sm text-gray-700">{t('resources.dialogs.uploadFile.chooseFile')}</p>
                                                    <p className="text-xs text-gray-500">{t('resources.dialogs.uploadFile.maxSize', { size: quota ? formatFileSize(quota.max_file_size) : '10MB' })}</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.uploadFile.titleLabel')}</label>
                                    <input
                                        type="text"
                                        value={fileForm.title}
                                        onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.uploadFile.titlePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.uploadFile.descriptionLabel')}</label>
                                    <textarea
                                        value={fileForm.description}
                                        onChange={(e) => setFileForm({ ...fileForm, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        rows={3}
                                        placeholder={t('resources.dialogs.uploadFile.descriptionPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.uploadFile.tagsLabel')}</label>
                                    <input
                                        type="text"
                                        value={fileForm.tags}
                                        onChange={(e) => setFileForm({ ...fileForm, tags: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.uploadFile.tagsPlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setFileDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleFileUpload}
                                    disabled={!fileForm.file}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${fileForm.file
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {t('resources.buttons.upload')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Edit Resource Dialog */}
                {editDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('resources.dialogs.editResource.title')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.editResource.titleLabel')}</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.editResource.descriptionLabel')}</label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('resources.dialogs.editResource.tagsLabel')}</label>
                                    <input
                                        type="text"
                                        value={editForm.tags}
                                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={t('resources.dialogs.editResource.tagsPlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleUpdateResource}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                                >
                                    {t('resources.buttons.saveChanges')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                {deleteDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl max-w-sm w-full p-6"
                        >
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{t('resources.dialogs.deleteResource.title')}</h3>
                            <p className="text-sm text-gray-600 text-center mb-6">
                                {t('resources.dialogs.deleteResource.message', { title: selectedResource?.title })}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleDeleteResource}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    {t('common.delete')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* PDF Viewer Modal */}
                {pdfViewerOpen && pdfUrl && (
                    <PDFViewer url={pdfUrl} onClose={() => setPdfViewerOpen(false)} />
                )}
            </div>
        </div>
    );
};

export default Resources;