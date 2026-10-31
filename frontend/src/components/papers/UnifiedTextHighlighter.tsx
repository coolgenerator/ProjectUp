import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
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
  onAskAI?: (text: string) => void;
  onAddNote?: (data: { text: string; page: number; quote: string; startOffset: number; endOffset: number }) => void;
  highlightAnnotation?: {
    page: number;
    startOffset: number;
    endOffset: number;
  } | null;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 235, 59, 0.4)' },
  { name: 'Green', value: 'rgba(76, 175, 80, 0.4)' },
  { name: 'Blue', value: 'rgba(33, 150, 243, 0.4)' },
  { name: 'Pink', value: 'rgba(233, 30, 99, 0.4)' },
  { name: 'Purple', value: 'rgba(156, 39, 176, 0.4)' },
];

const UnifiedTextHighlighter: React.FC<HighlighterProps> = memo(({
  currentPage,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  onAskAI,
  onAddNote,
  highlightAnnotation,
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [pendingSelection, setPendingSelection] = useState<{
    startOffset: number;
    endOffset: number;
    text: string;
    page: number; // Track which page the selection is on
  } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAskAIInput, setShowAskAIInput] = useState(false);
  const [showAddNoteInput, setShowAddNoteInput] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [noteText, setNoteText] = useState('');
  const [adjustingHighlight, setAdjustingHighlight] = useState<{
    id: string;
    side: 'start' | 'end';
  } | null>(null);
  const [adjustingSelection, setAdjustingSelection] = useState<'start' | 'end' | null>(null);
  const [selectionRects, setSelectionRects] = useState<DOMRect[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    highlight: Highlight | null;
  }>({ show: false, x: 0, y: 0, highlight: null });
  
  // Store references to highlight segments grouped by highlight ID
  const highlightGroupsRef = useRef<Map<string, HTMLElement[]>>(new Map());
  const processedRef = useRef(false);
  const [annotationRects, setAnnotationRects] = useState<DOMRect[]>([]);

  // Apply highlights to the text layer
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

      // Clear highlight groups
      highlightGroupsRef.current.clear();

      // Process highlights
      const pageHighlights = highlights.filter(h => h.page === currentPage);
      
      pageHighlights.forEach(highlight => {
        const highlightElements: HTMLElement[] = [];
        let segmentIndex = 0;
        
        // Find all spans that intersect with this highlight
        const affectedSpans = spanMap.filter(({ start, end }) => 
          end > highlight.startOffset && start < highlight.endOffset
        );
        
        affectedSpans.forEach((spanInfo, index) => {
          const { span, start, end, text } = spanInfo;
          const isFirstSegment = index === 0;
          const isLastSegment = index === affectedSpans.length - 1;
          
          const highlightStart = Math.max(0, highlight.startOffset - start);
          const highlightEnd = Math.min(text.length, highlight.endOffset - start);
          
          if (highlightStart < highlightEnd) {
            const beforeText = text.substring(0, highlightStart);
            const highlightText = text.substring(highlightStart, highlightEnd);
            const afterText = text.substring(highlightEnd);
            
            // Create wrapper to maintain original span styling
            const wrapper = document.createElement('span');
            wrapper.style.cssText = span.style.cssText;
            
            // Add text before highlight
            if (beforeText) {
              wrapper.appendChild(document.createTextNode(beforeText));
            }
            
            // Create highlight span
            if (highlightText) {
              const highlightSpan = document.createElement('span');
              highlightSpan.className = 'unified-highlight-segment';
              highlightSpan.dataset.highlightId = highlight.id;
              highlightSpan.dataset.segmentIndex = segmentIndex.toString();
              highlightSpan.dataset.isFirst = isFirstSegment.toString();
              highlightSpan.dataset.isLast = isLastSegment.toString();
              highlightSpan.textContent = highlightText;
              
              // Apply base styles
              highlightSpan.style.backgroundColor = highlight.color;
              highlightSpan.style.cursor = 'pointer';
              highlightSpan.style.transition = 'all 0.2s';
              highlightSpan.style.padding = '0 2px';
              
              // Rounded corners for first and last segments
              if (isFirstSegment) {
                highlightSpan.style.borderTopLeftRadius = '3px';
                highlightSpan.style.borderBottomLeftRadius = '3px';
              }
              if (isLastSegment) {
                highlightSpan.style.borderTopRightRadius = '3px';
                highlightSpan.style.borderBottomRightRadius = '3px';
              }
              
              // Store reference to this segment
              highlightElements.push(highlightSpan);
              
              // Add event handlers
              highlightSpan.addEventListener('mouseenter', () => handleHighlightHover(highlight.id, true));
              highlightSpan.addEventListener('mouseleave', () => handleHighlightHover(highlight.id, false));
              highlightSpan.addEventListener('click', (e) => handleHighlightClick(e, highlight));
              
              wrapper.appendChild(highlightSpan);
              segmentIndex++;
            }
            
            // Add text after highlight
            if (afterText) {
              wrapper.appendChild(document.createTextNode(afterText));
            }
            
            // Replace original span
            span.parentNode?.replaceChild(wrapper, span);
          }
        });
        
        // Store the group of elements for this highlight
        if (highlightElements.length > 0) {
          highlightGroupsRef.current.set(highlight.id, highlightElements);
        }
      });

      // Add adjustment handles for selected highlight
      if (selectedHighlight) {
        const highlight = pageHighlights.find(h => h.id === selectedHighlight);
        if (highlight) {
          addAdjustmentHandles(highlight, spanMap, fullText);
        }
      }

      processedRef.current = true;
    };

    // Cleanup function
    const cleanup = () => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (textLayer) {
        const spans = textLayer.querySelectorAll('span[data-processed]');
        spans.forEach(span => {
          span.removeAttribute('data-processed');
        });

        // Remove adjustment handles
        const handles = textLayer.querySelectorAll('.highlight-adjust-handle');
        handles.forEach(handle => handle.remove());
      }
      highlightGroupsRef.current.clear();
      processedRef.current = false;
    };

    cleanup();
    const timer = setTimeout(applyHighlights, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [highlights, currentPage, selectedHighlight]);

  // Unified hover handler for all segments of a highlight
  const handleHighlightHover = (highlightId: string, isEntering: boolean) => {
    const segments = highlightGroupsRef.current.get(highlightId);
    if (!segments) return;
    
    const highlight = highlights.find(h => h.id === highlightId);
    if (!highlight) return;
    
    segments.forEach(segment => {
      if (isEntering) {
        segment.style.backgroundColor = highlight.color.replace('0.4', '0.55');
        segment.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      } else {
        segment.style.backgroundColor = highlight.color;
        segment.style.boxShadow = 'none';
        if (selectedHighlight === highlightId) {
          segment.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
        }
      }
    });
  };

  // Unified click handler for highlight segments
  const handleHighlightClick = (e: MouseEvent, highlight: Highlight) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Select this highlight
    setSelectedHighlight(highlight.id);
    
    // Update visual state for all highlights
    highlightGroupsRef.current.forEach((segments, id) => {
      segments.forEach(segment => {
        if (id === highlight.id) {
          segment.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
          segment.style.outlineOffset = '1px';
        } else {
          segment.style.outline = 'none';
        }
      });
    });
    
    // Show context menu
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      highlight: highlight
    });
    
    onHighlightClick?.(highlight);
  };

  // Add adjustment handles for selected highlight
  const addAdjustmentHandles = (highlight: Highlight, spanMap: any[], fullText: string) => {
    const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    if (!textLayer) return;
    
    const segments = highlightGroupsRef.current.get(highlight.id);
    if (!segments || segments.length === 0) return;
    
    // Get first and last segments
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    
    // Create start handle
    const startHandle = document.createElement('div');
    startHandle.className = 'highlight-adjust-handle';
    startHandle.dataset.highlightId = highlight.id;
    startHandle.dataset.handleType = 'start';
    
    const firstRect = firstSegment.getBoundingClientRect();
    const layerRect = textLayer.getBoundingClientRect();
    
    startHandle.style.cssText = `
      position: absolute;
      left: ${firstRect.left - layerRect.left - 4}px;
      top: ${firstRect.top - layerRect.top}px;
      width: 3px;
      height: ${firstRect.height}px;
      background: #3B82F6;
      cursor: col-resize;
      z-index: 10;
      transition: width 0.2s;
    `;
    
    startHandle.addEventListener('mouseenter', () => {
      startHandle.style.width = '5px';
      startHandle.style.background = '#2563EB';
    });
    
    startHandle.addEventListener('mouseleave', () => {
      startHandle.style.width = '3px';
      startHandle.style.background = '#3B82F6';
    });
    
    startHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setAdjustingHighlight({ id: highlight.id, side: 'start' });
    });
    
    textLayer.appendChild(startHandle);
    
    // Create end handle
    const endHandle = document.createElement('div');
    endHandle.className = 'highlight-adjust-handle';
    endHandle.dataset.highlightId = highlight.id;
    endHandle.dataset.handleType = 'end';
    
    const lastRect = lastSegment.getBoundingClientRect();
    
    endHandle.style.cssText = `
      position: absolute;
      left: ${lastRect.right - layerRect.left + 1}px;
      top: ${lastRect.top - layerRect.top}px;
      width: 3px;
      height: ${lastRect.height}px;
      background: #3B82F6;
      cursor: col-resize;
      z-index: 10;
      transition: width 0.2s;
    `;
    
    endHandle.addEventListener('mouseenter', () => {
      endHandle.style.width = '5px';
      endHandle.style.background = '#2563EB';
    });
    
    endHandle.addEventListener('mouseleave', () => {
      endHandle.style.width = '3px';
      endHandle.style.background = '#3B82F6';
    });
    
    endHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setAdjustingHighlight({ id: highlight.id, side: 'end' });
    });
    
    textLayer.appendChild(endHandle);
  };

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();

        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          return;
        }

        const range = selection.getRangeAt(0);

        // Find the text layer that contains the selection
        // Check if selection is within any PDF page's text layer
        const pageElement = (range.commonAncestorContainer as Element).closest?.('[data-page-number]') ||
                           (range.commonAncestorContainer.parentElement as Element)?.closest?.('[data-page-number]');

        if (!pageElement) {
          return;
        }

        // Get the actual page number from the page element
        const actualPageNumber = parseInt(pageElement.getAttribute('data-page-number') || String(currentPage), 10);

        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        if (!textLayer) {
          return;
        }

        // Calculate offsets
        const spans = Array.from(textLayer.querySelectorAll('span')).filter(
          span => span.textContent && span.textContent.trim()
        );

        let fullText = '';
        let startOffset = -1;
        let endOffset = -1;

        spans.forEach(span => {
          const spanStart = fullText.length;
          const spanText = span.textContent || '';

          // Check for selection boundaries
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );

          let node;
          let nodeOffset = 0;
          while (node = walker.nextNode()) {
            if (node === range.startContainer && startOffset === -1) {
              startOffset = spanStart + nodeOffset + range.startOffset;
            }
            if (node === range.endContainer && endOffset === -1) {
              endOffset = spanStart + nodeOffset + range.endOffset;
            }
            nodeOffset += node.textContent?.length || 0;
          }

          fullText += spanText;
        });

        if (startOffset >= 0 && endOffset > startOffset) {
          const text = selection.toString();
          setPendingSelection({ startOffset, endOffset, text, page: actualPageNumber });

          // Position toolbar
          const rect = range.getBoundingClientRect();
          const toolbarHeight = 50;
          const spaceAbove = rect.top;

          // Position above if there's space, otherwise below
          const y = spaceAbove >= toolbarHeight
            ? rect.top - toolbarHeight
            : rect.bottom + 10;

          setToolbarPosition({
            x: Math.min(rect.left, window.innerWidth - 300),
            y: y
          });
          setShowToolbar(true);
        }
      }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

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
      
      let fullText = '';
      let targetOffset = -1;
      
      for (const span of spans) {
        const spanStart = fullText.length;
        const spanText = span.textContent || '';
        const rect = span.getBoundingClientRect();
        
        if (rect.left <= e.clientX && rect.right >= e.clientX &&
            rect.top <= e.clientY && rect.bottom >= e.clientY) {
          
          // Create measuring element
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

  // Handle selection adjustment (for pending selections)
  useEffect(() => {
    if (!adjustingSelection || !pendingSelection) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Find the page containing the current mouse position
      const pageElements = document.querySelectorAll('[data-page-number]');
      let targetTextLayer: HTMLElement | null = null;

      for (const pageEl of Array.from(pageElements)) {
        const textLayer = pageEl.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        if (textLayer) {
          const rect = textLayer.getBoundingClientRect();
          if (rect.top <= e.clientY && rect.bottom >= e.clientY &&
              rect.left <= e.clientX && rect.right >= e.clientX) {
            targetTextLayer = textLayer;
            break;
          }
        }
      }

      if (!targetTextLayer) return;

      // Find character position at mouse location
      const spans = Array.from(targetTextLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );

      let fullText = '';
      let targetOffset = -1;
      let closestOffset = -1;
      let closestDistance = Infinity;

      for (const span of spans) {
        const spanStart = fullText.length;
        const spanText = span.textContent || '';
        const rect = span.getBoundingClientRect();

        // Check if mouse is within this span's vertical bounds
        if (rect.top <= e.clientY && rect.bottom >= e.clientY) {
          // Check horizontal position for precise character detection
          if (rect.left <= e.clientX && rect.right >= e.clientX) {
            // Mouse is inside this span - find exact character
            const range = document.createRange();
            const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
            const textNode = walker.nextNode();

            if (textNode) {
              const nodeText = textNode.textContent || '';

              // Binary search for character position
              const low = 0;
              const high = nodeText.length;
              let bestIndex = 0;
              let bestDistance = Infinity;

              for (let i = 0; i <= nodeText.length; i++) {
                range.setStart(textNode, 0);
                range.setEnd(textNode, i);
                const charRect = range.getBoundingClientRect();
                const distance = Math.abs(charRect.right - e.clientX);

                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestIndex = i;
                }
              }

              targetOffset = spanStart + bestIndex;
              break;
            }
          } else {
            // Mouse is on the same line but outside this span
            // Track closest span
            const distance = e.clientX < rect.left
              ? rect.left - e.clientX
              : e.clientX - rect.right;

            if (distance < closestDistance) {
              closestDistance = distance;
              closestOffset = e.clientX < rect.left ? spanStart : spanStart + spanText.length;
            }
          }
        }

        fullText += spanText;
      }

      // Use closest offset if we didn't find exact position
      if (targetOffset === -1 && closestOffset !== -1) {
        targetOffset = closestOffset;
      }

      if (targetOffset >= 0) {
        let newStart = pendingSelection.startOffset;
        let newEnd = pendingSelection.endOffset;

        if (adjustingSelection === 'start') {
          newStart = Math.min(targetOffset, pendingSelection.endOffset - 1);
        } else {
          newEnd = Math.max(targetOffset, pendingSelection.startOffset + 1);
        }

        const newText = fullText.substring(newStart, newEnd);
        setPendingSelection({
          startOffset: newStart,
          endOffset: newEnd,
          text: newText,
          page: currentPage
        });

        // Update the visual selection to keep it highlighted
        const selection = window.getSelection();
        if (selection && targetTextLayer) {
          selection.removeAllRanges();
          const range = document.createRange();

          // Rebuild spans array for accurate node traversal
          const allSpans = Array.from(targetTextLayer.querySelectorAll('span')).filter(
            span => span.textContent && span.textContent.trim()
          );

          // Find the text nodes corresponding to the new offsets
          let currentOffset = 0;
          let startNode: Node | null = null;
          let startNodeOffset = 0;
          let endNode: Node | null = null;
          let endNodeOffset = 0;

          for (const span of allSpans) {
            const spanText = span.textContent || '';
            const spanStart = currentOffset;
            const spanEnd = currentOffset + spanText.length;

            const walker = document.createTreeWalker(
              span,
              NodeFilter.SHOW_TEXT,
              null
            );

            let textNode;
            while (textNode = walker.nextNode()) {
              const nodeText = textNode.textContent || '';
              const nodeStart = currentOffset;
              const nodeEnd = nodeStart + nodeText.length;

              if (!startNode && newStart >= nodeStart && newStart < nodeEnd) {
                startNode = textNode;
                startNodeOffset = Math.min(newStart - nodeStart, nodeText.length);
              }

              if (!endNode && newEnd > nodeStart && newEnd <= nodeEnd) {
                endNode = textNode;
                endNodeOffset = Math.min(newEnd - nodeStart, nodeText.length);
              }

              currentOffset += nodeText.length;

              if (startNode && endNode) break;
            }

            // If we haven't updated offset via walker, update it with span length
            if (currentOffset === spanStart) {
              currentOffset = spanEnd;
            }

            if (startNode && endNode) break;
          }

          if (startNode && endNode) {
            try {
              range.setStart(startNode, startNodeOffset);
              range.setEnd(endNode, endNodeOffset);
              selection.addRange(range);

              // Capture selection rectangles for visual overlay
              const rects = range.getClientRects();
              setSelectionRects(Array.from(rects));
            } catch (e) {
              console.error('Range error:', e);
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      setAdjustingSelection(null);
      setSelectionRects([]);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [adjustingSelection, pendingSelection]);

  // Update toolbar and handle positions on scroll
  useEffect(() => {
    if (!pendingSelection) return;

    const updatePositions = () => {
      // Find the page element for current page
      const pageElements = document.querySelectorAll('[data-page-number]');
      let targetTextLayer: HTMLElement | null = null;

      for (const pageEl of Array.from(pageElements)) {
        const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '0');
        if (pageNum === currentPage) {
          targetTextLayer = pageEl.querySelector('.react-pdf__Page__textContent') as HTMLElement;
          break;
        }
      }

      if (!targetTextLayer) return;

      // Get all text spans
      const spans = Array.from(targetTextLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      );

      // Build text and find positions
      let fullText = '';
      let startRect: DOMRect | null = null;
      let endRect: DOMRect | null = null;

      for (const span of spans) {
        const spanStart = fullText.length;
        const spanText = span.textContent || '';
        const spanEnd = spanStart + spanText.length;

        // Check if this span contains the start or end of selection
        if (!startRect && pendingSelection.startOffset >= spanStart && pendingSelection.startOffset < spanEnd) {
          const range = document.createRange();
          const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
          const textNode = walker.nextNode();
          if (textNode) {
            const offset = Math.min(pendingSelection.startOffset - spanStart, textNode.textContent?.length || 0);
            range.setStart(textNode, offset);
            range.setEnd(textNode, offset);
            startRect = range.getBoundingClientRect();
          }
        }

        if (!endRect && pendingSelection.endOffset >= spanStart && pendingSelection.endOffset <= spanEnd) {
          const range = document.createRange();
          const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
          const textNode = walker.nextNode();
          if (textNode) {
            const offset = Math.min(pendingSelection.endOffset - spanStart, textNode.textContent?.length || 0);
            range.setStart(textNode, offset);
            range.setEnd(textNode, offset);
            endRect = range.getBoundingClientRect();
          }
        }

        fullText += spanText;
        if (startRect && endRect) break;
      }

      if (startRect && endRect) {
        // Update toolbar position
        const toolbarHeight = 50;
        const spaceAbove = startRect.top;
        const y = spaceAbove >= toolbarHeight
          ? startRect.top - toolbarHeight
          : endRect.bottom + 10;

        setToolbarPosition({
          x: Math.min(startRect.left, window.innerWidth - 300),
          y: y
        });

        // Update selection rectangles if adjusting
        if (adjustingSelection) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            setSelectionRects(Array.from(rects));
          }
        }
      }
    };

    // Listen to scroll events on the PDF container
    const pdfContainer = document.querySelector('.overflow-auto');
    if (pdfContainer) {
      pdfContainer.addEventListener('scroll', updatePositions);
      return () => pdfContainer.removeEventListener('scroll', updatePositions);
    }
  }, [pendingSelection, currentPage, adjustingSelection]);

  // Handle click outside to deselect and close toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside any of our UI elements
      if (target.closest('.unified-highlight-segment') ||
          target.closest('.highlight-context-menu') ||
          target.closest('.highlight-adjust-handle') ||
          target.closest('.selection-toolbar') ||
          target.closest('.selection-handle') ||
          target.closest('.fixed.z-\\[9999\\]')) {
        return;
      }

      // Close all dialogs
      setSelectedHighlight(null);
      setContextMenu({ show: false, x: 0, y: 0, highlight: null });
      setShowToolbar(false);
      setShowAskAIInput(false);
      setShowAddNoteInput(false);
      setShowColorPicker(false);
      setPendingSelection(null);
      setAiQuestion('');
      setNoteText('');

      // Clear selection outlines
      highlightGroupsRef.current.forEach(segments => {
        segments.forEach(segment => {
          segment.style.outline = 'none';
        });
      });
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle temporary annotation highlight
  useEffect(() => {
    if (!highlightAnnotation) {
      setAnnotationRects([]);
      return;
    }

    // Only process if this component is for the annotation's page
    if (highlightAnnotation.page !== currentPage) {
      setAnnotationRects([]);
      return;
    }

    // Add a small delay to ensure page is rendered
    setTimeout(() => {
      // Find the SPECIFIC page element for the annotation's page number
      const allPages = Array.from(document.querySelectorAll('[data-page-number]'));
      const pageElement = allPages.find(el => el.getAttribute('data-page-number') === String(highlightAnnotation.page));

      if (!pageElement) {
        return;
      }

      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        return;
      }

      // Only get spans from THIS page's text layer
      const spans = Array.from(textLayer.querySelectorAll('span')).filter(
        span => span.textContent && span.textContent.trim()
      ) as HTMLSpanElement[];

    // Build text map
    let fullText = '';
    const spanMap: { span: HTMLSpanElement; start: number; end: number }[] = [];

    spans.forEach(span => {
      const text = span.textContent || '';
      spanMap.push({
        span,
        start: fullText.length,
        end: fullText.length + text.length
      });
      fullText += text;
    });

    // Find spans that contain the annotation
    const range = document.createRange();
    const rects: DOMRect[] = [];

    spanMap.forEach(({ span, start, end }) => {
      const overlapStart = Math.max(start, highlightAnnotation.startOffset);
      const overlapEnd = Math.min(end, highlightAnnotation.endOffset);

      if (overlapStart < overlapEnd) {
        const spanText = span.textContent || '';
        const localStart = overlapStart - start;
        const localEnd = overlapEnd - start;

        try {
          const textNode = span.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            range.setStart(textNode, Math.min(localStart, spanText.length));
            range.setEnd(textNode, Math.min(localEnd, spanText.length));

            const rangeRects = Array.from(range.getClientRects());
            rects.push(...rangeRects);
          }
        } catch (e) {
          console.error('Error creating range:', e);
        }
      }
    });

      setAnnotationRects(rects);
    }, 800); // Wait 800ms for page to render and scroll to complete
  }, [highlightAnnotation, currentPage]);

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

  // Render selection handles for adjusting the pending selection
  const renderSelectionHandles = () => {
    if (!pendingSelection) return null;

    // Find the page element for current page
    const pageElements = document.querySelectorAll('[data-page-number]');
    let targetTextLayer: HTMLElement | null = null;

    for (const pageEl of Array.from(pageElements)) {
      const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '0');
      if (pageNum === currentPage) {
        targetTextLayer = pageEl.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        break;
      }
    }

    if (!targetTextLayer) return null;

    // Get all text spans
    const spans = Array.from(targetTextLayer.querySelectorAll('span')).filter(
      span => span.textContent && span.textContent.trim()
    );

    // Build text and find positions
    let fullText = '';
    let startRect: DOMRect | null = null;
    let endRect: DOMRect | null = null;

    for (const span of spans) {
      const spanStart = fullText.length;
      const spanText = span.textContent || '';
      const spanEnd = spanStart + spanText.length;

      // Check if this span contains the start or end of selection
      if (!startRect && pendingSelection.startOffset >= spanStart && pendingSelection.startOffset < spanEnd) {
        // Start is in this span
        const range = document.createRange();
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
        const textNode = walker.nextNode();
        if (textNode) {
          const offset = Math.min(pendingSelection.startOffset - spanStart, textNode.textContent?.length || 0);
          range.setStart(textNode, offset);
          range.setEnd(textNode, offset);
          startRect = range.getBoundingClientRect();
        }
      }

      if (!endRect && pendingSelection.endOffset >= spanStart && pendingSelection.endOffset <= spanEnd) {
        // End is in this span
        const range = document.createRange();
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
        const textNode = walker.nextNode();
        if (textNode) {
          const offset = Math.min(pendingSelection.endOffset - spanStart, textNode.textContent?.length || 0);
          range.setStart(textNode, offset);
          range.setEnd(textNode, offset);
          endRect = range.getBoundingClientRect();
        }
      }

      fullText += spanText;

      if (startRect && endRect) break;
    }

    if (!startRect || !endRect) return null;

    return createPortal(
      <>
        {/* Start handle */}
        <div
          className="selection-handle"
          style={{
            position: 'fixed',
            left: `${startRect.left - 8}px`,
            top: `${startRect.top}px`,
            width: '6px',
            height: `${startRect.height}px`,
            background: '#3B82F6',
            cursor: 'col-resize',
            zIndex: 9998,
            borderRadius: '3px',
            transition: 'background 0.2s, width 0.2s',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAdjustingSelection('start');
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#2563EB';
            (e.target as HTMLElement).style.width = '8px';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = '#3B82F6';
            (e.target as HTMLElement).style.width = '6px';
          }}
        />
        {/* End handle */}
        <div
          className="selection-handle"
          style={{
            position: 'fixed',
            left: `${endRect.left + 2}px`,
            top: `${endRect.top}px`,
            width: '6px',
            height: `${endRect.height}px`,
            background: '#3B82F6',
            cursor: 'col-resize',
            zIndex: 9998,
            borderRadius: '3px',
            transition: 'background 0.2s, width 0.2s',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAdjustingSelection('end');
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#2563EB';
            (e.target as HTMLElement).style.width = '8px';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = '#3B82F6';
            (e.target as HTMLElement).style.width = '6px';
          }}
        />
      </>,
      document.body
    );
  };

  // Only render toolbar if this is the page with the active selection
  const shouldRenderToolbar = showToolbar && pendingSelection && pendingSelection.page === currentPage;
  const shouldRenderInputs = pendingSelection && pendingSelection.page === currentPage;

  // Render toolbars and menus in portals to escape parent container constraints
  const toolbarPortal = shouldRenderToolbar ? createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="selection-toolbar fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          left: `${toolbarPosition.x}px`,
          top: `${toolbarPosition.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center">
          <button
            onClick={() => {
              setShowAskAIInput(true);
              setShowToolbar(false);
            }}
            className="px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-r border-gray-200"
            title="Ask AI about this text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Ask AI</span>
          </button>
          <button
            onClick={() => {
              setShowAddNoteInput(true);
              setShowToolbar(false);
            }}
            className="px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-r border-gray-200"
            title="Add note with this text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Add Note</span>
          </button>
          <button
            onClick={() => {
              setShowColorPicker(true);
              setShowToolbar(false);
            }}
            className="px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            title="Highlight this text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Highlight</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      {/* Selection overlay during dragging */}
      {adjustingSelection && selectionRects.length > 0 && shouldRenderInputs && createPortal(
        <>
          {selectionRects.map((rect, index) => (
            <div
              key={index}
              style={{
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                background: 'rgba(59, 130, 246, 0.3)',
                pointerEvents: 'none',
                zIndex: 9997,
              }}
            />
          ))}
        </>,
        document.body
      )}

      {/* Temporary annotation highlight */}
      {annotationRects.length > 0 && createPortal(
        <>
          {annotationRects.map((rect, index) => (
            <div
              key={index}
              style={{
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                background: 'rgba(255, 193, 7, 0.5)',
                pointerEvents: 'none',
                zIndex: 9996,
                animation: 'pulse 0.5s ease-in-out infinite alternate',
              }}
            />
          ))}
          <style>{`
            @keyframes pulse {
              from { opacity: 0.5; }
              to { opacity: 0.8; }
            }
          `}</style>
        </>,
        document.body
      )}

      {renderSelectionHandles()}
      {toolbarPortal}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.show && contextMenu.highlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="highlight-context-menu fixed z-[70] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: contextMenu.y
            }}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  if (onAskAI && contextMenu.highlight) {
                    onAskAI(contextMenu.highlight.text);
                  }
                  setContextMenu({ show: false, x: 0, y: 0, highlight: null });
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Ask AI</span>
              </button>
              <button
                onClick={() => {
                  if (onAddNote && contextMenu.highlight) {
                    onAddNote(contextMenu.highlight.text, contextMenu.highlight.page);
                  }
                  setContextMenu({ show: false, x: 0, y: 0, highlight: null });
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Add Note</span>
              </button>
            </div>
            <div className="border-t border-gray-100">
              <button
                onClick={() => {
                  if (contextMenu.highlight) {
                    onHighlightDelete(contextMenu.highlight.id);
                    setSelectedHighlight(null);
                  }
                  setContextMenu({ show: false, x: 0, y: 0, highlight: null });
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Picker (shown after clicking Highlight) */}
      <AnimatePresence>
        {showColorPicker && shouldRenderInputs && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="fixed z-[60] bg-white rounded-xl shadow-2xl p-5 border border-gray-200"
            style={{
              left: toolbarPosition.x,
              top: toolbarPosition.y,
            }}
          >
            <div className="text-sm font-semibold text-gray-800 mb-3">Choose highlight color</div>
            <div className="flex gap-2 mb-4">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:shadow-lg ${
                    selectedColor === color.value
                      ? 'border-gray-800 scale-110 shadow-md'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value.replace('0.4', '0.8') }}
                  title={color.name}
                />
              ))}
            </div>

            <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded-lg italic">
              "{pendingSelection.text.substring(0, 60)}{pendingSelection.text.length > 60 ? '...' : ''}"
            </div>

            <div className="flex gap-2">
              <button
                onClick={createHighlight}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
              >
                Create Highlight
              </button>
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowColorPicker(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask AI Input */}
      {showAskAIInput && shouldRenderInputs && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="fixed z-[9999] bg-white rounded-xl shadow-2xl p-5 border border-gray-200"
            style={{
              left: toolbarPosition.x,
              top: toolbarPosition.y,
              minWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-800 mb-3">Ask AI a question</div>

            <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded-lg italic">
              Selected: "{pendingSelection.text.substring(0, 80)}{pendingSelection.text.length > 80 ? '...' : ''}"
            </div>

            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="What would you like to know about this text?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aiQuestion.trim()) {
                  if (onAskAI) {
                    onAskAI(`${aiQuestion}: "${pendingSelection.text}"`);
                  }
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAskAIInput(false);
                  setAiQuestion('');
                }
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (aiQuestion.trim() && onAskAI) {
                    onAskAI(`${aiQuestion}: "${pendingSelection.text}"`);
                  }
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAskAIInput(false);
                  setAiQuestion('');
                }}
                disabled={!aiQuestion.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ask AI
              </button>
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAskAIInput(false);
                  setAiQuestion('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Add Note Input */}
      {showAddNoteInput && shouldRenderInputs && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="fixed z-[9999] bg-white rounded-xl shadow-2xl p-5 border border-gray-200"
            style={{
              left: toolbarPosition.x,
              top: toolbarPosition.y,
              minWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-800 mb-3">Add a note</div>

            <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded-lg italic">
              Selected: "{pendingSelection.text.substring(0, 80)}{pendingSelection.text.length > 80 ? '...' : ''}"
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note about this text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && noteText.trim()) {
                  if (onAddNote && pendingSelection) {
                    onAddNote({
                      text: noteText,
                      page: currentPage,
                      quote: pendingSelection.text,
                      startOffset: pendingSelection.startOffset,
                      endOffset: pendingSelection.endOffset
                    });
                  }
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAddNoteInput(false);
                  setNoteText('');
                }
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (noteText.trim() && onAddNote && pendingSelection) {
                    onAddNote({
                      text: noteText,
                      page: currentPage,
                      quote: pendingSelection.text,
                      startOffset: pendingSelection.startOffset,
                      endOffset: pendingSelection.endOffset
                    });
                  }
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAddNoteInput(false);
                  setNoteText('');
                }}
                disabled={!noteText.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setPendingSelection(null);
                  setShowAddNoteInput(false);
                  setNoteText('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        .unified-highlight-segment {
          transition: all 0.2s;
        }
        
        .unified-highlight-segment:hover {
          filter: brightness(0.9);
        }
        
        .highlight-adjust-handle {
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
        
        .highlight-context-menu {
          user-select: none;
        }
      `}</style>
    </>
  );
});

UnifiedTextHighlighter.displayName = 'UnifiedTextHighlighter';

export default UnifiedTextHighlighter;