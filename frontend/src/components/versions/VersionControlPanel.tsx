/**
 * VersionControlPanel Component
 * Integrated panel for version control features
 * Can be embedded in node viewers/editors
 */

import React, { useState } from 'react';
import { ClockIcon, ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { VersionSwitcher } from './VersionSwitcher';
import { VersionTimeline } from './VersionTimeline';
import { VersionComparison } from './VersionComparison';
import { useVersionComparison } from '../../hooks/versions';
import type { Version } from '../../types/versions';

interface VersionControlPanelProps {
  nodeId: string;
  currentBranch?: string;
  onVersionChange?: (version: Version) => void;
  compact?: boolean;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  nodeId,
  currentBranch = 'main',
  onVersionChange,
  compact = false,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedVersionForComparison, setSelectedVersionForComparison] = useState<Version | null>(null);

  const {
    comparison,
    compareVersionIds,
    isComparisonReady,
    addVersionToCompare,
    clearComparisonSelections,
  } = useVersionComparison();

  const [versionA, versionB] = compareVersionIds;

  const handleVersionClick = (version: Version) => {
    // If comparison mode is active, add version to compare
    if (showTimeline) {
      addVersionToCompare(version.id);
    } else {
      onVersionChange?.(version);
    }
  };

  const handleAdoptVersion = (version: Version) => {
    // TODO: Implement adoption workflow
    console.log('Adopt version:', version);
    onVersionChange?.(version);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-3">
        <VersionSwitcher
          nodeId={nodeId}
          currentBranch={currentBranch}
          onVersionChange={onVersionChange}
          compact={compact}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${showTimeline
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <ClockIcon className="w-4 h-4" />
            {showTimeline ? 'Hide' : 'Show'} Timeline
          </button>

          {isComparisonReady && (
            <button
              onClick={() => clearComparisonSelections()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear Comparison
            </button>
          )}
        </div>
      </div>

      {/* Comparison Indicator */}
      {compareVersionIds[0] && !isComparisonReady && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <ArrowsRightLeftIcon className="w-4 h-4 inline mr-2" />
          Select another version to compare with
        </div>
      )}

      {/* Timeline View */}
      {showTimeline && (
        <div className="mt-3">
          <VersionTimeline
            nodeId={nodeId}
            onVersionClick={handleVersionClick}
            showAllBranches={true}
          />
        </div>
      )}

      {/* Comparison View */}
      {isComparisonReady && versionA && versionB && comparison && (
        <div className="mt-3">
          <VersionComparison
            versionA={comparison.version_a}
            versionB={comparison.version_b}
            onAdopt={handleAdoptVersion}
          />
        </div>
      )}
    </div>
  );
};

export default VersionControlPanel;
