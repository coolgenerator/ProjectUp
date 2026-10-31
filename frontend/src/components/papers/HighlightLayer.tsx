import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Highlight {
  id: string;
  page: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  color: string;
  note?: string;
}

interface HighlightLayerProps {
  currentPage: number;
  highlights: Highlight[];
  onHighlightCreate: (highlight: Omit<Highlight, 'id'>) => void;
  onHighlightUpdate: (id: string, bounds: Highlight['bounds']) => void;
  onHighlightDelete: (id: string) => void;
  onHighlightClick: (highlight: Highlight) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isSelecting: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 235, 59, 0.3)' },
  { name: 'Green', value: 'rgba(76, 175, 80, 0.3)' },
  { name: 'Blue', value: 'rgba(33, 150, 243, 0.3)' },
  { name: 'Pink', value: 'rgba(233, 30, 99, 0.3)' },
  { name: 'Purple', value: 'rgba(156, 39, 176, 0.3)' },
];

const HighlightLayer: React.FC<HighlightLayerProps> = memo(({
  currentPage,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  containerRef,
  isSelecting,
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<DOMRect | null>(null);
  
  const pageHighlights = highlights.filter(h => h.page === currentPage);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (!isSelecting) return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (!containerRect) return;
      
      // Calculate relative position within container
      const bounds = {
        x: ((rect.left - containerRect.left) / containerRect.width) * 100,
        y: ((rect.top - containerRect.top) / containerRect.height) * 100,
        width: (rect.width / containerRect.width) * 100,
        height: (rect.height / containerRect.height) * 100,
      };
      
      const selectedText = selection.toString();
      
      if (selectedText.trim()) {
        setSelectionBounds(rect);
        setShowColorPicker(true);
        
        // Create highlight after color selection
        const createHighlight = () => {
          onHighlightCreate({
            page: currentPage,
            bounds,
            text: selectedText,
            color: selectedColor,
          });
          
          // Clear selection
          selection.removeAllRanges();
          setSelectionBounds(null);
          setShowColorPicker(false);
        };
        
        // Auto-create with default color if color picker is not shown
        if (!showColorPicker) {
          createHighlight();
        }
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isSelecting, currentPage, containerRef, onHighlightCreate, selectedColor, showColorPicker]);

  // Handle highlight resizing
  const handleResizeStart = (e: React.MouseEvent, highlightId: string, handle: string) => {
    e.stopPropagation();
    setSelectedHighlight(highlightId);
    setIsResizing(true);
    setResizeHandle(handle);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !selectedHighlight || !resizeHandle || !containerRef.current) return;
    
    const highlight = pageHighlights.find(h => h.id === selectedHighlight);
    if (!highlight) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    const newBounds = { ...highlight.bounds };
    
    switch (resizeHandle) {
      case 'nw':
        newBounds.width += newBounds.x - x;
        newBounds.height += newBounds.y - y;
        newBounds.x = x;
        newBounds.y = y;
        break;
      case 'ne':
        newBounds.width = x - newBounds.x;
        newBounds.height += newBounds.y - y;
        newBounds.y = y;
        break;
      case 'sw':
        newBounds.width += newBounds.x - x;
        newBounds.height = y - newBounds.y;
        newBounds.x = x;
        break;
      case 'se':
        newBounds.width = x - newBounds.x;
        newBounds.height = y - newBounds.y;
        break;
      case 'n':
        newBounds.height += newBounds.y - y;
        newBounds.y = y;
        break;
      case 'e':
        newBounds.width = x - newBounds.x;
        break;
      case 's':
        newBounds.height = y - newBounds.y;
        break;
      case 'w':
        newBounds.width += newBounds.x - x;
        newBounds.x = x;
        break;
    }
    
    // Ensure minimum size
    newBounds.width = Math.max(2, newBounds.width);
    newBounds.height = Math.max(2, newBounds.height);
    
    onHighlightUpdate(selectedHighlight, newBounds);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeHandle(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, selectedHighlight, resizeHandle]);

  return (
    <>
      {/* Color Picker Popup */}
      <AnimatePresence>
        {showColorPicker && selectionBounds && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-50 bg-white rounded-lg shadow-xl p-3 border border-gray-200"
            style={{
              left: selectionBounds.left + selectionBounds.width / 2 - 100,
              top: selectionBounds.bottom + 10,
            }}
          >
            <div className="text-xs font-medium text-gray-700 mb-2">Choose highlight color:</div>
            <div className="flex gap-2 mb-3">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color.value ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value.replace('0.3', '1') }}
                  title={color.name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const selection = window.getSelection();
                  const selectedText = selection?.toString() || '';
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  
                  if (selection && !selection.isCollapsed && containerRect) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    const bounds = {
                      x: ((rect.left - containerRect.left) / containerRect.width) * 100,
                      y: ((rect.top - containerRect.top) / containerRect.height) * 100,
                      width: (rect.width / containerRect.width) * 100,
                      height: (rect.height / containerRect.height) * 100,
                    };
                    
                    onHighlightCreate({
                      page: currentPage,
                      bounds,
                      text: selectedText,
                      color: selectedColor,
                    });
                    
                    selection.removeAllRanges();
                  }
                  
                  setShowColorPicker(false);
                  setSelectionBounds(null);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Highlight
              </button>
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setShowColorPicker(false);
                  setSelectionBounds(null);
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlight Overlays */}
      {pageHighlights.map(highlight => (
        <motion.div
          key={highlight.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute cursor-pointer transition-all ${
            selectedHighlight === highlight.id ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{
            left: `${highlight.bounds.x}%`,
            top: `${highlight.bounds.y}%`,
            width: `${highlight.bounds.width}%`,
            height: `${highlight.bounds.height}%`,
            backgroundColor: highlight.color,
          }}
          onClick={() => onHighlightClick(highlight)}
          onMouseEnter={() => !isResizing && setSelectedHighlight(highlight.id)}
          onMouseLeave={() => !isResizing && setSelectedHighlight(null)}
        >
          {/* Resize Handles */}
          {selectedHighlight === highlight.id && (
            <>
              {/* Corner handles */}
              <div
                className="absolute w-2 h-2 bg-blue-500 rounded-full -top-1 -left-1 cursor-nw-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'nw')}
              />
              <div
                className="absolute w-2 h-2 bg-blue-500 rounded-full -top-1 -right-1 cursor-ne-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'ne')}
              />
              <div
                className="absolute w-2 h-2 bg-blue-500 rounded-full -bottom-1 -left-1 cursor-sw-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'sw')}
              />
              <div
                className="absolute w-2 h-2 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'se')}
              />
              
              {/* Edge handles */}
              <div
                className="absolute w-full h-1 bg-blue-500 opacity-0 hover:opacity-100 -top-0.5 left-0 cursor-n-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'n')}
              />
              <div
                className="absolute w-1 h-full bg-blue-500 opacity-0 hover:opacity-100 -right-0.5 top-0 cursor-e-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'e')}
              />
              <div
                className="absolute w-full h-1 bg-blue-500 opacity-0 hover:opacity-100 -bottom-0.5 left-0 cursor-s-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 's')}
              />
              <div
                className="absolute w-1 h-full bg-blue-500 opacity-0 hover:opacity-100 -left-0.5 top-0 cursor-w-resize"
                onMouseDown={e => handleResizeStart(e, highlight.id, 'w')}
              />
              
              {/* Delete button */}
              <button
                className="absolute -top-6 right-0 bg-red-500 text-white rounded px-2 py-0.5 text-xs hover:bg-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onHighlightDelete(highlight.id);
                }}
              >
                Delete
              </button>
            </>
          )}
        </motion.div>
      ))}
    </>
  );
});

HighlightLayer.displayName = 'HighlightLayer';

export default HighlightLayer;