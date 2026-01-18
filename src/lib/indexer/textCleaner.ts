// ===========================================
// Text Cleaning Utilities for Rules Indexing
// ===========================================

/**
 * Clean raw text by removing common PDF artifacts
 */
export function cleanText(text: string): string {
  let cleaned = text;

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove multiple consecutive newlines (keep max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove page numbers (common patterns)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gim, '');
  cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');

  // Remove common header/footer patterns
  cleaned = cleaned.replace(/^.*©.*$/gm, '');
  cleaned = cleaned.replace(/^.*All Rights Reserved.*$/gim, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/^ +/gm, '');
  cleaned = cleaned.replace(/ +$/gm, '');

  // Remove null characters and other control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned.trim();
}

/**
 * Detect and remove repeated headers/footers from pages
 */
export function removeRepeatedHeadersFooters(pages: string[]): string[] {
  if (pages.length < 3) return pages;

  // Find lines that appear in most pages (likely headers/footers)
  const lineFrequency = new Map<string, number>();
  
  pages.forEach(page => {
    const lines = page.split('\n').slice(0, 5).concat(page.split('\n').slice(-5));
    const uniqueLines = new Set(lines.filter(l => l.trim().length > 0));
    uniqueLines.forEach(line => {
      const normalized = line.trim().toLowerCase();
      lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
    });
  });

  // Lines appearing in >60% of pages are likely headers/footers
  const threshold = pages.length * 0.6;
  const repeatedLines = new Set<string>();
  
  lineFrequency.forEach((count, line) => {
    if (count >= threshold && line.length > 0 && line.length < 100) {
      repeatedLines.add(line);
    }
  });

  // Remove repeated lines from each page
  return pages.map(page => {
    const lines = page.split('\n');
    const filteredLines = lines.filter(line => {
      const normalized = line.trim().toLowerCase();
      return !repeatedLines.has(normalized);
    });
    return filteredLines.join('\n').trim();
  });
}

/**
 * Normalize text for comparison and deduplication
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\\w\\s]/g, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

/**
 * Extract potential section titles from text
 */
export function extractSectionTitles(text: string): string[] {
  const titles: string[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;

    // Patterns that indicate a section title:
    // 1. All caps line (not too long)
    if (line === line.toUpperCase() && line.length > 3 && line.length < 60 && /[A-Z]/.test(line)) {
      titles.push(line);
      continue;
    }

    // 2. Numbered sections (1. Title, 1.1 Title, etc.)
    const numberedMatch = line.match(/^(\d+\.?\d*\.?\d*)\s+([A-Z][A-Za-z\s]+)$/);
    if (numberedMatch) {
      titles.push(line);
      continue;
    }

    // 3. Lines followed by empty line and then body text
    const nextLine = lines[i + 1]?.trim();
    const lineAfter = lines[i + 2]?.trim();
    if (
      line.length < 60 &&
      line.length > 3 &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      nextLine === '' &&
      lineAfter && lineAfter.length > 50
    ) {
      // Check if it looks like a title (starts with capital, mostly letters)
      if (/^[A-Z]/.test(line) && /^[A-Za-z\s\-:]+$/.test(line)) {
        titles.push(line);
      }
    }
  }

  return titles;
}

/**
 * Split text into pages based on character count
 */
export function splitIntoPseudoPages(text: string, charsPerPage: number = 8000): string[] {
  const pages: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentPage = '';
  
  for (const paragraph of paragraphs) {
    if (currentPage.length + paragraph.length + 2 > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage.trim());
      currentPage = paragraph;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}
