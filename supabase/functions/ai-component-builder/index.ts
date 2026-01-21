// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TableData {
  id: string;
  title: string;
  confidence: string;
  raw_text: string | null;
  parsed_rows: any[] | null;
  source_id: string;
  page_number: number | null;
  keywords: string[] | null;
}

interface ChunkData {
  id: string;
  text: string;
  section_path: string[] | null;
  source_id: string;
}

function extractQueryTerms(prompt: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'but', 'and', 'or', 'if', 'because', 'until',
    'while', 'about', 'against', 'it', 'its', 'this', 'that', 'these', 'those',
    'what', 'which', 'who', 'whom', 'i', 'you', 'he', 'she', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
    'create', 'make', 'build', 'show', 'display', 'find', 'get', 'list',
    'table', 'card', 'component', 'widget', 'please', 'want', 'need'
  ]);

  return prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));
}

function scoreTables(tables: TableData[], queryTerms: string[]): TableData[] {
  // If no query terms, return top tables by confidence
  if (queryTerms.length === 0) return tables.slice(0, 10);

  const scored = tables.map(table => {
    let score = 0;
    const titleLower = (table.title || '').toLowerCase();
    const textLower = (table.raw_text || '').toLowerCase();
    const keywordsLower = (table.keywords || []).map(k => k.toLowerCase());

    for (const term of queryTerms) {
      // Title matches are highest priority - if title contains term, strong boost
      if (titleLower.includes(term)) score += 15;
      // Keyword matches are good
      if (keywordsLower.some(k => k.includes(term))) score += 8;
      // Text content matches
      if (textLower.includes(term)) score += 3;
    }

    // Confidence boost is secondary to relevance matching
    // This ensures low-confidence tables with matching terms still appear
    if (table.confidence === 'high') score += 3;
    else if (table.confidence === 'medium') score += 1;
    // Low confidence tables get no penalty - their score is based on relevance

    return { table, score };
  });

  // Return tables with ANY score > 0, sorted by score
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12) // Increased limit to include more relevant tables
    .map(s => s.table);
}

function scoreChunks(chunks: ChunkData[], queryTerms: string[]): ChunkData[] {
  if (queryTerms.length === 0) return chunks.slice(0, 5);

  const scored = chunks.map(chunk => {
    let score = 0;
    const textLower = chunk.text.toLowerCase();
    const pathLower = (chunk.section_path || []).join(' ').toLowerCase();

    for (const term of queryTerms) {
      if (pathLower.includes(term)) score += 5;
      if (textLower.includes(term)) score += 1;
    }

    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.chunk);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    const { prompt, conversationHistory = [], sourceContent, campaignId } = await req.json();

    // Extract search terms from the prompt
    const queryTerms = extractQueryTerms(prompt);
    console.log("Query terms:", queryTerms);

    // Fetch and score rules data
    let relevantTables: TableData[] = [];
    let relevantChunks: ChunkData[] = [];

    if (campaignId) {
      // Get sources for this campaign
      const { data: sources } = await supabase
        .from("rules_sources")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("index_status", "indexed");

      const sourceIds = sources?.map((s: any) => s.id) || [];

      if (sourceIds.length > 0) {
        // Fetch tables with ACTUAL DATA
        const { data: tables } = await supabase
          .from("rules_tables")
          .select("id, title_guess, confidence, raw_text, parsed_rows, source_id, page_number, keywords")
          .in("source_id", sourceIds)
          .order("confidence", { ascending: false });

        // Fetch chunks as fallback
        const { data: chunks } = await supabase
          .from("rules_chunks")
          .select("id, text, section_path, source_id")
          .in("source_id", sourceIds)
          .limit(100);

        // Score and select relevant data
        relevantTables = scoreTables(
          (tables || []).map((t: any) => ({ ...t, title: t.title_guess || 'Untitled Table' })),
          queryTerms
        );
        relevantChunks = scoreChunks(chunks || [], queryTerms);

        console.log(`Found ${relevantTables.length} relevant tables, ${relevantChunks.length} relevant chunks`);
      }
    }

    // Build context with ACTUAL table data
    let rulesContext = "";
    
    if (relevantTables.length > 0) {
      rulesContext += "\n=== AVAILABLE TABLES (use these for table components) ===\n";
      for (const table of relevantTables) {
        rulesContext += `\n--- TABLE: "${table.title}" (id: ${table.id}, sourceId: ${table.source_id}) ---\n`;
        if (table.parsed_rows && Array.isArray(table.parsed_rows) && table.parsed_rows.length > 0) {
          // Filter out separator rows (rows where all values are just dashes)
          const cleanRows = table.parsed_rows.filter((row: any) => {
            const values = Object.values(row);
            return !values.every(v => typeof v === 'string' && /^[-–—]+$/.test(v.trim()));
          });
          
          if (cleanRows.length > 0) {
            rulesContext += `Columns: ${Object.keys(cleanRows[0]).join(', ')}\n`;
            rulesContext += `ALL ROWS (${cleanRows.length} total):\n`;
            rulesContext += JSON.stringify(cleanRows, null, 2) + "\n";
          } else if (table.raw_text) {
            rulesContext += `Raw content:\n${table.raw_text.slice(0, 8000)}\n`;
          }
        } else if (table.raw_text) {
          // Include full raw text for tables without parsed rows
          rulesContext += `Raw content:\n${table.raw_text.slice(0, 8000)}\n`;
        }
      }
    }

    if (relevantChunks.length > 0) {
      rulesContext += "\n=== RELEVANT TEXT SECTIONS ===\n";
      for (const chunk of relevantChunks) {
        rulesContext += `\n--- Section: ${(chunk.section_path || ['Unknown']).join(' > ')} (id: ${chunk.id}, sourceId: ${chunk.source_id}) ---\n`;
        rulesContext += chunk.text.slice(0, 1000) + "\n";
      }
    }

    const systemPrompt = `You are an AI helping create dashboard components for wargaming campaigns.
Your ONLY job is to select and transform EXISTING data from the campaign's rules library into components.

CRITICAL RULES:
1. ONLY use data that appears in the AVAILABLE TABLES or RELEVANT TEXT SECTIONS below
2. NEVER invent, hallucinate, or make up table data, rules, or content
3. If the user asks for something not in the data, say "I couldn't find that in the indexed rules"
4. When creating table components, use the EXACT columns and rows from the source data
5. Always include the source table ID for provenance tracking

${rulesContext || "No indexed rules data available for this campaign."}

${sourceContent ? `\n=== USER-PROVIDED SOURCE CONTENT ===\n${sourceContent.substring(0, 20000)}` : ''}

RESPONSE FORMAT - You MUST return valid JSON:
{
  "message": "Brief description of what you created",
  "components": [
    {
      "type": "table",
      "sourceTableId": "uuid-from-above",
      "sourceId": "source-uuid",
      "data": {
        "title": "Table Name",
        "columns": ["Column1", "Column2"],
        "rows": [{"Column1": "value1", "Column2": "value2"}]
      }
    }
  ]
}

For card components:
{
  "type": "card",
  "sourceChunkIds": ["chunk-id1"],
  "sourceId": "source-uuid",
  "data": {
    "title": "Card Collection Name",
    "cards": [{"id": "1", "name": "Name", "description": "Description from source"}]
  }
}

If no relevant data is found, return:
{
  "message": "I couldn't find relevant data for that request. The indexed rules contain: [list what's available]",
  "components": []
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: prompt }
        ],
        temperature: 0.1, // Very low temperature for accuracy
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), { 
          status: 402, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI response content:", content.slice(0, 500));

    let parsed: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // If parsing fails, return a helpful message
      parsed = { 
        message: content.length > 0 
          ? content 
          : "I processed your request but couldn't generate valid components.", 
        components: [] 
      };
    }

    // Validate components have required fields
    const validComponents = Array.isArray(parsed.components) 
      ? parsed.components.filter((c: any) => {
          if (!c?.type || !c?.data?.title) return false;
          
          if (c.type === 'table') {
            // Ensure table has columns and rows
            if (!Array.isArray(c.data.columns) || c.data.columns.length === 0) return false;
            if (!Array.isArray(c.data.rows)) return false;
          }
          
          if (c.type === 'card') {
            // Ensure cards array exists
            if (!Array.isArray(c.data.cards)) return false;
          }
          
          return true;
        })
      : [];

    return new Response(JSON.stringify({
      message: parsed.message || "Here's what I found.",
      components: validComponents.map((c: any) => ({
        type: c.type,
        data: c.data,
        // Preserve provenance IDs
        sourceTableId: c.sourceTableId,
        sourceId: c.sourceId,
        sourceChunkIds: c.sourceChunkIds,
      }))
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("AI builder error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
