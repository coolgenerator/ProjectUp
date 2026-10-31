import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { RootState } from '../store/store';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
    url: string;
    onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, onClose }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const token = useSelector((state: RootState) => state.auth.token);

    // Memoize file prop to prevent unnecessary reloads
    const file = useMemo(() => ({
        url,
        httpHeaders: token ? {
            'Authorization': `Bearer ${token}`
        } : {},
        withCredentials: false,
    }), [url, token]);

    // Memoize options to prevent unnecessary reloads
    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }), []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('Error loading PDF:', error);
        setLoading(false);
    };

    const goToPrevPage = () => {
        setPageNumber((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
        setPageNumber((prev) => Math.min(numPages, prev + 1));
    };

    const zoomIn = () => {
        setScale((prev) => Math.min(2.5, prev + 0.1));
    };

    const zoomOut = () => {
        setScale((prev) => Math.max(0.5, prev - 0.1));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">PDF Viewer</h2>
                    {numPages > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <span>
                                Page {pageNumber} of {numPages}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Download Button */}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
                        title="Open in new tab"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                    </a>
                    {/* Zoom Controls */}
                    <button
                        onClick={zoomOut}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        title="Zoom Out"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>
                    <span className="text-sm">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={zoomIn}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        title="Zoom In"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors ml-4"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-800 flex flex-col items-center p-8">
                {loading && (
                    <div className="text-white text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>Loading PDF...</p>
                    </div>
                )}
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    options={options}
                    className="shadow-2xl"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                </Document>
            </div>

            {/* Footer Navigation */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-center gap-4">
                <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className={`px-4 py-2 rounded transition-colors ${
                        pageNumber <= 1
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                    Previous
                </button>

                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={1}
                        max={numPages}
                        value={pageNumber}
                        onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= numPages) {
                                setPageNumber(page);
                            }
                        }}
                        className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-center"
                    />
                    <span>/ {numPages}</span>
                </div>

                <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className={`px-4 py-2 rounded transition-colors ${
                        pageNumber >= numPages
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default PDFViewer;
