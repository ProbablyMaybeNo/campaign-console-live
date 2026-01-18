// PDF text extraction utility using pdf.js from CDN

interface PDFPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

interface ExtractionResult {
  pages: PDFPage[];
  totalPages: number;
  totalChars: number;
}

// Dynamically load pdf.js from CDN
async function loadPdfJs(): Promise<any> {
  // Check if already loaded
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
    script.type = "module";
    
    // For module script, we need a different approach
    const moduleScript = document.createElement("script");
    moduleScript.type = "module";
    moduleScript.textContent = `
      import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
      window.pdfjsLib = pdfjsLib;
      window.dispatchEvent(new Event('pdfjs-loaded'));
    `;
    
    const handleLoad = () => {
      window.removeEventListener("pdfjs-loaded", handleLoad);
      resolve((window as any).pdfjsLib);
    };
    
    window.addEventListener("pdfjs-loaded", handleLoad);
    document.head.appendChild(moduleScript);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener("pdfjs-loaded", handleLoad);
      reject(new Error("PDF.js failed to load"));
    }, 10000);
  });
}

// Alternative: Load as regular script for broader compatibility
async function loadPdfJsLegacy(): Promise<any> {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      } else {
        reject(new Error("PDF.js failed to initialize"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js script"));
    document.head.appendChild(script);
  });
}

/**
 * Extract text from a PDF file
 */
export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<ExtractionResult> {
  // Load pdf.js dynamically
  const pdfjsLib = await loadPdfJsLegacy();
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const totalPages = pdf.numPages;
  const pages: PDFPage[] = [];
  let totalChars = 0;
  
  // Extract text from each page
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Combine text items
    let pageText = "";
    let lastY = -1;
    
    for (const item of textContent.items) {
      if ("str" in item) {
        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5];
        
        // Add newline if Y position changed significantly (new line)
        if (lastY !== -1 && Math.abs(y - lastY) > 5) {
          pageText += "\n";
        } else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        
        pageText += textItem.str;
        lastY = y;
      }
    }
    
    // Clean up the text
    const cleanedText = cleanPdfText(pageText);
    
    pages.push({
      pageNumber: i,
      text: cleanedText,
      charCount: cleanedText.length,
    });
    
    totalChars += cleanedText.length;
    
    if (onProgress) {
      onProgress(i, totalPages);
    }
  }
  
  return {
    pages,
    totalPages,
    totalChars,
  };
}

/**
 * Clean up extracted PDF text
 */
function cleanPdfText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/[ \t]+/g, " ")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Fix hyphenation at line breaks
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Trim lines
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    // Trim overall
    .trim();
}

/**
 * Detect and remove repeated headers/footers
 */
export function removeHeadersFooters(pages: PDFPage[]): PDFPage[] {
  if (pages.length < 3) return pages;
  
  // Find repeated first/last lines across pages
  const firstLines = pages.map(p => p.text.split("\n")[0]?.trim()).filter(Boolean);
  const lastLines = pages.map(p => {
    const lines = p.text.split("\n");
    return lines[lines.length - 1]?.trim();
  }).filter(Boolean);
  
  // Count occurrences
  const countOccurrences = (arr: string[]) => {
    const counts = new Map<string, number>();
    arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
    return counts;
  };
  
  const firstCounts = countOccurrences(firstLines);
  const lastCounts = countOccurrences(lastLines);
  
  // Find headers/footers that appear on more than 50% of pages
  const threshold = pages.length * 0.5;
  const repeatedHeaders = new Set<string>();
  const repeatedFooters = new Set<string>();
  
  firstCounts.forEach((count, line) => {
    if (count > threshold && line.length < 100) {
      repeatedHeaders.add(line);
    }
  });
  
  lastCounts.forEach((count, line) => {
    if (count > threshold && line.length < 100) {
      repeatedFooters.add(line);
    }
  });
  
  // Remove repeated headers/footers
  return pages.map(page => {
    const lines = page.text.split("\n");
    
    // Remove header
    if (lines.length > 0 && repeatedHeaders.has(lines[0]?.trim())) {
      lines.shift();
    }
    
    // Remove footer
    if (lines.length > 0 && repeatedFooters.has(lines[lines.length - 1]?.trim())) {
      lines.pop();
    }
    
    const newText = lines.join("\n").trim();
    return {
      ...page,
      text: newText,
      charCount: newText.length,
    };
  });
}