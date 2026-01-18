// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceId, githubData, preDetectedTables } = await req.json();
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

    console.log(`Indexing source ${sourceId}, type: ${source.type}`);
    await supabase.from('rules_sources').update({ index_status: 'indexing' }).eq('id', sourceId);

    // Clear existing data
    await supabase.from('rules_chunks').delete().eq('source_id', sourceId);
    await supabase.from('rules_tables').delete().eq('source_id', sourceId);
    await supabase.from('rules_sections').delete().eq('source_id', sourceId);

    let stats = { pages: 0, sections: 0, chunks: 0, tablesHigh: 0, tablesLow: 0, datasets: 0 };

    if (githubData) {
      stats = await processGitHubJson(supabase, sourceId, githubData);
    } else {
      stats = await processFromPages(supabase, sourceId, preDetectedTables);
    }

    await supabase.from('rules_sources').update({
      index_status: 'indexed',
      index_stats: stats,
      index_error: null,
      last_indexed_at: new Date().toISOString()
    }).eq('id', sourceId);

    return new Response(JSON.stringify({
      success: true,
      message: `Indexed ${stats.pages} pages, ${stats.chunks} chunks, ${stats.tablesHigh + stats.tablesLow} tables`,
      stats
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Indexing error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processFromPages(supabase: any, sourceId: string, preDetectedTables?: any[]) {
  const { data: pages } = await supabase
    .from('rules_pages')
    .select('page_number, text')
    .eq('source_id', sourceId)
    .order('page_number');

  if (!pages?.length) {
    await supabase.from('rules_sources').update({
      index_status: 'failed',
      index_error: { stage: 'empty', message: 'No pages found' }
    }).eq('id', sourceId);
    throw new Error('No content to index');
  }

  // Enhanced section header patterns
  const sectionPatterns = [
    /^(?:CHAPTER|PART)\s+[\dIVXLC]+[:\.]?\s*(.+)?$/im,
    /^###\s+(.+)$/m,
    /^##\s+(.+)$/m,
    /^#\s+(.+)$/m,
    /^(\d+\.\d+\.\d+)\s+([A-Z].+)$/m,
    /^(\d+\.\d+)\s+([A-Z].+)$/m,
    /^(\d+\.)\s+([A-Z].+)$/m,
    /^([A-Z][A-Z\s]{4,50})$/m,
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

  // Build sections with enhanced detection
  const sections: any[] = [];
  let currentSection = { 
    title: 'Introduction', 
    page_start: 1, 
    page_end: 1, 
    text: '', 
    section_path: ['Introduction'],
    sectionType: 'other'
  };

  for (const page of pages) {
    const lines = page.text.split('\n');
    let foundHeader = false;
    
    for (const line of lines) {
      for (const pattern of sectionPatterns) {
        const match = line.trim().match(pattern);
        if (match && line.trim().length > 2 && line.trim().length < 80) {
          // Avoid matching dice roll lines
          if (line.match(/^\d+\s*[-–—]\s*\d+/)) continue;
          
          if (currentSection.text) {
            sections.push({ ...currentSection, page_end: page.page_number - 1 });
          }
          
          const title = (match[1] || match[2] || line.trim()).replace(/^#+\s*/, '').trim().substring(0, 100);
          currentSection = { 
            title, 
            page_start: page.page_number, 
            page_end: page.page_number, 
            text: page.text, 
            section_path: [title],
            sectionType: determineSectionType(title)
          };
          foundHeader = true;
          break;
        }
      }
      if (foundHeader) break;
    }
    
    if (!foundHeader) {
      currentSection.text += '\n' + page.text;
      currentSection.page_end = page.page_number;
    }
  }
  if (currentSection.text) sections.push(currentSection);

  for (const s of sections) {
    await supabase.from('rules_sections').insert({
      source_id: sourceId, 
      title: s.title, 
      page_start: s.page_start, 
      page_end: s.page_end,
      text: s.text.substring(0, 50000), 
      section_path: s.section_path,
      keywords: [s.sectionType],
    });
  }

  // Build chunks with enhanced score hints
  const chunks: any[] = [];
  let orderIndex = 0;
  for (const section of sections) {
    let pos = 0;
    while (pos < section.text.length) {
      let end = Math.min(pos + 1800, section.text.length);
      const chunkText = section.text.slice(pos, end).trim();
      if (chunkText) {
        // Enhanced score hints
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
      pos = end - 200;
      if (pos >= section.text.length - 200) break;
    }
  }

  for (const c of chunks) {
    await supabase.from('rules_chunks').insert({ source_id: sourceId, ...c });
  }

  // Detect tables - use pre-detected if available, otherwise detect
  let tablesHigh = 0, tablesLow = 0;
  
  if (preDetectedTables?.length) {
    // Use pre-detected tables from client
    for (const table of preDetectedTables) {
      const confidence = table.confidence || 'medium';
      if (confidence === 'high') tablesHigh++; else tablesLow++;
      
      // Parse dice roll tables into structured rows
      let parsedRows = null;
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
      
      await supabase.from('rules_tables').insert({
        source_id: sourceId, 
        title_guess: table.title?.substring(0, 100) || 'Untitled Table',
        page_number: table.pageNumber, 
        raw_text: table.rawText?.substring(0, 5000) || '',
        parsed_rows: parsedRows,
        confidence,
        keywords: table.diceType ? [table.diceType, table.type] : [table.type],
      });
    }
  } else {
    // Fallback to pattern detection
    // Pipe tables
    const pipePattern = /(?:^|\n)([A-Z][^\n]{0,50})\n((?:\|[^\n]+\|\n?)+)/g;
    for (const page of pages) {
      for (const match of page.text.matchAll(pipePattern)) {
        const confidence = match[2].split('\n').length > 3 ? 'high' : 'low';
        if (confidence === 'high') tablesHigh++; else tablesLow++;
        await supabase.from('rules_tables').insert({
          source_id: sourceId, 
          title_guess: match[1].trim().substring(0, 100),
          page_number: page.page_number, 
          raw_text: match[0].substring(0, 5000), 
          confidence
        });
      }
    }
    
    // Dice roll tables (D6 pattern)
    const d6Pattern = /(?:^|\n)([A-Z][^\n]{0,50})\n((?:\s*[1-6]\s*[-–—]?\s*.+\n?){3,})/g;
    for (const page of pages) {
      for (const match of page.text.matchAll(d6Pattern)) {
        const rows: string[] = match[2].trim().split('\n').filter((r: string) => r.trim());
        if (rows.length >= 3) {
          const parsedRows = rows.map((row: string) => {
            const m = row.match(/^\s*([1-6])\s*[-–—]?\s*(.+)/);
            return m ? { roll: m[1], result: m[2].trim() } : { roll: '?', result: row.trim() };
          });
          tablesHigh++;
          await supabase.from('rules_tables').insert({
            source_id: sourceId,
            title_guess: match[1].trim().substring(0, 100),
            page_number: page.page_number,
            raw_text: match[0].substring(0, 5000),
            parsed_rows: parsedRows,
            confidence: 'high',
            keywords: ['d6', 'dice-roll'],
          });
        }
      }
    }
  }

  return { pages: pages.length, sections: sections.length, chunks: chunks.length, tablesHigh, tablesLow, datasets: 0 };
}

/**
 * Detect if text contains whitespace-aligned table patterns
 */
function detectWhitespaceTablePattern(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim().length > 10);
  if (lines.length < 3) return false;
  
  // Check for consistent multi-space gaps
  let linesWithGaps = 0;
  for (const line of lines) {
    if (/\S\s{3,}\S/.test(line)) {
      linesWithGaps++;
    }
  }
  
  return linesWithGaps >= Math.min(3, lines.length * 0.5);
}

async function processGitHubJson(supabase: any, sourceId: string, json: any) {
  let sectionsCount = 0, chunksCount = 0, tablesHigh = 0, datasetsCount = 0, pseudoPage = 1;

  if (json.groups) {
    for (const group of json.groups) {
      await supabase.from('rules_sections').insert({
        source_id: sourceId, title: group.name, text: group.description || null,
        section_path: [group.name], page_start: pseudoPage, page_end: pseudoPage
      });
      sectionsCount++;

      if (group.sections) {
        for (const section of group.sections) {
          await supabase.from('rules_sections').insert({
            source_id: sourceId, title: section.title, text: section.text?.substring(0, 50000) || null,
            section_path: [group.name, section.title], page_start: pseudoPage, page_end: pseudoPage
          });
          sectionsCount++;

          if (section.text) {
            await supabase.from('rules_chunks').insert({
              source_id: sourceId, text: section.text.substring(0, 1800),
              section_path: [group.name, section.title], page_start: pseudoPage, page_end: pseudoPage,
              order_index: chunksCount, score_hints: { hasRollRanges: false, hasTablePattern: false }
            });
            chunksCount++;
          }

          if (section.tables) {
            for (const table of section.tables) {
              await supabase.from('rules_tables').insert({
                source_id: sourceId, title_guess: table.name, page_number: pseudoPage,
                raw_text: JSON.stringify(table).substring(0, 5000), confidence: 'high',
                parsed_rows: table.rows || [], keywords: ['table']
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
      if (rec && ds.rows) {
        for (const row of ds.rows) {
          await supabase.from('rules_dataset_rows').insert({ dataset_id: rec.id, data: row });
        }
      }
      datasetsCount++;
    }
  }

  return { pages: pseudoPage, sections: sectionsCount, chunks: chunksCount, tablesHigh, tablesLow: 0, datasets: datasetsCount };
}
