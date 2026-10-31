/**
 * VersionSwitcher Component
 * Dropdown component to switch between different versions and branches of a node
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ClockIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useVersions } from '../../hooks/versions';
import type { Version, Branch } from '../../types/versions';

interface VersionSwitcherProps {
  nodeId: string;
  currentBranch?: string;
  onVersionChange?: (version: Version) => void;
  onBranchChange?: (branch: string) => void;
  compact?: boolean;
}

export const VersionSwitcher: React.FC<VersionSwitcherProps> = ({
  nodeId,
  currentBranch = 'main',
  onVersionChange,
  onBranchChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(currentBranch);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    currentVersion,
    versions,
    branches,
    loading,
    error,
    refetchVersions,
  } = useVersions({
    nodeId,
    branch: selectedBranch,
    autoFetch: true,
    fetchBranches: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleBranchSwitch = (branchName: string) => {
    setSelectedBranch(branchName);
    refetchVersions(branchName);
    onBranchChange?.(branchName);
  };

  const handleVersionSelect = (version: Version) => {
    onVersionChange?.(version);
    setIsOpen(false);
  };

  if (loading && !currentVersion) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <ClockIcon className="w-4 h-4 animate-spin" />
        <span>Loading versions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 text-sm text-red-500">
        Error loading versions
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Version Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          border border-gray-300 hover:border-gray-400
          bg-white hover:bg-gray-50
          transition-all duration-200
          ${compact ? 'text-xs' : 'text-sm'}
        `}
      >
        <CodeBracketIcon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        <span className="font-medium">
          {currentVersion?.full_version || `${selectedBranch}.0`}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Version Control</h3>
            <p className="text-xs text-gray-500 mt-1">
              Switch between branches and versions
            </p>
          </div>

          {/* Branch Selector */}
          {branches && branches.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Branch
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {branches.map((branch: Branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.branch_name)}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${selectedBranch === branch.branch_name
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {branch.display_name || branch.branch_name}
                    {branch.version_count > 0 && (
                      <span className="ml-1 opacity-75">({branch.version_count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Versions List */}
          <div className="flex-1 overflow-y-auto">
            {versions && versions.length > 0 ? (
              <div className="py-2">
                {versions.map((version: Version) => (
                  <button
                    key={version.id}
                    onClick={() => handleVersionSelect(version)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                      ${version.is_current ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-gray-900">
                            {version.full_version}
                          </span>
                          {version.is_current && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                          {version.title}
                        </p>
                        {version.change_description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {version.change_description}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(version.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No versions found in this branch
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionSwitcher;
