// ============================================
// Table Detection for Rules Indexing
// ============================================

import type { RulesTable, Confidence, DetectedTablePattern } from "@/types/rulesV2";

interface TableCandidate {
  startLine: number;
  endLine: number;
  rawText: string;
  titleGuess: string | null;
  headerContext: string | null;
  type: 'roll_table' | 'stats_table' | 'equipment' | 'generic';
  confidence: Confidence;
  parsedRows: Record<string, string>[] | null;
}

/**
 * Detect roll tables (D6, D66, D100 etc.)
 */
function detectRollTable(lines: string[], startIdx: number): TableCandidate | null {
  const rollPatterns = [
    /^(\d+)\s*[-–]\s*(\d+)[:\s]+(.+)$/,  // 1-2: Result
    /^(\d+)[:\s]+(.+)$/,                   // 1: Result
    /^(\d{2})\s*[-–]?\s*(.+)$/,            // 11-16 Result (D66)
  ];
  
  let tableStartLine = -1;
  let titleGuess: string | null = null;
  const rows: Record<string, string>[] = [];
  
  // Look backwards for title
  for (let i = startIdx - 1; i >= Math.max(0, startIdx - 5); i--) {
    const line = lines[i].trim();
    if (line && !line.match(/^\d/) && line.length < 60) {
      titleGuess = line;
      break;
    }
  }
  
  // Scan forward for roll entries
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (rows.length > 2) break; // End of table
      continue;
    }
    
    let matched = false;
    for (const pattern of rollPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (tableStartLine === -1) tableStartLine = i;
        
        if (match.length === 4) {
          // Range pattern: 1-2: Result
          rows.push({ Roll: `${match[1]}-${match[2]}`, Result: match[3].trim() });
        } else if (match.length === 3) {
          // Single or D66 pattern
          rows.push({ Roll: match[1], Result: match[2].trim() });
        }
        matched = true;
        break;
      }
    }
    
    // If we've started a table and hit a non-matching line, check if it's continuation
    if (tableStartLine !== -1 && !matched) {
      // Check if this might be a continuation of the previous result
      if (line.length > 0 && !line.match(/^\d/) && rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.Result = `${lastRow.Result} ${line}`;
      } else if (rows.length > 2) {
        break;
      }
    }
  }
  
  if (rows.length < 3) return null;
  
  // Determine confidence based on table completeness
  let confidence: Confidence = 'medium';
  const hasD6 = rows.length === 6 || rows.some(r => r.Roll.includes('-'));
  const hasD66 = rows.some(r => /^\d{2}$/.test(r.Roll));
  
  if (hasD6 || hasD66) {
    confidence = 'high';
  }
  
  const rawText = lines.slice(
    Math.max(0, tableStartLine - 2),
    tableStartLine + rows.length + 1
  ).join('\n');
  
  return {
    startLine: tableStartLine,
    endLine: tableStartLine + rows.length,
    rawText,
    titleGuess: titleGuess || (hasD66 ? 'D66 Table' : 'D6 Table'),
    headerContext: lines.slice(Math.max(0, tableStartLine - 3), tableStartLine).join('\n'),
    type: 'roll_table',
    confidence,
    parsedRows: rows,
  };
}

/**
 * Detect equipment/item tables
 */
function detectEquipmentTable(lines: string[], startIdx: number): TableCandidate | null {
  const equipmentPatterns = [
    /^(.+?)\s+(\d+)\s*(gc|gc|gold|pts?|points?)(\s+.+)?$/i,  // Name Cost Unit [Effect]
    /^(.+?)\s*[-–]\s*(\d+)\s*(gc|gold|pts?)$/i,              // Name - Cost gc
  ];
  
  let tableStartLine = -1;
  let titleGuess: string | null = null;
  const rows: Record<string, string>[] = [];
  
  // Look backwards for title
  for (let i = startIdx - 1; i >= Math.max(0, startIdx - 3); i--) {
    const line = lines[i].trim();
    if (line && /equipment|weapon|armour|armor|item|gear/i.test(line)) {
      titleGuess = line;
      break;
    }
  }
  
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 30); i++) {
    const line = lines[i].trim();
    if (!line) {
      if (rows.length > 2) break;
      continue;
    }
    
    for (const pattern of equipmentPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (tableStartLine === -1) tableStartLine = i;
        rows.push({
          Name: match[1].trim(),
          Cost: `${match[2]} ${match[3]}`,
          Effect: match[4]?.trim() || '',
        });
        break;
      }
    }
  }
  
  if (rows.length < 3) return null;
  
  const rawText = lines.slice(
    Math.max(0, tableStartLine - 2),
    tableStartLine + rows.length + 1
  ).join('\n');
  
  return {
    startLine: tableStartLine,
    endLine: tableStartLine + rows.length,
    rawText,
    titleGuess: titleGuess || 'Equipment',
    headerContext: lines.slice(Math.max(0, tableStartLine - 3), tableStartLine).join('\n'),
    type: 'equipment',
    confidence: 'medium',
    parsedRows: rows,
  };
}

/**
 * Detect stats tables (unit profiles, etc.)
 */
function detectStatsTable(lines: string[], startIdx: number): TableCandidate | null {
  // Look for header row with common stat abbreviations
  const statHeaders = /\b(M|WS|BS|S|T|W|I|A|Ld|Sv|Mv|Rng|Acc|Str|AP|Dmg)\b/i;
  
  const headerLine = lines[startIdx].trim();
  if (!statHeaders.test(headerLine)) return null;
  
  // Parse headers
  const headers = headerLine.split(/\s{2,}|\t/).map(h => h.trim()).filter(Boolean);
  if (headers.length < 3) return null;
  
  const rows: Record<string, string>[] = [];
  let titleGuess: string | null = null;
  
  // Look backwards for title
  for (let i = startIdx - 1; i >= Math.max(0, startIdx - 3); i--) {
    const line = lines[i].trim();
    if (line && !statHeaders.test(line) && line.length < 60) {
      titleGuess = line;
      break;
    }
  }
  
  // Parse data rows
  for (let i = startIdx + 1; i < Math.min(lines.length, startIdx + 20); i++) {
    const line = lines[i].trim();
    if (!line) {
      if (rows.length > 0) break;
      continue;
    }
    
    const values = line.split(/\s{2,}|\t/).map(v => v.trim()).filter(Boolean);
    if (values.length >= headers.length - 1) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    } else if (rows.length > 0) {
      break;
    }
  }
  
  if (rows.length < 1) return null;
  
  const rawText = lines.slice(
    Math.max(0, startIdx - 2),
    startIdx + rows.length + 2
  ).join('\n');
  
  return {
    startLine: startIdx,
    endLine: startIdx + rows.length + 1,
    rawText,
    titleGuess: titleGuess || 'Stats Table',
    headerContext: lines.slice(Math.max(0, startIdx - 3), startIdx).join('\n'),
    type: 'stats_table',
    confidence: 'high',
    parsedRows: rows,
  };
}

/**
 * Detect generic tables with tab or multi-space separation
 */
function detectGenericTable(lines: string[], startIdx: number): TableCandidate | null {
  const line = lines[startIdx].trim();
  
  // Check for tab-separated or multi-space separated content
  const separator = line.includes('\t') ? /\t+/ : /\s{3,}/;
  const columns = line.split(separator).filter(Boolean);
  
  if (columns.length < 2) return null;
  
  const rows: Record<string, string>[] = [];
  const headers = columns.map(c => c.trim());
  
  for (let i = startIdx + 1; i < Math.min(lines.length, startIdx + 30); i++) {
    const rowLine = lines[i].trim();
    if (!rowLine) {
      if (rows.length > 1) break;
      continue;
    }
    
    const values = rowLine.split(separator).filter(Boolean);
    if (values.length >= headers.length - 1) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      rows.push(row);
    } else if (rows.length > 1) {
      break;
    }
  }
  
  if (rows.length < 2) return null;
  
  const rawText = lines.slice(startIdx, startIdx + rows.length + 1).join('\n');
  
  return {
    startLine: startIdx,
    endLine: startIdx + rows.length + 1,
    rawText,
    titleGuess: null,
    headerContext: lines.slice(Math.max(0, startIdx - 2), startIdx).join('\n'),
    type: 'generic',
    confidence: 'low',
    parsedRows: rows,
  };
}

/**
 * Detect all tables in a page of text
 */
export function detectTables(
  text: string,
  pageNumber: number,
  sourceId: string,
  sectionId?: string
): Omit<RulesTable, "id" | "created_at">[] {
  const tables: Omit<RulesTable, "id" | "created_at">[] = [];
  const lines = text.split('\n');
  const processedLines = new Set<number>();
  
  for (let i = 0; i < lines.length; i++) {
    if (processedLines.has(i)) continue;
    
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try different detection strategies
    let candidate: TableCandidate | null = null;
    
    // Check for roll table patterns first (highest value)
    if (/^\d+\s*[-–:]\s*\d*/.test(line) || /^[1-6]\s*[-–]?\s*[1-6]?\s*[:\s]/.test(line)) {
      candidate = detectRollTable(lines, i);
    }
    
    // Check for stats table
    if (!candidate && /\b(M|WS|BS|S|T|W|I|A|Ld)\b/i.test(line)) {
      candidate = detectStatsTable(lines, i);
    }
    
    // Check for equipment patterns
    if (!candidate && /\d+\s*(gc|gold|pts?|points?)/i.test(line)) {
      candidate = detectEquipmentTable(lines, i);
    }
    
    // Generic table (tab-separated or multi-space)
    if (!candidate && (line.includes('\t') || /\s{3,}/.test(line))) {
      candidate = detectGenericTable(lines, i);
    }
    
    if (candidate) {
      // Mark lines as processed
      for (let j = candidate.startLine; j <= candidate.endLine; j++) {
        processedLines.add(j);
      }
      
      tables.push({
        source_id: sourceId,
        section_id: sectionId || null,
        title_guess: candidate.titleGuess,
        header_context: candidate.headerContext,
        page_number: pageNumber,
        raw_text: candidate.rawText,
        parsed_rows: candidate.parsedRows,
        confidence: candidate.confidence,
        keywords: extractTableKeywords(candidate),
      });
    }
  }
  
  return tables;
}

/**
 * Extract keywords specific to tables
 */
function extractTableKeywords(candidate: TableCandidate): string[] {
  const keywords: string[] = [];
  
  // Add type as keyword
  keywords.push(candidate.type.replace('_', ' '));
  
  // Extract from title
  if (candidate.titleGuess) {
    const titleWords = candidate.titleGuess
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);
    keywords.push(...titleWords);
  }
  
  // Look for specific terms in raw text
  const rawLower = candidate.rawText.toLowerCase();
  const terms = [
    'injury', 'exploration', 'advancement', 'skill', 'loot',
    'encounter', 'event', 'critical', 'fumble', 'misfire',
    'weapon', 'armour', 'armor', 'equipment', 'spell',
  ];
  
  for (const term of terms) {
    if (rawLower.includes(term)) {
      keywords.push(term);
    }
  }
  
  return [...new Set(keywords)];
}

/**
 * Detect datasets (structured collections that span multiple tables)
 */
export function detectDatasets(
  tables: Omit<RulesTable, "id" | "created_at">[],
  chunks: { text: string; keywords: string[] }[],
  sourceId: string
): {
  datasets: Omit<import("@/types/rulesV2").RulesDataset, "id" | "created_at">[];
  rows: Map<string, Omit<import("@/types/rulesV2").RulesDatasetRow, "id" | "dataset_id" | "created_at">[]>;
} {
  const datasets: Omit<import("@/types/rulesV2").RulesDataset, "id" | "created_at">[] = [];
  const rows = new Map<string, Omit<import("@/types/rulesV2").RulesDatasetRow, "id" | "dataset_id" | "created_at">[]>();
  
  // Group high-confidence equipment tables into a dataset
  const equipmentTables = tables.filter(t => t.keywords.includes('equipment') && t.confidence !== 'low');
  if (equipmentTables.length > 0) {
    const allRows: Omit<import("@/types/rulesV2").RulesDatasetRow, "id" | "dataset_id" | "created_at">[] = [];
    const fields = new Set<string>();
    
    for (const table of equipmentTables) {
      if (table.parsed_rows) {
        for (const row of table.parsed_rows) {
          Object.keys(row).forEach(k => fields.add(k));
          allRows.push({
            data: row,
            page_number: table.page_number,
            source_path: null,
          });
        }
      }
    }
    
    if (allRows.length > 0) {
      datasets.push({
        source_id: sourceId,
        name: 'Equipment',
        dataset_type: 'equipment',
        fields: [...fields],
        confidence: 'high',
      });
      rows.set('Equipment', allRows);
    }
  }
  
  // Group skill-related tables
  const skillTables = tables.filter(t => t.keywords.includes('skill'));
  if (skillTables.length > 0) {
    const allRows: Omit<import("@/types/rulesV2").RulesDatasetRow, "id" | "dataset_id" | "created_at">[] = [];
    const fields = new Set<string>();
    
    for (const table of skillTables) {
      if (table.parsed_rows) {
        for (const row of table.parsed_rows) {
          Object.keys(row).forEach(k => fields.add(k));
          allRows.push({
            data: row,
            page_number: table.page_number,
            source_path: null,
          });
        }
      }
    }
    
    if (allRows.length > 0) {
      datasets.push({
        source_id: sourceId,
        name: 'Skills',
        dataset_type: 'skills',
        fields: [...fields],
        confidence: 'medium',
      });
      rows.set('Skills', allRows);
    }
  }
  
  // Group injury tables
  const injuryTables = tables.filter(t => t.keywords.includes('injury') && t.confidence !== 'low');
  if (injuryTables.length > 0) {
    const allRows: Omit<import("@/types/rulesV2").RulesDatasetRow, "id" | "dataset_id" | "created_at">[] = [];
    
    for (const table of injuryTables) {
      if (table.parsed_rows) {
        for (const row of table.parsed_rows) {
          allRows.push({
            data: row,
            page_number: table.page_number,
            source_path: null,
          });
        }
      }
    }
    
    if (allRows.length > 0) {
      datasets.push({
        source_id: sourceId,
        name: 'Injuries',
        dataset_type: 'injuries',
        fields: ['Roll', 'Result'],
        confidence: 'high',
      });
      rows.set('Injuries', allRows);
    }
  }
  
  return { datasets, rows };
}
