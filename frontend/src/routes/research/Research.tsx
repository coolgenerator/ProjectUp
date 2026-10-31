import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Upload, Search, FileText, Eye } from 'lucide-react';
import {
    Resource,
    getUserResources,
    uploadFile as uploadFileService,
    formatFileSize,
} from '../../services/resourceServices';

const Research: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const authInit = useSelector((state: RootState) => state.auth.init);
    const [papers, setPapers] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadFile, setUploadFileState] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');

    // Load papers
    const loadPapers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getUserResources(1, 100, 'file');
            // Filter to only PDFs
            const pdfPapers = (response.data || []).filter(r =>
                r.file_type?.toLowerCase().includes('pdf')
            );
            setPapers(pdfPapers);
        } catch (error: any) {
            console.error('Failed to load papers:', error);
            toast.error('Failed to load papers');
            setPapers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check authentication and load papers
    useEffect(() => {
        if (!authInit) {
            return;
        }

        if (isAuthenticated) {
            loadPapers();
        }
    }, [authInit, isAuthenticated, loadPapers]);

    // Handle file upload
    const handleUploadPaper = async () => {
        if (!uploadFile) {
            toast.error('Please select a PDF file');
            return;
        }

        if (!uploadFile.type.includes('pdf')) {
            toast.error('Only PDF files are allowed');
            return;
        }

        // Check for duplicate files in existing papers
        const duplicatePaper = papers.find(paper => {
            // Check if the filenames match (case-insensitive)
            const existingFilename = paper.file_name || '';
            return existingFilename.toLowerCase() === uploadFile.name.toLowerCase();
        });

        if (duplicatePaper) {
            toast.error(`A paper with the same filename already exists: "${duplicatePaper.title}"`);
            return;
        }

        try {
            await uploadFileService(
                uploadFile,
                uploadTitle || uploadFile.name,
                '',
                ['research', 'paper']
            );

            toast.success('Paper uploaded successfully');
            setUploadDialogOpen(false);
            setUploadFileState(null);
            setUploadTitle('');
            loadPapers();
        } catch (error: any) {
            // Handle backend duplicate error (409 Conflict)
            if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
                toast.error('This paper has already been uploaded. Please choose a different file.');
            } else {
                toast.error(error.message || 'Failed to upload paper');
            }
        }
    };

    // Filter papers based on search
    const filteredPapers = papers.filter(paper =>
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Don't render while auth is initializing
    if (!authInit) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // Show intro page for non-authenticated users
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
                            <FileText className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 mb-4">{t('research.intro.hero.title')}</h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            {t('research.intro.hero.description')}
                        </p>
                    </div>

                    {/* Showcase Image Section */}
                    <div className="mb-20 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl transform -rotate-1"></div>
                        <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-30 -ml-32 -mb-32"></div>
                            <div className="relative">
                                <img
                                    src="/utils/Research.png"
                                    alt={t('research.intro.hero.showcaseAlt')}
                                    className="w-full h-auto rounded-xl shadow-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                                <Upload className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('research.intro.features.uploadOrganize.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.uploadOrganize.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <Eye className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('research.intro.features.interactiveReader.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.interactiveReader.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <Search className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('research.intro.features.smartSearch.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.smartSearch.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('research.intro.features.aiAnalysis.title')}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.aiAnalysis.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-xl font-semibold text-gray-900">{t('research.intro.features.collaborate.title')}</h3>
                                <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-xs font-semibold rounded-full">
                                    {t('research.intro.features.collaborate.comingSoon')}
                                </span>
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.collaborate.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-xl font-semibold text-gray-900">{t('research.intro.features.trackProgress.title')}</h3>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                                    {t('research.intro.features.trackProgress.comingSoon')}
                                </span>
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {t('research.intro.features.trackProgress.description')}
                            </p>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-12 text-center shadow-xl">
                        <h2 className="text-3xl font-bold text-white mb-4">{t('research.intro.cta.title')}</h2>
                        <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">
                            {t('research.intro.cta.description')}
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
                            >
                                {t('research.intro.cta.getStarted')}
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-800 transition-colors"
                            >
                                {t('research.intro.cta.signIn')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('research.title')}</h1>
                    <p className="text-gray-600">{t('research.subtitle')}</p>
                </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <button
                            onClick={() => setUploadDialogOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                        >
                            <Upload className="w-5 h-5" />
                            {t('research.uploadPaper')}
                        </button>

                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder={t('research.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Papers Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg mb-4" />
                                <div className="h-6 bg-gray-200 rounded mb-3" />
                                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                                <div className="h-4 bg-gray-200 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredPapers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-12 h-12 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                            {searchQuery ? t('research.noPapersFound') : t('research.noPapersYet')}
                        </h3>
                        <p className="text-gray-600 mb-8">
                            {searchQuery
                                ? t('research.tryDifferentSearch')
                                : t('research.getStarted')}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setUploadDialogOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 inline-flex items-center gap-2 font-medium shadow-md"
                            >
                                <Upload className="w-5 h-5" />
                                {t('research.uploadFirstPaper')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPapers.map((paper) => (
                            <div
                                key={paper.id}
                                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group"
                            >
                                <div className="p-6">
                                    {/* PDF Icon */}
                                    <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                                        <FileText className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Paper Info */}
                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        {paper.title}
                                    </h3>

                                    {paper.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {paper.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <span>{formatFileSize(paper.file_size || 0)}</span>
                                        <span>•</span>
                                        <span>PDF</span>
                                    </div>

                                    {/* Tags */}
                                    {paper.tags && paper.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {paper.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {paper.tags.length > 3 && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                    +{paper.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="pt-4 border-t border-gray-100 flex gap-2">
                                        <button
                                            onClick={() => navigate(`/paper/${paper.id}`)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Read
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Dialog */}
                {uploadDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Research Paper</h2>

                            <div className="space-y-4">
                                {/* File Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        PDF File *
                                    </label>
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (!file.type.includes('pdf')) {
                                                        toast.error('Only PDF files are allowed');
                                                        return;
                                                    }
                                                    setUploadFileState(file);
                                                    setUploadTitle(file.name.replace('.pdf', ''));
                                                }
                                            }}
                                        />
                                        <div className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer text-center">
                                            {uploadFile ? (
                                                <div>
                                                    <FileText className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                                    <p className="text-sm text-gray-700 font-medium">{uploadFile.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{formatFileSize(uploadFile.size)}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                    <p className="text-sm text-gray-700 font-medium">Click to upload PDF</p>
                                                    <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paper Title (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter custom title"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setUploadDialogOpen(false);
                                        setUploadFileState(null);
                                        setUploadTitle('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadPaper}
                                    disabled={!uploadFile}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                                        uploadFile
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Upload
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Research;
