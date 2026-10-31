/**
 * VersionComparison Component
 * Side-by-side comparison of two versions with diff stats
 */

import React, { useEffect } from 'react';
import { ArrowsRightLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useVersionComparison } from '../../hooks/versions';
import type { Version } from '../../types/versions';

interface VersionComparisonProps {
  versionA: Version;
  versionB: Version;
  onAdopt?: (version: Version) => void;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({
  versionA,
  versionB,
  onAdopt,
}) => {
  const {
    comparison,
    loading,
    error,
    fetchComparison,
  } = useVersionComparison();

  useEffect(() => {
    if (versionA?.id && versionB?.id) {
      fetchComparison(versionA.id, versionB.id);
    }
  }, [versionA?.id, versionB?.id, fetchComparison]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowsRightLeftIcon className="w-8 h-8 text-gray-400 animate-pulse mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Comparing versions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const { version_a, version_b, title_changed, summary_diff, content_diff, tags_changed } = comparison;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Version Comparison</h2>
          <ArrowsRightLeftIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-blue-600">
              {version_a.full_version}
            </span>
            <span className="text-gray-400">→</span>
            <span className="font-mono text-xs font-medium text-green-600">
              {version_b.full_version}
            </span>
          </div>
        </div>
      </div>

      {/* Diff Statistics */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Changes Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Summary Diff */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Summary</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600">+{summary_diff.added}</span>
              <span className="text-xs text-red-600">-{summary_diff.removed}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${summary_diff.similarity}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{summary_diff.similarity.toFixed(0)}%</span>
            </div>
          </div>

          {/* Content Diff */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Content</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600">+{content_diff.added}</span>
              <span className="text-xs text-red-600">-{content_diff.removed}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${content_diff.similarity}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{content_diff.similarity.toFixed(0)}%</span>
            </div>
          </div>

          {/* Other Changes */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Other Changes</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {title_changed ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-xs text-gray-600">Title</span>
              </div>
              <div className="flex items-center gap-1">
                {tags_changed ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-xs text-gray-600">Tags</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Version A */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-medium text-blue-600">
                {version_a.full_version}
              </span>
              {version_a.is_current && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Current
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{version_a.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(version_a.created_at).toLocaleString()}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{version_a.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Content</h4>
              <div className="text-sm text-gray-600 leading-relaxed max-h-64 overflow-y-auto">
                {version_a.content}
              </div>
            </div>

            {version_a.tags && version_a.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {version_a.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onAdopt && !version_a.is_current && (
            <button
              onClick={() => onAdopt(version_a)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              Adopt This Version
            </button>
          )}
        </div>

        {/* Version B */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-medium text-green-600">
                {version_b.full_version}
              </span>
              {version_b.is_current && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Current
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{version_b.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(version_b.created_at).toLocaleString()}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{version_b.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Content</h4>
              <div className="text-sm text-gray-600 leading-relaxed max-h-64 overflow-y-auto">
                {version_b.content}
              </div>
            </div>

            {version_b.tags && version_b.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {version_b.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onAdopt && !version_b.is_current && (
            <button
              onClick={() => onAdopt(version_b)}
              className="mt-4 w-full px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
            >
              Adopt This Version
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionComparison;
