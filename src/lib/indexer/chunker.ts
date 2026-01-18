// ============================================
// Section-Aware Chunking for Rules Indexing
// ============================================

import { CHUNK_CONFIG, type RulesChunk, type RulesSection } from "@/types/rulesV2";

interface ChunkInput {
  text: string;
  pageNumber: number;
  sectionPath?: string[];
  sectionId?: string;
}

interface ChunkOutput {
  text: string;
  pageStart: number;
  pageEnd: number;
  sectionPath: string[];
  sectionId: string | null;
  orderIndex: number;
  keywords: string[];
  scoreHints: RulesChunk["score_hints"];
}

/**
 * Extract keywords from text for search
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // Common wargaming terms to look for
  const importantTerms = [
    'injury', 'wound', 'damage', 'attack', 'defense', 'armour', 'armor',
    'skill', 'ability', 'trait', 'equipment', 'weapon', 'item',
    'exploration', 'loot', 'treasure', 'encounter', 'event',
    'advancement', 'experience', 'level', 'upgrade',
    'warband', 'unit', 'model', 'hero', 'henchman',
    'deployment', 'scenario', 'mission', 'objective',
    'movement', 'shooting', 'combat', 'melee', 'ranged',
    'morale', 'rout', 'flee', 'recovery',
    'd6', 'd66', 'd3', 'd10', 'd20', 'dice', 'roll',
    'table', 'chart', 'list',
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const term of importantTerms) {
    if (lowerText.includes(term)) {
      keywords.push(term);
    }
  }
  
  return [...new Set(keywords)];
}

/**
 * Analyze text for scoring hints (used by AI matcher)
 */
function analyzeScoreHints(text: string): RulesChunk["score_hints"] {
  const hints: RulesChunk["score_hints"] = {};
  
  // Check for roll ranges (1-2, 3-4, 5-6 or 1, 2, 3, 4, 5, 6)
  if (/\b[1-6]\s*[-–]\s*[1-6]\b/.test(text) || /\b(D6|d6|D66|d66)\b/.test(text)) {
    hints.hasRollRanges = true;
  }
  
  // Check for table patterns (rows with consistent structure)
  const lines = text.split('\n').filter(l => l.trim());
  const hasTabs = lines.some(l => l.includes('\t'));
  const hasAlignedNumbers = lines.filter(l => /^\s*\d+\.?\s/.test(l)).length > 3;
  if (hasTabs || hasAlignedNumbers) {
    hints.hasTablePattern = true;
  }
  
  // Check for list patterns
  const bulletLines = lines.filter(l => /^[\s]*[-•*]\s/.test(l) || /^\s*\d+[.)]\s/.test(l));
  if (bulletLines.length > 3) {
    hints.hasListPattern = true;
  }
  
  // Check for dice notation
  if (/\b\d*[dD]\d+(\+\d+)?\b/.test(text)) {
    hints.hasDiceNotation = true;
  }
  
  return hints;
}

/**
 * Find natural break points in text (paragraph boundaries, headers)
 */
function findNaturalBreakPoints(text: string): number[] {
  const breaks: number[] = [];
  
  // Paragraph breaks (double newline)
  let match;
  const paragraphRegex = /\n\n+/g;
  while ((match = paragraphRegex.exec(text)) !== null) {
    breaks.push(match.index + match[0].length);
  }
  
  return breaks.sort((a, b) => a - b);
}

/**
 * Chunk a single section/page with overlap
 */
function chunkText(input: ChunkInput, startIndex: number = 0): ChunkOutput[] {
  const { text, pageNumber, sectionPath = [], sectionId } = input;
  const chunks: ChunkOutput[] = [];
  
  if (text.length <= CHUNK_CONFIG.TARGET_SIZE) {
    // Text fits in one chunk
    chunks.push({
      text: text.trim(),
      pageStart: pageNumber,
      pageEnd: pageNumber,
      sectionPath,
      sectionId: sectionId || null,
      orderIndex: startIndex,
      keywords: extractKeywords(text),
      scoreHints: analyzeScoreHints(text),
    });
    return chunks;
  }
  
  const breakPoints = findNaturalBreakPoints(text);
  let currentStart = 0;
  let orderIndex = startIndex;
  
  while (currentStart < text.length) {
    // Find the best break point near target size
    let targetEnd = currentStart + CHUNK_CONFIG.TARGET_SIZE;
    let actualEnd = targetEnd;
    
    // Look for natural break point
    const nearbyBreaks = breakPoints.filter(
      bp => bp > currentStart + CHUNK_CONFIG.MIN_SIZE && 
            bp < currentStart + CHUNK_CONFIG.MAX_SIZE
    );
    
    if (nearbyBreaks.length > 0) {
      // Find break closest to target
      actualEnd = nearbyBreaks.reduce((best, bp) => {
        const bestDist = Math.abs(best - targetEnd);
        const bpDist = Math.abs(bp - targetEnd);
        return bpDist < bestDist ? bp : best;
      }, nearbyBreaks[0]);
    } else if (targetEnd < text.length) {
      // No natural break, try to break at word boundary
      const endRegion = text.slice(targetEnd - 50, targetEnd + 50);
      const spaceMatch = endRegion.match(/\s+/g);
      if (spaceMatch) {
        const lastSpace = endRegion.lastIndexOf(' ');
        if (lastSpace > 0) {
          actualEnd = targetEnd - 50 + lastSpace;
        }
      }
    } else {
      actualEnd = text.length;
    }
    
    const chunkText = text.slice(currentStart, actualEnd).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        pageStart: pageNumber,
        pageEnd: pageNumber,
        sectionPath,
        sectionId: sectionId || null,
        orderIndex,
        keywords: extractKeywords(chunkText),
        scoreHints: analyzeScoreHints(chunkText),
      });
      orderIndex++;
    }
    
    // Move forward with overlap
    currentStart = actualEnd - CHUNK_CONFIG.OVERLAP_SIZE;
    if (currentStart < 0 || actualEnd >= text.length) {
      break;
    }
  }
  
  return chunks;
}

/**
 * Create chunks from pages, respecting section boundaries
 */
export function createChunks(
  pages: Array<{ text: string; pageNumber: number }>,
  sections?: RulesSection[]
): Omit<RulesChunk, "id" | "created_at">[] {
  const allChunks: Omit<RulesChunk, "id" | "created_at">[] = [];
  let globalOrderIndex = 0;
  
  if (sections && sections.length > 0) {
    // Section-aware chunking
    for (const section of sections) {
      if (!section.text) continue;
      
      const sectionChunks = chunkText({
        text: section.text,
        pageNumber: section.page_start || 1,
        sectionPath: section.section_path,
        sectionId: section.id,
      }, globalOrderIndex);
      
      for (const chunk of sectionChunks) {
        allChunks.push({
          source_id: "", // Will be set by caller
          section_id: chunk.sectionId,
          text: chunk.text,
          page_start: chunk.pageStart,
          page_end: chunk.pageEnd,
          section_path: chunk.sectionPath,
          order_index: chunk.orderIndex,
          keywords: chunk.keywords,
          score_hints: chunk.scoreHints,
        });
        globalOrderIndex++;
      }
    }
  } else {
    // Page-based chunking (no sections)
    for (const page of pages) {
      const pageChunks = chunkText({
        text: page.text,
        pageNumber: page.pageNumber,
      }, globalOrderIndex);
      
      for (const chunk of pageChunks) {
        allChunks.push({
          source_id: "", // Will be set by caller
          section_id: null,
          text: chunk.text,
          page_start: chunk.pageStart,
          page_end: chunk.pageEnd,
          section_path: [],
          order_index: chunk.orderIndex,
          keywords: chunk.keywords,
          score_hints: chunk.scoreHints,
        });
        globalOrderIndex++;
      }
    }
  }
  
  return allChunks;
}

/**
 * Extract sections from pages using header detection
 */
export function extractSections(
  pages: Array<{ text: string; pageNumber: number }>,
  sourceId: string
): Omit<RulesSection, "id" | "created_at">[] {
  const sections: Omit<RulesSection, "id" | "created_at">[] = [];
  
  // Combine all pages to find section boundaries
  interface PageLine {
    text: string;
    pageNumber: number;
    lineIndex: number;
  }
  
  const allLines: PageLine[] = [];
  for (const page of pages) {
    const lines = page.text.split('\n');
    lines.forEach((line, idx) => {
      allLines.push({
        text: line,
        pageNumber: page.pageNumber,
        lineIndex: idx,
      });
    });
  }
  
  // Find potential section headers
  const headers: Array<PageLine & { isHeader: boolean; level: number }> = [];
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.text.trim();
    
    if (!trimmed || trimmed.length < 3 || trimmed.length > 80) continue;
    
    let isHeader = false;
    let level = 3;
    
    // All caps = likely header
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !/^\d+$/.test(trimmed)) {
      isHeader = true;
      level = 1;
    }
    
    // Numbered sections
    if (/^(\d+\.)+\s+[A-Z]/.test(trimmed)) {
      isHeader = true;
      level = (trimmed.match(/\./g) || []).length;
    }
    
    // Title case followed by empty line
    const nextLine = allLines[i + 1]?.text.trim();
    if (
      !isHeader &&
      /^[A-Z][a-z]/.test(trimmed) &&
      !trimmed.endsWith('.') &&
      (!nextLine || nextLine === '')
    ) {
      isHeader = true;
      level = 2;
    }
    
    if (isHeader) {
      headers.push({ ...line, isHeader, level });
    }
  }
  
  // Build sections from headers
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextHeader = headers[i + 1];
    
    // Find start and end positions
    const startPage = header.pageNumber;
    const endPage = nextHeader ? nextHeader.pageNumber : pages[pages.length - 1].pageNumber;
    
    // Build section text
    let sectionText = '';
    let capturing = false;
    
    for (const page of pages) {
      if (page.pageNumber < startPage) continue;
      if (nextHeader && page.pageNumber > endPage) break;
      
      const lines = page.text.split('\n');
      for (let j = 0; j < lines.length; j++) {
        if (page.pageNumber === startPage && !capturing) {
          // Start capturing from header line
          if (lines[j].trim() === header.text.trim()) {
            capturing = true;
            continue; // Don't include header in text
          }
        }
        
        if (capturing) {
          // Stop at next header
          if (nextHeader && page.pageNumber === nextHeader.pageNumber) {
            if (lines[j].trim() === nextHeader.text.trim()) {
              break;
            }
          }
          sectionText += lines[j] + '\n';
        }
      }
    }
    
    // Build section path based on level
    const sectionPath: string[] = [header.text.trim()];
    
    sections.push({
      source_id: sourceId,
      title: header.text.trim(),
      section_path: sectionPath,
      page_start: startPage,
      page_end: endPage,
      text: sectionText.trim() || null,
      keywords: [], // Will be extracted from chunks
    });
  }
  
  return sections;
}
