// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { buildTableDataFromDbRecord, extractQueryTerms, scoreText } from "../_shared/rules_retrieval.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ConversationMessageSchema = z.object({
  role: z.string().min(1).max(20),
  content: z.string().max(20000),
});

const RequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  conversationHistory: z.array(ConversationMessageSchema).optional().default([]),
  sourceContent: z.string().max(30000).optional(),
  campaignId: z.string().uuid().optional(),
});

type CandidateTableMeta = {
  id: string;
  title_guess: string | null;
  confidence: string;
  keywords: string[] | null;
  page_number: number | null;
  source_id: string;
  header_context: string | null;
};

type CandidateChunk = {
  id: string;
  text: string;
  section_path: string[] | null;
  source_id: string;
};

type SelectedComponent = {
  type: "table" | "card";
  title: string;
  tableId?: string;
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

    const rawBody = await req.json();
    const parsedReq = RequestSchema.safeParse(rawBody);
    if (!parsedReq.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsedReq.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, conversationHistory, campaignId } = parsedReq.data;

    // If no campaignId, we can't access indexed rules
    if (!campaignId) {
      return new Response(JSON.stringify({
        message: "I need a campaign context to search your indexed rules.",
        components: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get indexed sources for this campaign
    const { data: sources, error: sourcesError } = await supabase
      .from("rules_sources")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("index_status", "indexed");

    if (sourcesError) throw sourcesError;

    const sourceIds = (sources || []).map((s: any) => s.id).filter(Boolean);
    if (sourceIds.length === 0) {
      return new Response(JSON.stringify({
        message: "No indexed rules sources found for this campaign. Index a rules source first.",
        components: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract query terms from the user's prompt
    const terms = extractQueryTerms(prompt);

    // Fetch candidate tables metadata (no big payload yet)
    const { data: tableMeta, error: tableMetaError } = await supabase
      .from("rules_tables")
      .select("id, title_guess, confidence, keywords, page_number, source_id, header_context")
      .in("source_id", sourceIds)
      .limit(500);

    if (tableMetaError) throw tableMetaError;

    // Fetch candidate chunks (fallback context)
    const { data: chunks, error: chunkError } = await supabase
      .from("rules_chunks")
      .select("id, text, section_path, source_id")
      .in("source_id", sourceIds)
      .limit(200);

    if (chunkError) throw chunkError;

    const rankedTables = (tableMeta as CandidateTableMeta[] | null || [])
      .map((t) => {
        const confidenceBoost = t.confidence === "high" ? 10 : t.confidence === "medium" ? 6 : 2;
        const keywordText = (t.keywords || []).join(" ");
        const titleText = t.title_guess || "";
        const headerText = t.header_context || "";
        const score =
          confidenceBoost +
          scoreText(titleText, terms) * 4 +
          scoreText(keywordText, terms) * 3 +
          scoreText(headerText, terms) * 2;

        return { t, score };
      })
      .sort((a, b) => b.score - a.score);

    const topMeta = rankedTables.slice(0, 30).map((x) => x.t);
    const topIds = topMeta.map((t) => t.id);

    // Fetch full content only for top candidates
    const { data: topTables, error: topTablesError } = await supabase
      .from("rules_tables")
      .select("id, title_guess, confidence, keywords, page_number, source_id, raw_text, parsed_rows")
      .in("id", topIds)
      .limit(30);

    if (topTablesError) throw topTablesError;

    const tablesById = new Map<string, any>((topTables || []).map((t: any) => [t.id, t]));

    // Build a short candidate list for the model to choose from
    const candidateList = topMeta
      .map((t, idx) => {
        const kw = (t.keywords || []).slice(0, 6).join(", ");
        return `${idx + 1}. id=${t.id} | ${t.title_guess || "Untitled"} | page=${t.page_number ?? "?"} | confidence=${t.confidence} | keywords=${kw}`;
      })
      .join("\n");

    // Use tool calling so the model selects IDs; we then populate rows/columns deterministically from DB
    const selectionSystemPrompt = `You are selecting which indexed RULE TABLES to use to satisfy the user's request.

Choose ONLY from the candidates list below. Return your answer via the select_components tool.

CANDIDATE TABLES:\n${candidateList || "(none)"}\n\nRules:\n- Prefer candidates whose title/keywords match the request terms (${terms.join(", ") || "none"}).\n- If the user asked for N tables, return N table components.\n- Do not invent table IDs.\n- Keep titles short and specific (e.g. 'Common Exploration Table', 'Rare Exploration Table').`;

    const toolBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: selectionSystemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "select_components",
            description: "Select indexed rules items to create dashboard components.",
            parameters: {
              type: "object",
              properties: {
                components: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["table", "card"] },
                      title: { type: "string" },
                      tableId: { type: "string" },
                    },
                    required: ["type", "title"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["components"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "select_components" } },
      temperature: 0.2,
    };

    const selectionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(toolBody),
    });

    if (!selectionResp.ok) {
      if (selectionResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (selectionResp.status === 402) return new Response(JSON.stringify({ error: "Credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await selectionResp.text();
      console.error("AI selection error:", selectionResp.status, t);
      throw new Error(`AI error: ${selectionResp.status}`);
    }

    const selectionData = await selectionResp.json();
    const toolCall = selectionData.choices?.[0]?.message?.tool_calls?.[0];
    let selected: SelectedComponent[] = [];

    try {
      const argsRaw = toolCall?.function?.arguments;
      const args = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
      selected = Array.isArray(args?.components) ? args.components : [];
    } catch {
      selected = [];
    }

    // Fallback: if tool call fails, just take top 3 ranked tables
    if (selected.length === 0) {
      selected = rankedTables.slice(0, 3).map(({ t }) => ({
        type: "table",
        title: t.title_guess || "Table",
        tableId: t.id,
      }));
    }

    const builtComponents = selected
      .filter((c) => c.type === "table" && typeof c.tableId === "string" && tablesById.has(c.tableId))
      .slice(0, 5)
      .map((c) => {
        const table = tablesById.get(c.tableId!)!;
        const tableData = buildTableDataFromDbRecord(table);
        if (!tableData) return null;

        const columns = tableData.columns.slice(0, 12);
        const rows = tableData.rows.slice(0, 200).map((r) => {
          const out: Record<string, string> = { id: crypto.randomUUID() };
          columns.forEach((col) => {
            const v = r[col];
            // Keep cells bounded to avoid giant widgets
            out[col] = (v ?? "").toString().slice(0, 2000);
          });
          return out;
        });

        return {
          type: "table",
          data: {
            title: c.title || table.title_guess || "Table",
            columns,
            rows,
          },
        };
      })
      .filter(Boolean);

    const fallbackChunks = (chunks as CandidateChunk[] | null || [])
      .slice(0, 5)
      .map((c) => `- ${c.section_path?.join(" > ") || "Unknown"}: ${c.text?.substring(0, 200) || ""}`)
      .join("\n");

    const message = builtComponents.length
      ? "Created table components from the best-matching indexed rules tables."
      : `I couldn't confidently match your request to any indexed tables. Try using more specific terms (e.g. 'exploration', 'rare exploration', 'legendary exploration').\n\nNearby content:\n${fallbackChunks || "(none)"}`;

    return new Response(JSON.stringify({ message, components: builtComponents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI builder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
