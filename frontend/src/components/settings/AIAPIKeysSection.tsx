import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

const { API_BASE_URL } = config;

interface AIAPIKey {
    id: number;
    provider: string;
    model?: string;
    base_url?: string;
    is_active: boolean;
    key_preview: string;
    created_at: string;
    updated_at: string;
}

interface AIAPIKeysSectionProps {
    onMessage: (message: string) => void;
    onError: (error: string) => void;
}

const AIAPIKeysSection: React.FC<AIAPIKeysSectionProps> = ({ onMessage, onError }) => {
    const [apiKeys, setApiKeys] = useState<AIAPIKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingKey, setEditingKey] = useState<number | null>(null);
    const [testingKey, setTestingKey] = useState<number | null>(null);

    // Form state
    const [selectedProvider, setSelectedProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [baseURL, setBaseURL] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [showKey, setShowKey] = useState(false);

    const providers = [
        { value: 'openai', label: 'OpenAI', defaultURL: 'https://api.openai.com/v1', description: 'GPT-4, GPT-3.5, and more', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'] },
        { value: 'anthropic', label: 'Anthropic', defaultURL: 'https://api.anthropic.com/v1', description: 'Claude models', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
        { value: 'google', label: 'Google AI', defaultURL: 'https://generativelanguage.googleapis.com/v1', description: 'Gemini models', models: ['gemini-2.5-pro-preview', 'gemini-2.5-flash-preview', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
        { value: 'vertex-ai', label: 'Google Vertex AI', defaultURL: 'https://us-central1-aiplatform.googleapis.com/v1', description: 'Enterprise Gemini via Google Cloud', models: ['gemini-3.0-pro', 'gemini-3.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'], usesJsonCredentials: true },
        { value: 'openrouter', label: 'OpenRouter', defaultURL: 'https://openrouter.ai/api/v1', description: 'Unified API for multiple providers', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-pro-preview', 'meta-llama/llama-3.3-70b-instruct'] },
        { value: 'together', label: 'Together AI', defaultURL: 'https://api.together.xyz/v1', description: 'Open-source models', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'] },
        { value: 'replicate', label: 'Replicate', defaultURL: 'https://api.replicate.com/v1', description: 'Run ML models in the cloud', models: [] },
        { value: 'cohere', label: 'Cohere', defaultURL: 'https://api.cohere.ai/v1', description: 'Command and Embed models', models: ['command-r-plus-08-2024', 'command-r-plus', 'command-r-08-2024', 'command-r', 'command'] },
        { value: 'groq', label: 'Groq', defaultURL: 'https://api.groq.com/openai/v1', description: 'Ultra-fast LLM inference', models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
        { value: 'mistral', label: 'Mistral AI', defaultURL: 'https://api.mistral.ai/v1', description: 'Mistral and Mixtral models', models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'pixtral-large-latest'] },
        { value: 'perplexity', label: 'Perplexity', defaultURL: 'https://api.perplexity.ai', description: 'Search-augmented LLMs', models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-huge-128k-online'] },
        { value: 'ai21', label: 'AI21 Labs', defaultURL: 'https://api.ai21.com/studio/v1', description: 'Jurassic models', models: ['jamba-1.5-large', 'jamba-1.5-mini', 'jamba-instruct'] },
        { value: 'huggingface', label: 'Hugging Face', defaultURL: 'https://api-inference.huggingface.co', description: 'Inference API', models: [] },
        { value: 'azure-openai', label: 'Azure OpenAI', defaultURL: 'https://YOUR_RESOURCE.openai.azure.com', description: 'Microsoft Azure OpenAI Service', models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'] },
        { value: 'aws-bedrock', label: 'AWS Bedrock', defaultURL: 'https://bedrock-runtime.REGION.amazonaws.com', description: 'Amazon Bedrock models', models: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'anthropic.claude-3-sonnet-20240229-v1:0', 'meta.llama3-70b-instruct-v1:0'] },
        { value: 'fireworks', label: 'Fireworks AI', defaultURL: 'https://api.fireworks.ai/inference/v1', description: 'Fast model inference', models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/llama-v3p1-70b-instruct'] },
        { value: 'anyscale', label: 'Anyscale', defaultURL: 'https://api.endpoints.anyscale.com/v1', description: 'Llama and Mistral models', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct'] },
        { value: 'deepseek', label: 'DeepSeek', defaultURL: 'https://api.deepseek.com/v1', description: 'DeepSeek models', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
        { value: 'deepinfra', label: 'DeepInfra', defaultURL: 'https://api.deepinfra.com/v1/openai', description: 'Serverless inference', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct'] },
        { value: 'qwen', label: 'Qwen (Alibaba)', defaultURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', description: 'Qwen models from Alibaba', models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct'] },
        { value: 'baichuan', label: 'Baichuan AI', defaultURL: 'https://api.baichuan-ai.com/v1', description: 'Baichuan models', models: ['Baichuan2-Turbo', 'Baichuan2-Turbo-192k', 'Baichuan4'] },
        { value: 'moonshot', label: 'Moonshot AI', defaultURL: 'https://api.moonshot.cn/v1', description: 'Moonshot (Kimi) models', models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'] },
        { value: 'zhipu', label: 'Zhipu AI (ChatGLM)', defaultURL: 'https://open.bigmodel.cn/api/paas/v4', description: 'GLM models', models: ['glm-4-plus', 'glm-4', 'glm-4v', 'glm-3-turbo'] },
        { value: 'custom', label: 'Custom Provider', defaultURL: '', description: 'Use your own API endpoint', models: [] },
    ];

    useEffect(() => {
        fetchAPIKeys();
    }, []);

    const fetchAPIKeys = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-api-keys`);
            if (response.ok) {
                const data = await response.json();
                setApiKeys(data.api_keys || []);
            } else {
                onError('Failed to fetch API keys');
            }
        } catch (error) {
            onError('Failed to fetch API keys');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        const providerInfo = providers.find(p => p.value === provider);
        if (providerInfo) {
            setBaseURL(providerInfo.defaultURL);
            // Set default model if available
            if (providerInfo.models && providerInfo.models.length > 0) {
                setModel(providerInfo.models[0]);
            } else {
                setModel('');
            }
        }
    };

    const resetForm = () => {
        setApiKey('');
        setModel('');
        setBaseURL('');
        setIsActive(true);
        setShowKey(false);
        setSelectedProvider('openai');
        setEditingKey(null);
        setShowAddForm(false);
    };

    const handleAddKey = async () => {
        if (!apiKey.trim()) {
            onError(selectedProvider === 'vertex-ai' ? 'Service account JSON is required' : 'API key is required');
            return;
        }

        // Validate JSON for Vertex AI
        if (selectedProvider === 'vertex-ai') {
            try {
                const parsed = JSON.parse(apiKey);
                if (!parsed.type || !parsed.project_id) {
                    onError('Invalid service account JSON: missing required fields (type, project_id)');
                    return;
                }
            } catch {
                onError('Invalid JSON format. Please paste the complete service account JSON.');
                return;
            }
        }

        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider,
                    api_key: apiKey,
                    model: model || undefined,
                    base_url: baseURL || undefined,
                    is_active: isActive,
                }),
            });

            if (response.ok) {
                onMessage('API key added successfully');
                resetForm();
                fetchAPIKeys();
            } else {
                const data = await response.json();
                onError(data.error || 'Failed to add API key');
            }
        } catch (error) {
            onError('Failed to add API key');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateKey = async (keyId: number) => {
        setIsLoading(true);
        try {
            const body: any = {};
            if (apiKey.trim()) {
                body.api_key = apiKey;
            }
            if (model !== undefined) {
                body.model = model || null;
            }
            if (baseURL !== undefined) {
                body.base_url = baseURL || null;
            }
            body.is_active = isActive;

            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-api-keys/${keyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                onMessage('API key updated successfully');
                resetForm();
                fetchAPIKeys();
            } else {
                const data = await response.json();
                onError(data.error || 'Failed to update API key');
            }
        } catch (error) {
            onError('Failed to update API key');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteKey = async (keyId: number) => {
        if (!window.confirm('Are you sure you want to delete this API key?')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-api-keys/${keyId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                onMessage('API key deleted successfully');
                fetchAPIKeys();
            } else {
                const data = await response.json();
                onError(data.error || 'Failed to delete API key');
            }
        } catch (error) {
            onError('Failed to delete API key');
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (key: AIAPIKey) => {
        setEditingKey(key.id);
        setSelectedProvider(key.provider);
        setModel(key.model || '');
        setBaseURL(key.base_url || '');
        setIsActive(key.is_active);
        setApiKey(''); // Don't pre-fill the key for security
        setShowAddForm(true);
    };

    const handleTestKey = async (keyId: number) => {
        setTestingKey(keyId);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/ai-api-keys/${keyId}/test`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    onMessage(`✓ ${data.message}`);
                } else {
                    onError(`✗ ${data.message}`);
                }
            } else {
                const data = await response.json();
                onError(data.error || 'Failed to test API key');
            }
        } catch (error) {
            onError('Failed to test API key');
        } finally {
            setTestingKey(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                    AI API Keys
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                    Manage your API keys for different AI providers. Keys are encrypted and stored securely.
                </p>
            </div>

            {/* Add New Key Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add API Key
                </button>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">
                        {editingKey ? 'Edit API Key' : 'Add New API Key'}
                    </h3>

                    {/* Provider Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            AI Provider
                        </label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            disabled={editingKey !== null}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50"
                        >
                            {providers.map(provider => (
                                <option key={provider.value} value={provider.value}>
                                    {provider.label} - {provider.description}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {providers.find(p => p.value === selectedProvider)?.description}
                        </p>
                    </div>

                    {/* Model Selection - Editable with Suggestions */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Model <span className="text-xs text-gray-500">(optional, editable)</span>
                        </label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            list={`model-suggestions-${selectedProvider}`}
                            placeholder="Type or select a model..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                        {providers.find(p => p.value === selectedProvider)?.models && providers.find(p => p.value === selectedProvider)!.models!.length > 0 && (
                            <datalist id={`model-suggestions-${selectedProvider}`}>
                                {providers.find(p => p.value === selectedProvider)?.models?.map(m => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {providers.find(p => p.value === selectedProvider)?.models && providers.find(p => p.value === selectedProvider)!.models!.length > 0
                                ? "Select from suggestions or type your own model name"
                                : "Enter the model name you want to use"}
                        </p>
                    </div>

                    {/* API Key / Credentials Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            {selectedProvider === 'vertex-ai' ? 'Service Account JSON' : 'API Key'} {editingKey && <span className="text-xs text-gray-500">(leave empty to keep current)</span>}
                        </label>
                        {selectedProvider === 'vertex-ai' ? (
                            <div>
                                <textarea
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Paste the entire service account JSON credentials from Google Cloud Console
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
                                >
                                    {showKey ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Base URL Input (Optional) */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Base URL <span className="text-xs text-gray-500">(optional, for custom endpoints)</span>
                        </label>
                        <input
                            type="text"
                            value={baseURL}
                            onChange={(e) => setBaseURL(e.target.value)}
                            placeholder="https://api.example.com/v1"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                    </div>

                    {/* Active Toggle */}
                    <div className="mb-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="mr-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                Active (use this key for AI features)
                            </span>
                        </label>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => editingKey ? handleUpdateKey(editingKey) : handleAddKey()}
                            disabled={isLoading || (!editingKey && !apiKey.trim())}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : editingKey ? 'Update Key' : 'Add Key'}
                        </button>
                        <button
                            onClick={resetForm}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Existing Keys List */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Your API Keys</h3>
                {isLoading && apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        Loading...
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <p>No API keys configured yet</p>
                        <p className="text-sm mt-1">Add your first API key to get started</p>
                    </div>
                ) : (
                    apiKeys.map(key => (
                        <div key={key.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-slate-100">
                                            {providers.find(p => p.value === key.provider)?.label || key.provider}
                                        </h4>
                                        {key.is_active && (
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 font-mono">
                                        {key.key_preview}
                                    </p>
                                    {key.model && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                            </svg>
                                            Model: {key.model}
                                        </p>
                                    )}
                                    {key.base_url && (
                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                            {key.base_url}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                                        Added: {new Date(key.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleTestKey(key.id)}
                                        disabled={testingKey === key.id}
                                        className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Test API Key"
                                    >
                                        {testingKey === key.id ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => startEdit(key)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded"
                                        title="Edit"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteKey(key.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded"
                                        title="Delete"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info Boxes */}
            <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium mb-1">Security Note</p>
                            <p>Your API keys are encrypted using AES-256 encryption before being stored. Only the masked preview is ever displayed. Keep your keys secure and never share them.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-green-800 dark:text-green-200">
                            <p className="font-medium mb-1">Supported Providers</p>
                            <p>We support {providers.length - 1} major AI providers including OpenAI, Anthropic, Google, OpenRouter, Groq, Mistral, and more. Each provider can have one active key at a time.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAPIKeysSection;
