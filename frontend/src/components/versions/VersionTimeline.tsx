/**
 * VersionTimeline Component
 * Git-like visual timeline showing version history and branches
 */

import React, { useEffect } from 'react';
import { ClockIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useVersions } from '../../hooks/versions';
import type { Version, VersionTree } from '../../types/versions';

interface VersionTimelineProps {
  nodeId: string;
  onVersionClick?: (version: Version) => void;
  showAllBranches?: boolean;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  nodeId,
  onVersionClick,
  showAllBranches = true,
}) => {
  const {
    versionTree,
    treeLoading,
    error,
    refetchTree,
  } = useVersions({
    nodeId,
    autoFetch: true,
    fetchTree: true,
  });

  if (treeLoading && !versionTree) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ClockIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading version timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => refetchTree()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!versionTree || !versionTree.branches) {
    return (
      <div className="text-center py-12">
        <CodeBracketIcon className="w-12 h-12 text-gray-300 mx-auto" />
        <p className="mt-2 text-sm text-gray-500">No version history found</p>
      </div>
    );
  }

  const { branches, tree } = versionTree;

  // Get all branch names sorted (main first)
  const branchNames = Object.keys(branches).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  // Filter branches if needed
  const displayBranches = showAllBranches
    ? branchNames
    : branchNames.filter(name => branches[name].some(v => v.is_current || !v.is_archived));

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Version Timeline</h2>
          <button
            onClick={() => refetchTree()}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh timeline"
          >
            <ArrowPathIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {displayBranches.length} {displayBranches.length === 1 ? 'branch' : 'branches'} •{' '}
          {Object.values(branches).flat().length} total versions
        </p>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="space-y-8">
          {displayBranches.map((branchName, branchIdx) => {
            const branchVersions = branches[branchName] || [];
            const isMainBranch = branchName === 'main';

            return (
              <div key={branchName} className="relative">
                {/* Branch Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium
                      ${isMainBranch
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                      }
                    `}
                  >
                    {branchName}
                  </div>
                  <span className="text-xs text-gray-500">
                    {branchVersions.length} {branchVersions.length === 1 ? 'version' : 'versions'}
                  </span>
                </div>

                {/* Branch Timeline */}
                <div className="relative pl-8">
                  {/* Vertical Line */}
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

                  {/* Versions */}
                  <div className="space-y-4">
                    {branchVersions.map((version, versionIdx) => {
                      const isFirst = versionIdx === 0;
                      const isLast = versionIdx === branchVersions.length - 1;
                      const hasChildren = tree[version.full_version]?.children?.length > 0;

                      return (
                        <div key={version.id} className="relative">
                          {/* Timeline Dot */}
                          <div
                            className={`
                              absolute -left-6 top-3 w-4 h-4 rounded-full border-2
                              ${version.is_current
                                ? 'bg-green-500 border-green-600'
                                : 'bg-white border-gray-300'
                              }
                            `}
                          />

                          {/* Version Card */}
                          <button
                            onClick={() => onVersionClick?.(version)}
                            className={`
                              w-full text-left p-4 rounded-lg border transition-all
                              ${version.is_current
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-medium text-gray-900">
                                    {version.full_version}
                                  </span>
                                  {version.is_current && (
                                    <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                      Current
                                    </span>
                                  )}
                                  {version.is_archived && (
                                    <span className="px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">
                                      Archived
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                  {version.title}
                                </h4>

                                {version.change_description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {version.change_description}
                                  </p>
                                )}

                                {version.change_type && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                    {version.change_type.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {new Date(version.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(version.created_at).toLocaleTimeString()}
                                </p>
                                {hasChildren && (
                                  <p className="text-xs text-blue-500 mt-1">
                                    {tree[version.full_version].children.length} child
                                    {tree[version.full_version].children.length !== 1 ? 'ren' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Show children branches if any */}
                          {hasChildren && (
                            <div className="ml-8 mt-2 pl-4 border-l-2 border-dashed border-gray-300">
                              {tree[version.full_version].children.map(childVersion => (
                                <div
                                  key={childVersion}
                                  className="text-xs text-gray-500 py-1"
                                >
                                  → {childVersion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Branch Connector (if not last branch) */}
                {branchIdx < displayBranches.length - 1 && (
                  <div className="h-4 border-l-2 border-dashed border-gray-300 ml-2 mt-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {displayBranches.length === 0 && (
          <div className="text-center py-12">
            <CodeBracketIcon className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No active branches to display</p>
            {!showAllBranches && (
              <button
                onClick={() => {}}
                className="mt-2 text-sm text-blue-500 hover:text-blue-700"
              >
                Show archived branches
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionTimeline;
