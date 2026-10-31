import React, { useState } from 'react';
import { X, Plus, Trash2, FileText, GripVertical, Link as LinkIcon, File } from 'lucide-react';
import config from '../../../config';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { Resource } from '../../../types/project/resource';

const { API_BASE_URL } = config;

interface ResourceExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResources: Partial<Resource>[];
  projectId: string;
  nodeId: string;
  onResourcesCreated?: () => void;
}

const ResourceExtractionModal: React.FC<ResourceExtractionModalProps> = ({
  isOpen,
  onClose,
  initialResources,
  projectId,
  nodeId,
  onResourcesCreated,
}) => {
  const [resources, setResources] = useState<Resource[]>(
    initialResources.map((r, index) => ({
      id: `temp-${index}`,
      name: r.name || '',
      resource_type: r.resource_type || 'link',
      url: r.url || '',
      category: r.category,
      description: r.description,
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleResourceChange = (id: string, field: keyof Resource, value: any) => {
    setResources(resources.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const handleAddResource = () => {
    setResources([
      ...resources,
      {
        id: `temp-${Date.now()}`,
        name: '',
        resource_type: 'link',
        url: '',
        category: '',
        description: '',
      },
    ]);
  };

  const handleRemoveResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const handleSubmit = async () => {
    if (resources.length === 0 || resources.some(r => !r.name.trim() || !r.url.trim())) {
      alert('Please fill in all resource names and URLs');
      return;
    }

    setLoading(true);
    try {
      // Create resources via backend API
      const createPromises = resources.map(resource =>
        fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/resources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: resource.name,
            resource_type: resource.resource_type,
            url: resource.resource_type === 'link' ? resource.url : null,
            file_path: resource.resource_type === 'file' ? resource.url : null,
            category: resource.category || null,
          }),
        })
      );

      const results = await Promise.all(createPromises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        alert(`Successfully created ${resources.length} resource(s)!`);
        if (onResourcesCreated) onResourcesCreated();
        onClose();
      } else {
        throw new Error('Some resources failed to create');
      }
    } catch (error) {
      console.error('Error creating resources:', error);
      alert('Failed to create resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review Resources</h2>
              <p className="text-sm text-gray-600">
                Review and edit {resources.length} resource{resources.length !== 1 ? 's' : ''} before saving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Resources List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {resources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                No Related Content Detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                The current node content doesn't contain any URLs, links, or resource references. Try adding resources to this node first, or create them manually.
              </p>
              <button
                onClick={handleAddResource}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-medium hover:from-amber-700 hover:to-amber-800 shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Resource Manually
              </button>
            </div>
          )}

          {resources.map((resource, index) => (
            <div
              key={resource.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-colors bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-gray-400 mt-2">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-3">
                  {/* Name & Type */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Resource Name *
                      </label>
                      <input
                        type="text"
                        value={resource.name}
                        onChange={(e) => handleResourceChange(resource.id, 'name', e.target.value)}
                        placeholder="e.g., Official Documentation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={resource.resource_type}
                        onChange={(e) => handleResourceChange(resource.id, 'resource_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="link">Link</option>
                        <option value="file">File</option>
                      </select>
                    </div>
                  </div>

                  {/* URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {resource.resource_type === 'link' ? (
                        <>
                          <LinkIcon className="w-3 h-3 inline mr-1" />
                          URL *
                        </>
                      ) : (
                        <>
                          <File className="w-3 h-3 inline mr-1" />
                          File Path *
                        </>
                      )}
                    </label>
                    <input
                      type="text"
                      value={resource.url}
                      onChange={(e) => handleResourceChange(resource.id, 'url', e.target.value)}
                      placeholder={resource.resource_type === 'link' ? 'https://...' : '/path/to/file'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  {/* Category & Description */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={resource.category || ''}
                        onChange={(e) => handleResourceChange(resource.id, 'category', e.target.value)}
                        placeholder="e.g., Documentation, Tutorial"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={resource.description || ''}
                        onChange={(e) => handleResourceChange(resource.id, 'description', e.target.value)}
                        placeholder="Brief description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveResource(resource.id)}
                  className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Resource Button */}
          <button
            onClick={handleAddResource}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Resource
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {resources.length} resource{resources.length !== 1 ? 's' : ''} to save
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || resources.length === 0}
              className={`
                px-6 py-2 rounded-lg font-medium text-white transition-all
                ${loading || resources.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                `Save ${resources.length} Resource${resources.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceExtractionModal;
