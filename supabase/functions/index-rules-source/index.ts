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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceId } = await req.json();
    if (!sourceId) {
      return new Response(JSON.stringify({ error: 'sourceId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get source
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

    // Update status to indexing
    await supabase.from('rules_sources').update({ index_status: 'indexing' }).eq('id', sourceId);

    // Clear existing indexed data for this source
    await supabase.from('rules_chunks').delete().eq('source_id', sourceId);
    await supabase.from('rules_tables').delete().eq('source_id', sourceId);
    await supabase.from('rules_sections').delete().eq('source_id', sourceId);

    // Get pages (already stored for paste sources, need to extract for PDF)
    let pages: { page_number: number; text: string }[] = [];
    
    const { data: existingPages } = await supabase
      .from('rules_pages')
      .select('page_number, text')
      .eq('source_id', sourceId)
      .order('page_number');

    pages = existingPages || [];

    if (pages.length === 0) {
      await supabase.from('rules_sources').update({
        index_status: 'failed',
        index_error: { stage: 'empty', message: 'No pages found to index' }
      }).eq('id', sourceId);
      
      return new Response(JSON.stringify({ error: 'No content to index' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build sections (simple header detection)
    const sections: { title: string; page_start: number; page_end: number; text: string }[] = [];
    const headerPattern = /^(?:#{1,3}\s+|(?:\d+\.)+\s+|[A-Z][A-Z\s]{2,}:?\s*$)/gm;
    
    let currentSection = { title: 'Introduction', page_start: 1, page_end: 1, text: '' };
    
    for (const page of pages) {
      const matches = page.text.match(headerPattern);
      if (matches && matches.length > 0) {
        if (currentSection.text) {
          sections.push({ ...currentSection, page_end: page.page_number - 1 });
        }
        currentSection = {
          title: matches[0].replace(/^#+\s*/, '').trim().substring(0, 100),
          page_start: page.page_number,
          page_end: page.page_number,
          text: page.text
        };
      } else {
        currentSection.text += '\n' + page.text;
        currentSection.page_end = page.page_number;
      }
    }
    if (currentSection.text) sections.push(currentSection);

    // Insert sections
    const sectionInserts = sections.map(s => ({
      source_id: sourceId,
      title: s.title,
      page_start: s.page_start,
      page_end: s.page_end,
      text: s.text.substring(0, 50000),
    }));
    
    if (sectionInserts.length > 0) {
      await supabase.from('rules_sections').insert(sectionInserts);
    }

    // Build chunks (~1800 chars with ~200 overlap)
    const TARGET_SIZE = 1800;
    const OVERLAP = 200;
    const chunks: { text: string; page_start: number; page_end: number; order_index: number; score_hints: object }[] = [];
    
    let orderIndex = 0;
    for (const section of sections) {
      const text = section.text;
      let pos = 0;
      
      while (pos < text.length) {
        const end = Math.min(pos + TARGET_SIZE, text.length);
        const chunkText = text.slice(pos, end);
        
        chunks.push({
          text: chunkText,
          page_start: section.page_start,
          page_end: section.page_end,
          order_index: orderIndex++,
          score_hints: {
            hasRollRanges: /\b[dD]\d+\b/.test(chunkText),
            hasTablePattern: /\|.*\|/.test(chunkText) || /\t.*\t/.test(chunkText),
          }
        });
        
        pos = end - OVERLAP;
        if (pos >= text.length - OVERLAP) break;
      }
    }

    // Insert chunks
    const chunkInserts = chunks.map(c => ({ source_id: sourceId, ...c }));
    if (chunkInserts.length > 0) {
      await supabase.from('rules_chunks').insert(chunkInserts);
    }

    // Detect tables (simple pattern)
    const tablePattern = /(?:^|\n)([A-Z][^\n]{0,50})\n((?:\|[^\n]+\|\n?)+)/g;
    let tablesHigh = 0, tablesLow = 0;

    for (const page of pages) {
      const matches = [...page.text.matchAll(tablePattern)];
      for (const match of matches) {
        const confidence = match[2].split('\n').length > 3 ? 'high' : 'low';
        if (confidence === 'high') tablesHigh++; else tablesLow++;
        
        await supabase.from('rules_tables').insert({
          source_id: sourceId,
          title_guess: match[1].trim().substring(0, 100),
          page_number: page.page_number,
          raw_text: match[0].substring(0, 5000),
          confidence,
        });
      }
    }

    // Update source with stats
    await supabase.from('rules_sources').update({
      index_status: 'indexed',
      index_stats: {
        pages: pages.length,
        sections: sections.length,
        chunks: chunks.length,
        tablesHigh,
        tablesLow,
        datasets: 0
      },
      index_error: null,
      last_indexed_at: new Date().toISOString()
    }).eq('id', sourceId);

    return new Response(JSON.stringify({
      success: true,
      message: `Indexed ${pages.length} pages, ${chunks.length} chunks, ${tablesHigh + tablesLow} tables`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Indexing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
