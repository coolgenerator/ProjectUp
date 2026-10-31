import React from 'react';
import { Sparkles } from 'lucide-react';
import { MentionableMaterial, IdeaTree } from '../../../../types/chat';
import { getMaterialIcon, getMaterialTypeLabel } from '../../../../utils/chat/mentionUtils';

interface MentionMenuProps {
  show: boolean;
  selectedCategory: 'nodes' | 'papers' | 'resources' | null;
  selectedTreeId: string | null;
  treeSessions: IdeaTree[];
  suggestedMaterials: MentionableMaterial[];
  filteredMaterials: MentionableMaterial[];
  selectedIndex: number;
  onSelectCategory: (category: 'nodes' | 'papers' | 'resources') => void;
  onSelectTree: (treeId: string) => void;
  onSelectMaterial: (material: MentionableMaterial) => void;
}

/**
 * @ Mention dropdown menu component
 */
const MentionMenu: React.FC<MentionMenuProps> = ({
  show,
  selectedCategory,
  selectedTreeId,
  treeSessions,
  suggestedMaterials,
  filteredMaterials,
  selectedIndex,
  onSelectCategory,
  onSelectTree,
  onSelectMaterial
}) => {
  if (!show) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full bg-white border-2 border-teal-300 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
      {/* Categories Section */}
      <div className="p-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-blue-50">
        <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Categories</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectCategory('nodes')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              selectedCategory === 'nodes'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-teal-100 border border-slate-200'
            }`}
          >
            <span>💡</span>
            <span>Nodes</span>
          </button>
          <button
            onClick={() => onSelectCategory('papers')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              selectedCategory === 'papers'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-teal-100 border border-slate-200'
            }`}
          >
            <span>📄</span>
            <span>Papers (PDF)</span>
          </button>
          <button
            onClick={() => onSelectCategory('resources')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              selectedCategory === 'resources'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-teal-100 border border-slate-200'
            }`}
          >
            <span>🔗</span>
            <span>Resources</span>
          </button>
        </div>

        {/* Tree Selector (shown when Nodes category is selected) */}
        {selectedCategory === 'nodes' && treeSessions.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Select Tree:</div>
            <div className="flex flex-wrap gap-1.5">
              {treeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectTree(session.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    selectedTreeId === session.id
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="mr-1">{session.icon || '🌳'}</span>
                  {session.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto">
        {selectedCategory ? (
          // Category-filtered materials
          selectedCategory === 'nodes' && !selectedTreeId ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              👆 Please select a tree to see nodes
            </div>
          ) : filteredMaterials.length > 0 ? (
            filteredMaterials.map((material, index) => (
              <button
                key={`${material.type}-${material.id}`}
                onClick={() => onSelectMaterial(material)}
                className={`w-full px-3 py-2.5 text-left hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-teal-100' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5 text-lg">
                    {getMaterialIcon(material)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-sm font-semibold text-slate-800 truncate flex-1">
                        {material.title}
                      </div>
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium flex-shrink-0">
                        {getMaterialTypeLabel(material)}
                      </span>
                    </div>
                    {material.description && (
                      <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {material.description}
                      </div>
                    )}
                    {material.type === 'paper' && material.metadata?.authors && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        By: {material.metadata.authors}
                      </div>
                    )}
                    {material.type === 'node' && material.metadata?.treeName && (
                      <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        <span>🌳</span>
                        <span>{material.metadata.treeName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-sm">
              No {selectedCategory} found
            </div>
          )
        ) : (
          // Suggestions Section (shown when no category selected)
          <div>
            <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  AI Suggestions
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Related materials based on current context
              </div>
            </div>
            {suggestedMaterials.length > 0 ? (
              suggestedMaterials.map((material, index) => (
                <button
                  key={`${material.type}-${material.id}`}
                  onClick={() => onSelectMaterial(material)}
                  className={`w-full px-3 py-2.5 text-left hover:bg-purple-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    index === selectedIndex ? 'bg-purple-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5 text-lg">
                      {getMaterialIcon(material)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-sm font-semibold text-slate-800 truncate flex-1">
                          {material.title}
                        </div>
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex-shrink-0">
                          {getMaterialTypeLabel(material)}
                        </span>
                      </div>
                      {material.description && (
                        <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {material.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                👆 Select a category above to browse materials
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentionMenu;
