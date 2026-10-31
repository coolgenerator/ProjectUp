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

interface TextHighlighterProps {
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

const TextHighlighter: React.FC<TextHighlighterProps> = memo(({
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
  } | null>(null);
  const [adjustingHighlight, setAdjustingHighlight] = useState<{
    id: string;
    side: 'start' | 'end';
  } | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  // Get text layer element
  useEffect(() => {
    const findTextLayer = () => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLDivElement;
      if (textLayer) {
        textLayerRef.current = textLayer;
      }
    };

    // Try to find text layer immediately and after a delay
    findTextLayer();
    const timer = setTimeout(findTextLayer, 500);
    
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Apply highlights to text layer
  useEffect(() => {
    if (!textLayerRef.current) return;

    const textLayer = textLayerRef.current;
    const pageHighlights = highlights.filter(h => h.page === currentPage);

    // Remove existing highlight spans
    const existingHighlights = textLayer.querySelectorAll('.pdf-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });

    // Get all text spans in the text layer
    const textSpans = Array.from(textLayer.querySelectorAll('span')).filter(
      span => span.textContent && span.textContent.trim()
    );

    if (textSpans.length === 0) return;

    // Build complete text and position map
    let fullText = '';
    const spanMap: { span: HTMLSpanElement; start: number; end: number }[] = [];
    
    textSpans.forEach(span => {
      const start = fullText.length;
      const text = span.textContent || '';
      fullText += text;
      const end = fullText.length;
      spanMap.push({ span, start, end });
    });

    // Apply each highlight
    pageHighlights.forEach(highlight => {
      const { startOffset, endOffset, color, id } = highlight;
      
      // Find spans that intersect with this highlight
      spanMap.forEach(({ span, start, end }) => {
        // Check if this span intersects with the highlight
        if (end > startOffset && start < endOffset) {
          const text = span.textContent || '';
          const relativeStart = Math.max(0, startOffset - start);
          const relativeEnd = Math.min(text.length, endOffset - start);
          
          if (relativeStart < relativeEnd) {
            // Split text node if needed and wrap in highlight
            const beforeText = text.substring(0, relativeStart);
            const highlightText = text.substring(relativeStart, relativeEnd);
            const afterText = text.substring(relativeEnd);
            
            // Clear span content
            span.textContent = '';
            
            // Add text parts with highlight
            if (beforeText) {
              span.appendChild(document.createTextNode(beforeText));
            }
            
            if (highlightText) {
              const highlightSpan = document.createElement('span');
              highlightSpan.className = 'pdf-highlight';
              highlightSpan.dataset.highlightId = id;
              highlightSpan.style.backgroundColor = color;
              highlightSpan.style.cursor = 'pointer';
              highlightSpan.style.position = 'relative';
              highlightSpan.textContent = highlightText;
              
              // Add event listeners
              highlightSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                setSelectedHighlight(id);
                onHighlightClick?.(highlight);
              });
              
              highlightSpan.addEventListener('mouseenter', () => {
                if (!adjustingHighlight) {
                  highlightSpan.style.outline = '2px solid #3B82F6';
                  highlightSpan.style.outlineOffset = '1px';
                }
              });
              
              highlightSpan.addEventListener('mouseleave', () => {
                highlightSpan.style.outline = 'none';
              });
              
              span.appendChild(highlightSpan);
              
              // Add adjustment handles if selected
              if (selectedHighlight === id && isHighlightMode) {
                // Start handle
                const startHandle = document.createElement('div');
                startHandle.className = 'highlight-handle highlight-handle-start';
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
                  z-index: 10;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                `;
                startHandle.innerHTML = '<div style="width: 2px; height: 10px; background: white;"></div>';
                startHandle.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAdjustingHighlight({ id, side: 'start' });
                });
                highlightSpan.appendChild(startHandle);
                
                // End handle
                const endHandle = document.createElement('div');
                endHandle.className = 'highlight-handle highlight-handle-end';
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
                  z-index: 10;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                `;
                endHandle.innerHTML = '<div style="width: 2px; height: 10px; background: white;"></div>';
                endHandle.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAdjustingHighlight({ id, side: 'end' });
                });
                highlightSpan.appendChild(endHandle);
                
                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'highlight-delete';
                deleteBtn.style.cssText = `
                  position: absolute;
                  top: -25px;
                  right: 0;
                  background: #EF4444;
                  color: white;
                  border: none;
                  padding: 2px 8px;
                  font-size: 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  z-index: 11;
                `;
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  onHighlightDelete(id);
                  setSelectedHighlight(null);
                });
                highlightSpan.appendChild(deleteBtn);
              }
            }
            
            if (afterText) {
              span.appendChild(document.createTextNode(afterText));
            }
          }
        }
      });
    });
  }, [highlights, currentPage, selectedHighlight, isHighlightMode, onHighlightClick, onHighlightDelete, adjustingHighlight]);

  // Handle text selection
  useEffect(() => {
    if (!isHighlightMode || !textLayerRef.current) return;

    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      const textLayer = textLayerRef.current;
      if (!textLayer) return;

      // Get selection range
      const range = selection.getRangeAt(0);
      
      // Check if selection is within text layer
      if (!textLayer.contains(range.commonAncestorContainer)) return;

      // Calculate offsets within the text layer
      const textSpans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let fullText = '';
      let startOffset = -1;
      let endOffset = -1;
      let foundStart = false;
      
      textSpans.forEach(span => {
        const spanText = span.textContent || '';
        
        if (!foundStart && span.contains(range.startContainer)) {
          // Handle text nodes within spans
          let textBeforeStart = '';
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          while (node = walker.nextNode()) {
            if (node === range.startContainer) {
              startOffset = fullText.length + textBeforeStart.length + range.startOffset;
              foundStart = true;
              break;
            }
            textBeforeStart += node.textContent || '';
          }
          
          if (!foundStart) {
            startOffset = fullText.length;
            foundStart = true;
          }
        }
        
        if (span.contains(range.endContainer)) {
          let textBeforeEnd = '';
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          while (node = walker.nextNode()) {
            if (node === range.endContainer) {
              endOffset = fullText.length + textBeforeEnd.length + range.endOffset;
              break;
            }
            textBeforeEnd += node.textContent || '';
          }
          
          if (endOffset === -1) {
            endOffset = fullText.length + spanText.length;
          }
        }
        
        fullText += spanText;
      });

      if (startOffset >= 0 && endOffset > startOffset) {
        const text = selection.toString();
        setPendingSelection({ startOffset, endOffset, text });
        
        // Position color picker near selection
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
    if (!adjustingHighlight || !textLayerRef.current) return;

    const textLayer = textLayerRef.current;
    const highlight = highlights.find(h => h.id === adjustingHighlight.id);
    if (!highlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Find the character position at mouse location
      const textSpans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );
      
      let fullText = '';
      let targetOffset = -1;
      
      textSpans.forEach(span => {
        const spanText = span.textContent || '';
        const rect = span.getBoundingClientRect();
        
        if (rect.left <= e.clientX && rect.right >= e.clientX &&
            rect.top <= e.clientY && rect.bottom >= e.clientY) {
          // Mouse is over this span - find character position
          const relativeX = e.clientX - rect.left;
          const charWidth = rect.width / spanText.length;
          const charIndex = Math.floor(relativeX / charWidth);
          targetOffset = fullText.length + charIndex;
        }
        
        fullText += spanText;
      });

      if (targetOffset >= 0) {
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

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [adjustingHighlight, highlights, onHighlightUpdate]);

  // Create highlight from pending selection
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

TextHighlighter.displayName = 'TextHighlighter';

export default TextHighlighter;