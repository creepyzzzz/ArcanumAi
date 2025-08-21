import { FileRef } from '@/types';

export const ACCEPTED_FILE_TYPES = {
  images: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  text: [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/yaml',
    'application/yaml',
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/python',
    'text/java',
    'text/c',
    'text/cpp',
    'text/html',
    'text/css'
  ],
  documents: ['application/pdf'] // Future: 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_FILE_TYPES.images,
  ...ACCEPTED_FILE_TYPES.text,
  ...ACCEPTED_FILE_TYPES.documents
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_FILE_COUNT = 10;

export function getFileCategory(type: string): 'image' | 'text' | 'document' | 'unknown' {
  if (ACCEPTED_FILE_TYPES.images.includes(type)) return 'image';
  if (ACCEPTED_FILE_TYPES.text.includes(type)) return 'text';
  if (ACCEPTED_FILE_TYPES.documents.includes(type)) return 'document';
  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Lazy load PDF.js
let pdfjsLib: any = null;
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    // Dynamically import pdfjs-dist
    const pdfjs = await import('pdfjs-dist');
    // Specify the worker source
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    return null;
  }
}

/**
 * NEW: Extracts text content from a PDF file.
 * @param file The PDF file.
 * @returns A promise that resolves to the extracted text.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    return 'PDF processing is currently unavailable.';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

/**
 * NEW: Processes an uploaded file to extract its content for the AI model.
 * This is the main function to handle different file types.
 * @param file The file to process.
 * @returns A promise that resolves to a partial FileRef object
 * containing either `extractedText` or `dataUrl`.
 */
export async function processFile(file: File): Promise<Partial<Pick<FileRef, 'extractedText' | 'dataUrl'>>> {
  const category = getFileCategory(file.type);

  switch (category) {
    case 'image':
      try {
        const dataUrl = await fileToBase64(file);
        return { dataUrl };
      } catch (error) {
        console.error('Error converting image to base64:', error);
        return {};
      }

    case 'text':
      try {
        const extractedText = await fileToText(file);
        return { extractedText };
      } catch (error) {
        console.error('Error reading text file:', error);
        return {};
      }

    case 'document':
      if (file.type === 'application/pdf') {
        try {
          const extractedText = await extractPdfText(file);
          return { extractedText };
        } catch (error) {
          console.error('Error extracting text from PDF:', error);
          return { extractedText: 'Could not extract text from this PDF.' };
        }
      }
      // Placeholder for future DOCX support
      console.warn(`Unsupported document type: ${file.type}`);
      return { extractedText: `File type ${file.type} is not fully supported for text extraction yet.` };

    default:
      console.warn(`Unsupported file category for file: ${file.name}`);
      return {};
  }
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not supported` };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit` };
  }
  
  return { valid: true };
}
