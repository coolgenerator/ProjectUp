import React, { useState, useEffect, useCallback, memo } from 'react';
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

interface PDFHighlightLayerProps {
  currentPage: number;
  highlights: Highlight[];
  onHighlightCreate: (highlight: Omit<Highlight, 'id'>) => void;
  onHighlightUpdate: (id: string, bounds: Highlight['bounds']) => void;
  onHighlightDelete: (id: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  isHighlightMode: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 235, 59, 0.4)' },
  { name: 'Green', value: 'rgba(76, 175, 80, 0.4)' },
  { name: 'Blue', value: 'rgba(33, 150, 243, 0.4)' },
  { name: 'Pink', value: 'rgba(233, 30, 99, 0.4)' },
  { name: 'Purple', value: 'rgba(156, 39, 176, 0.4)' },
];

const PDFHighlightLayer: React.FC<PDFHighlightLayerProps> = memo(({
  currentPage,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  isHighlightMode,
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState<{
    highlightId: string;
    handle: string;
    startX: number;
    startY: number;
    originalBounds: Highlight['bounds'];
  } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [pendingHighlight, setPendingHighlight] = useState<{
    bounds: DOMRect;
    text: string;
    pageRect: DOMRect;
  } | null>(null);

  // Filter highlights for current page
  const pageHighlights = highlights.filter(h => h.page === currentPage);

  // Handle text selection
  useEffect(() => {
    if (!isHighlightMode) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      // Find the PDF page element
      const pageElement = document.querySelector('.react-pdf__Page__canvas') as HTMLElement;
      if (!pageElement) return;

      const pageRect = pageElement.getBoundingClientRect();
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      
      if (rects.length === 0) return;

      // Get the bounding box of all selected text
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      rects.forEach(rect => {
        if (rect.width > 0 && rect.height > 0) {
          minX = Math.min(minX, rect.left);
          minY = Math.min(minY, rect.top);
          maxX = Math.max(maxX, rect.right);
          maxY = Math.max(maxY, rect.bottom);
        }
      });

      if (minX === Infinity) return;

      const bounds = new DOMRect(minX, minY, maxX - minX, maxY - minY);
      const text = selection.toString();

      setPendingHighlight({ bounds, text, pageRect });
      setShowColorPicker(true);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isHighlightMode]);

  // Create highlight from pending selection
  const createHighlight = useCallback(() => {
    if (!pendingHighlight) return;

    const { bounds, text, pageRect } = pendingHighlight;
    
    // Calculate position relative to the PDF page
    const relativeX = ((bounds.left - pageRect.left) / pageRect.width) * 100;
    const relativeY = ((bounds.top - pageRect.top) / pageRect.height) * 100;
    const relativeWidth = (bounds.width / pageRect.width) * 100;
    const relativeHeight = (bounds.height / pageRect.height) * 100;

    onHighlightCreate({
      page: currentPage,
      bounds: {
        x: relativeX,
        y: relativeY,
        width: relativeWidth,
        height: relativeHeight,
      },
      text,
      color: selectedColor,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setPendingHighlight(null);
    setShowColorPicker(false);
  }, [pendingHighlight, selectedColor, currentPage, onHighlightCreate]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, highlightId: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const highlight = pageHighlights.find(h => h.id === highlightId);
    if (!highlight) return;

    setIsResizing(true);
    setResizeData({
      highlightId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      originalBounds: { ...highlight.bounds },
    });
  }, [pageHighlights]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing || !resizeData) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pageElement = document.querySelector('.react-pdf__Page__canvas') as HTMLElement;
      if (!pageElement) return;

      const pageRect = pageElement.getBoundingClientRect();
      const deltaX = ((e.clientX - resizeData.startX) / pageRect.width) * 100;
      const deltaY = ((e.clientY - resizeData.startY) / pageRect.height) * 100;

      const newBounds = { ...resizeData.originalBounds };

      switch (resizeData.handle) {
        case 'nw':
          newBounds.x = resizeData.originalBounds.x + deltaX;
          newBounds.y = resizeData.originalBounds.y + deltaY;
          newBounds.width = resizeData.originalBounds.width - deltaX;
          newBounds.height = resizeData.originalBounds.height - deltaY;
          break;
        case 'ne':
          newBounds.y = resizeData.originalBounds.y + deltaY;
          newBounds.width = resizeData.originalBounds.width + deltaX;
          newBounds.height = resizeData.originalBounds.height - deltaY;
          break;
        case 'sw':
          newBounds.x = resizeData.originalBounds.x + deltaX;
          newBounds.width = resizeData.originalBounds.width - deltaX;
          newBounds.height = resizeData.originalBounds.height + deltaY;
          break;
        case 'se':
          newBounds.width = resizeData.originalBounds.width + deltaX;
          newBounds.height = resizeData.originalBounds.height + deltaY;
          break;
      }

      // Ensure minimum size and bounds
      newBounds.width = Math.max(1, newBounds.width);
      newBounds.height = Math.max(1, newBounds.height);
      newBounds.x = Math.max(0, Math.min(100 - newBounds.width, newBounds.x));
      newBounds.y = Math.max(0, Math.min(100 - newBounds.height, newBounds.y));

      onHighlightUpdate(resizeData.highlightId, newBounds);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeData(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeData, onHighlightUpdate]);

  return (
    <>
      {/* Color Picker Modal */}
      <AnimatePresence>
        {showColorPicker && pendingHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[60] bg-white rounded-lg shadow-2xl p-4 border border-gray-200"
            style={{
              left: Math.min(pendingHighlight.bounds.left, window.innerWidth - 250),
              top: pendingHighlight.bounds.bottom + 10,
            }}
          >
            <div className="text-sm font-medium text-gray-700 mb-3">Choose highlight color:</div>
            <div className="flex gap-2 mb-3">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value.replace('0.4', '1') }}
                  title={color.name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createHighlight}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Create Highlight
              </button>
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setPendingHighlight(null);
                  setShowColorPicker(false);
                }}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlights */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {pageHighlights.map(highlight => (
          <div
            key={highlight.id}
            className={`absolute pointer-events-auto transition-opacity ${
              selectedHighlight === highlight.id ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
              left: `${highlight.bounds.x}%`,
              top: `${highlight.bounds.y}%`,
              width: `${highlight.bounds.width}%`,
              height: `${highlight.bounds.height}%`,
              backgroundColor: highlight.color,
              cursor: 'pointer',
            }}
            onClick={() => {
              setSelectedHighlight(highlight.id);
              onHighlightClick?.(highlight);
            }}
            onMouseEnter={() => !isResizing && setSelectedHighlight(highlight.id)}
            onMouseLeave={() => !isResizing && setSelectedHighlight(null)}
          >
            {/* Resize Handles */}
            {selectedHighlight === highlight.id && isHighlightMode && (
              <>
                {/* Corner handles */}
                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full -top-1.5 -left-1.5 cursor-nw-resize border border-white"
                  onMouseDown={e => handleResizeStart(e, highlight.id, 'nw')}
                />
                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full -top-1.5 -right-1.5 cursor-ne-resize border border-white"
                  onMouseDown={e => handleResizeStart(e, highlight.id, 'ne')}
                />
                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize border border-white"
                  onMouseDown={e => handleResizeStart(e, highlight.id, 'sw')}
                />
                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize border border-white"
                  onMouseDown={e => handleResizeStart(e, highlight.id, 'se')}
                />
                
                {/* Delete button */}
                <button
                  className="absolute -top-8 right-0 bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs transition-colors shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHighlightDelete(highlight.id);
                    setSelectedHighlight(null);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
});

PDFHighlightLayer.displayName = 'PDFHighlightLayer';

export default PDFHighlightLayer;