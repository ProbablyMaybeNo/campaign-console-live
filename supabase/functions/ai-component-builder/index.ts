// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch indexed rules data for auto-pick scoring
    let rulesContext = "";
    let availableData: { datasets: any[]; tables: any[]; chunks: any[] } = { datasets: [], tables: [], chunks: [] };

    if (campaignId) {
      // Get sources for this campaign
      const { data: sources } = await supabase
        .from("rules_sources")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("index_status", "indexed");

      const sourceIds = sources?.map((s: any) => s.id) || [];

      if (sourceIds.length > 0) {
        // Fetch datasets (highest priority)
        const { data: datasets } = await supabase
          .from("rules_datasets")
          .select("id, name, dataset_type, fields, source_id")
          .in("source_id", sourceIds);

        // Fetch tables with content (medium priority)
        const { data: tables } = await supabase
          .from("rules_tables")
          .select("id, title_guess, confidence, keywords, page_number, source_id, raw_text, parsed_rows")
          .in("source_id", sourceIds)
          .order("confidence", { ascending: false })
          .limit(50);

        // Fetch chunks (fallback)
        const { data: chunks } = await supabase
          .from("rules_chunks")
          .select("id, text, section_path, score_hints, source_id")
          .in("source_id", sourceIds)
          .limit(100);

        availableData = { datasets: datasets || [], tables: tables || [], chunks: chunks || [] };

        // Build detailed table context with actual content
        const tableDetails = (tables || []).slice(0, 30).map((t: any) => {
          let content = "";
          if (t.parsed_rows && Array.isArray(t.parsed_rows) && t.parsed_rows.length > 0) {
            const cols = Object.keys(t.parsed_rows[0]);
            content = `Columns: ${cols.join(', ')}\nRows (${t.parsed_rows.length}): ${JSON.stringify(t.parsed_rows.slice(0, 10))}`;
          } else if (t.raw_text) {
            content = `Raw: ${t.raw_text.substring(0, 1500)}`;
          }
          return `### ${t.title_guess || 'Untitled'} (id: ${t.id}, page: ${t.page_number}, confidence: ${t.confidence})\n${content}`;
        }).join('\n\n');

        rulesContext = `
INDEXED RULES DATA (use these IDs and ACTUAL CONTENT when creating components):

DATASETS (${datasets?.length || 0}) - HIGHEST PRIORITY:
${datasets?.map((d: any) => `- ${d.name} (id: ${d.id}, type: ${d.dataset_type}, fields: ${d.fields?.join(', ')}, sourceId: ${d.source_id})`).join('\n') || 'None'}

TABLES WITH CONTENT (${tables?.length || 0}) - USE THIS DATA TO POPULATE COMPONENTS:
${tableDetails || 'None'}

CHUNKS (${chunks?.length || 0}) - FALLBACK:
${chunks?.slice(0, 10).map((c: any) => `- Section: ${c.section_path?.join(' > ') || 'Unknown'} (id: ${c.id})\n  Text: ${c.text?.substring(0, 500) || ''}`).join('\n') || 'None'}

CRITICAL INSTRUCTIONS:
- When asked to create tables, USE THE ACTUAL CONTENT from the tables above
- Copy the real data (columns and rows) from the matching table
- Do NOT invent or make up data - use what's in the indexed tables
- Include dataSource/sourceId/tableId for provenance tracking
`;
      }
    }

    const systemPrompt = `You are an AI helping create dashboard components for wargaming campaigns.
${rulesContext}
${sourceContent ? `\nSOURCE CONTENT:\n${sourceContent.substring(0, 30000)}` : ''}

RESPONSE FORMAT (always valid JSON):
{
  "message": "Your response explaining what you created",
  "components": [{
    "type": "table" | "card",
    "data": { 
      "title": "Component Name",
      "columns": ["Column1", "Column2", ...],  // Use real column names from the indexed data
      "rows": [{"id": "uuid", "Column1": "value", "Column2": "value"}, ...]  // Use REAL data from tables
    },
    "dataSource": "rules",
    "sourceId": "uuid-of-source",
    "tableId": "uuid-of-table",
    "preferred": "table"
  }]
}

CRITICAL RULES:
1. ALWAYS use the ACTUAL content from the indexed tables above - never invent data
2. For table components, copy the real columns and rows from the matching indexed table
3. Each row must have a unique "id" field (generate UUIDs)
4. Columns must be an array of strings
5. Include tableId/sourceId for data provenance`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { message: content, components: [] };
    }

    return new Response(JSON.stringify({
      message: parsed.message || "Here's what I found.",
      components: Array.isArray(parsed.components) ? parsed.components.filter((c: any) => c?.type && c?.data?.title) : []
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("AI builder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
