// PDF text extraction utility using pdf.js from CDN
// Enhanced with dice roll table detection and whitespace-aligned table detection

import type { DetectedTable, DetectedSection, EnhancedExtractionResult } from "@/types/rules";

interface PDFPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

interface ExtractionResult {
  pages: PDFPage[];
  totalPages: number;
  totalChars: number;
  pageErrors: number[];
}

interface PdfjsLib {
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
}

interface PdfPageProxy {
  getTextContent: () => Promise<PdfTextContent>;
}

interface PdfTextContent {
  items: PdfTextItem[];
}

interface PdfTextItem {
  str?: string;
  transform?: number[];
}

type PdfjsWindow = Window & { pdfjsLib?: PdfjsLib };

// Dynamically load pdf.js from CDN
async function loadPdfJs(): Promise<PdfjsLib> {
  // Check if already loaded
  const pdfWindow = window as PdfjsWindow;
  if (pdfWindow.pdfjsLib) {
    return pdfWindow.pdfjsLib;
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
      resolve((window as PdfjsWindow).pdfjsLib as PdfjsLib);
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
async function loadPdfJsLegacy(): Promise<PdfjsLib> {
  const pdfWindow = window as PdfjsWindow;
  if (pdfWindow.pdfjsLib) {
    return pdfWindow.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as PdfjsWindow).pdfjsLib;
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
  const pageErrors: number[] = [];
  
  // Extract text from each page
  for (let i = 1; i <= totalPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Combine text items
      let pageText = "";
      let lastY = -1;
      
      for (const item of textContent.items) {
        if (typeof item.str === "string" && Array.isArray(item.transform)) {
          const y = item.transform[5] ?? 0;
          
          // Add newline if Y position changed significantly (new line)
          if (lastY !== -1 && Math.abs(y - lastY) > 5) {
            pageText += "\n";
          } else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
            pageText += " ";
          }
          
          pageText += item.str;
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
    } catch (error) {
      pageErrors.push(i);
      pages.push({
        pageNumber: i,
        text: "",
        charCount: 0,
      });
    }
    
    if (onProgress) {
      onProgress(i, totalPages);
    }
  }
  
  return {
    pages,
    totalPages,
    totalChars,
    pageErrors,
  };
}

/**
 * Enhanced PDF extraction with table and section detection
 */
export async function extractPdfTextEnhanced(
  file: File,
  onProgress?: (page: number, total: number, stage?: string) => void
): Promise<EnhancedExtractionResult> {
  // First do standard extraction
  const baseResult = await extractPdfText(file, (page, total) => {
    onProgress?.(page, total, "extracting");
  });

  // Detect tables across all pages
  const detectedTables: DetectedTable[] = [];
  const detectedSections: DetectedSection[] = [];
  const extractionStats = getExtractionStats(baseResult.pages);

  for (const page of baseResult.pages) {
    // Detect dice roll tables
    const diceRollTables = detectDiceRollTables(page.text, page.pageNumber);
    detectedTables.push(...diceRollTables);

    // Detect whitespace-aligned tables
    const whitespaceTables = detectWhitespaceAlignedTables(page.text, page.pageNumber);
    // Avoid duplicates with dice tables
    for (const wsTable of whitespaceTables) {
      const isDuplicate = diceRollTables.some(
        dt => Math.abs(dt.startLine - wsTable.startLine) < 3
      );
      if (!isDuplicate) {
        detectedTables.push(wsTable);
      }
    }

    // Detect pipe tables (existing pattern)
    const pipeTables = detectPipeTables(page.text, page.pageNumber);
    for (const pipeTable of pipeTables) {
      const isDuplicate = detectedTables.some(
        t => Math.abs(t.startLine - pipeTable.startLine) < 3
      );
      if (!isDuplicate) {
        detectedTables.push(pipeTable);
      }
    }

    // Detect sections
    const pageSections = detectSections(page.text, page.pageNumber);
    detectedSections.push(...pageSections);
  }

  return {
    pages: baseResult.pages,
    totalPages: baseResult.totalPages,
    totalChars: baseResult.totalChars,
    emptyPages: extractionStats.emptyPages,
    avgCharsPerPage: extractionStats.avgCharsPerPage,
    pageErrors: baseResult.pageErrors,
    detectedTables,
    detectedSections,
  };
}

/**
 * Detect D6, D66, 2D6 roll tables with roll ranges
 */
export function detectDiceRollTables(text: string, pageNumber: number): DetectedTable[] {
  const tables: DetectedTable[] = [];
  const lines = text.split("\n");

  // Patterns for dice roll ranges
  const d6RangePattern = /^\s*([1-6])\s*[-–—]\s*([1-6])\s+(.+)/;
  const d66RangePattern = /^\s*([1-6][1-6])\s*[-–—]\s*([1-6][1-6])\s+(.+)/;
  // Single D6: "1 Something" or "1 - Something" (number 1-6 with optional separator)
  const singleD6Pattern = /^\s*([1-6])\s*[-–—]?\s+(.+)/;
  // 2D6: Only match numbers 2-12 (not 1, which would be D6)
  const twoD6RangePattern = /^\s*(2|3|4|5|6|7|8|9|10|11|12)\s*[-–—]\s+(.+)/;

  let currentTable: { 
    startLine: number; 
    endLine: number; 
    title: string; 
    headerContext: string;
    rows: string[][]; 
    diceType: 'd6' | 'd66' | '2d6';
    rawLines: string[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for D6 range (1-2, 3-4, 5-6)
    const d6Match = line.match(d6RangePattern);
    if (d6Match) {
      if (!currentTable || currentTable.diceType !== 'd6') {
        if (currentTable && currentTable.rows.length >= 3) {
          tables.push(buildTableFromCurrent(currentTable, pageNumber));
        }
        currentTable = {
          startLine: i,
          endLine: i,
          title: findTableTitle(lines, i),
          headerContext: findTableHeaderContext(lines, i),
          rows: [],
          diceType: 'd6',
          rawLines: [],
        };
      }
      currentTable.endLine = i;
      currentTable.rows.push([`${d6Match[1]}-${d6Match[2]}`, d6Match[3]]);
      currentTable.rawLines.push(line);
      continue;
    }

    // Check for D66 range (11-16, 21-26, etc.)
    const d66Match = line.match(d66RangePattern);
    if (d66Match) {
      if (!currentTable || currentTable.diceType !== 'd66') {
        if (currentTable && currentTable.rows.length >= 3) {
          tables.push(buildTableFromCurrent(currentTable, pageNumber));
        }
        currentTable = {
          startLine: i,
          endLine: i,
          title: findTableTitle(lines, i),
          headerContext: findTableHeaderContext(lines, i),
          rows: [],
          diceType: 'd66',
          rawLines: [],
        };
      }
      currentTable.endLine = i;
      currentTable.rows.push([`${d66Match[1]}-${d66Match[2]}`, d66Match[3]]);
      currentTable.rawLines.push(line);
      continue;
    }

    // Check for single D6 (1, 2, 3, 4, 5, 6 in sequence)
    const singleMatch = line.match(singleD6Pattern);
    if (singleMatch && parseInt(singleMatch[1]) >= 1 && parseInt(singleMatch[1]) <= 6) {
      const expectedNum = currentTable?.diceType === 'd6' && currentTable.rows.length > 0
        ? parseInt(currentTable.rows[currentTable.rows.length - 1][0]) + 1
        : 1;
      
      if (parseInt(singleMatch[1]) === expectedNum || !currentTable) {
        if (!currentTable || currentTable.diceType !== 'd6') {
          if (currentTable && currentTable.rows.length >= 3) {
            tables.push(buildTableFromCurrent(currentTable, pageNumber));
          }
          currentTable = {
            startLine: i,
            endLine: i,
            title: findTableTitle(lines, i),
            headerContext: findTableHeaderContext(lines, i),
            rows: [],
            diceType: 'd6',
            rawLines: [],
          };
        }
      }
      currentTable.endLine = i;
      currentTable.rows.push([singleMatch[1], singleMatch[2]]);
      currentTable.rawLines.push(line);
      continue;
    }

    const twoD6Match = line.match(twoD6RangePattern);
    if (twoD6Match) {
      if (!currentTable || currentTable.diceType !== '2d6') {
        if (currentTable && currentTable.rows.length >= 3) {
          tables.push(buildTableFromCurrent(currentTable, pageNumber));
        }
        currentTable = {
          startLine: i,
          endLine: i,
          title: findTableTitle(lines, i),
          headerContext: findTableHeaderContext(lines, i),
          rows: [],
          diceType: '2d6',
          rawLines: [],
        };
      }
      currentTable.endLine = i;
      currentTable.rows.push([twoD6Match[1], twoD6Match[2]]);
      currentTable.rawLines.push(line);
      continue;
    }

    // If we hit a non-matching line, close the current table if valid
    if (currentTable && line.length > 0 && !line.match(/^[\s]*$/)) {
      // Check if this looks like a continuation
      const isContinuation = line.match(/^\s{2,}/) && !line.match(/^\s*\d/);
      if (!isContinuation && currentTable.rows.length >= 3) {
        tables.push(buildTableFromCurrent(currentTable, pageNumber));
        currentTable = null;
      } else if (isContinuation && currentTable.rows.length > 0) {
        // Append to last row
        currentTable.rows[currentTable.rows.length - 1][1] += " " + line.trim();
        currentTable.rawLines[currentTable.rawLines.length - 1] += " " + line.trim();
      } else if (!isContinuation) {
        currentTable = null;
      }
    }
  }

  // Don't forget the last table
  if (currentTable && currentTable.rows.length >= 3) {
    tables.push(buildTableFromCurrent(currentTable, pageNumber));
  }

  return tables;
}

function buildTableFromCurrent(
  current: { startLine: number; endLine: number; title: string; headerContext: string; rows: string[][]; diceType: 'd6' | 'd66' | '2d6'; rawLines: string[] },
  pageNumber: number
): DetectedTable {
  return {
    type: 'dice-roll',
    title: current.title,
    headerContext: current.headerContext,
    pageNumber,
    startLine: current.startLine,
    endLine: current.endLine,
    rawText: current.rawLines.join("\n"),
    columns: ['Roll', 'Result'],
    rows: current.rows,
    diceType: current.diceType,
    confidence: current.rows.length >= 6 ? 'high' : current.rows.length >= 3 ? 'medium' : 'low',
  };
}

function findTableTitle(lines: string[], tableStartLine: number): string {
  for (let i = tableStartLine - 1; i >= Math.max(0, tableStartLine - 3); i--) {
    const line = lines[i].trim();
    if (line.length === 0 || line.length > 80) continue;
    if (line.match(/^\|/)) continue;

    const explicitMatch = line.match(/^(Table|Roll on|Rolls on|Roll)\s*:?\s*(.+)?/i);
    if (explicitMatch) {
      return explicitMatch[2]?.trim() || explicitMatch[1];
    }

    if (!line.match(/^\d/)) {
      return line.replace(/[:-–—]$/, '').trim();
    }
  }
  return 'Untitled Table';
}

function findTableHeaderContext(lines: string[], tableStartLine: number): string {
  return lines
    .slice(Math.max(0, tableStartLine - 3), tableStartLine)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.match(/^\d+\s*[-–—]\s*\d+/))
    .join(" | ");
}

/**
 * Detect tables using whitespace alignment (common in rulebooks)
 */
export function detectWhitespaceAlignedTables(text: string, pageNumber: number): DetectedTable[] {
  const tables: DetectedTable[] = [];
  const lines = text.split("\n");

  // Analyze lines for consistent column positions
  const columnPositions = detectColumnPositions(lines);
  
  if (columnPositions.length < 2) {
    return tables;
  }

  let tableStart = -1;
  let tableLines: string[] = [];
  let tableTitle = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line has data at the column positions
    const hasColumns = checkLineHasColumns(line, columnPositions);
    
    if (hasColumns && line.trim().length > 10) {
      if (tableStart === -1) {
        tableStart = i;
        tableTitle = findTableTitle(lines, i);
      }
      tableLines.push(line);
    } else {
      // End of table
      if (tableLines.length >= 3) {
        const extracted = extractTableStructure(tableLines, columnPositions);
        if (extracted.rows.length >= 2) {
          tables.push({
            type: 'whitespace',
            title: tableTitle,
            headerContext: findTableHeaderContext(lines, tableStart),
            pageNumber,
            startLine: tableStart,
            endLine: tableStart + tableLines.length - 1,
            rawText: tableLines.join("\n"),
            columns: extracted.columns,
            rows: extracted.rows,
            confidence: extracted.rows.length >= 5 ? 'high' : 'medium',
          });
        }
      }
      tableStart = -1;
      tableLines = [];
    }
  }

  // Don't forget the last table
  if (tableLines.length >= 3) {
    const extracted = extractTableStructure(tableLines, columnPositions);
    if (extracted.rows.length >= 2) {
      tables.push({
        type: 'whitespace',
        title: tableTitle,
        headerContext: findTableHeaderContext(lines, tableStart),
        pageNumber,
        startLine: tableStart,
        endLine: tableStart + tableLines.length - 1,
        rawText: tableLines.join("\n"),
        columns: extracted.columns,
        rows: extracted.rows,
        confidence: extracted.rows.length >= 5 ? 'high' : 'medium',
      });
    }
  }

  return tables;
}

/**
 * Detect column positions by analyzing whitespace patterns
 */
function detectColumnPositions(lines: string[]): number[] {
  const spaceFrequency: Map<number, number> = new Map();
  
  // Count where spaces occur consistently across lines
  for (const line of lines) {
    if (line.trim().length < 10) continue;
    
    let inSpace = false;
    let spaceStart = -1;
    
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ' || line[i] === '\t') {
        if (!inSpace) {
          inSpace = true;
          spaceStart = i;
        }
      } else {
        if (inSpace && i - spaceStart >= 2) {
          // Found a gap of 2+ spaces, mark the position after the gap
          spaceFrequency.set(i, (spaceFrequency.get(i) || 0) + 1);
        }
        inSpace = false;
      }
    }
  }

  // Find positions that appear in at least 20% of lines
  const threshold = lines.filter(l => l.trim().length > 10).length * 0.2;
  const positions: number[] = [0]; // Start of line is always a column
  
  const sortedPositions = Array.from(spaceFrequency.entries())
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => a[0] - b[0]);
  
  // Filter out positions too close together (less than 5 chars apart)
  for (const [pos] of sortedPositions) {
    if (positions.length === 0 || pos - positions[positions.length - 1] >= 5) {
      positions.push(pos);
    }
  }

  return positions;
}

function checkLineHasColumns(line: string, positions: number[]): boolean {
  if (line.trim().length < 5) return false;
  
  let hasContent = 0;
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : line.length;
    const segment = line.slice(start, end).trim();
    if (segment.length > 0) hasContent++;
  }
  
  // Need content in at least 2 columns
  return hasContent >= 2;
}

/**
 * Extract table structure from lines using column positions
 */
export function extractTableStructure(
  lines: string[],
  columnPositions: number[]
): { columns: string[]; rows: string[][] } {
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const rows: string[][] = [];
  
  for (const line of lines) {
    const row: string[] = [];
    for (let i = 0; i < columnPositions.length; i++) {
      const start = columnPositions[i];
      const end = i + 1 < columnPositions.length ? columnPositions[i + 1] : line.length;
      row.push(line.slice(start, end).trim());
    }
    rows.push(row);
  }

  // First row is usually headers
  const columns = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);

  return { columns, rows: dataRows };
}

/**
 * Detect pipe-delimited tables (Markdown style)
 */
export function detectPipeTables(text: string, pageNumber: number): DetectedTable[] {
  const tables: DetectedTable[] = [];
  const lines = text.split("\n");

  let tableStart = -1;
  let tableLines: string[] = [];
  let tableTitle = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line has pipe delimiters
    if (line.includes('|') && line.split('|').length >= 3) {
      if (tableStart === -1) {
        tableStart = i;
        tableTitle = findTableTitle(lines, i);
      }
      tableLines.push(line);
    } else {
      if (tableLines.length >= 2) {
        const parsedRows = tableLines.map(l => 
          l.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
        );
        tables.push({
          type: 'pipe',
          title: tableTitle,
          headerContext: findTableHeaderContext(lines, tableStart),
          pageNumber,
          startLine: tableStart,
          endLine: tableStart + tableLines.length - 1,
          rawText: tableLines.join("\n"),
          columns: parsedRows[0] || [],
          rows: parsedRows.slice(1),
          confidence: parsedRows.length >= 4 ? 'high' : 'medium',
        });
      }
      tableStart = -1;
      tableLines = [];
    }
  }

  // Last table
  if (tableLines.length >= 2) {
    const parsedRows = tableLines.map(l => 
      l.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
    );
    tables.push({
      type: 'pipe',
      title: tableTitle,
      headerContext: findTableHeaderContext(lines, tableStart),
      pageNumber,
      startLine: tableStart,
      endLine: tableStart + tableLines.length - 1,
      rawText: tableLines.join("\n"),
      columns: parsedRows[0] || [],
      rows: parsedRows.slice(1),
      confidence: parsedRows.length >= 4 ? 'high' : 'medium',
    });
  }

  return tables;
}

/**
 * Detect section headers in text
 */
export function detectSections(text: string, pageNumber: number): DetectedSection[] {
  const sections: DetectedSection[] = [];
  const lines = text.split("\n");

  // Section header patterns (ordered by specificity)
  const patterns: { pattern: RegExp; level: number; type: 'chapter' | 'section' | 'subsection' }[] = [
    // Chapter markers
    { pattern: /^(?:CHAPTER|PART)\s+[\dIVXLC]+[:.]?\s*(.+)?$/i, level: 1, type: 'chapter' },
    
    // Markdown headers
    { pattern: /^###\s+(.+)$/, level: 3, type: 'subsection' },
    { pattern: /^##\s+(.+)$/, level: 2, type: 'section' },
    { pattern: /^#\s+(.+)$/, level: 1, type: 'chapter' },
    
    // Numbered sections (1. or 1.1 or 1.1.1)
    { pattern: /^(\d+\.\d+\.\d+)\s+([A-Z].+)$/, level: 3, type: 'subsection' },
    { pattern: /^(\d+\.\d+)\s+([A-Z].+)$/, level: 2, type: 'section' },
    { pattern: /^(\d+\.)\s+([A-Z].+)$/, level: 1, type: 'chapter' },
    
    // ALL CAPS headers (common in wargame rulebooks)
    { pattern: /^([A-Z][A-Z\s]{4,50})$/, level: 2, type: 'section' },
    
    // Wargame-specific section names
    { pattern: /^(POST[- ]?GAME\s+SEQUENCE|POST[- ]?BATTLE)$/i, level: 2, type: 'section' },
    { pattern: /^(EXPLORATION|EXPLORATION\s+PHASE)$/i, level: 2, type: 'section' },
    { pattern: /^(CAMPAIGN\s+RULES|CAMPAIGN\s+PLAY)$/i, level: 1, type: 'chapter' },
    { pattern: /^(SKILLS|SKILL\s+LIST|SKILLS\s+&\s+ABILITIES)$/i, level: 2, type: 'section' },
    { pattern: /^(EQUIPMENT|WEAPONS?\s+LIST|ARMOU?R\s+LIST)$/i, level: 2, type: 'section' },
    { pattern: /^(INJURIES|INJURY\s+TABLE|SERIOUS\s+INJURIES)$/i, level: 2, type: 'section' },
    { pattern: /^(WARBANDS?|GANG|WARBAND\s+CREATION)$/i, level: 2, type: 'section' },
    { pattern: /^(SCENARIOS?|MISSIONS?)$/i, level: 2, type: 'section' },
    { pattern: /^(ABILITIES|SPECIAL\s+RULES?)$/i, level: 2, type: 'section' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 3 || line.length > 80) continue;

    for (const { pattern, level, type } of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Extract title from match
        let title = match[1] || match[2] || line;
        title = title.replace(/[:\-–—]+$/, '').trim();
        
        // Skip if it looks like a table row or list item
        if (title.match(/^\d+\s*[-–—]\s*\d+/) || title.match(/^\|/)) {
          continue;
        }

        sections.push({
          title,
          pageNumber,
          lineNumber: i,
          level,
          type,
        });
        break;
      }
    }
  }

  return sections;
}

/**
 * Clean up extracted PDF text
 */
function cleanPdfText(text: string): string {
  const normalized = text
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2");

  const merged = mergeSoftLineBreaks(normalized);

  return merged
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .trim();
}

function mergeSoftLineBreaks(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    const nextLine = lines[i + 1]?.trim() ?? "";

    if (!line) {
      result.push("");
      continue;
    }

    const isList = /^([-*•]|\d+\.)\s+/.test(line);
    const nextIsList = /^([-*•]|\d+\.)\s+/.test(nextLine);
    const isTableLine = /\|/.test(line) || /\S\s{2,}\S/.test(line);
    const nextIsTable = /\|/.test(nextLine) || /\S\s{2,}\S/.test(nextLine);
    const endsSentence = /[.!?":]$/.test(line);

    if (!endsSentence && nextLine && !isList && !nextIsList && !isTableLine && !nextIsTable && /^[a-z]/.test(nextLine)) {
      result.push(`${line} ${nextLine}`);
      i += 1;
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

export function getExtractionStats(pages: PDFPage[]) {
  const totalChars = pages.reduce((acc, page) => acc + page.text.trim().length, 0);
  const emptyPages = pages.filter((page) => page.text.trim().length < 20).length;
  const avgCharsPerPage = pages.length ? Math.round(totalChars / pages.length) : 0;

  return { emptyPages, avgCharsPerPage, totalChars };
}

export function shouldFlagScannedPdf(pages: PDFPage[]) {
  return shouldUseOcrFallback(pages);
}

export function shouldUseOcrFallback(pages: PDFPage[]) {
  if (!pages.length) return false;
  const { emptyPages, avgCharsPerPage, totalChars } = getExtractionStats(pages);
  const emptyRatio = emptyPages / pages.length;
  const isShortDoc = pages.length <= 2;
  const lowTextAverage = avgCharsPerPage < (isShortDoc ? 25 : 45);
  const highEmptyRatio = emptyRatio >= (isShortDoc ? 0.8 : 0.55);
  const lowTotal = totalChars < pages.length * (isShortDoc ? 40 : 50);
  return highEmptyRatio || lowTextAverage || lowTotal;
}

/**
 * Detect and remove repeated headers/footers
 */
export function removeHeadersFooters(pages: PDFPage[]): PDFPage[] {
  if (pages.length < 3) return pages;
  
  const headerLines: string[] = [];
  const footerLines: string[] = [];

  pages.forEach((page) => {
    const lines = page.text.split("\n");
    headerLines.push(...lines.slice(0, 3).map(line => line.trim()).filter(isHeaderFooterCandidate));
    footerLines.push(...lines.slice(-3).map(line => line.trim()).filter(isHeaderFooterCandidate));
  });
  
  // Count occurrences
  const countOccurrences = (arr: string[]) => {
    const counts = new Map<string, number>();
    arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
    return counts;
  };
  
  const headerCounts = countOccurrences(headerLines);
  const footerCounts = countOccurrences(footerLines);
  
  // Find headers/footers that appear on more than 30% of pages
  const threshold = pages.length * 0.3;
  const repeatedHeaders = new Set<string>();
  const repeatedFooters = new Set<string>();
  
  headerCounts.forEach((count, line) => {
    if (count > threshold && line.length < 100 && isHeaderFooterCandidate(line)) {
      repeatedHeaders.add(line);
    }
  });
  
  footerCounts.forEach((count, line) => {
    if (count > threshold && line.length < 100 && isHeaderFooterCandidate(line)) {
      repeatedFooters.add(line);
    }
  });
  
  // Remove repeated headers/footers
  return pages.map(page => {
    const lines = page.text.split("\n");

    const cleanedLines = lines.filter((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (!isHeaderFooterCandidate(trimmed)) return true;

      const isHeaderZone = index <= 2;
      const isFooterZone = index >= lines.length - 3;

      if (isHeaderZone && repeatedHeaders.has(trimmed)) return false;
      if (isFooterZone && repeatedFooters.has(trimmed)) return false;

      return true;
    });
    
    const newText = cleanedLines.join("\n").trim();
    return {
      ...page,
      text: newText,
      charCount: newText.length,
    };
  });
}

function isHeaderFooterCandidate(line: string) {
  if (!line) return false;
  if (line.length > 120) return false;
  if (/\|/.test(line)) return false;
  if (/\S\s{2,}\S/.test(line)) return false;
  if (/^\d+\s*$/.test(line)) return false;
  return true;
}
