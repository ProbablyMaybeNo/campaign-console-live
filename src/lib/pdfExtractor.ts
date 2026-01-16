// PDF.js loaded dynamically from CDN to avoid large package install
let pdfjsLib: any = null;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  fileName: string;
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  
  // Check if already loaded globally
  if ((window as any).pdfjsLib) {
    pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return pdfjsLib;
  }
  
  // Dynamically load PDF.js from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  
  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
  
  // Access the global pdfjsLib
  pdfjsLib = (window as any).pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  return pdfjsLib;
}

/**
 * Extract text content from a PDF file
 * @param file The PDF file to extract from
 * @param onProgress Optional callback for progress updates
 * @returns Promise with extracted text and metadata
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<PDFExtractionResult> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const pageCount = pdf.numPages;
  const textParts: string[] = [];
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Extract text items and join them
    const pageText = textContent.items
      .map((item: any) => {
        if ("str" in item && typeof item.str === "string") {
          return item.str;
        }
        return "";
      })
      .join(" ");
    
    textParts.push(pageText);
    
    // Report progress
    if (onProgress) {
      onProgress({
        currentPage: i,
        totalPages: pageCount,
        percentage: Math.round((i / pageCount) * 100),
      });
    }
  }
  
  // Join all pages with double newlines
  const fullText = textParts.join("\n\n");
  
  return {
    text: fullText,
    pageCount,
    fileName: file.name,
  };
}

/**
 * Validate if a file is a valid PDF
 */
export function isValidPDF(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Get a preview of the extracted text (first N characters)
 */
export function getTextPreview(text: string, maxLength: number = 2000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
