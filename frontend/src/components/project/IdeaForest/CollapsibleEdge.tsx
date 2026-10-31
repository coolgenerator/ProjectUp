import React from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';
import { HiMinus, HiPlus } from 'react-icons/hi2';

interface CollapsibleEdgeProps extends EdgeProps {
  data?: {
    onToggleExpand?: () => void;
    isExpanded?: boolean;
    hasChildren?: boolean;
  };
}

const CollapsibleEdge: React.FC<CollapsibleEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hasChildren = data?.hasChildren ?? false;
  const isExpanded = data?.isExpanded ?? true;
  const onToggleExpand = data?.onToggleExpand;

  // Only show button if node has children
  if (!hasChildren || !onToggleExpand) {
    return (
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    );
  }

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Collapse/Expand Button */}
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="edge-button-foreign-object"
        requiredExtensions="http://www.w3.org/1999/xhtml"
        style={{ overflow: 'visible', pointerEvents: 'all' }}
      >
        <button
          onClick={(e) => {
            console.log('[CollapsibleEdge] 🖱️ Button clicked!', {
              edgeId: id,
              isExpanded,
              hasChildren,
            });
            e.stopPropagation();
            e.preventDefault();
            onToggleExpand();
            console.log('[CollapsibleEdge] ✅ onToggleExpand called');
          }}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md
            ${isExpanded
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-500'
            }
          `}
          title={isExpanded ? 'Collapse children' : 'Expand children'}
          style={{ cursor: 'pointer' }}
        >
          {isExpanded ? (
            <HiMinus className="w-3.5 h-3.5" />
          ) : (
            <HiPlus className="w-3.5 h-3.5" />
          )}
        </button>
      </foreignObject>
    </>
  );
};

export default CollapsibleEdge;
