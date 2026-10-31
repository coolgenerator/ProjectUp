import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Highlight {
  id: string;
  page: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  note?: string;
}

interface TextRange {
  start: number;
  end: number;
  rect: DOMRect;
}

interface HighlighterProps {
  currentPage: number;
  highlights: Highlight[];
  onHighlightCreate: (highlight: Omit<Highlight, 'id'>) => void;
  onHighlightUpdate: (id: string, startOffset: number, endOffset: number) => void;
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

const AdvancedTextHighlighter: React.FC<HighlighterProps> = memo(({
  currentPage,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  isHighlightMode,
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [pendingSelection, setPendingSelection] = useState<{
    startOffset: number;
    endOffset: number;
    text: string;
    ranges: TextRange[];
  } | null>(null);
  const [adjustingHighlight, setAdjustingHighlight] = useState<{
    id: string;
    side: 'start' | 'end';
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);

  // Detect column layout
  const detectColumns = (textLayer: HTMLElement): number => {
    const spans = Array.from(textLayer.querySelectorAll('span')).filter(
      span => span.textContent && span.textContent.trim()
    );
    
    if (spans.length < 10) return 1;
    
    // Get x-coordinates of text spans
    const xPositions = spans.map(span => span.getBoundingClientRect().left);
    const uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);
    
    // Check for column gap
    const gaps: number[] = [];
    for (let i = 1; i < uniqueX.length; i++) {
      const gap = uniqueX[i] - uniqueX[i - 1];
      if (gap > 50) gaps.push(gap); // Significant gap indicates column boundary
    }
    
    // If there's a consistent large gap, we likely have columns
    if (gaps.length > 0) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap > 100) {
        // Find column boundaries
        const pageWidth = textLayer.getBoundingClientRect().width;
        const columnWidth = pageWidth / 2;
        
        // Check if text spans are distributed in columns
        const leftColumn = spans.filter(s => s.getBoundingClientRect().left < pageWidth / 2);
        const rightColumn = spans.filter(s => s.getBoundingClientRect().left >= pageWidth / 2);
        
        if (leftColumn.length > 10 && rightColumn.length > 10) {
          return 2;
        }
      }
    }
    
    return 1;
  };

  // Get text ranges for selection accounting for columns
  const getTextRanges = (
    startOffset: number,
    endOffset: number,
    textLayer: HTMLElement
  ): TextRange[] => {
    const spans = Array.from(textLayer.querySelectorAll('span')).filter(
      span => span.textContent && span.textContent.trim()
    );
    
    if (spans.length === 0) return [];
    
    const columnCount = detectColumns(textLayer);
    const ranges: TextRange[] = [];
    let currentOffset = 0;
    let currentRange: TextRange | null = null;
    let lastRect: DOMRect | null = null;
    
    for (const span of spans) {
      const text = span.textContent || '';
      const spanStart = currentOffset;
      const spanEnd = currentOffset + text.length;
      
      if (spanEnd > startOffset && spanStart < endOffset) {
        const rect = span.getBoundingClientRect();
        const textStart = Math.max(0, startOffset - spanStart);
        const textEnd = Math.min(text.length, endOffset - spanStart);
        
        if (textStart < textEnd) {
          // Check for column/line break
          const shouldBreak = lastRect && (
            // Line break detection
            Math.abs(rect.top - lastRect.bottom) > 5 ||
            // Column break detection (for 2-column layout)
            (columnCount === 2 && 
             lastRect.right < textLayer.getBoundingClientRect().width / 2 && 
             rect.left > textLayer.getBoundingClientRect().width / 2)
          );
          
          if (shouldBreak && currentRange) {
            ranges.push(currentRange);
            currentRange = null;
          }
          
          if (!currentRange) {
            currentRange = {
              start: spanStart + textStart,
              end: spanStart + textEnd,
              rect: new DOMRect(rect.left, rect.top, rect.width, rect.height)
            };
          } else {
            // Extend current range
            currentRange.end = spanStart + textEnd;
            currentRange.rect = new DOMRect(
              Math.min(currentRange.rect.left, rect.left),
              Math.min(currentRange.rect.top, rect.top),
              Math.max(currentRange.rect.right, rect.right) - Math.min(currentRange.rect.left, rect.left),
              Math.max(currentRange.rect.bottom, rect.bottom) - Math.min(currentRange.rect.top, rect.top)
            );
          }
          
          lastRect = rect;
        }
      }
      
      currentOffset = spanEnd;
    }
    
    if (currentRange) {
      ranges.push(currentRange);
    }
    
    return ranges;
  };

  // Render highlights
  useEffect(() => {
    if (!highlightLayerRef.current) return;
    
    const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    if (!textLayer) return;
    
    const container = highlightLayerRef.current;
    container.innerHTML = ''; // Clear existing highlights
    
    const pageHighlights = highlights.filter(h => h.page === currentPage);
    const pageRect = textLayer.getBoundingClientRect();
    
    pageHighlights.forEach(highlight => {
      const ranges = getTextRanges(highlight.startOffset, highlight.endOffset, textLayer);
      
      ranges.forEach((range, index) => {
        const highlightEl = document.createElement('div');
        highlightEl.className = 'pdf-text-highlight';
        highlightEl.dataset.highlightId = highlight.id;
        highlightEl.style.cssText = `
          position: absolute;
          left: ${range.rect.left - pageRect.left}px;
          top: ${range.rect.top - pageRect.top}px;
          width: ${range.rect.width}px;
          height: ${range.rect.height}px;
          background-color: ${highlight.color};
          pointer-events: auto;
          cursor: pointer;
          transition: outline 0.2s;
        `;
        
        // Add event listeners
        highlightEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedHighlight(highlight.id);
          onHighlightClick?.(highlight);
        });
        
        highlightEl.addEventListener('mouseenter', () => {
          if (!adjustingHighlight) {
            highlightEl.style.outline = '2px solid #3B82F6';
            highlightEl.style.outlineOffset = '1px';
          }
        });
        
        highlightEl.addEventListener('mouseleave', () => {
          if (selectedHighlight !== highlight.id) {
            highlightEl.style.outline = 'none';
          }
        });
        
        // Add adjustment handles only on first and last range
        if (selectedHighlight === highlight.id && isHighlightMode) {
          if (index === 0) {
            // Start handle
            const startHandle = document.createElement('div');
            startHandle.className = 'highlight-handle-start';
            startHandle.style.cssText = `
              position: absolute;
              left: -8px;
              top: 50%;
              transform: translateY(-50%);
              width: 16px;
              height: 20px;
              background: #3B82F6;
              border: 2px solid white;
              border-radius: 4px;
              cursor: ew-resize;
              z-index: 20;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            startHandle.innerHTML = '<div style="width: 2px; height: 10px; background: white; margin: 0 auto;"></div>';
            startHandle.addEventListener('mousedown', (e) => {
              e.preventDefault();
              e.stopPropagation();
              setAdjustingHighlight({
                id: highlight.id,
                side: 'start',
                originalStart: highlight.startOffset,
                originalEnd: highlight.endOffset
              });
            });
            highlightEl.appendChild(startHandle);
          }
          
          if (index === ranges.length - 1) {
            // End handle
            const endHandle = document.createElement('div');
            endHandle.className = 'highlight-handle-end';
            endHandle.style.cssText = `
              position: absolute;
              right: -8px;
              top: 50%;
              transform: translateY(-50%);
              width: 16px;
              height: 20px;
              background: #3B82F6;
              border: 2px solid white;
              border-radius: 4px;
              cursor: ew-resize;
              z-index: 20;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            endHandle.innerHTML = '<div style="width: 2px; height: 10px; background: white; margin: 0 auto;"></div>';
            endHandle.addEventListener('mousedown', (e) => {
              e.preventDefault();
              e.stopPropagation();
              setAdjustingHighlight({
                id: highlight.id,
                side: 'end',
                originalStart: highlight.startOffset,
                originalEnd: highlight.endOffset
              });
            });
            highlightEl.appendChild(endHandle);
            
            // Delete button on last segment
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'highlight-delete';
            deleteBtn.style.cssText = `
              position: absolute;
              top: -30px;
              right: 0;
              background: #EF4444;
              color: white;
              border: none;
              padding: 4px 8px;
              font-size: 12px;
              border-radius: 4px;
              cursor: pointer;
              z-index: 21;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              onHighlightDelete(highlight.id);
              setSelectedHighlight(null);
            });
            highlightEl.appendChild(deleteBtn);
          }
        }
        
        container.appendChild(highlightEl);
      });
    });
  }, [highlights, currentPage, selectedHighlight, isHighlightMode, onHighlightClick, onHighlightDelete, adjustingHighlight]);

  // Handle text selection
  useEffect(() => {
    if (!isHighlightMode) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer) return;

      const range = selection.getRangeAt(0);
      
      // Check if selection is within text layer
      if (!textLayer.contains(range.commonAncestorContainer)) return;

      // Calculate text offsets
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let fullText = '';
      let startOffset = -1;
      let endOffset = -1;
      
      for (const span of spans) {
        const spanText = span.textContent || '';
        const spanStart = fullText.length;
        const spanEnd = fullText.length + spanText.length;
        
        // Check if selection starts in this span
        if (startOffset === -1 && span.contains(range.startContainer)) {
          const textBeforeStart = span.textContent?.substring(0, range.startOffset) || '';
          startOffset = spanStart + textBeforeStart.length;
        }
        
        // Check if selection ends in this span
        if (span.contains(range.endContainer)) {
          const textBeforeEnd = span.textContent?.substring(0, range.endOffset) || '';
          endOffset = spanStart + textBeforeEnd.length;
        }
        
        fullText += spanText;
      }

      if (startOffset >= 0 && endOffset > startOffset) {
        const text = selection.toString();
        const ranges = getTextRanges(startOffset, endOffset, textLayer);
        
        setPendingSelection({ startOffset, endOffset, text, ranges });
        
        // Position color picker
        const rect = range.getBoundingClientRect();
        setPickerPosition({ 
          x: Math.min(rect.left, window.innerWidth - 250),
          y: rect.bottom + 10 
        });
        setShowColorPicker(true);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isHighlightMode]);

  // Handle highlight adjustment
  useEffect(() => {
    if (!adjustingHighlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer) return;

      // Find character position at mouse location
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let currentOffset = 0;
      let targetOffset = -1;
      
      for (const span of spans) {
        const text = span.textContent || '';
        const rect = span.getBoundingClientRect();
        
        if (rect.left <= e.clientX && rect.right >= e.clientX &&
            rect.top <= e.clientY && rect.bottom >= e.clientY) {
          // Estimate character position within span
          const relativeX = (e.clientX - rect.left) / rect.width;
          const charIndex = Math.round(relativeX * text.length);
          targetOffset = currentOffset + charIndex;
          break;
        }
        
        currentOffset += text.length;
      }

      if (targetOffset >= 0) {
        const highlight = highlights.find(h => h.id === adjustingHighlight.id);
        if (!highlight) return;
        
        if (adjustingHighlight.side === 'start') {
          const newStart = Math.min(targetOffset, highlight.endOffset - 1);
          onHighlightUpdate(adjustingHighlight.id, newStart, highlight.endOffset);
        } else {
          const newEnd = Math.max(targetOffset, highlight.startOffset + 1);
          onHighlightUpdate(adjustingHighlight.id, highlight.startOffset, newEnd);
        }
      }
    };

    const handleMouseUp = () => {
      setAdjustingHighlight(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none'; // Prevent text selection during adjustment

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [adjustingHighlight, highlights, onHighlightUpdate]);

  // Create highlight
  const createHighlight = useCallback(() => {
    if (!pendingSelection) return;

    onHighlightCreate({
      page: currentPage,
      startOffset: pendingSelection.startOffset,
      endOffset: pendingSelection.endOffset,
      text: pendingSelection.text,
      color: selectedColor,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setPendingSelection(null);
    setShowColorPicker(false);
  }, [pendingSelection, selectedColor, currentPage, onHighlightCreate]);

  return (
    <>
      {/* Highlight layer */}
      <div
        ref={highlightLayerRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      />

      {/* Color Picker Modal */}
      <AnimatePresence>
        {showColorPicker && pendingSelection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[60] bg-white rounded-lg shadow-2xl p-4 border border-gray-200"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.y,
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
            
            {/* Preview of selection */}
            <div className="text-xs text-gray-500 mb-2 max-w-xs">
              "{pendingSelection.text.substring(0, 50)}{pendingSelection.text.length > 50 ? '...' : ''}"
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
                  setPendingSelection(null);
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
    </>
  );
});

AdvancedTextHighlighter.displayName = 'AdvancedTextHighlighter';

export default AdvancedTextHighlighter;