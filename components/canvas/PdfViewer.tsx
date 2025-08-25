'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// The package override in package.json installed an older, compatible version
// of pdfjs-dist, which uses the `.js` extension for its worker file.
// This path now correctly points to that legacy worker.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PdfViewerProps {
  fileUrl: string;
}

export function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    if (pageNumber > 1) {
      changePage(-1);
    }
  }

  function nextPage() {
    if (numPages && pageNumber < numPages) {
      changePage(1);
    }
  }

  return (
    <div className="flex flex-col h-full items-center bg-gray-100 dark:bg-gray-800">
      <div className="flex-1 overflow-auto w-full flex justify-center p-4">
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading="Loading PDF...">
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>

      {/* --- MODIFICATION START --- */}
      {/* Redesigned the control bar for a more compact and mobile-friendly layout. */}
      <div className="flex items-center justify-between w-full p-2 bg-background border-t">
        {/* Page Navigation Group */}
        <div className="flex items-center gap-2">
          <Button onClick={previousPage} disabled={pageNumber <= 1} size="icon" variant="ghost">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium">
            {pageNumber} / {numPages || '--'}
          </span>
          <Button onClick={nextPage} disabled={!numPages || pageNumber >= numPages} size="icon" variant="ghost">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Zoom Controls Group */}
        <div className="flex items-center gap-2">
            <Button onClick={() => setScale(s => s / 1.2)} size="icon" variant="ghost">
                <ZoomOut className="h-5 w-5" />
            </Button>
            <Button onClick={() => setScale(s => s * 1.2)} size="icon" variant="ghost">
                <ZoomIn className="h-5 w-5" />
            </Button>
        </div>
      </div>
      {/* --- MODIFICATION END --- */}
    </div>
  );
}
