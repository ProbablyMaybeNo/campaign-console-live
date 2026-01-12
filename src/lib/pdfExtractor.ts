import * as pdfjsLib from "pdfjs-dist";

// Set worker source - using CDN for compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export interface PDFExtractionProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
  };
}

/**
 * Extract text from a PDF file entirely in the browser
 * This avoids sending large files to the server
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFExtractionProgress) => void
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  }).promise;

  const totalPages = pdf.numPages;
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Extract text items and join with spaces
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    
    textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
    
    if (onProgress) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        percentage: Math.round((pageNum / totalPages) * 100),
      });
    }
  }

  // Get metadata
  let metadata: PDFExtractionResult["metadata"];
  try {
    const meta = await pdf.getMetadata();
    metadata = {
      title: (meta.info as any)?.Title,
      author: (meta.info as any)?.Author,
    };
  } catch {
    // Metadata extraction is optional
  }

  return {
    text: textParts.join("\n\n"),
    pageCount: totalPages,
    metadata,
  };
}

/**
 * Estimate the token count of text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit while preserving structure
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) return text;
  
  // Truncate and add indicator
  return text.substring(0, estimatedChars - 50) + "\n\n[Content truncated due to length...]";
}
