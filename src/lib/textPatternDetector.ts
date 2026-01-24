/**
 * Text Pattern Detector - Client-side text analysis for pasted content
 * Reuses detection logic from pdfExtractor.ts for dice/whitespace tables
 */

import { detectDiceRollTables, detectWhitespaceAlignedTables, detectPipeTables } from './pdfExtractor';

export interface DetectedContent {
  type: 'dice-table' | 'whitespace-table' | 'pipe-table' | 'tsv' | 'csv' | 'key-value' | 'lines';
  title: string;
  confidence: 'high' | 'medium' | 'low';
  columns: string[];
  rows: string[][];
  rawText: string;
  diceType?: 'd6' | 'd66' | '2d6';
  warnings: string[];
}

export interface ParseResult {
  detections: DetectedContent[];
  bestMatch: DetectedContent | null;
  truncated: boolean;
  rawCharCount: number;
}

// Limits
const MAX_CHARS = 60000;
const MAX_ROWS = 300;
const MAX_COLS = 25;

/**
 * Analyze pasted text and detect table structures
 */
export function analyzeText(rawText: string): ParseResult {
  const warnings: string[] = [];
  let text = rawText;
  let truncated = false;

  // Enforce character limit
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS);
    truncated = true;
    warnings.push(`Text truncated to ${MAX_CHARS.toLocaleString()} characters`);
  }

  const detections: DetectedContent[] = [];

  // 1. Detect dice roll tables (D6, D66, 2D6)
  const diceRollTables = detectDiceRollTables(text, 1);
  for (const table of diceRollTables) {
    detections.push({
      type: 'dice-table',
      title: table.title || 'Dice Roll Table',
      confidence: table.confidence,
      columns: table.columns || ['Roll', 'Result'],
      rows: enforceRowLimit(table.rows || [], warnings),
      rawText: table.rawText,
      diceType: table.diceType,
      warnings: [...warnings],
    });
  }

  // 2. Detect whitespace-aligned tables
  const whitespaceTables = detectWhitespaceAlignedTables(text, 1);
  for (const table of whitespaceTables) {
    // Avoid duplicates with dice tables
    const isDuplicate = diceRollTables.some(
      dt => Math.abs(dt.startLine - table.startLine) < 3
    );
    if (!isDuplicate) {
      detections.push({
        type: 'whitespace-table',
        title: table.title || 'Table',
        confidence: table.confidence,
        columns: enforceColLimit(table.columns || [], warnings),
        rows: enforceRowLimit(table.rows || [], warnings),
        rawText: table.rawText,
        warnings: [...warnings],
      });
    }
  }

  // 3. Detect pipe/markdown tables
  const pipeTables = detectPipeTables(text, 1);
  for (const table of pipeTables) {
    const isDuplicate = detections.some(
      t => Math.abs(t.rawText.length - table.rawText.length) < 50
    );
    if (!isDuplicate) {
      detections.push({
        type: 'pipe-table',
        title: table.title || 'Table',
        confidence: table.confidence,
        columns: enforceColLimit(table.columns || [], warnings),
        rows: enforceRowLimit(table.rows || [], warnings),
        rawText: table.rawText,
        warnings: [...warnings],
      });
    }
  }

  // 4. If no tables detected, try TSV detection
  if (detections.length === 0) {
    const tsvResult = detectTSV(text);
    if (tsvResult) {
      detections.push({
        ...tsvResult,
        columns: enforceColLimit(tsvResult.columns, warnings),
        rows: enforceRowLimit(tsvResult.rows, warnings),
        warnings: [...warnings],
      });
    }
  }

  // 5. Try CSV detection
  if (detections.length === 0) {
    const csvResult = detectCSV(text);
    if (csvResult) {
      detections.push({
        ...csvResult,
        columns: enforceColLimit(csvResult.columns, warnings),
        rows: enforceRowLimit(csvResult.rows, warnings),
        warnings: [...warnings],
      });
    }
  }

  // 6. Try key-value detection
  if (detections.length === 0) {
    const kvResult = detectKeyValue(text);
    if (kvResult) {
      detections.push({
        ...kvResult,
        rows: enforceRowLimit(kvResult.rows, warnings),
        warnings: [...warnings],
      });
    }
  }

  // 7. Fallback: treat each line as a row
  if (detections.length === 0) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      detections.push({
        type: 'lines',
        title: 'Content',
        confidence: 'low',
        columns: ['Content'],
        rows: enforceRowLimit(lines.map(l => [l.trim()]), warnings),
        rawText: text,
        warnings: [...warnings, 'No table structure detected. Treating each line as a row.'],
      });
    }
  }

  // Find best match (highest confidence, most rows)
  const bestMatch = detections.length > 0
    ? detections.reduce((best, current) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        const bestScore = confidenceOrder[best.confidence] * 1000 + best.rows.length;
        const currentScore = confidenceOrder[current.confidence] * 1000 + current.rows.length;
        return currentScore > bestScore ? current : best;
      })
    : null;

  return {
    detections,
    bestMatch,
    truncated,
    rawCharCount: rawText.length,
  };
}

/**
 * Detect tab-separated values
 */
function detectTSV(text: string): DetectedContent | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Check if most lines have tabs
  const linesWithTabs = lines.filter(l => l.includes('\t'));
  if (linesWithTabs.length < lines.length * 0.7) return null;

  const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
  
  // Use first row as headers if it looks like headers
  const firstRow = rows[0];
  const isFirstRowHeader = firstRow.every(cell => 
    cell.length < 50 && !cell.match(/^\d+$/)
  );

  const columns = isFirstRowHeader ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`);
  const dataRows = isFirstRowHeader ? rows.slice(1) : rows;

  // Normalize row lengths
  const normalizedRows = dataRows.map(row => {
    const normalized = [...row];
    while (normalized.length < columns.length) normalized.push('');
    return normalized.slice(0, columns.length);
  });

  return {
    type: 'tsv',
    title: 'Tab-Separated Data',
    confidence: normalizedRows.length >= 5 ? 'high' : 'medium',
    columns,
    rows: normalizedRows,
    rawText: text,
    warnings: [],
  };
}

/**
 * Detect comma-separated values (CSV)
 * Handles quoted fields with commas inside
 */
function detectCSV(text: string): DetectedContent | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Check if most lines have commas (but not tabs, which would be TSV)
  const linesWithCommas = lines.filter(l => l.includes(',') && !l.includes('\t'));
  if (linesWithCommas.length < lines.length * 0.7) return null;

  // Parse CSV rows, handling quoted fields
  const rows = lines.map(line => parseCSVLine(line));
  
  // Verify consistent column count (within tolerance)
  const columnCounts = rows.map(r => r.length);
  const modeCount = columnCounts.sort((a, b) =>
    columnCounts.filter(v => v === a).length - columnCounts.filter(v => v === b).length
  ).pop() || 0;
  
  const consistentRows = rows.filter(r => Math.abs(r.length - modeCount) <= 1);
  if (consistentRows.length < rows.length * 0.7) return null;

  // Use first row as headers if it looks like headers
  const firstRow = rows[0];
  const isFirstRowHeader = firstRow.every(cell => 
    cell.length < 50 && !cell.match(/^\d+\.?\d*$/)
  );

  const columns = isFirstRowHeader ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`);
  const dataRows = isFirstRowHeader ? rows.slice(1) : rows;

  // Normalize row lengths
  const normalizedRows = dataRows.map(row => {
    const normalized = [...row];
    while (normalized.length < columns.length) normalized.push('');
    return normalized.slice(0, columns.length);
  });

  return {
    type: 'csv',
    title: 'CSV Data',
    confidence: normalizedRows.length >= 5 ? 'high' : 'medium',
    columns,
    rows: normalizedRows,
    rawText: text,
    warnings: [],
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Detect key: value patterns
 */
function detectKeyValue(text: string): DetectedContent | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;

  const kvPattern = /^([^:]+):\s*(.+)$/;
  const kvLines = lines.filter(l => kvPattern.test(l));

  if (kvLines.length < lines.length * 0.5) return null;

  const rows = kvLines.map(line => {
    const match = line.match(kvPattern);
    return match ? [match[1].trim(), match[2].trim()] : ['', line];
  });

  return {
    type: 'key-value',
    title: 'Key-Value Data',
    confidence: rows.length >= 5 ? 'high' : 'medium',
    columns: ['Property', 'Value'],
    rows,
    rawText: text,
    warnings: [],
  };
}

/**
 * Enforce row limit
 */
function enforceRowLimit(rows: string[][], warnings: string[]): string[][] {
  if (rows.length > MAX_ROWS) {
    warnings.push(`Rows limited to ${MAX_ROWS} (${rows.length} detected)`);
    return rows.slice(0, MAX_ROWS);
  }
  return rows;
}

/**
 * Enforce column limit
 */
function enforceColLimit(columns: string[], warnings: string[]): string[] {
  if (columns.length > MAX_COLS) {
    warnings.push(`Columns limited to ${MAX_COLS} (${columns.length} detected)`);
    return columns.slice(0, MAX_COLS);
  }
  return columns;
}

/**
 * Convert parsed content to component config format
 */
export function toTableConfig(detection: DetectedContent): {
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  rawText: string;
  parsingMode: 'auto';
  sourceLabel?: string;
} {
  return {
    columns: detection.columns,
    rows: detection.rows.map(rowData => {
      const row: { id: string; [key: string]: string } = { id: crypto.randomUUID() };
      detection.columns.forEach((col, i) => {
        row[col] = rowData[i] || '';
      });
      return row;
    }),
    rawText: detection.rawText,
    parsingMode: 'auto',
  };
}

/**
 * Convert parsed content to card config format
 */
export function toCardConfig(detection: DetectedContent): {
  title: string;
  sections: Array<{ header: string; content: string }>;
  rawText: string;
  parsingMode: 'auto';
} {
  // Group rows into sections
  const sections: Array<{ header: string; content: string }> = [];
  
  if (detection.type === 'key-value') {
    // Each key-value pair becomes a section
    for (const row of detection.rows) {
      sections.push({
        header: row[0] || 'Item',
        content: row[1] || '',
      });
    }
  } else {
    // Table rows become a single section with formatted content
    const content = detection.rows
      .map(row => row.join(' | '))
      .join('\n');
    sections.push({
      header: detection.title,
      content,
    });
  }

  return {
    title: detection.title,
    sections,
    rawText: detection.rawText,
    parsingMode: 'auto',
  };
}
