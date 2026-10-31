import React, { useState, useEffect, useCallback } from 'react';
import { SkillItem, InterestItem } from '../types/profile/formData';
import { SkillCategory, InterestCategory } from '../components/profile/datasets/createProfileData';
import { getSuggestions, getPopularItems, getCategorizedItems, ConceptSuggestion, CategoryWithConcepts } from '../api/suggestionApi';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import debounce from 'lodash.debounce';

interface TagWithLevelSelectorProps {
    label: string;
    suggestions: string[];
    selectedTags: (SkillItem | InterestItem)[];
    onAddTag: (tag: string, level: number) => void;
    onRemoveTag: (tagName: string) => void;
    onUpdateLevel: (tagName: string, level: number) => void;
    placeholder?: string;
    bubbleColor?: string;
    levelLabel?: string;
    type: 'skill' | 'interest';
    categories?: SkillCategory[] | InterestCategory[];
}

const TagWithLevelSelector: React.FC<TagWithLevelSelectorProps> = ({
    label,
    suggestions,
    selectedTags,
    onAddTag,
    onRemoveTag,
    onUpdateLevel,
    bubbleColor = 'bg-blue-200',
    levelLabel = 'Level',
    type = 'skill',
    categories = [],
}) => {
    const { t } = useTranslation();
    const [customTag, setCustomTag] = useState<string>('');
    const [tagLevel, setTagLevel] = useState<number>(3); // Default level is 3 (medium)
    const [activeCategory, setActiveCategory] = useState<string>(''); // Track active category
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<ConceptSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [apiCategories, setApiCategories] = useState<CategoryWithConcepts[]>([]);
    const [popularItems, setPopularItems] = useState<ConceptSuggestion[]>([]);

    // Fetch popular items on initial load
    // COMMENTED OUT: API endpoints not available
    // useEffect(() => {
    //     const fetchPopular = async () => {
    //         const items = await getPopularItems(type);
    //         setPopularItems(items);
    //     };

    //     fetchPopular();
    // }, [type]);

    // Fetch categorized items on initial load
    // COMMENTED OUT: API endpoints not available
    // useEffect(() => {
    //     const fetchCategorized = async () => {
    //         const categorized = await getCategorizedItems(type);
    //         setApiCategories(categorized);
    //     };

    //     fetchCategorized();
    // }, [type]);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (query.length >= 2) {
                setIsLoading(true);
                const results = await getSuggestions(query, type);
                setSearchResults(results);
                setIsLoading(false);
            } else {
                setSearchResults([]);
            }
        }, 300),
        [type]
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        setCustomTag(query);

        if (query.length >= 2) {
            debouncedSearch(query);
        } else {
            setSearchResults([]);
        }
    };

    const handleAddTag = () => {
        if (customTag && selectedTags && !selectedTags.some(tag => tag.name === customTag)) {
            onAddTag(customTag, tagLevel);
            setCustomTag(''); // Clear the input field
            setTagLevel(3); // Reset level to default
            setSearchQuery(''); // Clear search query
            setSearchResults([]); // Clear search results
        }
    };

    // Check if a tag is selected
    const isTagSelected = (tagName: string): boolean => {
        return selectedTags && selectedTags.some(tag => tag.name === tagName);
    };

    // Get level options for dropdown with translations
    const getLevelOptions = () => {
        if (type === 'skill') {
            const levelKeys = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];
            return (
                <>
                    {levelKeys.map((key, index) => (
                        <option
                            key={index + 1}
                            value={index + 1}
                            title={t(`profile.editProfileMultiStep.skillsInterests.skillLevels.${key}Desc`)}
                        >
                            {t(`profile.editProfileMultiStep.skillsInterests.skillLevels.${key}`)}
                        </option>
                    ))}
                </>
            );
        } else {
            const levelKeys = ['curious', 'interested', 'engaged', 'passionate', 'obsessed'];
            return (
                <>
                    {levelKeys.map((key, index) => (
                        <option
                            key={index + 1}
                            value={index + 1}
                            title={t(`profile.editProfileMultiStep.skillsInterests.interestLevels.${key}Desc`)}
                        >
                            {t(`profile.editProfileMultiStep.skillsInterests.interestLevels.${key}`)}
                        </option>
                    ))}
                </>
            );
        }
    };

    // Get level display text - using Roman numerals for both types
    const getLevelDisplay = (level: number) => {
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        return romanNumerals[level - 1] || 'I';
    };

    // Translate category name
    const translateCategory = (categoryName: string) => {
        const categoryKey = type === 'skill' ? 'skillCategories' : 'interestCategories';
        const translationKey = `profile.editProfileMultiStep.skillsInterests.${categoryKey}.${categoryName}`;
        const translation = t(translationKey, { returnObjects: false, defaultValue: '' });
        // If no translation found, return original name
        return translation || categoryName;
    };

    // Translate individual skill or interest item
    const translateItem = (itemName: string) => {
        const itemKey = type === 'skill' ? 'commonSkills' : 'commonInterests';
        const translationKey = `profile.editProfileMultiStep.skillsInterests.${itemKey}.${itemName}`;
        const translation = t(translationKey, { returnObjects: false, defaultValue: '' });
        // If no translation found, return original name (common for technical terms)
        return translation || itemName;
    };

    // Get level description
    const getLevelDescription = (level: number) => {
        if (type === 'skill') {
            const levelKeys = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];
            const key = levelKeys[level - 1] || levelKeys[0];
            const name = t(`profile.editProfileMultiStep.skillsInterests.skillLevels.${key}`);
            const desc = t(`profile.editProfileMultiStep.skillsInterests.skillLevels.${key}Desc`);
            return `${name} - ${desc}`;
        } else {
            const levelKeys = ['curious', 'interested', 'engaged', 'passionate', 'obsessed'];
            const key = levelKeys[level - 1] || levelKeys[0];
            const name = t(`profile.editProfileMultiStep.skillsInterests.interestLevels.${key}`);
            const desc = t(`profile.editProfileMultiStep.skillsInterests.interestLevels.${key}Desc`);
            return `${name} - ${desc}`;
        }
    };

    // Get suggestions based on active category or search results
    const getVisibleSuggestions = (): string[] => {
        // If we have search results, show those
        if (searchQuery && searchResults.length > 0) {
            return searchResults.map(result => result.name);
        }

        // If using API categories and a category is selected
        if (apiCategories.length > 0 && activeCategory) {
            const category = apiCategories.find(c => c.category === activeCategory);
            if (category) {
                return category.concepts.map(concept => concept.name);
            }
        }

        // If in API mode and showing all (popular)
        if (apiCategories.length > 0 && !activeCategory) {
            return popularItems.map(item => item.name);
        }

        // Fallback to using local data
        if (activeCategory && categories.length > 0) {
            const categoryItems = type === 'skill'
                ? (categories as SkillCategory[]).find(c => c.category === activeCategory)?.skills || []
                : (categories as InterestCategory[]).find(c => c.category === activeCategory)?.interests || [];

            return categoryItems;
        }

        // Always return an array, even if empty
        return suggestions || [];
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <label className="font-medium text-base sm:text-lg">{label}</label>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                        {type === 'skill'
                            ? t('profile.editProfileMultiStep.skillsInterests.skillsDescription')
                            : t('profile.editProfileMultiStep.skillsInterests.interestsDescription')}
                    </p>
                </div>
                {selectedTags && selectedTags.length > 0 && (
                    <span className="text-xs sm:text-sm text-gray-500 ml-2 text-right">
                        {t('profile.editProfileMultiStep.skillsInterests.addedCount', { count: selectedTags.length })}
                        {selectedTags.length < 5 ?
                            ` ${t('profile.editProfileMultiStep.skillsInterests.moreRecommended', { count: 5 - selectedTags.length })}` :
                            ` ${t('profile.editProfileMultiStep.skillsInterests.greatJob')}`}
                    </span>
                )}
            </div>

            {/* Add encouraging message */}
            <p className="text-sm text-gray-600 mb-3">
                {type === 'skill'
                    ? t('profile.editProfileMultiStep.skillsInterests.skillsEncouragement')
                    : t('profile.editProfileMultiStep.skillsInterests.interestsEncouragement')}
            </p>

            {/* Level Legend */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {type === 'skill'
                        ? t('profile.editProfileMultiStep.skillsInterests.skillLevelsLabel')
                        : t('profile.editProfileMultiStep.skillsInterests.interestLevelsLabel')}
                </p>
                <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 text-xs">
                    {[1, 2, 3, 4, 5].map(level => (
                        <span key={level} className="inline-flex items-center gap-0.5" title={getLevelDescription(level)}>
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                {getLevelDisplay(level)}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                                = {getLevelDescription(level).split(' - ')[0]}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Input field for search/custom tags with level selector */}
            <div className="space-y-3 mb-4">
                {/* Search input */}
                <input
                    type="text"
                    placeholder={`Search or add your own ${type === 'skill' ? 'skill' : 'interest'}...`}
                    value={customTag}
                    onChange={handleSearchChange}
                    className="w-full border p-2 rounded"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                        }
                    }}
                />

                {/* Level selector and Add button */}
                <div className="flex gap-2">
                    <div className="flex items-center flex-grow">
                        <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">
                            {type === 'skill'
                                ? t('profile.editProfileMultiStep.skillsInterests.proficiency')
                                : t('profile.editProfileMultiStep.skillsInterests.interestLevel')}:
                        </label>
                        <select
                            value={tagLevel}
                            onChange={(e) => setTagLevel(parseInt(e.target.value))}
                            className="border p-2 rounded flex-grow min-w-0"
                        >
                            {getLevelOptions()}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddTag}
                        className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 whitespace-nowrap"
                    >
                        {t('profile.editProfileMultiStep.skillsInterests.add')}
                    </button>
                </div>
            </div>

            {/* Display selected tags */}
            {selectedTags && selectedTags.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        {type === 'skill'
                            ? t('profile.editProfileMultiStep.skillsInterests.selectedSkills')
                            : t('profile.editProfileMultiStep.skillsInterests.selectedInterests')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag, index) => (
                            <div
                                key={index}
                                className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${bubbleColor || 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}
                            >
                                <span className="font-medium">{translateItem(tag.name)}</span>
                                <div className="relative group inline-flex items-center">
                                    {/* Display the current level as abbreviation/icon */}
                                    <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">
                                        {getLevelDisplay(tag.level)}
                                    </span>
                                    {/* Hidden select for changing level */}
                                    <select
                                        value={tag.level}
                                        onChange={(e) => {
                                            e.preventDefault();
                                            onUpdateLevel(tag.name, parseInt(e.target.value));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute opacity-0 cursor-pointer inset-0 w-full"
                                        title={getLevelDescription(tag.level)}
                                    >
                                        {getLevelOptions()}
                                    </select>
                                    {/* Visual indicator for clickable area */}
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        {getLevelDescription(tag.level)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onRemoveTag(tag.name);
                                    }}
                                    className="ml-0.5 text-red-500 hover:text-red-700 text-lg leading-none"
                                    title="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search results */}
            {isLoading && (
                <div className="mb-4 text-gray-500 text-sm">
                    Searching...
                </div>
            )}

            {/* Categories tabs - only show if no search term */}
            {!searchQuery && (apiCategories.length > 0 || categories.length > 0) && (
                <div className="mb-4 overflow-x-auto -mx-2 px-2">
                    <div className="flex gap-2 pb-2">
                        <button
                            type="button"
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${activeCategory === '' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveCategory('');
                            }}
                        >
                            {t('profile.editProfileMultiStep.skillsInterests.all')}
                        </button>
                        {/* Show API categories if available, otherwise use local categories */}
                        {apiCategories.length > 0
                            ? apiCategories.map((category, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${activeCategory === category.category ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveCategory(category.category);
                                    }}
                                >
                                    {translateCategory(category.category)}
                                </button>
                            ))
                            : categories.map((category, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${activeCategory === category.category ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveCategory(category.category);
                                    }}
                                >
                                    {translateCategory(category.category)}
                                </button>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* Suggestions display */}
            <div className="mb-4">
                <p className="text-sm text-gray-700 font-medium mb-1">
                    {searchQuery
                        ? t('profile.editProfileMultiStep.skillsInterests.searchResultsFor', { query: searchQuery })
                        : `${activeCategory || t('profile.editProfileMultiStep.skillsInterests.popular')} ${type === 'skill' ? t('profile.editProfileMultiStep.skillsInterests.popularSkills').toLowerCase() : t('profile.editProfileMultiStep.skillsInterests.popularInterests').toLowerCase()}`}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                    {(getVisibleSuggestions() || []).slice(0, 20).map((suggestion, index) => (
                        <span
                            key={index}
                            className={`cursor-pointer px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-800 hover:bg-gray-300 ${isTagSelected(suggestion) ? bubbleColor : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isTagSelected(suggestion)) {
                                    onAddTag(suggestion, 3); // Default level 3
                                } else {
                                    onRemoveTag(suggestion);
                                }
                            }}
                        >
                            {suggestion}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagWithLevelSelector; 