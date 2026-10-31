import React from 'react';
import { GitBranch, Clock } from 'lucide-react';

export interface ConversationBranch {
  id: string;
  name: string;
  createdAt: string;
  messageCount: number;
}

interface BranchSelectorProps {
  branches: ConversationBranch[];
  activeBranchId: string;
  onBranchSwitch: (branchId: string) => void;
  disabled?: boolean;
}

/**
 * Dropdown selector for switching between conversation branches
 * Shows when multiple conversation branches exist from the same point
 */
const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  activeBranchId,
  onBranchSwitch,
  disabled = false
}) => {
  if (branches.length <= 1) {
    return null;
  }

  const activeBranch = branches.find(b => b.id === activeBranchId);

  return (
    <div className="my-3 px-4">
      <div className="max-w-[85%] mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">
            Multiple conversation branches from this point
          </span>
        </div>

        <select
          value={activeBranchId}
          onChange={(e) => onBranchSwitch(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg bg-white hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} ({branch.messageCount} messages)
            </option>
          ))}
        </select>

        {activeBranch && (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>
              Viewing: {activeBranch.name} ({activeBranch.messageCount} messages)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSelector;
