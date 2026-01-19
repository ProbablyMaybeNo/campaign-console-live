// Shared helpers for AI component builder (rule retrieval + table parsing)

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","from","at","by","as","is","are","was","were",
  "make","create","build","generate","show","me","please","table","tables","card","cards","widget","widgets",
  "into","within","about","using","use","rules","pdf","rulebook","content","containing","contains",
]);

export function extractQueryTerms(input: string): string[] {
  const raw = (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t));

  // De-dupe while preserving order
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const t of raw) {
    if (!seen.has(t)) {
      seen.add(t);
      terms.push(t);
    }
  }
  return terms.slice(0, 12);
}

export function scoreText(text: string, terms: string[]): number {
  if (!text) return 0;
  const hay = text.toLowerCase();
  let score = 0;

  for (const term of terms) {
    // simple containment with small bonus for exact word boundary
    if (hay.includes(term)) score += 2;
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text)) score += 2;
  }

  return score;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseMarkdownPipeTable(raw: string): { columns: string[]; rows: Record<string, string>[] } | null {
  if (!raw) return null;

  // Find first contiguous block of pipe-table-ish lines
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 3) return null;

  const header = splitPipeRow(lines[0]);
  const separator = lines[1];
  const isSeparator = /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/.test(separator);
  if (!isSeparator) return null;

  const columns = header.map((h, idx) => (h || `Column ${idx + 1}`).trim()).filter(Boolean);
  if (columns.length === 0) return null;

  const rows: Record<string, string>[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = splitPipeRow(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }

  if (rows.length === 0) return null;
  return { columns, rows };
}

function splitPipeRow(line: string): string[] {
  // Remove first/last pipe then split
  const inner = line.replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => c.trim());
}

export function buildTableDataFromDbRecord(table: {
  parsed_rows?: unknown;
  raw_text?: string | null;
}): { columns: string[]; rows: Record<string, string>[] } | null {
  const parsedRows = table.parsed_rows;

  if (Array.isArray(parsedRows) && parsedRows.length > 0 && parsedRows[0] && typeof parsedRows[0] === "object") {
    const first = parsedRows[0] as Record<string, unknown>;
    const columns = Object.keys(first).map((c) => c.trim()).filter(Boolean);
    if (columns.length === 0) return null;

    const rows = (parsedRows as Record<string, unknown>[]).map((r) => {
      const out: Record<string, string> = {};
      columns.forEach((c) => {
        const v = r[c];
        out[c] = typeof v === "string" ? v : v == null ? "" : String(v);
      });
      return out;
    });

    return { columns, rows };
  }

  if (table.raw_text) {
    return parseMarkdownPipeTable(table.raw_text);
  }

  return null;
}
