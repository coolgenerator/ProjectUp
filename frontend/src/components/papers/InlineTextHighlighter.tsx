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

interface HighlighterProps {
  currentPage: number;
  highlights: Highlight[];
  onHighlightCreate: (highlight: Omit<Highlight, 'id'>) => void;
  onHighlightUpdate: (id: string, startOffset: number, endOffset: number) => void;
  onHighlightDelete: (id: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  isHighlightMode: boolean;
  onAskAI?: (highlight: Highlight) => void;
  onAddNote?: (highlight: Highlight) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 235, 59, 0.4)' },
  { name: 'Green', value: 'rgba(76, 175, 80, 0.4)' },
  { name: 'Blue', value: 'rgba(33, 150, 243, 0.4)' },
  { name: 'Pink', value: 'rgba(233, 30, 99, 0.4)' },
  { name: 'Purple', value: 'rgba(156, 39, 176, 0.4)' },
];

const InlineTextHighlighter: React.FC<HighlighterProps> = memo(({
  currentPage,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  isHighlightMode,
  onAskAI,
  onAddNote,
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [pendingSelection, setPendingSelection] = useState<{
    startOffset: number;
    endOffset: number;
    text: string;
  } | null>(null);
  const [adjustingHighlight, setAdjustingHighlight] = useState<{
    id: string;
    side: 'start' | 'end';
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    highlight: Highlight | null;
  }>({ show: false, x: 0, y: 0, highlight: null });
  const processedRef = useRef(false);

  // Apply highlights directly to text spans
  useEffect(() => {
    const applyHighlights = () => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer || processedRef.current) return;

      // Get all text spans
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim() && !span.dataset.processed
      );
      
      if (spans.length === 0) return;

      // Build text map
      let fullText = '';
      const spanMap: { span: HTMLSpanElement; start: number; end: number; text: string }[] = [];
      
      spans.forEach(span => {
        const start = fullText.length;
        const text = span.textContent || '';
        fullText += text;
        const end = fullText.length;
        spanMap.push({ span, start, end, text });
        span.dataset.processed = 'true';
      });

      // Apply highlights to spans
      const pageHighlights = highlights.filter(h => h.page === currentPage);
      
      pageHighlights.forEach(highlight => {
        spanMap.forEach(({ span, start, end, text }) => {
          // Check if this span intersects with highlight
          if (end > highlight.startOffset && start < highlight.endOffset) {
            const highlightStart = Math.max(0, highlight.startOffset - start);
            const highlightEnd = Math.min(text.length, highlight.endOffset - start);
            
            if (highlightStart < highlightEnd) {
              const beforeText = text.substring(0, highlightStart);
              const highlightText = text.substring(highlightStart, highlightEnd);
              const afterText = text.substring(highlightEnd);
              
              // Create new span structure with highlight
              const wrapper = document.createElement('span');
              wrapper.style.cssText = span.style.cssText;
              
              if (beforeText) {
                wrapper.appendChild(document.createTextNode(beforeText));
              }
              
              if (highlightText) {
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'pdf-inline-highlight';
                highlightSpan.dataset.highlightId = highlight.id;
                highlightSpan.style.backgroundColor = highlight.color;
                highlightSpan.style.cursor = 'pointer';
                highlightSpan.style.borderRadius = '2px';
                highlightSpan.textContent = highlightText;
                
                // Add hover effect
                highlightSpan.addEventListener('mouseenter', () => {
                  if (selectedHighlight === highlight.id) {
                    highlightSpan.style.backgroundColor = highlight.color.replace('0.4', '0.6');
                  }
                });
                
                highlightSpan.addEventListener('mouseleave', () => {
                  highlightSpan.style.backgroundColor = highlight.color;
                });
                
                highlightSpan.addEventListener('click', (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setSelectedHighlight(highlight.id);
                  setContextMenu({
                    show: true,
                    x: e.clientX,
                    y: e.clientY,
                    highlight: highlight
                  });
                  onHighlightClick?.(highlight);
                });
                
                wrapper.appendChild(highlightSpan);
              }
              
              if (afterText) {
                wrapper.appendChild(document.createTextNode(afterText));
              }
              
              // Replace original span with wrapped version
              span.parentNode?.replaceChild(wrapper, span);
            }
          }
        });
      });

      // Add adjustment cursors for selected highlight
      if (selectedHighlight && isHighlightMode) {
        const highlight = pageHighlights.find(h => h.id === selectedHighlight);
        if (highlight) {
          addAdjustmentCursors(highlight, spanMap, fullText);
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (textLayer) {
        const spans = textLayer.querySelectorAll('span[data-processed]');
        spans.forEach(span => {
          span.removeAttribute('data-processed');
        });
        
        // Remove cursors
        const cursors = textLayer.querySelectorAll('.highlight-cursor');
        cursors.forEach(cursor => cursor.remove());
      }
      processedRef.current = false;
    };

    cleanup();
    const timer = setTimeout(applyHighlights, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [highlights, currentPage, selectedHighlight, isHighlightMode, onHighlightClick]);

  // Add adjustment cursors
  const addAdjustmentCursors = (highlight: Highlight, spanMap: any[], fullText: string) => {
    const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    if (!textLayer) return;

    // Find position for start cursor
    let startCursorAdded = false;
    let endCursorAdded = false;

    spanMap.forEach(({ span, start, end }) => {
      // Add start cursor
      if (!startCursorAdded && highlight.startOffset >= start && highlight.startOffset <= end) {
        const charIndex = highlight.startOffset - start;
        const textBefore = span.textContent?.substring(0, charIndex) || '';
        
        // Create a temporary span to measure text width
        const measurer = document.createElement('span');
        measurer.style.cssText = span.style.cssText;
        measurer.style.visibility = 'hidden';
        measurer.style.position = 'absolute';
        measurer.textContent = textBefore;
        document.body.appendChild(measurer);
        const textWidth = measurer.getBoundingClientRect().width;
        document.body.removeChild(measurer);
        
        const spanRect = span.getBoundingClientRect();
        const layerRect = textLayer.getBoundingClientRect();
        
        const startCursor = document.createElement('div');
        startCursor.className = 'highlight-cursor highlight-cursor-start';
        startCursor.style.cssText = `
          position: absolute;
          left: ${spanRect.left - layerRect.left + textWidth - 2}px;
          top: ${spanRect.top - layerRect.top}px;
          width: 3px;
          height: ${spanRect.height}px;
          background: #3B82F6;
          cursor: col-resize;
          z-index: 10;
          box-shadow: 0 0 3px rgba(59, 130, 246, 0.5);
        `;
        startCursor.title = 'Drag to adjust highlight start';
        
        startCursor.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setAdjustingHighlight({ id: highlight.id, side: 'start' });
        });
        
        textLayer.appendChild(startCursor);
        startCursorAdded = true;
      }
      
      // Add end cursor
      if (!endCursorAdded && highlight.endOffset >= start && highlight.endOffset <= end) {
        const charIndex = highlight.endOffset - start;
        const textBefore = span.textContent?.substring(0, charIndex) || '';
        
        // Create a temporary span to measure text width
        const measurer = document.createElement('span');
        measurer.style.cssText = span.style.cssText;
        measurer.style.visibility = 'hidden';
        measurer.style.position = 'absolute';
        measurer.textContent = textBefore;
        document.body.appendChild(measurer);
        const textWidth = measurer.getBoundingClientRect().width;
        document.body.removeChild(measurer);
        
        const spanRect = span.getBoundingClientRect();
        const layerRect = textLayer.getBoundingClientRect();
        
        const endCursor = document.createElement('div');
        endCursor.className = 'highlight-cursor highlight-cursor-end';
        endCursor.style.cssText = `
          position: absolute;
          left: ${spanRect.left - layerRect.left + textWidth}px;
          top: ${spanRect.top - layerRect.top}px;
          width: 3px;
          height: ${spanRect.height}px;
          background: #3B82F6;
          cursor: col-resize;
          z-index: 10;
          box-shadow: 0 0 3px rgba(59, 130, 246, 0.5);
        `;
        endCursor.title = 'Drag to adjust highlight end';
        
        endCursor.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setAdjustingHighlight({ id: highlight.id, side: 'end' });
        });
        
        textLayer.appendChild(endCursor);
        endCursorAdded = true;
      }
    });
  };

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
      if (!textLayer.contains(range.commonAncestorContainer)) return;

      // Build text map and find selection offsets
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let fullText = '';
      let startOffset = -1;
      let endOffset = -1;
      
      spans.forEach(span => {
        const spanStart = fullText.length;
        const spanText = span.textContent || '';
        
        // Check for selection start
        if (startOffset === -1) {
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          let nodeOffset = 0;
          while (node = walker.nextNode()) {
            if (node === range.startContainer) {
              startOffset = spanStart + nodeOffset + range.startOffset;
              break;
            }
            nodeOffset += node.textContent?.length || 0;
          }
        }
        
        // Check for selection end
        if (endOffset === -1) {
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          let nodeOffset = 0;
          while (node = walker.nextNode()) {
            if (node === range.endContainer) {
              endOffset = spanStart + nodeOffset + range.endOffset;
              break;
            }
            nodeOffset += node.textContent?.length || 0;
          }
        }
        
        fullText += spanText;
      });

      if (startOffset >= 0 && endOffset > startOffset) {
        const text = selection.toString();
        setPendingSelection({ startOffset, endOffset, text });
        
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

  // Handle cursor adjustment
  useEffect(() => {
    if (!adjustingHighlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer) return;

      // Find character position at mouse location
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let fullText = '';
      let targetOffset = -1;
      
      for (const span of spans) {
        const spanStart = fullText.length;
        const spanText = span.textContent || '';
        const rect = span.getBoundingClientRect();
        
        if (rect.left <= e.clientX && rect.right >= e.clientX &&
            rect.top <= e.clientY && rect.bottom >= e.clientY) {
          
          // Create measuring element to find character position
          const measurer = document.createElement('span');
          measurer.style.cssText = span.style.cssText;
          measurer.style.visibility = 'hidden';
          measurer.style.position = 'absolute';
          document.body.appendChild(measurer);
          
          // Binary search for character position
          let low = 0;
          let high = spanText.length;
          let bestIndex = 0;
          
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            measurer.textContent = spanText.substring(0, mid);
            const width = measurer.getBoundingClientRect().width;
            
            if (rect.left + width < e.clientX) {
              bestIndex = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          
          document.body.removeChild(measurer);
          targetOffset = spanStart + bestIndex;
          break;
        }
        
        fullText += spanText;
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
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [adjustingHighlight, highlights, onHighlightUpdate]);

  // Handle click outside to deselect highlight and close context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked on a highlight or context menu
      if (!target.closest('.pdf-inline-highlight') && 
          !target.closest('.highlight-context-menu')) {
        setSelectedHighlight(null);
        setContextMenu({ show: false, x: 0, y: 0, highlight: null });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

    window.getSelection()?.removeAllRanges();
    setPendingSelection(null);
    setShowColorPicker(false);
  }, [pendingSelection, selectedColor, currentPage, onHighlightCreate]);

  return (
    <>
      {/* Context Menu for Highlight Actions */}
      <AnimatePresence>
        {contextMenu.show && contextMenu.highlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="highlight-context-menu fixed z-[70] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 180),
              top: contextMenu.y
            }}
          >
            <button
              onClick={() => {
                if (onAskAI && contextMenu.highlight) {
                  onAskAI(contextMenu.highlight);
                }
                setContextMenu({ show: false, x: 0, y: 0, highlight: null });
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <span>🤖</span>
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => {
                if (onAddNote && contextMenu.highlight) {
                  onAddNote(contextMenu.highlight);
                }
                setContextMenu({ show: false, x: 0, y: 0, highlight: null });
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <span>📝</span>
              <span>Add Note</span>
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => {
                if (contextMenu.highlight) {
                  onHighlightDelete(contextMenu.highlight.id);
                  setSelectedHighlight(null);
                }
                setContextMenu({ show: false, x: 0, y: 0, highlight: null });
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
      
      <style>{`
        .pdf-inline-highlight {
          transition: background-color 0.2s;
          border-radius: 2px;
          padding: 0 1px;
        }
        
        .pdf-inline-highlight:hover {
          filter: brightness(0.9);
        }
        
        .highlight-cursor {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        .highlight-cursor:hover {
          width: 4px !important;
          background: #2563EB !important;
        }
        
        .highlight-context-menu {
          user-select: none;
        }
      `}</style>
    </>
  );
});

InlineTextHighlighter.displayName = 'InlineTextHighlighter';

export default InlineTextHighlighter;