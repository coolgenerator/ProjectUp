import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, LoadingState } from '../../../types/projectAssistant';

interface AnalyzeStepProps {
    profile: UserProfile;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    onAnalyze: () => void;
    onSkipToRoadmap?: () => void; // NEW: Skip idea generation and go straight to roadmap
    loadingState: LoadingState;
    onPrevious?: () => void;
    hasPrevious?: boolean;
}

const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
    profile,
    setProfile,
    onAnalyze,
    onSkipToRoadmap,
    loadingState,
    onPrevious,
    hasPrevious = false
}) => {
    const [newSkill, setNewSkill] = useState('');
    const [newInterest, setNewInterest] = useState('');
    const goalInputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize screenshots array if it doesn't exist
    useEffect(() => {
        if (!profile.screenshots) {
            setProfile(prev => ({
                ...prev,
                screenshots: []
            }));
        }
    }, []);

    // Pre-fill with tutorial data if tutorial mode is active
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isTutorial = urlParams.get('tutorial') === 'true';

        if (isTutorial && profile.skills.length === 0) {
            // Pre-fill with sample project idea
            setProfile(prev => ({
                ...prev,
                goal: 'Build a mobile app that helps students track their study habits and improve productivity through gamification and AI-powered recommendations.',
                skills: ['JavaScript', 'React', 'Python'],
                interests: ['Mobile Development', 'Education Technology', 'User Experience Design'],
                preferredDifficulty: 'Intermediate',
                estimatedTime: '6-8 weeks',
                hoursPerWeek: '5-10 hours'
            }));
        }
    }, [profile.skills.length]);

    const addSkill = () => {
        if (newSkill.trim() !== '' && !profile.skills.includes(newSkill.trim())) {
            setProfile({
                ...profile,
                skills: [...profile.skills, newSkill.trim()]
            });
            setNewSkill('');
        }
    };

    const addInterest = () => {
        if (newInterest.trim() !== '' && !profile.interests.includes(newInterest.trim())) {
            setProfile({
                ...profile,
                interests: [...profile.interests, newInterest.trim()]
            });
            setNewInterest('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent, type: 'skill' | 'interest') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (type === 'skill') {
                addSkill();
            } else {
                addInterest();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        // Check if screenshots exist and limit to 10
        if (!profile.screenshots || profile.screenshots.length >= 10) {
            return;
        }

        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); // Prevent the default paste behavior

                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const result = event?.target?.result;
                        if (result && typeof result === 'string') {
                            // Add the new screenshot to the array
                            setProfile(prev => ({
                                ...prev,
                                screenshots: [...(prev.screenshots || []), result]
                            }));
                        }
                    };
                    reader.readAsDataURL(blob);
                }
                break;
            }
        }
    };

    const removeScreenshot = (index: number) => {
        if (profile.screenshots) {
            const updatedScreenshots = [...profile.screenshots];
            updatedScreenshots.splice(index, 1);
            setProfile({
                ...profile,
                screenshots: updatedScreenshots
            });
        }
    };

    const renderInputSection = () => (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="border-b border-gray-200 pb-2">
                <h3 className="text-lg font-semibold text-gray-800">Your Skills & Interests</h3>
                <p className="text-sm text-gray-600">Help us understand your background to generate personalized ideas for your goal</p>
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Current Skills</h4>
                <p className="text-sm text-gray-600">
                    List your existing skills, knowledge areas, or tools you're familiar with. These could be technical, creative, business-related, or any other relevant capabilities.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <strong>Tip:</strong> Be as specific as possible with your skills for better results. For example, instead of just "Programming", specify languages like "Python" or "JavaScript". For design skills, mention specific tools like "Photoshop" or "Figma".
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                    {profile.skills.map((skill, index) => (
                        <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {skill}
                        </div>
                    ))}
                </div>
                <div className="flex">
                    <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'skill')}
                        placeholder="Add a skill (e.g. Photography, Writing, Marketing, JavaScript)"
                        className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        onClick={addSkill}
                        className="bg-blue-500 text-white px-4 rounded-r-md hover:bg-blue-600"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Areas of Interest</h4>
                <p className="text-sm text-gray-600">
                    What areas, domains, or subjects are you interested in exploring?
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-sm text-purple-800">
                    <strong>Tip:</strong> Include specific interests rather than general categories for more tailored recommendations. For example, instead of "Technology", try "Artificial Intelligence" or "IoT Smart Home Solutions".
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                    {profile.interests.map((interest, index) => (
                        <div key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                            {interest}
                        </div>
                    ))}
                </div>
                <div className="flex">
                    <input
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'interest')}
                        placeholder="Add an interest (e.g. Art, Fitness, Entrepreneurship, Technology)"
                        className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        onClick={addInterest}
                        className="bg-purple-500 text-white px-4 rounded-r-md hover:bg-purple-600"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Project Goal Section */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800">Your Goal</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        What would you like to achieve or create?
                    </label>
                    <textarea
                        data-tour="project-goal-input"
                        value={profile.goal || ''}
                        onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                        placeholder="Describe what you want to build, learn, or accomplish. This could be a project, a new skill, a business idea, a hobby to develop, etc."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requirements & Resources
                    </label>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-2 text-sm text-green-800">
                        <strong>Tip:</strong> If your project has specific requirements (like a course rubric, page limits, or mandatory deliverables), add them here. The AI will strictly follow these constraints when generating ideas and plans.
                    </div>
                    <div className="space-y-2">
                        <textarea
                            ref={goalInputRef}
                            value={profile.reference || ''}
                            onChange={(e) => setProfile({ ...profile, reference: e.target.value })}
                            onPaste={handlePaste}
                            placeholder="Specify any requirements, constraints, or rubrics that must be followed (e.g., project rubric, deliverable format, page limits, grading criteria). You can also add reference materials, URLs, or paste screenshots."
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />

                        {/* Screenshot Preview Gallery */}
                        {profile.screenshots && profile.screenshots.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                                {profile.screenshots.map((screenshot, index) => (
                                    <div key={index} className="relative group">
                                        <div className="border border-gray-300 rounded-md overflow-hidden bg-gray-100 aspect-square">
                                            <img
                                                src={screenshot}
                                                alt={`Screenshot ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeScreenshot(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove screenshot"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Project Preferences Section */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800">Your Preferences</h3>
                <div className="space-y-6">
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Preferred Difficulty Level
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['Beginner', 'Intermediate', 'Advanced', 'Any'].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setProfile({
                                        ...profile,
                                        preferredDifficulty: level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Any'
                                    })}
                                    className={`px-4 py-2 rounded-md border ${profile.preferredDifficulty === level
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } transition-colors`}
                                >
                                    {level === 'Any' ? 'Any difficulty' : level}
                                    {level === 'Beginner' && ' - I\'m just starting out'}
                                    {level === 'Intermediate' && ' - I have some experience'}
                                    {level === 'Advanced' && ' - I\'m looking for a challenge'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Estimated Time to Complete
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['1-2 weeks', '3-4 weeks', '1-3 months', '3-6 months', '6+ months', 'Custom', 'By Deadline'].map((timeframe) => (
                                <button
                                    key={timeframe}
                                    type="button"
                                    onClick={() => setProfile({
                                        ...profile,
                                        estimatedTime: timeframe,
                                        // Clear the custom fields if a predefined option is selected
                                        ...(timeframe !== 'Custom' && timeframe !== 'By Deadline' ? { customTimePeriod: undefined, deadline: undefined } : {})
                                    })}
                                    className={`px-4 py-2 rounded-md border ${profile.estimatedTime === timeframe
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } transition-colors`}
                                >
                                    {timeframe}
                                </button>
                            ))}
                        </div>

                        {/* Custom time period input */}
                        {profile.estimatedTime === 'Custom' && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={profile.customTimePeriod || ''}
                                    onChange={(e) => setProfile({ ...profile, customTimePeriod: e.target.value })}
                                    placeholder="Specify a custom time period (e.g., 2 years, 18 months)"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        {/* Deadline selector */}
                        {profile.estimatedTime === 'By Deadline' && (
                            <div className="mt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={profile.deadline || ''}
                                        onChange={(e) => setProfile({ ...profile, deadline: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]} // Set min to today
                                        className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <span className="text-sm text-gray-500">Select a target completion date</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Hours Per Week to Dedicate
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['1-5 hours', '5-10 hours', '10-20 hours', '20+ hours', 'Custom'].map((hours) => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => setProfile({
                                        ...profile,
                                        hoursPerWeek: hours,
                                        // Clear custom hours if a predefined option is selected
                                        ...(hours !== 'Custom' ? { customHoursPerWeek: undefined } : {})
                                    })}
                                    className={`px-4 py-2 rounded-md border ${profile.hoursPerWeek === hours
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } transition-colors`}
                                >
                                    {hours === 'Custom' ? hours : `${hours} per week`}
                                </button>
                            ))}
                        </div>

                        {/* Custom hours per week input */}
                        {profile.hoursPerWeek === 'Custom' && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={profile.customHoursPerWeek || ''}
                                    onChange={(e) => setProfile({ ...profile, customHoursPerWeek: e.target.value })}
                                    placeholder="Specify your weekly time commitment (e.g., 2-3 hours on weekends)"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLoadingState = () => (
        <div className="p-4 space-y-4">
            <div className="mb-4">
                <div className="font-medium text-gray-700 mb-1">{loadingState.loadingStage}</div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full progress-bar-animated"
                        style={{ width: `${loadingState.loadingProgress}%` }}
                    ></div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Progress</h4>
                <div className="space-y-2 text-sm text-gray-600">
                    {loadingState.loadingMessages.map((message, index) => (
                        <div key={index} className="flex items-center">
                            <span className="mr-2">→</span>
                            <span>{message}</span>
                            {index === loadingState.loadingMessages.length - 1 && (
                                <div className="typing-indicator ml-2">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const isFormComplete = () => {
        return profile.skills.length > 0 &&
            profile.interests.length > 0 &&
            (profile.goal || '').trim() !== '';
    };

    const renderActionButtons = () => (
        <div className="space-y-4">
            {/* Info box explaining the two options */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Choose your path:</p>
                        <ul className="space-y-1 ml-4">
                            <li className="list-disc"><strong>Generate Ideas:</strong> Brainstorm multiple project options to explore</li>
                            <li className="list-disc"><strong>Skip to Roadmap:</strong> Already have a specific project? Go straight to planning</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                {hasPrevious && onPrevious && (
                    <button
                        onClick={onPrevious}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        &larr; Previous Step
                    </button>
                )}
                <div className={`flex gap-3 ${hasPrevious ? "" : "ml-auto"}`}>
                    {/* Skip to Roadmap button */}
                    {onSkipToRoadmap && (
                        <button
                            onClick={onSkipToRoadmap}
                            disabled={!isFormComplete() || loadingState.loading}
                            className={`px-6 py-2 rounded-lg transition-colors border-2 ${!isFormComplete()
                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                : 'bg-white text-purple-600 border-purple-500 hover:bg-purple-50'
                                }`}
                            title="Skip idea generation and create a roadmap for your specific project"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                                Skip to Roadmap
                            </span>
                        </button>
                    )}

                    {/* Generate Ideas button */}
                    <button
                        data-tour="generate-ideas-button"
                        onClick={onAnalyze}
                        disabled={!isFormComplete() || loadingState.loading}
                        className={`px-6 py-2 rounded-lg transition-colors ${!isFormComplete()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {loadingState.loading ? 'Analyzing...' : 'Generate Project Ideas'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="pb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Tell us about your goal</h2>
                <p className="text-gray-600">
                    We'll use your skills, interests, and objectives to generate personalized ideas for your next project, hobby, skill, or business venture.
                </p>
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p>
                            <strong>For best results:</strong> The more specific you are with your skills and interests, the more accurate and tailored our recommendations will be. Take a moment to be detailed about what you know and what you're interested in exploring.
                        </p>
                    </div>
                </div>
            </div>

            {loadingState.loading ? (
                renderLoadingState()
            ) : (
                <div className="space-y-8">
                    {renderInputSection()}
                    {renderActionButtons()}
                </div>
            )}
        </div>
    );
};

export default AnalyzeStep; 