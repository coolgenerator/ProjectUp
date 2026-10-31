import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import UnifiedTextHighlighter from './UnifiedTextHighlighter';
import CropOverlay from './CropOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;

interface Highlight {
  id: string;
  page: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  note?: string;
}

interface PDFViewerProps {
  fileUrl: string;
  scale: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onPageChange: (page: number) => void;
  onTextSelection?: () => void;
  highlights?: Highlight[];
  onHighlightCreate?: (highlight: Omit<Highlight, 'id'>) => void;
  onHighlightUpdate?: (id: string, startOffset: number, endOffset: number) => void;
  onHighlightDelete?: (id: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  onAskAI?: (text: string) => void;
  onAddNote?: (data: { text: string; page: number; quote: string; startOffset: number; endOffset: number }) => void;
  scrollToPage?: number;
  highlightAnnotation?: {
    page: number;
    startOffset: number;
    endOffset: number;
  } | null;
  isCropMode?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  scale,
  onLoadSuccess,
  onPageChange,
  onTextSelection,
  highlights = [],
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick,
  onAskAI,
  onAddNote,
  scrollToPage,
  highlightAnnotation,
  isCropMode = false,
}) => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const token = useSelector((state: RootState) => state.auth.token);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [renderedPagesCount, setRenderedPagesCount] = useState(3); // Start with 3 pages loaded
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpToPageInput, setJumpToPageInput] = useState('');

  const handleLoadSuccess = (data: { numPages: number }) => {
    setLoadError(null);
    setNumPages(data.numPages);
    onLoadSuccess(data);
    pageRefs.current = Array(data.numPages).fill(null);
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !numPages) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Load more pages when approaching bottom (within 500px)
    if (scrollHeight - scrollTop < clientHeight + 500) {
      if (renderedPagesCount < numPages) {
        // Load 3 pages at a time for smoother scrolling
        setRenderedPagesCount(prev => Math.min(prev + 3, numPages));
      }
    }
  }, [numPages, renderedPagesCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '0', 10);
            if (pageNum) {
              setCurrentPage(pageNum); // Update current page state
              onPageChange(pageNum);
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.5 }
    );

    pageRefs.current.forEach(ref => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      pageRefs.current.forEach(ref => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [renderedPagesCount, onPageChange]);

  // Scroll to page when scrollToPage prop changes
  useEffect(() => {
    if (scrollToPage && containerRef.current) {
      const pageIndex = scrollToPage - 1;
      const pageElement = pageRefs.current[pageIndex];

      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (scrollToPage > renderedPagesCount) {
        // If page not rendered yet, render up to that page
        setRenderedPagesCount(scrollToPage);
        // Scroll will happen after page is rendered
        setTimeout(() => {
          const element = pageRefs.current[pageIndex];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [scrollToPage, renderedPagesCount]);


  const fileOptions = useMemo(() => {
    return token ? {
      url: fileUrl,
      httpHeaders: {
        'Authorization': `Bearer ${token}`
      }
    } : fileUrl;
  }, [fileUrl, token]);

  // Navigation functions
  const goToPage = useCallback((pageNumber: number) => {
    if (!numPages || pageNumber < 1 || pageNumber > numPages) return;

    // Ensure the page is rendered
    if (pageNumber > renderedPagesCount) {
      setRenderedPagesCount(pageNumber);
    }

    // Scroll to the page
    setTimeout(() => {
      const pageIndex = pageNumber - 1;
      const pageElement = pageRefs.current[pageIndex];
      if (pageElement && containerRef.current) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, pageNumber > renderedPagesCount ? 200 : 0);
  }, [numPages, renderedPagesCount]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (numPages && currentPage < numPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, numPages, goToPage]);

  const handleJumpToPage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPageInput, 10);
    if (!isNaN(pageNum) && numPages && pageNum >= 1 && pageNum <= numPages) {
      goToPage(pageNum);
      setJumpToPageInput('');
    }
  }, [jumpToPageInput, numPages, goToPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousPage, goToNextPage]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold">Unable to Display PDF</p>
        </div>
        <p className="text-gray-600 mb-4">{loadError}</p>
        <div className="space-y-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open PDF in New Tab
          </a>
          <p className="text-sm text-gray-500">
            Or try downloading the file and opening it locally
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center p-4 relative"
        onMouseUp={onTextSelection}
        onScroll={handleScroll}
      >
        <Document
          file={fileOptions}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={(err) => setLoadError(err.message)}
          loading={
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading PDF document...</p>
            </div>
          }
          noData={
            <div className="text-gray-500 text-center p-8">
              <p>No PDF data available</p>
            </div>
          }
        >
          {Array.from(new Array(renderedPagesCount), (el, index) => (
            <div key={`page_${index + 1}`} ref={el => pageRefs.current[index] = el} data-page-number={index + 1} className="relative">
              <Page
                pageNumber={index + 1}
                scale={scale}
                renderAnnotationLayer={true}
                renderTextLayer={true}
                loading={
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }
              />
              {onHighlightCreate && onHighlightUpdate && onHighlightDelete && (
                <UnifiedTextHighlighter
                  currentPage={index + 1}
                  highlights={highlights}
                  onHighlightCreate={onHighlightCreate}
                  onHighlightUpdate={onHighlightUpdate}
                  onHighlightDelete={onHighlightDelete}
                  onHighlightClick={onHighlightClick}
                  onAskAI={onAskAI}
                  onAddNote={onAddNote}
                  highlightAnnotation={highlightAnnotation}
                />
              )}
              <CropOverlay
                currentPage={index + 1}
                isCropMode={isCropMode}
                onAskAI={onAskAI}
                onAddNote={onAddNote}
              />
            </div>
          ))}
        </Document>

        {/* Page Navigation Controls - Floating at bottom */}
        {numPages && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white shadow-lg rounded-full border border-gray-200 px-4 py-2 flex items-center gap-3">
              {/* Previous Page Button */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page (Arrow Left / PageUp)"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page Info */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Page {currentPage} of {numPages}
                </span>

                {/* Jump to Page */}
                <form onSubmit={handleJumpToPage} className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max={numPages}
                    value={jumpToPageInput}
                    onChange={(e) => setJumpToPageInput(e.target.value)}
                    placeholder="Go to..."
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Go
                  </button>
                </form>
              </div>

              {/* Next Page Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === numPages}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page (Arrow Right / PageDown)"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
