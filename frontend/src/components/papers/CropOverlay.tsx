import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface CropOverlayProps {
  currentPage: number;
  isCropMode: boolean;
  onCropComplete?: (area: CropArea, text: string) => void;
  onAskAI?: (text: string, imageUrl?: string) => void;
  onAddNote?: (data: { text: string; page: number; quote: string; startOffset: number; endOffset: number; imageUrl?: string }) => void;
  onHighlight?: (area: CropArea, color: string) => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move' | null;

const CropOverlay: React.FC<CropOverlayProps> = ({
  currentPage,
  isCropMode,
  onCropComplete,
  onAskAI,
  onAddNote,
  onHighlight
}) => {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [pendingCropArea, setPendingCropArea] = useState<CropArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [showActions, setShowActions] = useState(false);
  const [showAskAIInput, setShowAskAIInput] = useState(false);
  const [showAddNoteInput, setShowAddNoteInput] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [noteText, setNoteText] = useState('');
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update toolbar position on scroll
  useEffect(() => {
    if (!pendingCropArea || !overlayRef.current) return;
    if (!showActions && !showAskAIInput && !showAddNoteInput) return;

    const updatePosition = () => {
      if (!overlayRef.current || !pendingCropArea) return;

      const overlayRect = overlayRef.current.getBoundingClientRect();
      const toolbarHeight = 50;
      const spaceAbove = pendingCropArea.y;

      // Position above if there's space, otherwise below
      const y = spaceAbove >= toolbarHeight
        ? overlayRect.top + pendingCropArea.y - toolbarHeight
        : overlayRect.top + pendingCropArea.y + pendingCropArea.height + 10;

      const position = {
        x: Math.min(overlayRect.left + pendingCropArea.x, window.innerWidth - 300),
        y: y
      };
      setToolbarPosition(position);
    };

    // Find the scrollable PDF container
    const pdfContainer = overlayRef.current.closest('.overflow-auto');
    if (!pdfContainer) return;

    pdfContainer.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      pdfContainer.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [pendingCropArea, showActions, showAskAIInput, showAddNoteInput]);

  // Extract text from the cropped area
  const extractTextFromCrop = useCallback((area: CropArea): string => {
    try {
      const textLayer = document.querySelector(`[data-page-number="${area.page}"] .react-pdf__Page__textContent`);
      if (!textLayer) return '';

      const spans = textLayer.querySelectorAll('span');
      let extractedText = '';

      spans.forEach((span) => {
        const rect = span.getBoundingClientRect();
        const pageElement = span.closest('.react-pdf__Page');
        if (!pageElement) return;

        const pageRect = pageElement.getBoundingClientRect();
        const relativeX = rect.left - pageRect.left;
        const relativeY = rect.top - pageRect.top;

        // Check if span is within crop area
        if (
          relativeX >= area.x &&
          relativeX + rect.width <= area.x + area.width &&
          relativeY >= area.y &&
          relativeY + rect.height <= area.y + area.height
        ) {
          extractedText += span.textContent + ' ';
        }
      });

      return extractedText.trim();
    } catch (error) {
      console.error('Error extracting text from crop:', error);
      return '';
    }
  }, []);

  // Capture image from cropped area
  const captureImageFromCrop = useCallback(async (area: CropArea): Promise<Blob | null> => {
    try {
      const pageElement = document.querySelector(`[data-page-number="${area.page}"]`);
      if (!pageElement) return null;

      const canvas = pageElement.querySelector('canvas');
      if (!canvas) return null;

      // Create a temporary canvas for the cropped region
      const cropCanvas = document.createElement('canvas');
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return null;

      // Get the canvas bounding rect and page rect
      const canvasRect = canvas.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();

      // Calculate the scale factor between display size and actual canvas size
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;

      // Convert crop area coordinates (relative to page) to canvas coordinates
      const cropX = area.x * scaleX;
      const cropY = area.y * scaleY;
      const cropWidth = area.width * scaleX;
      const cropHeight = area.height * scaleY;

      // Set crop canvas dimensions
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;

      // Draw the cropped region
      ctx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // Convert to blob
      return new Promise((resolve) => {
        cropCanvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (error) {
      console.error('Error capturing image from crop:', error);
      return null;
    }
  }, []);

  // Upload cropped image to S3
  const uploadCroppedImage = useCallback(async (blob: Blob, page: number): Promise<string | null> => {
    try {
      const formData = new FormData();
      const fileName = `crop-page${page}-${Date.now()}.png`;
      formData.append('file', blob, fileName);
      formData.append('title', `Cropped Image - Page ${page}`);
      formData.append('description', `Cropped region from PDF page ${page}`);

      console.log('[Upload Cropped Image] Uploading image for page', page);

      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/resources/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error('[Upload Cropped Image] Failed to upload:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      console.log('[Upload Cropped Image] Upload response:', result);
      console.log('[Upload Cropped Image] Extracted URL:', result.data?.url);

      return result.data?.url || result.data?.file_url || null;
    } catch (error) {
      console.error('[Upload Cropped Image] Error:', error);
      return null;
    }
  }, []);

  // Handle mouse down to start drawing or resizing
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropMode || !overlayRef.current) return;

    // Don't start new crop if showing input dialogs
    if (showAskAIInput || showAddNoteInput) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing crop area handles
    if (cropArea) {
      const handle = getHandleAtPoint(x, y, cropArea);
      if (handle) {
        setActiveHandle(handle);
        setIsDrawing(true);
        return;
      }
    }

    // Start new crop
    setShowActions(false);
    setStartPoint({ x, y });
    setCropArea({ x, y, width: 0, height: 0, page: currentPage });
    setIsDrawing(true);
  }, [isCropMode, cropArea, currentPage, showAskAIInput, showAddNoteInput]);

  // Handle mouse move for drawing/resizing
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeHandle && cropArea) {
      // Resize existing crop
      const newArea = resizeCropArea(cropArea, activeHandle, x, y, startPoint!);
      setCropArea(newArea);
    } else if (startPoint) {
      // Draw new crop
      const width = x - startPoint.x;
      const height = y - startPoint.y;
      const newX = width < 0 ? x : startPoint.x;
      const newY = height < 0 ? y : startPoint.y;

      setCropArea({
        x: newX,
        y: newY,
        width: Math.abs(width),
        height: Math.abs(height),
        page: currentPage
      });
    }
  }, [isDrawing, activeHandle, cropArea, startPoint, currentPage]);

  // Handle mouse up to finish drawing/resizing
  const handleMouseUp = useCallback(() => {
    if (isDrawing && cropArea && cropArea.width > 10 && cropArea.height > 10 && overlayRef.current) {
      setPendingCropArea(cropArea);
      setShowActions(true);
      const text = extractTextFromCrop(cropArea);
      if (onCropComplete) {
        onCropComplete(cropArea, text);
      }

      // Calculate toolbar position
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const toolbarHeight = 50;
      const spaceAbove = cropArea.y;

      // Position above if there's space, otherwise below
      const y = spaceAbove >= toolbarHeight
        ? overlayRect.top + cropArea.y - toolbarHeight
        : overlayRect.top + cropArea.y + cropArea.height + 10;

      const position = {
        x: Math.min(overlayRect.left + cropArea.x, window.innerWidth - 300),
        y: y
      };
      setToolbarPosition(position);
    }
    setIsDrawing(false);
    setStartPoint(null);
    setActiveHandle(null);
  }, [isDrawing, cropArea, extractTextFromCrop, onCropComplete]);

  // Clear crop when crop mode is disabled
  useEffect(() => {
    if (!isCropMode) {
      setCropArea(null);
      setShowActions(false);
      setShowAskAIInput(false);
      setShowAddNoteInput(false);
      setAiQuestion('');
      setNoteText('');
    }
  }, [isCropMode]);

  // Get which handle is at a point
  const getHandleAtPoint = (x: number, y: number, area: CropArea): ResizeHandle => {
    const handleSize = 10;
    const { x: ax, y: ay, width, height } = area;

    // Corner handles
    if (Math.abs(x - ax) < handleSize && Math.abs(y - ay) < handleSize) return 'nw';
    if (Math.abs(x - (ax + width)) < handleSize && Math.abs(y - ay) < handleSize) return 'ne';
    if (Math.abs(x - ax) < handleSize && Math.abs(y - (ay + height)) < handleSize) return 'sw';
    if (Math.abs(x - (ax + width)) < handleSize && Math.abs(y - (ay + height)) < handleSize) return 'se';

    // Edge handles
    if (Math.abs(y - ay) < handleSize && x > ax && x < ax + width) return 'n';
    if (Math.abs(y - (ay + height)) < handleSize && x > ax && x < ax + width) return 's';
    if (Math.abs(x - ax) < handleSize && y > ay && y < ay + height) return 'w';
    if (Math.abs(x - (ax + width)) < handleSize && y > ay && y < ay + height) return 'e';

    // Move handle (inside area)
    if (x > ax && x < ax + width && y > ay && y < ay + height) return 'move';

    return null;
  };

  // Resize crop area based on handle
  const resizeCropArea = (
    area: CropArea,
    handle: ResizeHandle,
    x: number,
    y: number,
    start: { x: number; y: number }
  ): CropArea => {
    const { x: ax, y: ay, width, height } = area;
    let newX = ax, newY = ay, newWidth = width, newHeight = height;

    switch (handle) {
      case 'nw':
        newX = x;
        newY = y;
        newWidth = width + (ax - x);
        newHeight = height + (ay - y);
        break;
      case 'ne':
        newY = y;
        newWidth = x - ax;
        newHeight = height + (ay - y);
        break;
      case 'sw':
        newX = x;
        newWidth = width + (ax - x);
        newHeight = y - ay;
        break;
      case 'se':
        newWidth = x - ax;
        newHeight = y - ay;
        break;
      case 'n':
        newY = y;
        newHeight = height + (ay - y);
        break;
      case 's':
        newHeight = y - ay;
        break;
      case 'w':
        newX = x;
        newWidth = width + (ax - x);
        break;
      case 'e':
        newWidth = x - ax;
        break;
      case 'move':
        const dx = x - start.x;
        const dy = y - start.y;
        newX = ax + dx;
        newY = ay + dy;
        break;
    }

    // Ensure minimum size
    if (newWidth < 20) newWidth = 20;
    if (newHeight < 20) newHeight = 20;

    return { x: newX, y: newY, width: newWidth, height: newHeight, page: area.page };
  };

  if (!isCropMode) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto z-50"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isCropMode ? 'crosshair' : 'default' }}
    >
      {/* Crop rectangle - show cropArea or pendingCropArea */}
      {((cropArea && cropArea.width > 0 && cropArea.height > 0) || (pendingCropArea && !cropArea)) && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10"
          style={{
            left: (cropArea || pendingCropArea)!.x,
            top: (cropArea || pendingCropArea)!.y,
            width: (cropArea || pendingCropArea)!.width,
            height: (cropArea || pendingCropArea)!.height,
            pointerEvents: 'none'
          }}
        >
          {/* Resize handles */}
          {!isDrawing && (
            <>
              {/* Corner handles */}
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -top-1.5 -left-1.5 cursor-nw-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -top-1.5 -right-1.5 cursor-ne-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize pointer-events-auto" />

              {/* Edge handles */}
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full -bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full top-1/2 -translate-y-1/2 -left-1.5 cursor-w-resize pointer-events-auto" />
              <div className="absolute w-3 h-3 bg-blue-600 rounded-full top-1/2 -translate-y-1/2 -right-1.5 cursor-e-resize pointer-events-auto" />
            </>
          )}

        </div>
      )}

      {/* Toolbar Portal - consistent with highlight feature */}
      {showActions && !isDrawing && (cropArea || pendingCropArea) && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            key="crop-toolbar"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
            style={{
              left: `${toolbarPosition.x}px`,
              top: `${toolbarPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center">
              {onAskAI && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowAskAIInput(true);
                    setShowActions(false);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-r border-gray-200"
                  title="Ask AI about this crop"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Ask AI</span>
                </button>
              )}
              {onAddNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowAddNoteInput(true);
                    setShowActions(false);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  title="Add note with this crop"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Add Note</span>
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Ask AI Input Dialog */}
      {createPortal(
        <AnimatePresence mode="wait">
          {showAskAIInput && pendingCropArea && (
            <motion.div
              key="ask-ai-dialog"
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
              Cropped region from page {pendingCropArea.page}
            </div>

            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="What would you like to know about this image?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && aiQuestion.trim()) {
                  const imageBlob = await captureImageFromCrop(pendingCropArea);
                  const text = extractTextFromCrop(pendingCropArea);
                  let imageUrl: string | null = null;

                  if (imageBlob) {
                    imageUrl = await uploadCroppedImage(imageBlob, pendingCropArea.page);
                  }

                  if (onAskAI) {
                    onAskAI(`${aiQuestion}${text ? `\n\nExtracted text: ${text}` : ''}`, imageUrl || undefined);
                  }
                  setCropArea(null);
                  setPendingCropArea(null);
                  setShowAskAIInput(false);
                  setAiQuestion('');
                }
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (aiQuestion.trim()) {
                    const imageBlob = await captureImageFromCrop(pendingCropArea);
                    const text = extractTextFromCrop(pendingCropArea);
                    let imageUrl: string | null = null;

                    if (imageBlob) {
                      imageUrl = await uploadCroppedImage(imageBlob, pendingCropArea.page);
                    }

                    if (onAskAI) {
                      onAskAI(`${aiQuestion}${text ? `\n\nExtracted text: ${text}` : ''}`, imageUrl || undefined);
                    }
                  }
                  setCropArea(null);
                  setPendingCropArea(null);
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
                  setCropArea(null);
                  setPendingCropArea(null);
                  setShowAskAIInput(false);
                  setAiQuestion('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add Note Input Dialog */}
      {createPortal(
        <AnimatePresence mode="wait">
          {showAddNoteInput && pendingCropArea && (
            <motion.div
              key="add-note-dialog"
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
              Cropped region from page {pendingCropArea.page}
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note about this image..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
              rows={3}
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && e.ctrlKey && noteText.trim()) {
                  const imageBlob = await captureImageFromCrop(pendingCropArea);
                  const text = extractTextFromCrop(pendingCropArea);
                  let imageUrl: string | null = null;

                  if (imageBlob) {
                    imageUrl = await uploadCroppedImage(imageBlob, pendingCropArea.page);
                  }

                  if (onAddNote) {
                    onAddNote({
                      text: noteText,
                      page: pendingCropArea.page,
                      quote: text,
                      startOffset: 0,
                      endOffset: 0,
                      imageUrl: imageUrl || undefined
                    });
                  }
                  setCropArea(null);
                  setPendingCropArea(null);
                  setShowAddNoteInput(false);
                  setNoteText('');
                }
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (noteText.trim()) {
                    const imageBlob = await captureImageFromCrop(pendingCropArea);
                    const text = extractTextFromCrop(pendingCropArea);
                    let imageUrl: string | null = null;

                    if (imageBlob) {
                      imageUrl = await uploadCroppedImage(imageBlob, pendingCropArea.page);
                    }

                    if (onAddNote) {
                      onAddNote({
                        text: noteText,
                        page: pendingCropArea.page,
                        quote: text,
                        startOffset: 0,
                        endOffset: 0,
                        imageUrl: imageUrl || undefined
                      });
                    }
                  }
                  setCropArea(null);
                  setPendingCropArea(null);
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
                  setCropArea(null);
                  setPendingCropArea(null);
                  setShowAddNoteInput(false);
                  setNoteText('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default CropOverlay;
