import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../hooks/fetchWithAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface AIService {
    service_type: string;
    name: string;
    description: string;
    category: string;
    icon: string;
}

interface AIServicePreference {
    service_type: string;
    provider: string;
    model: string;
    is_enabled: boolean;
    name: string;
    description: string;
    category: string;
    icon: string;
}

interface ProviderInfo {
    value: string;
    label: string;
    models: string[];
    description: string;
    default_url: string;
}

interface AIServicePreferencesSectionProps {
    onMessage?: (message: string) => void;
    onError?: (error: string) => void;
}

// Category information for grouping
const categoryInfo: Record<string, { name: string; description: string; icon: string }> = {
    learning: {
        name: 'Learning & Education',
        description: 'AI services for course generation, quizzes, and learning paths',
        icon: '📚'
    },
    project: {
        name: 'Project Management',
        description: 'AI services for project planning, tasks, and insights',
        icon: '📊'
    },
    content: {
        name: 'Content & Writing',
        description: 'AI services for content creation, suggestions, and summarization',
        icon: '✍️'
    },
    research: {
        name: 'Research & Analysis',
        description: 'AI services for research, paper analysis, and information gathering',
        icon: '🔍'
    },
    code: {
        name: 'Code & Development',
        description: 'AI services for code generation and review',
        icon: '💻'
    },
    general: {
        name: 'General Purpose',
        description: 'General AI assistant and utilities',
        icon: '🤖'
    }
};

const AIServicePreferencesSection: React.FC<AIServicePreferencesSectionProps> = ({ onMessage, onError }) => {
    const [preferences, setPreferences] = useState<AIServicePreference[]>([]);
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Group services by category
    const groupedServices = React.useMemo(() => {
        const grouped: Record<string, AIServicePreference[]> = {};
        preferences.forEach(pref => {
            if (!grouped[pref.category]) {
                grouped[pref.category] = [];
            }
            grouped[pref.category].push(pref);
        });
        return grouped;
    }, [preferences]);

    const [providersLoaded, setProvidersLoaded] = useState(false);

    useEffect(() => {
        loadAvailableProviders();
    }, []);

    // Load preferences after providers are loaded (even if empty)
    useEffect(() => {
        if (providersLoaded) {
            loadPreferences(providers);
        }
    }, [providersLoaded, providers]);

    const loadAvailableProviders = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-service-preferences/available-providers`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.status && data.data && data.data.providers) {
                setProviders(data.data.providers);
            } else {
                // If no providers available, set empty array
                setProviders([]);
            }
        } catch (error: any) {
            console.error('Error loading available providers:', error);
            // Don't show error to user, just use empty provider list
            setProviders([]);
        } finally {
            setProvidersLoaded(true);
        }
    };

    const loadPreferences = async (availableProviders: ProviderInfo[]) => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-service-preferences`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.status && data.data) {
                // Validate and correct mismatched provider/model combinations
                const validatedPreferences = data.data.map((pref: AIServicePreference) => {
                    const providerConfig = availableProviders.find(p => p.value === pref.provider);
                    if (providerConfig && providerConfig.models.length > 0) {
                        // Check if current model is valid for this provider
                        const isModelValid = providerConfig.models.includes(pref.model);
                        if (!isModelValid) {
                            // Set to first model of the provider
                            return { ...pref, model: providerConfig.models[0] };
                        }
                    }
                    return pref;
                });
                setPreferences(validatedPreferences);
            } else {
                throw new Error(data.message || 'Failed to load preferences');
            }
        } catch (error: any) {
            console.error('Error loading AI service preferences:', error);
            if (onError) {
                onError(error.message || 'Failed to load AI service preferences');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (serviceType: string, provider: string) => {
        setPreferences(prev => prev.map(pref => {
            if (pref.service_type === serviceType) {
                // Get default model for the new provider
                const providerConfig = providers.find(p => p.value === provider);
                const defaultModel = providerConfig?.models[0] || '';

                return { ...pref, provider, model: defaultModel };
            }
            return pref;
        }));
        setHasChanges(true);
    };

    const handleModelChange = (serviceType: string, model: string) => {
        setPreferences(prev => prev.map(pref =>
            pref.service_type === serviceType ? { ...pref, model } : pref
        ));
        setHasChanges(true);
    };

    const handleToggleEnabled = (serviceType: string, isEnabled: boolean) => {
        setPreferences(prev => prev.map(pref =>
            pref.service_type === serviceType ? { ...pref, is_enabled: isEnabled } : pref
        ));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatePayload = {
                preferences: preferences.map(pref => ({
                    service_type: pref.service_type,
                    provider: pref.provider,
                    model: pref.model,
                    is_enabled: pref.is_enabled
                }))
            };

            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-service-preferences`, {
                method: 'PUT',
                body: JSON.stringify(updatePayload),
            });

            const data = await response.json();

            if (data.status) {
                if (onMessage) {
                    onMessage('AI service preferences saved successfully');
                }
                setHasChanges(false);
                // Reload to get updated data
                await loadPreferences(providers);
            } else {
                throw new Error(data.message || 'Failed to save preferences');
            }
        } catch (error: any) {
            console.error('Error saving AI service preferences:', error);
            if (onError) {
                onError(error.message || 'Failed to save AI service preferences');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!confirm('Are you sure you want to reset all AI service preferences to defaults?')) {
            return;
        }

        setSaving(true);
        try {
            // Delete all preferences to revert to defaults
            for (const pref of preferences) {
                await fetchWithAuth(`${API_BASE_URL}/api/ai-service-preferences/${pref.service_type}`, {
                    method: 'DELETE',
                });
            }

            if (onMessage) {
                onMessage('All preferences reset to defaults');
            }
            setHasChanges(false);
            await loadPreferences(providers);
        } catch (error: any) {
            console.error('Error resetting preferences:', error);
            if (onError) {
                onError(error.message || 'Failed to reset preferences');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            AI Service Preferences
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Configure which AI provider and model to use for each service. This allows you to optimize for cost, quality, or specific capabilities.
                        </p>
                    </div>
                    <button
                        onClick={handleResetToDefaults}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Reset to Defaults
                    </button>
                </div>

                {/* Info banner */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium mb-1">How it works:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Toggle services on/off to control which AI features you want to use</li>
                                <li>Configure provider and model for each enabled service</li>
                                <li>Free tier users: Services will use your configured API keys (set in "AI API Keys" tab)</li>
                                <li>Paid tier users: Services will use our managed API keys regardless of these settings</li>
                                <li>Disabled services won't consume your API quota or cost you anything</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* No providers warning */}
                {providers.length === 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium mb-1">No AI providers available</p>
                                <p>
                                    You need to configure at least one AI API key to use AI services.
                                    Go to the <strong>"AI API Keys"</strong> tab to add your API keys for providers like OpenAI, Anthropic, Google, etc.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Services grouped by category */}
                <div className="space-y-8">
                    {Object.entries(groupedServices).map(([category, services]) => {
                        const catInfo = categoryInfo[category] || {
                            name: category,
                            description: '',
                            icon: '⚙️'
                        };

                        return (
                            <div key={category} className="border-t border-gray-200 dark:border-gray-700 pt-6 first:border-t-0 first:pt-0">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                        <span className="text-2xl mr-2">{catInfo.icon}</span>
                                        {catInfo.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-9">
                                        {catInfo.description}
                                    </p>
                                </div>

                                <div className="grid gap-4 ml-9">
                                    {services.map(service => {
                                        const selectedProvider = providers.find(p => p.value === service.provider);
                                        const availableModels = selectedProvider?.models || [];

                                        return (
                                            <div
                                                key={service.service_type}
                                                className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-opacity ${!service.is_enabled ? 'opacity-60' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-3 flex-1 mr-4">
                                                        {/* Enable/Disable Toggle */}
                                                        <div className="flex items-center mt-1">
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={service.is_enabled}
                                                                    onChange={(e) => handleToggleEnabled(service.service_type, e.target.checked)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        </div>

                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                                {service.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                {service.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex space-x-3">
                                                        {/* Provider Selection */}
                                                        <div className="min-w-[180px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                Provider
                                                            </label>
                                                            <select
                                                                value={service.provider}
                                                                onChange={(e) => handleProviderChange(service.service_type, e.target.value)}
                                                                disabled={!service.is_enabled}
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {providers.map(provider => (
                                                                    <option key={provider.value} value={provider.value}>
                                                                        {provider.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Model Selection */}
                                                        <div className="min-w-[220px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                Model
                                                            </label>
                                                            <input
                                                                type="text"
                                                                list={`model-list-${service.service_type}`}
                                                                value={service.model}
                                                                onChange={(e) => handleModelChange(service.service_type, e.target.value)}
                                                                disabled={!service.is_enabled}
                                                                placeholder="Select or type a model..."
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                            <datalist id={`model-list-${service.service_type}`}>
                                                                {availableModels.map(model => (
                                                                    <option key={model} value={model} />
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save Button */}
                {hasChanges && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Save Preferences'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIServicePreferencesSection;
