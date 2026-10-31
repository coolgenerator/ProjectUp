import React, { useState, useEffect } from 'react';
import { ProjectIdea } from '../../../types/projectAssistant';

interface IdeasStepProps {
    ideas: ProjectIdea[];
    selectedIdea: ProjectIdea | null;
    onSelectIdea: (idea: ProjectIdea) => void;
    onGenerateRoadmap: () => void;
    onRegenerateIdeas: () => void;
    isLoading: boolean;
    onPrevious: () => void;
    regenerationAdjustments: string;
    setRegenerationAdjustments: (adjustments: string) => void;
    loadingProgress: number;
    loadingStage: string;
    loadingMessages: string[];
}

const IdeasStep: React.FC<IdeasStepProps> = ({
    ideas,
    selectedIdea,
    onSelectIdea,
    onGenerateRoadmap,
    onRegenerateIdeas,
    isLoading,
    onPrevious,
    regenerationAdjustments,
    setRegenerationAdjustments,
    loadingProgress,
    loadingStage,
    loadingMessages
}) => {
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
    const [showRegenerateForm, setShowRegenerateForm] = useState<boolean>(false);

    // Move the in-place editing state outside of renderSelectedIdeaDetails
    const [isEditing, setIsEditing] = useState(false);
    const [editedIdea, setEditedIdea] = useState<ProjectIdea | null>(null);
    const [newTechnology, setNewTechnology] = useState('');
    const [newFeature, setNewFeature] = useState('');
    const [newOutcome, setNewOutcome] = useState('');

    // Update editedIdea when selectedIdea changes
    useEffect(() => {
        if (selectedIdea) {
            setEditedIdea({ ...selectedIdea });
        } else {
            setEditedIdea(null);
        }
    }, [selectedIdea]);

    // Common adjustment options
    const commonAdjustments = [
        { label: "Make projects simpler", value: "Make the projects simpler and more beginner-friendly." },
        { label: "Make projects more challenging", value: "Make the projects more challenging and advanced." },
        { label: "Reduce time requirements", value: "Reduce the time requirements for the projects." },
        { label: "Include more web technologies", value: "Include more web technologies like React, JavaScript, and HTML/CSS." },
        { label: "Include more mobile technologies", value: "Include more mobile technologies like React Native, Flutter, and Swift." },
        { label: "Include more data science", value: "Include more data science technologies like Python, TensorFlow, and pandas." },
        { label: "Include more game development", value: "Include more game development technologies like Unity, Unreal Engine, and Godot." },
    ];

    // Handle saving changes
    const saveChanges = () => {
        if (editedIdea) {
            onSelectIdea(editedIdea);
            setIsEditing(false);
        }
    };

    // Handle cancelling changes
    const cancelEditing = () => {
        if (selectedIdea) {
            setEditedIdea({ ...selectedIdea });
            setIsEditing(false);
        }
    };

    // Add a new technology
    const addTechnology = () => {
        if (newTechnology.trim() && editedIdea) {
            setEditedIdea({
                ...editedIdea,
                keyTechnologies: [...(editedIdea.keyTechnologies || []), newTechnology.trim()]
            });
            setNewTechnology('');
        }
    };

    // Remove a technology
    const removeTechnology = (index: number) => {
        if (editedIdea) {
            const technologies = [...(editedIdea.keyTechnologies || [])];
            technologies.splice(index, 1);
            setEditedIdea({
                ...editedIdea,
                keyTechnologies: technologies
            });
        }
    };

    // Add a new feature
    const addFeature = () => {
        if (newFeature.trim() && editedIdea) {
            setEditedIdea({
                ...editedIdea,
                keyFeatures: [...(editedIdea.keyFeatures || []), newFeature.trim()]
            });
            setNewFeature('');
        }
    };

    // Remove a feature
    const removeFeature = (index: number) => {
        if (editedIdea) {
            const features = [...(editedIdea.keyFeatures || [])];
            features.splice(index, 1);
            setEditedIdea({
                ...editedIdea,
                keyFeatures: features
            });
        }
    };

    // Add a new learning outcome
    const addOutcome = () => {
        if (newOutcome.trim() && editedIdea) {
            setEditedIdea({
                ...editedIdea,
                learningOutcomes: [...(editedIdea.learningOutcomes || []), newOutcome.trim()]
            });
            setNewOutcome('');
        }
    };

    // Remove a learning outcome
    const removeOutcome = (index: number) => {
        if (editedIdea) {
            const outcomes = [...(editedIdea.learningOutcomes || [])];
            outcomes.splice(index, 1);
            setEditedIdea({
                ...editedIdea,
                learningOutcomes: outcomes
            });
        }
    };

    // Add a common adjustment to the text
    const addCommonAdjustment = (adjustment: string) => {
        const currentText = regenerationAdjustments.trim();
        const newText = currentText ? `${currentText}\n${adjustment}` : adjustment;
        setRegenerationAdjustments(newText);
    };

    // Toggle regenerate form
    const toggleRegenerateForm = () => {
        setShowRegenerateForm(!showRegenerateForm);
    };

    // Handle regenerate with adjustments
    const handleRegenerateWithAdjustments = () => {
        onRegenerateIdeas();
        setShowRegenerateForm(false);
    };

    // Clear adjustments
    const clearAdjustments = () => {
        setRegenerationAdjustments('');
    };

    // Render regenerate form modal
    const renderRegenerateForm = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Customize Regenerated Ideas</h3>
                <p className="text-gray-600 mb-4">
                    Tell us how you'd like to adjust the regenerated project ideas. Do you want them to be easier,
                    more challenging, use specific technologies, or focus on certain areas?
                </p>

                <div className="mb-4">
                    <label htmlFor="regenerationAdjustments" className="block text-sm font-medium text-gray-700 mb-1">
                        Your adjustments:
                    </label>
                    <textarea
                        id="regenerationAdjustments"
                        value={regenerationAdjustments}
                        onChange={(e) => setRegenerationAdjustments(e.target.value)}
                        placeholder="E.g., Make the projects easier, focus on web development, reduce the time requirements..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 h-32"
                    />
                </div>

                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Common adjustments:</h4>
                    <div className="flex flex-wrap gap-2">
                        {commonAdjustments.map((adjustment, index) => (
                            <button
                                key={index}
                                onClick={() => addCommonAdjustment(adjustment.value)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
                            >
                                {adjustment.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={clearAdjustments}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setShowRegenerateForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRegenerateWithAdjustments}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Regenerate Ideas
                    </button>
                </div>
            </div>
        </div>
    );

    const filteredIdeas = ideas?.filter(idea =>
        filterDifficulty === 'all' || idea.difficulty === filterDifficulty
    ) || [];

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-100 text-green-800';
            case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'Advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderIdeasGrid = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="idea-cards-grid">
            {filteredIdeas.length > 0 ? (
                filteredIdeas.map((idea, index) => (
                    <div
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedIdea?.title === idea.title ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                        onClick={() => onSelectIdea(idea)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">{idea.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(idea.difficulty)}`}>
                                {idea.difficulty}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{idea.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {idea.keyTechnologies.slice(0, 3).map((tech, i) => (
                                <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {tech}
                                </span>
                            ))}
                            {idea.keyTechnologies.length > 3 && (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    +{idea.keyTechnologies.length - 3} more
                                </span>
                            )}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Est. time: {idea.estimatedTime}</span>
                            {idea.estimatedHoursPerWeek && (
                                <span className="text-xs text-gray-500">{idea.estimatedHoursPerWeek}</span>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-3 text-center py-8">
                    <p className="text-gray-500">No project ideas found. Try adjusting your filters or regenerate ideas.</p>
                </div>
            )}
        </div>
    );

    const renderSelectedIdeaDetails = () => {
        if (!selectedIdea || !editedIdea) return null;

        // Ensure the editedIdea has all properties from selectedIdea to prevent errors
        const safeEditedIdea = {
            ...selectedIdea,
            ...editedIdea,
            keyTechnologies: editedIdea.keyTechnologies || [],
            keyFeatures: editedIdea.keyFeatures || [],
            learningOutcomes: editedIdea.learningOutcomes || []
        };

        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6" data-tour="selected-idea-review">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={safeEditedIdea.title}
                                onChange={(e) => setEditedIdea({ ...safeEditedIdea, title: e.target.value })}
                                className="text-xl font-bold text-gray-900 border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-gray-900">{selectedIdea.title}</h2>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                            {isEditing ? (
                                <select
                                    value={safeEditedIdea.difficulty}
                                    onChange={(e) => setEditedIdea({ ...safeEditedIdea, difficulty: e.target.value as "Beginner" | "Intermediate" | "Advanced" })}
                                    className="px-2 py-1 rounded-full text-xs font-medium border border-gray-300 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedIdea.difficulty)}`}>
                                    {selectedIdea.difficulty}
                                </span>
                            )}

                            <div className="flex flex-col md:flex-row md:gap-4">
                                {isEditing ? (
                                    <div className="flex items-center mt-1 md:mt-0">
                                        <span className="text-sm text-gray-600 mr-2">Est. time:</span>
                                        <input
                                            type="text"
                                            value={safeEditedIdea.estimatedTime}
                                            onChange={(e) => setEditedIdea({ ...safeEditedIdea, estimatedTime: e.target.value })}
                                            className="text-sm text-gray-600 border-b border-gray-300 focus:border-blue-500 focus:outline-none w-24"
                                            placeholder="e.g. 2-3 weeks"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-600">Est. time: {selectedIdea.estimatedTime}</span>
                                )}

                                {isEditing ? (
                                    <div className="flex items-center mt-1 md:mt-0">
                                        <span className="text-sm text-gray-600 mr-2">Hours per week:</span>
                                        <input
                                            type="text"
                                            value={safeEditedIdea.estimatedHoursPerWeek || ""}
                                            onChange={(e) => setEditedIdea({ ...safeEditedIdea, estimatedHoursPerWeek: e.target.value })}
                                            className="text-sm text-gray-600 border-b border-gray-300 focus:border-blue-500 focus:outline-none w-24"
                                            placeholder="e.g. 5-8 hours/week"
                                        />
                                    </div>
                                ) : (
                                    selectedIdea.estimatedHoursPerWeek && (
                                        <span className="text-sm text-gray-600">Hours/week: {selectedIdea.estimatedHoursPerWeek}</span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 border border-gray-300 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveChanges}
                                className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <textarea
                        value={safeEditedIdea.description}
                        onChange={(e) => setEditedIdea({ ...safeEditedIdea, description: e.target.value })}
                        className="text-gray-700 mb-4 w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none min-h-[100px]"
                    />
                ) : (
                    <p className="text-gray-700 mb-4">{selectedIdea.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Key Technologies</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(isEditing ? safeEditedIdea.keyTechnologies : selectedIdea.keyTechnologies).map((tech, i) => (
                                <span key={i} className={`${isEditing ? 'pr-1' : 'px-2'} py-1 rounded text-xs bg-blue-100 text-blue-800 flex items-center`}>
                                    {tech}
                                    {isEditing && (
                                        <button
                                            onClick={() => removeTechnology(i)}
                                            className="ml-1 text-blue-800 hover:text-blue-900"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                        {isEditing && (
                            <div className="flex items-center mt-2">
                                <input
                                    type="text"
                                    value={newTechnology}
                                    onChange={(e) => setNewTechnology(e.target.value)}
                                    placeholder="Add technology"
                                    className="text-sm border border-gray-300 rounded-l p-1 flex-grow focus:outline-none focus:border-blue-500"
                                    onKeyPress={(e) => e.key === 'Enter' && addTechnology()}
                                />
                                <button
                                    onClick={addTechnology}
                                    className="bg-blue-600 text-white text-sm px-2 py-1 rounded-r hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Key Features</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {(isEditing ? safeEditedIdea.keyFeatures : selectedIdea.keyFeatures).map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span className="flex-grow">{feature}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeFeature(i)}
                                            className="ml-1 text-gray-500 hover:text-gray-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {isEditing && (
                            <div className="flex items-center mt-2">
                                <input
                                    type="text"
                                    value={newFeature}
                                    onChange={(e) => setNewFeature(e.target.value)}
                                    placeholder="Add feature"
                                    className="text-sm border border-gray-300 rounded-l p-1 flex-grow focus:outline-none focus:border-blue-500"
                                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                                />
                                <button
                                    onClick={addFeature}
                                    className="bg-blue-600 text-white text-sm px-2 py-1 rounded-r hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Learning Outcomes</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {(isEditing ? safeEditedIdea.learningOutcomes : selectedIdea.learningOutcomes).map((outcome, i) => (
                            <li key={i} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span className="flex-grow">{outcome}</span>
                                {isEditing && (
                                    <button
                                        onClick={() => removeOutcome(i)}
                                        className="ml-1 text-gray-500 hover:text-gray-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {isEditing && (
                        <div className="flex items-center mt-2">
                            <input
                                type="text"
                                value={newOutcome}
                                onChange={(e) => setNewOutcome(e.target.value)}
                                placeholder="Add learning outcome"
                                className="text-sm border border-gray-300 rounded-l p-1 flex-grow focus:outline-none focus:border-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && addOutcome()}
                            />
                            <button
                                onClick={addOutcome}
                                className="bg-blue-600 text-white text-sm px-2 py-1 rounded-r hover:bg-blue-700"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render a loading animation
    const renderLoadingState = () => (
        <div className="flex flex-col items-center justify-center p-8 loading-container">
            <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-6">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out loading-progress-bar"
                    style={{ width: `${loadingProgress || 0}%` }}
                ></div>
            </div>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
                {loadingStage || "Generating Project Ideas"}
            </h3>
            <p className="text-gray-500 text-center max-w-lg">
                We're creating personalized project ideas based on your skills and interests. This should take just a moment...
            </p>
            {loadingMessages && loadingMessages.length > 0 && (
                <div className="mt-4 w-full max-w-md">
                    <div className="text-xs text-gray-500 mb-1">Progress:</div>
                    <ul className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                        {loadingMessages.map((message, index) => (
                            <li key={index} className="flex items-center gap-2 loading-message">
                                <span className="text-green-500">✓</span> {message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Show regenerate form if active */}
            {showRegenerateForm && renderRegenerateForm()}

            <div className="pb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose a Project Idea</h2>
                <p className="text-gray-600">
                    Select one of the AI-generated project ideas that best matches your interests and skill level,
                    or regenerate to see new options.
                </p>
            </div>

            {/* Show selected idea details if an idea is selected */}
            {selectedIdea && renderSelectedIdeaDetails()}

            {/* Show filters and regenerate button if not loading */}
            {!isLoading && (
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="difficulty-filter" className="text-sm font-medium text-gray-700">
                            Filter by:
                        </label>
                        <select
                            id="difficulty-filter"
                            value={filterDifficulty}
                            onChange={(e) => setFilterDifficulty(e.target.value)}
                            className="text-sm border border-gray-300 rounded-md p-1"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleRegenerateForm}
                            disabled={isLoading}
                            className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Customize Regeneration
                        </button>

                        <button
                            onClick={onRegenerateIdeas}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                            Regenerate Ideas
                        </button>
                    </div>
                </div>
            )}

            {/* Show loading state or ideas grid */}
            {isLoading ? (
                renderLoadingState()
            ) : (
                renderIdeasGrid()
            )}

            <div className="flex justify-between mt-6">
                <button
                    onClick={onPrevious}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    &larr; Previous Step
                </button>
                <div className="flex flex-col items-end">
                    <button
                        data-tour="generate-roadmap-button"
                        onClick={onGenerateRoadmap}
                        disabled={!selectedIdea || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            "Generate Project Roadmap"
                        )}
                    </button>
                    {selectedIdea && !isLoading && (
                        <p className="text-xs text-gray-500 mt-1">
                            Tip: Click the "Edit" button to customize the selected idea
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IdeasStep; 
