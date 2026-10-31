import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import InfiniteScroll from "react-infinite-scroll-component";
import { Users, Target, MessageSquare, TrendingUp, Award, Lightbulb, Search, SlidersHorizontal, X } from "lucide-react";
import ProjectPostCard from "../../components/project/ProjectPostCard";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { RootState } from "../../store/store";
import { RecommendedProjects } from "../../components/match/Recommendations";
import { ProfileNudge } from "../../components/match/MatchProfile";
import { Button, Card, EmptyState, FadeIn, Input, PAGE_WIDTH, PageHeader, Select, Skeleton, cx } from "../../components/ui";

const PAGE_SIZE = 12;
// Wait this long after typing before refetching
const FILTER_DEBOUNCE_MS = 350;

interface ProjectFilters {
    search: string;
    role: string;
    maxHours: string;
    openOnly: boolean;
}

const EMPTY_FILTERS: ProjectFilters = { search: "", role: "", maxHours: "", openOnly: false };

// Open projects: recruiting posts, filterable by the role you could take and the time you have.
const Projects: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const [filters, setFilters] = useState<ProjectFilters>(EMPTY_FILTERS);
    const [applied, setApplied] = useState<ProjectFilters>(EMPTY_FILTERS);
    const [projects, setProjects] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);

    // Text filters apply shortly after typing stops; toggles and selects apply at once
    useEffect(() => {
        const timer = setTimeout(() => setApplied(filters), FILTER_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [filters]);

    const fetchProjects = useCallback(async (currentPage: number, f: ProjectFilters) => {
        if (currentPage === 1) setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
            if (f.search.trim()) params.set("search", f.search.trim());
            if (f.role.trim()) params.set("role", f.role.trim());
            if (f.maxHours) params.set("max_hours", f.maxHours);
            if (f.openOnly) params.set("open", "1");
            const response = await fetchWithAuth(`/api/projects/posts?${params.toString()}`);
            const data = await response.json();
            const list = data.projects || [];
            setProjects((prev) => (currentPage === 1 ? list : [...prev, ...list]));
            setHasMore(list.length === PAGE_SIZE);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        setPage(1);
        fetchProjects(1, applied);
    }, [applied, fetchProjects, isAuthenticated]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchProjects(next, applied);
    };

    const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setApplied(EMPTY_FILTERS);
    };

    if (!isAuthenticated) {
        const features = [
            {
                icon: <Users className="w-12 h-12 text-blue-500" />,
                title: t('projects.intro.features.discoverCollaborators.title'),
                description: t('projects.intro.features.discoverCollaborators.description')
            },
            {
                icon: <Target className="w-12 h-12 text-purple-500" />,
                title: t('projects.intro.features.exploreProjects.title'),
                description: t('projects.intro.features.exploreProjects.description')
            },
            {
                icon: <MessageSquare className="w-12 h-12 text-green-500" />,
                title: t('projects.intro.features.seamlessCommunication.title'),
                description: t('projects.intro.features.seamlessCommunication.description')
            },
            {
                icon: <TrendingUp className="w-12 h-12 text-orange-500" />,
                title: t('projects.intro.features.trackProgress.title'),
                description: t('projects.intro.features.trackProgress.description')
            },
            {
                icon: <Award className="w-12 h-12 text-pink-500" />,
                title: t('projects.intro.features.showcaseWork.title'),
                description: t('projects.intro.features.showcaseWork.description')
            },
            {
                icon: <Lightbulb className="w-12 h-12 text-yellow-500" />,
                title: t('projects.intro.features.aiAssistance.title'),
                description: t('projects.intro.features.aiAssistance.description')
            }
        ];

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                {/* Hero Section */}
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="mb-6 flex justify-center">
                            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl shadow-2xl">
                                <Users className="w-16 h-16 text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
                            {t('projects.intro.hero.title')}
                        </h1>
                        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                            {t('projects.intro.hero.description')}
                        </p>
                    </div>

                    {/* Showcase Image Section */}
                    <div className="mb-20 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl transform -rotate-1"></div>
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full blur-3xl opacity-30 -ml-32 -mb-32"></div>
                            <div className="relative">
                                <img
                                    src="/utils/projects_ideatree.png"
                                    alt={t('projects.intro.hero.showcaseAlt')}
                                    className="w-full h-auto rounded-xl shadow-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16 max-w-7xl mx-auto">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-slate-700"
                            >
                                <div className="mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <div className="mt-16 text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-12 shadow-2xl max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                            {t('projects.intro.cta.title')}
                        </h2>
                        <p className="text-xl text-white/90 mb-8">
                            {t('projects.intro.cta.description')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                            >
                                {t('projects.intro.cta.getStarted')}
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg font-semibold text-lg hover:bg-white/10 transform hover:scale-105 transition-all duration-200"
                            >
                                {t('projects.intro.cta.signIn')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className={cx(PAGE_WIDTH, "py-8 sm:py-10")}>
                <PageHeader
                    title={t("nav.openProjects")}
                    subtitle={t("match.projects.pageSubtitle")}
                    actions={
                        <Button size="lg" onClick={() => navigate("/ideas")} icon={<Lightbulb className="h-4 w-4" />}>
                            {t("match.startFromIdea")}
                        </Button>
                    }
                />

                <ProfileNudge className="mb-6" />

                <div className="mb-8">
                    <RecommendedProjects />
                </div>

                {/* Filters */}
                <Card className="mb-6" padded={false}>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
                        <label className="relative block">
                            <span className="sr-only">{t("projects.searchPlaceholder")}</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                            <Input
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                placeholder={t("projects.searchPlaceholder")}
                                className="pl-9"
                            />
                        </label>
                        <label className="block">
                            <span className="sr-only">{t("match.projects.filterRole")}</span>
                            <Input
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                placeholder={`${t("match.projects.filterRole")} · ${t("match.projects.filterRolePlaceholder")}`}
                            />
                        </label>
                        <label className="block">
                            <span className="sr-only">{t("match.projects.filterHours")}</span>
                            <Select value={filters.maxHours} onChange={(e) => { const f = { ...filters, maxHours: e.target.value }; setFilters(f); setApplied(f); }}>
                                <option value="">{t("match.projects.anyHoursOption")}</option>
                                {[4, 6, 8, 10, 15].map((h) => (
                                    <option key={h} value={h}>{t("match.projects.maxHoursOption", { n: h })}</option>
                                ))}
                            </Select>
                        </label>
                        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                            <label className="mt-1 flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={filters.openOnly}
                                    onChange={(e) => { const f = { ...filters, openOnly: e.target.checked }; setFilters(f); setApplied(f); }}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("match.projects.openOnly")}
                            </label>
                            {filtersActive && (
                                <Button variant="ghost" size="sm" className="mt-1" onClick={clearFilters} icon={<X className="h-3.5 w-3.5" />}>
                                    {t("match.projects.clear")}
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {loading && page === 1 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-96" />)}
                    </div>
                ) : projects.length === 0 ? (
                    <EmptyState
                        icon={<SlidersHorizontal className="h-5 w-5" />}
                        title={t("match.projects.emptyTitle")}
                        description={t("match.projects.emptyHint")}
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                {filtersActive && <Button variant="secondary" onClick={clearFilters}>{t("match.projects.clear")}</Button>}
                                <Button onClick={() => navigate("/ideas")} icon={<Lightbulb className="h-4 w-4" />}>{t("match.projects.startOwn")}</Button>
                            </div>
                        }
                    />
                ) : (
                    <InfiniteScroll
                        dataLength={projects.length}
                        next={loadMore}
                        hasMore={hasMore}
                        loader={<Skeleton className="mt-6 h-24" />}
                        endMessage={<p className="mt-8 text-center text-sm text-gray-400">{t("projects.noMoreProjects")}</p>}
                        style={{ overflow: "visible" }}
                    >
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {projects.map((project, i) => (
                                <FadeIn key={project.post_id} delay={Math.min(i % PAGE_SIZE, 6) * 0.03}>
                                    <ProjectPostCard
                                        project={project}
                                        onLove={() => undefined}
                                        onSave={() => undefined}
                                        isLoved={project.is_loved || false}
                                        isSaved={project.is_saved || false}
                                        loveCount={project.love_count || 0}
                                    />
                                </FadeIn>
                            ))}
                        </div>
                    </InfiniteScroll>
                )}
            </div>
        </div>
    );
};

export default Projects;
