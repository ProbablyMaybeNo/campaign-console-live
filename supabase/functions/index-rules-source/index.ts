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

    const { sourceId, githubData } = await req.json();
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
      stats = await processFromPages(supabase, sourceId);
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

async function processFromPages(supabase: any, sourceId: string) {
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

  // Build sections
  const sections: any[] = [];
  const headerPattern = /^(?:#{1,3}\s+|(?:\d+\.)+\s+|[A-Z][A-Z\s]{2,}:?\s*$)/gm;
  let currentSection = { title: 'Introduction', page_start: 1, page_end: 1, text: '', section_path: ['Introduction'] };

  for (const page of pages) {
    const matches = page.text.match(headerPattern);
    if (matches?.length) {
      if (currentSection.text) sections.push({ ...currentSection, page_end: page.page_number - 1 });
      const title = matches[0].replace(/^#+\s*/, '').trim().substring(0, 100);
      currentSection = { title, page_start: page.page_number, page_end: page.page_number, text: page.text, section_path: [title] };
    } else {
      currentSection.text += '\n' + page.text;
      currentSection.page_end = page.page_number;
    }
  }
  if (currentSection.text) sections.push(currentSection);

  for (const s of sections) {
    await supabase.from('rules_sections').insert({
      source_id: sourceId, title: s.title, page_start: s.page_start, page_end: s.page_end,
      text: s.text.substring(0, 50000), section_path: s.section_path,
    });
  }

  // Build chunks
  const chunks: any[] = [];
  let orderIndex = 0;
  for (const section of sections) {
    let pos = 0;
    while (pos < section.text.length) {
      let end = Math.min(pos + 1800, section.text.length);
      const chunkText = section.text.slice(pos, end).trim();
      if (chunkText) {
        chunks.push({
          text: chunkText, page_start: section.page_start, page_end: section.page_end,
          order_index: orderIndex++, section_path: section.section_path,
          score_hints: { hasRollRanges: /\b[dD]\d+\b/.test(chunkText), hasTablePattern: /\|.*\|/.test(chunkText) }
        });
      }
      pos = end - 200;
      if (pos >= section.text.length - 200) break;
    }
  }

  for (const c of chunks) {
    await supabase.from('rules_chunks').insert({ source_id: sourceId, ...c });
  }

  // Detect tables
  let tablesHigh = 0, tablesLow = 0;
  const tablePattern = /(?:^|\n)([A-Z][^\n]{0,50})\n((?:\|[^\n]+\|\n?)+)/g;
  for (const page of pages) {
    for (const match of page.text.matchAll(tablePattern)) {
      const confidence = match[2].split('\n').length > 3 ? 'high' : 'low';
      if (confidence === 'high') tablesHigh++; else tablesLow++;
      await supabase.from('rules_tables').insert({
        source_id: sourceId, title_guess: match[1].trim().substring(0, 100),
        page_number: page.page_number, raw_text: match[0].substring(0, 5000), confidence
      });
    }
  }

  return { pages: pages.length, sections: sections.length, chunks: chunks.length, tablesHigh, tablesLow, datasets: 0 };
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
