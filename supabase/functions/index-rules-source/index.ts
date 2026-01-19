import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildChunksFromText } from "../_shared/indexing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type IndexStats = {
  pages?: number;
  pagesExtracted: number;
  emptyPages: number;
  avgCharsPerPage: number;
  sections: number;
  chunks: number;
  tablesHigh: number;
  tablesLow: number;
  datasets: number;
  timeMsByStage: Record<string, number>;
  ocrAttempted: boolean;
  ocrSucceeded: boolean;
  pageHashes: { pageNumber: number; hash: string }[];
};

type PreDetectedTable = {
  confidence?: 'high' | 'medium' | 'low';
  type?: string;
  rows?: string[][];
  columns?: string[];
  title?: string;
  pageNumber: number;
  rawText?: string;
  headerContext?: string;
  diceType?: string;
};

type PreDetectedSection = { title: string; pageNumber: number };

type GitHubTable = { name: string; rows?: Record<string, unknown>[] };
type GitHubSection = { title: string; text?: string; tables?: GitHubTable[] };
type GitHubGroup = { name: string; description?: string; sections?: GitHubSection[] };
type GitHubDataset = { name: string; type?: string; fields?: string[]; rows?: Record<string, unknown>[] };
type GitHubRulesJson = { groups?: GitHubGroup[]; datasets?: GitHubDataset[] };

type IndexRequest = {
  sourceId?: string;
  githubData?: GitHubRulesJson;
  preDetectedTables?: PreDetectedTable[];
  preDetectedSections?: PreDetectedSection[];
  clientStats?: Partial<IndexStats>;
  clientTimings?: Record<string, number>;
};

type RulesPage = { page_number: number; text: string };
type RulesSection = {
  title: string;
  page_start: number;
  page_end: number;
  text: string;
  section_path: string[];
  sectionType: string;
};

type RulesChunk = {
  text: string;
  page_start: number;
  page_end: number;
  order_index: number;
  section_path: string[];
  score_hints: {
    hasRollRanges: boolean;
    hasTablePattern: boolean;
    hasDiceTable: boolean;
    sectionType: string;
  };
};

type DetectedTable = {
  pageNumber: number;
  title: string;
  rawText: string;
  parsedRows?: Record<string, unknown>[] | null;
  confidence: 'high' | 'medium' | 'low';
  headerContext?: string | null;
  keywords?: string[] | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: SupabaseClient | null = null;
  let requestSourceId: string | undefined;

  try {
    const requestStart = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceId, githubData, preDetectedTables, preDetectedSections, clientStats, clientTimings } =
      (await req.json()) as IndexRequest;
    requestSourceId = sourceId;
    if (!sourceId) {
      return new Response(JSON.stringify({ error: 'sourceId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: source, error: sourceError } = await supabase
      .from('rules_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({ error: 'Source not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const log = (message: string, data: Record<string, unknown> = {}) => {
      console.log(JSON.stringify({ scope: 'index-rules-source', message, ...data }));
    };

    log('indexing_started', { sourceId, type: source.type });
    await supabase.from('rules_sources').update({ index_status: 'indexing', index_error: null }).eq('id', sourceId);

    let indexResult: { stats: IndexStats; failed: boolean; errorMessage?: string; errorStage?: string } = {
      stats: {
        pages: 0,
        pagesExtracted: 0,
        emptyPages: 0,
        avgCharsPerPage: 0,
        sections: 0,
        chunks: 0,
        tablesHigh: 0,
        tablesLow: 0,
        datasets: 0,
        timeMsByStage: {},
        ocrAttempted: false,
        ocrSucceeded: false,
        pageHashes: [],
      },
      failed: false,
    };

    if (githubData) {
      indexResult = { stats: await processGitHubJson(supabase, sourceId, githubData), failed: false };
    } else {
      indexResult = await processFromPages(
        supabase,
        sourceId,
        preDetectedTables,
        preDetectedSections,
        source.index_stats || {},
        clientStats,
        clientTimings
      );
    }
    const stats = indexResult.stats;
    stats.timeMsByStage.total = Math.round(performance.now() - requestStart);
    stats.timeMsByStage.indexing = stats.timeMsByStage.total;
    stats.pages = stats.pages ?? stats.pagesExtracted;

    if (indexResult.failed) {
      await supabase.from('rules_sources').update({
        index_status: 'failed',
        index_stats: stats,
        index_error: { stage: indexResult.errorStage || 'indexing', message: indexResult.errorMessage || 'Indexing failed' },
        last_indexed_at: new Date().toISOString(),
      }).eq('id', sourceId);

      return new Response(JSON.stringify({ error: indexResult.errorMessage || 'Indexing failed', stats }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await supabase.from('rules_sources').update({
      index_status: 'indexed',
      index_stats: stats,
      index_error: null,
      last_indexed_at: new Date().toISOString()
    }).eq('id', sourceId);

    log('indexing_completed', { sourceId, stats });

    return new Response(JSON.stringify({
      success: true,
      message: `Indexed ${stats.pagesExtracted} pages, ${stats.chunks} chunks, ${stats.tablesHigh + stats.tablesLow} tables`,
      stats
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Indexing error:', error);
    if (supabase && requestSourceId) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await supabase.from('rules_sources').update({
        index_status: 'failed',
        index_error: { stage: 'indexing', message },
        index_stats: {
          pages: 0,
          pagesExtracted: 0,
          emptyPages: 0,
          avgCharsPerPage: 0,
          sections: 0,
          chunks: 0,
          tablesHigh: 0,
          tablesLow: 0,
          datasets: 0,
          timeMsByStage: { total: 0, indexing: 0 },
          ocrAttempted: false,
          ocrSucceeded: false,
          pageHashes: [],
        },
        last_indexed_at: new Date().toISOString(),
      }).eq('id', requestSourceId);
    }
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

type IndexResult = { stats: IndexStats; failed: boolean; errorMessage?: string; errorStage?: string };

async function processFromPages(
  supabase: SupabaseClient,
  sourceId: string,
  preDetectedTables?: PreDetectedTable[],
  preDetectedSections?: PreDetectedSection[],
  previousStats: Record<string, unknown> = {},
  clientStats: Partial<IndexStats> = {},
  clientTimings: Record<string, number> = {},
): Promise<IndexResult> {
  const loadStart = performance.now();
  const { data: pages } = await supabase
    .from('rules_pages')
    .select('page_number, text')
    .eq('source_id', sourceId)
    .order('page_number');

  const timeMsByStage: Record<string, number> = { ...clientTimings };
  timeMsByStage.loadPages = Math.round(performance.now() - loadStart);

  if (!pages?.length) {
    return {
      stats: {
        pages: 0,
        pagesExtracted: 0,
        emptyPages: 0,
        avgCharsPerPage: 0,
        sections: 0,
        chunks: 0,
        tablesHigh: 0,
        tablesLow: 0,
        datasets: 0,
        timeMsByStage,
        ocrAttempted: false,
        ocrSucceeded: false,
        pageHashes: [],
      },
      failed: true,
      errorMessage: 'No pages found',
      errorStage: 'empty',
    };
  }

  const { stats: pageStats, shouldFail } = buildPageStats(pages, clientStats);
  const pageHashes = await buildPageHashes(pages);
  timeMsByStage.hashPages = pageHashes.timeMs;

  if (shouldSkipReindex(previousStats, pageHashes.hashes)) {
    return {
      stats: {
        ...pageStats,
        sections: (previousStats.sections as number) ?? 0,
        chunks: (previousStats.chunks as number) ?? 0,
        tablesHigh: (previousStats.tablesHigh as number) ?? 0,
        tablesLow: (previousStats.tablesLow as number) ?? 0,
        datasets: (previousStats.datasets as number) ?? 0,
        timeMsByStage,
        pageHashes: pageHashes.hashes,
      },
      failed: false,
    };
  }

  // Clear existing data
  await supabase.from('rules_chunks').delete().eq('source_id', sourceId);
  await supabase.from('rules_tables').delete().eq('source_id', sourceId);
  await supabase.from('rules_sections').delete().eq('source_id', sourceId);

  if (shouldFail) {
    return {
      stats: {
        ...pageStats,
        sections: 0,
        chunks: 0,
        tablesHigh: 0,
        tablesLow: 0,
        datasets: 0,
        timeMsByStage,
        ocrAttempted: pageStats.ocrAttempted,
        ocrSucceeded: pageStats.ocrSucceeded,
        pageHashes: pageHashes.hashes,
      },
      failed: true,
      errorMessage: 'Scanned PDF detected. Use OCR / alternate method.',
      errorStage: 'scanned_pdf',
    };
  }

  // Enhanced section header patterns
  const sectionPatterns = [
    /^(?:CHAPTER|PART)\s+[\dIVXLC]+[:.]?\s*(.+)?$/im,
    /^###\s+(.+)$/m,
    /^##\s+(.+)$/m,
    /^#\s+(.+)$/m,
    /^(\d+\.\d+\.\d+)\s+([A-Z].+)$/m,
    /^(\d+\.\d+)\s+([A-Z].+)$/m,
    /^(\d+\.)\s+([A-Z].+)$/m,
    /^([A-Z][A-Z\s]{4,50})$/m,
    /^(?:SECTION|APPENDIX)[:\s]+(.+)$/im,
    /^(POST[- ]?GAME\s+SEQUENCE|POST[- ]?BATTLE)$/im,
    /^(EXPLORATION|EXPLORATION\s+PHASE)$/im,
    /^(CAMPAIGN\s+RULES|CAMPAIGN\s+PLAY)$/im,
    /^(SKILLS|SKILL\s+LIST|SKILLS\s*&\s*ABILITIES)$/im,
    /^(EQUIPMENT|WEAPONS?\s+LIST|ARMOU?R\s+LIST)$/im,
    /^(INJURIES|INJURY\s+TABLE|SERIOUS\s+INJURIES)$/im,
    /^(WARBANDS?|GANG|WARBAND\s+CREATION)$/im,
    /^(SCENARIOS?|MISSIONS?)$/im,
    /^(ABILITIES|SPECIAL\s+RULES?)$/im,
  ];

  // Determine section type from title
  function determineSectionType(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('exploration') || lowerTitle.includes('explore')) return 'exploration';
    if (lowerTitle.includes('skill') || lowerTitle.includes('abilities')) return 'skills';
    if (lowerTitle.includes('post-game') || lowerTitle.includes('post game') || lowerTitle.includes('post-battle')) return 'post-game';
    if (lowerTitle.includes('equipment') || lowerTitle.includes('weapon') || lowerTitle.includes('armour') || lowerTitle.includes('armor')) return 'equipment';
    if (lowerTitle.includes('injury') || lowerTitle.includes('injuries')) return 'post-game';
    if (lowerTitle.includes('campaign')) return 'core';
    return 'other';
  }

  const sectionStart = performance.now();
  const sections = buildSections(pages, sectionPatterns, determineSectionType, preDetectedSections);
  timeMsByStage.sectionDetection = Math.round(performance.now() - sectionStart);

  const writeStart = performance.now();
  await insertInBatches(supabase, 'rules_sections', sections.map((s) => ({
    source_id: sourceId,
    title: s.title,
    page_start: s.page_start,
    page_end: s.page_end,
    text: s.text.substring(0, 50000),
    section_path: s.section_path,
    keywords: [s.sectionType],
  })));

  const chunkStart = performance.now();
  const chunks: RulesChunk[] = [];
  let orderIndex = 0;
  for (const section of sections) {
    const sectionChunks = buildChunksFromText(section.text, { targetSize: 1800, overlap: 200 });
    for (const { text } of sectionChunks) {
      const chunkText = text.trim();
      if (!chunkText) continue;
      const hasDiceNotation = /\b[dD]\d+\b/.test(chunkText);
      const hasRollRanges = /\b[1-6]\s*[-–—]\s*[1-6]\b/.test(chunkText) || /\b[1-6][1-6]\s*[-–—]\s*[1-6][1-6]\b/.test(chunkText);
      const hasPipeTable = /\|.*\|/.test(chunkText);
      const hasWhitespaceTable = detectWhitespaceTablePattern(chunkText);

      chunks.push({
        text: chunkText,
        page_start: section.page_start,
        page_end: section.page_end,
        order_index: orderIndex++,
        section_path: section.section_path,
        score_hints: {
          hasRollRanges: hasDiceNotation || hasRollRanges,
          hasTablePattern: hasPipeTable || hasWhitespaceTable,
          hasDiceTable: hasRollRanges,
          sectionType: section.sectionType,
        }
      });
    }
  }

  await insertInBatches(supabase, 'rules_chunks', chunks.map((c) => ({ source_id: sourceId, ...c })));
  timeMsByStage.chunking = Math.round(performance.now() - chunkStart);

  let tablesHigh = 0, tablesLow = 0;
  const tableStart = performance.now();

  if (preDetectedTables?.length) {
    const tableRecords: Record<string, unknown>[] = [];
    for (const table of preDetectedTables) {
      const confidence = table.confidence || 'medium';
      if (confidence === 'high') tablesHigh++; else tablesLow++;

      let parsedRows: Record<string, string>[] | null = null;
      if (table.type === 'dice-roll' && table.rows) {
        parsedRows = table.rows.map((row: string[]) => ({
          roll: row[0],
          result: row[1],
        }));
      } else if (table.rows) {
        parsedRows = table.rows.map((row: string[]) => {
          const obj: Record<string, string> = {};
          (table.columns || []).forEach((col: string, i: number) => {
            obj[col || `col${i}`] = row[i] || '';
          });
          return obj;
        });
      }

      tableRecords.push({
        source_id: sourceId,
        title_guess: table.title?.substring(0, 100) || 'Untitled Table',
        page_number: table.pageNumber,
        raw_text: table.rawText?.substring(0, 5000) || '',
        parsed_rows: parsedRows,
        confidence,
        header_context: table.headerContext?.substring(0, 500) || null,
        keywords: table.diceType ? [table.diceType, table.type] : [table.type],
      });
    }
    await insertInBatches(supabase, 'rules_tables', tableRecords);
  } else {
    const detectedTables = detectTablesFromPages(pages);
    const tableRecords: Record<string, unknown>[] = [];
    for (const table of detectedTables) {
      if (table.confidence === 'high') tablesHigh++; else tablesLow++;
      tableRecords.push({
        source_id: sourceId,
        title_guess: table.title?.substring(0, 100) || 'Untitled Table',
        page_number: table.pageNumber,
        raw_text: table.rawText?.substring(0, 5000) || '',
        parsed_rows: table.parsedRows ?? null,
        confidence: table.confidence,
        header_context: table.headerContext || null,
        keywords: table.keywords || null,
      });
    }
    await insertInBatches(supabase, 'rules_tables', tableRecords);
  }

  timeMsByStage.tableDetection = Math.round(performance.now() - tableStart);
  timeMsByStage.writeBatches = Math.round(performance.now() - writeStart);

  return {
    stats: {
      ...pageStats,
      sections: sections.length,
      chunks: chunks.length,
      tablesHigh,
      tablesLow,
      datasets: 0,
      timeMsByStage,
      pageHashes: pageHashes.hashes,
    },
    failed: false,
  };
}

/**
 * Detect if text contains whitespace-aligned table patterns
 */
function detectWhitespaceTablePattern(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim().length > 10);
  if (lines.length < 3) return false;

  let linesWithGaps = 0;
  for (const line of lines) {
    if (/\S\s{3,}\S/.test(line)) {
      linesWithGaps++;
    }
  }

  return linesWithGaps >= Math.min(3, lines.length * 0.5);
}

async function processGitHubJson(supabase: SupabaseClient, sourceId: string, json: GitHubRulesJson): Promise<IndexStats> {
  let sectionsCount = 0, chunksCount = 0, tablesHigh = 0, datasetsCount = 0, pseudoPage = 1;
  const timeMsByStage: Record<string, number> = {};
  const start = performance.now();
  const sectionRows: Record<string, unknown>[] = [];
  const chunkRows: Record<string, unknown>[] = [];
  const tableRows: Record<string, unknown>[] = [];

  if (json.groups) {
    for (const group of json.groups) {
      sectionRows.push({
        source_id: sourceId,
        title: group.name,
        text: group.description || null,
        section_path: [group.name],
        page_start: pseudoPage,
        page_end: pseudoPage,
      });
      sectionsCount++;

      if (group.sections) {
        for (const section of group.sections) {
          sectionRows.push({
            source_id: sourceId,
            title: section.title,
            text: section.text?.substring(0, 50000) || null,
            section_path: [group.name, section.title],
            page_start: pseudoPage,
            page_end: pseudoPage,
          });
          sectionsCount++;

          if (section.text) {
            chunkRows.push({
              source_id: sourceId,
              text: section.text.substring(0, 1800),
              section_path: [group.name, section.title],
              page_start: pseudoPage,
              page_end: pseudoPage,
              order_index: chunksCount,
              score_hints: { hasRollRanges: false, hasTablePattern: false },
            });
            chunksCount++;
          }

          if (section.tables) {
            for (const table of section.tables) {
              tableRows.push({
                source_id: sourceId,
                title_guess: table.name,
                page_number: pseudoPage,
                raw_text: JSON.stringify(table).substring(0, 5000),
                confidence: 'high',
                parsed_rows: table.rows || [],
                keywords: ['table'],
              });
              tablesHigh++;
            }
          }
        }
      }
      pseudoPage++;
    }
  }

  if (json.datasets) {
    for (const ds of json.datasets) {
      const { data: rec } = await supabase.from('rules_datasets').insert({
        source_id: sourceId, name: ds.name, dataset_type: ds.type || 'other',
        fields: ds.fields || [], confidence: 'high'
      }).select().single();
      const datasetId = rec && typeof rec.id !== 'undefined' ? rec.id : null;
      if (datasetId && ds.rows) {
        const datasetRows = ds.rows.map((row) => ({ dataset_id: datasetId, data: row }));
        await insertInBatches(supabase, 'rules_dataset_rows', datasetRows);
      }
      datasetsCount++;
    }
  }

  await insertInBatches(supabase, 'rules_sections', sectionRows);
  await insertInBatches(supabase, 'rules_chunks', chunkRows);
  await insertInBatches(supabase, 'rules_tables', tableRows);

  timeMsByStage.total = Math.round(performance.now() - start);

  return {
    pages: pseudoPage,
    pagesExtracted: pseudoPage,
    emptyPages: 0,
    avgCharsPerPage: 0,
    sections: sectionsCount,
    chunks: chunksCount,
    tablesHigh,
    tablesLow: 0,
    datasets: datasetsCount,
    timeMsByStage,
    ocrAttempted: false,
    ocrSucceeded: false,
    pageHashes: [],
  };
}

async function insertInBatches(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 200
) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw error;
  }
}

function buildPageStats(pages: RulesPage[], clientStats: Partial<IndexStats>) {
  const totalChars = pages.reduce((acc, page) => acc + page.text.trim().length, 0);
  const emptyPages = pages.filter((page) => page.text.trim().length < 20).length;
  const avgCharsPerPage = pages.length ? Math.round(totalChars / pages.length) : 0;
  const emptyRatio = pages.length ? emptyPages / pages.length : 0;
  const shouldFail = emptyRatio >= 0.6 || avgCharsPerPage < 40;
  const defaultStats: IndexStats = {
    pages: pages.length,
    pagesExtracted: pages.length,
    emptyPages,
    avgCharsPerPage,
    sections: 0,
    chunks: 0,
    tablesHigh: 0,
    tablesLow: 0,
    datasets: 0,
    timeMsByStage: {},
    ocrAttempted: false,
    ocrSucceeded: false,
    pageHashes: [],
  };

  return {
    stats: {
      ...defaultStats,
      ...clientStats,
      pages: clientStats.pages ?? clientStats.pagesExtracted ?? pages.length,
      pagesExtracted: clientStats.pagesExtracted ?? pages.length,
      emptyPages,
      avgCharsPerPage,
      timeMsByStage: {
        ...defaultStats.timeMsByStage,
        ...(clientStats.timeMsByStage ?? {}),
      },
    },
    shouldFail,
  };
}

async function buildPageHashes(pages: RulesPage[]) {
  const start = performance.now();
  const hashes = await Promise.all(
    pages.map(async (page) => ({
      pageNumber: page.page_number,
      hash: await sha256(page.text),
    }))
  );
  return { hashes, timeMs: Math.round(performance.now() - start) };
}

function shouldSkipReindex(previousStats: Record<string, unknown>, newHashes: { pageNumber: number; hash: string }[]) {
  const previousHashes = (previousStats.pageHashes as { pageNumber: number; hash: string }[]) || [];
  if (!previousHashes.length || previousHashes.length !== newHashes.length) return false;
  return previousHashes.every((prev, index) => prev.pageNumber === newHashes[index].pageNumber && prev.hash === newHashes[index].hash);
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildSections(
  pages: RulesPage[],
  sectionPatterns: RegExp[],
  determineSectionType: (title: string) => string,
  preDetectedSections?: PreDetectedSection[],
) {
  const sections: RulesSection[] = [];
  let currentSection: RulesSection | null = null;
  let headerCount = 0;

  for (const page of pages) {
    const lines = page.text.split('\n');
    const detectedHeader = findHeader(lines, sectionPatterns, preDetectedSections, page.page_number);

    if (detectedHeader) {
      headerCount += 1;
      if (currentSection?.text) {
        currentSection.page_end = page.page_number - 1;
        sections.push(currentSection);
      }

      const title = detectedHeader.title;
      currentSection = {
        title,
        page_start: page.page_number,
        page_end: page.page_number,
        text: page.text,
        section_path: [title],
        sectionType: determineSectionType(title),
      };
    } else if (currentSection) {
      currentSection.text += '\n' + page.text;
      currentSection.page_end = page.page_number;
    } else {
      currentSection = {
        title: `Page ${page.page_number}`,
        page_start: page.page_number,
        page_end: page.page_number,
        text: page.text,
        section_path: [`Page ${page.page_number}`],
        sectionType: 'other',
      };
    }
  }

  if (currentSection?.text) sections.push(currentSection);

  if (headerCount === 0) {
    return pages.map((page) => ({
      title: `Page ${page.page_number}`,
      page_start: page.page_number,
      page_end: page.page_number,
      text: page.text,
      section_path: [`Page ${page.page_number}`],
      sectionType: 'other',
    }));
  }

  return sections;
}

function findHeader(
  lines: string[],
  sectionPatterns: RegExp[],
  preDetectedSections: PreDetectedSection[] | undefined,
  pageNumber: number,
) {
  const detected = preDetectedSections?.find((section) => section.pageNumber === pageNumber);
  if (detected) {
    return { title: detected.title };
  }

  for (const line of lines) {
    for (const pattern of sectionPatterns) {
      const match = line.trim().match(pattern);
      if (match && line.trim().length > 2 && line.trim().length < 80) {
        if (line.match(/^\d+\s*[-–—]\s*\d+/)) continue;
        const title = (match[1] || match[2] || line.trim()).replace(/^#+\s*/, '').trim().substring(0, 100);
        return { title };
      }
    }
  }

  return null;
}

function detectTablesFromPages(pages: RulesPage[]): DetectedTable[] {
  const tables: DetectedTable[] = [];

  for (const page of pages) {
    const lines = page.text.split('\n');
    let currentLines: string[] = [];
    let tableStart = -1;

    const flush = () => {
      if (currentLines.length < 2) {
        currentLines = [];
        tableStart = -1;
        return;
      }

      const headerContext = lines
        .slice(Math.max(0, tableStart - 3), tableStart)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' | ');

      const diceRows = currentLines.filter((line) => isDiceRangeLine(line));
      const pipeRows = currentLines.filter((line) => line.includes('|'));
      const parsedRows = parseDiceRows(diceRows) || parsePipeRows(pipeRows);

      const confidence = determineTableConfidence(currentLines, diceRows.length);

      tables.push({
        pageNumber: page.page_number,
        title: inferTableTitle(headerContext, currentLines[0]),
        rawText: currentLines.join('\n'),
        parsedRows,
        confidence,
        headerContext: headerContext || null,
        keywords: buildTableKeywords(diceRows.length, pipeRows.length),
      });

      currentLines = [];
      tableStart = -1;
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      const isTableLine = looksLikeTableLine(line);

      if (isTableLine) {
        if (currentLines.length === 0) tableStart = i;
        currentLines.push(line);
      } else if (currentLines.length) {
        flush();
      }
    }

    if (currentLines.length) flush();
  }

  return tables;
}

function looksLikeTableLine(line: string) {
  if (!line) return false;
  if (/\|.+\|/.test(line)) return true;
  if (isDiceRangeLine(line)) return true;
  if (/\S\s{2,}\S/.test(line)) return true;
  return false;
}

function isDiceRangeLine(line: string) {
  return /^\s*(\d{1,2}|[1-6][1-6])\s*[-–—]?\s+/.test(line) || /\bD66\b/i.test(line);
}

function parseDiceRows(lines: string[]) {
  if (lines.length < 2) return null;
  const rows = lines.map((row) => {
    const match = row.match(/^\s*([0-9]{1,2}|[1-6][1-6])\s*[-–—]?\s*(.+)/);
    return match ? { roll: match[1], result: match[2].trim() } : { roll: '?', result: row.trim() };
  });
  return rows;
}

function parsePipeRows(lines: string[]) {
  if (lines.length < 2) return null;
  const parsed = lines.map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));
  if (parsed.length < 2) return null;
  const [header, ...rows] = parsed;
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    header.forEach((col, index) => {
      obj[col || `col${index + 1}`] = row[index] || '';
    });
    return obj;
  });
}

function determineTableConfidence(lines: string[], diceRowCount: number) {
  if (diceRowCount >= 3) return 'high';
  if (lines.length >= 4) return 'medium';
  return 'low';
}

function inferTableTitle(headerContext: string, firstLine: string) {
  if (headerContext) return headerContext.split(' | ').slice(-1)[0];
  const rollMatch = firstLine.match(/^(Table|Roll on|Rolls on|Roll)\s*:?(.+)?/i);
  if (rollMatch) return rollMatch[2]?.trim() || rollMatch[1];
  return 'Table';
}

function buildTableKeywords(diceCount: number, pipeCount: number) {
  const keywords = [];
  if (diceCount >= 2) keywords.push('dice-roll');
  if (pipeCount >= 2) keywords.push('pipe');
  return keywords.length ? keywords : null;
}
