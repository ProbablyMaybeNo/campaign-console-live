import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConversionRequest {
  rawText: string;
  hint?: "table" | "card";
}

interface TableResult {
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  title?: string;
}

interface CardResult {
  title: string;
  sections: Array<{ header: string; content: string }>;
}

interface Entitlements {
  plan: string;
  smart_paste_enabled: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get user ID
  const userId = user.id;

  // Check entitlements - Smart Paste requires Supporter subscription
  const { data: entitlements, error: entitlementError } = await supabase.rpc('get_user_entitlements', {
    _user_id: userId,
  });

  if (entitlementError) {
    console.error("Failed to check entitlements:", entitlementError);
    return new Response(
      JSON.stringify({ error: "Failed to verify subscription status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userEntitlements = entitlements as Entitlements;
  
  if (!userEntitlements?.smart_paste_enabled) {
    return new Response(
      JSON.stringify({ 
        error: "SUBSCRIPTION_REQUIRED",
        message: "Smart Paste requires a Supporter subscription. Upgrade to unlock AI-powered text conversion.",
        code: "SUBSCRIPTION_REQUIRED"
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { rawText, hint = "table" }: ConversionRequest = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce size limit
    if (rawText.length > 60000) {
      return new Response(
        JSON.stringify({ error: "Text exceeds 60,000 character limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = hint === "card" 
      ? `You are a text formatter that organizes unstructured rules text into well-formatted card sections.
Extract the main title and break the content into logical sections.
Format each section's content using simple markdown:
- Use **bold** for important terms, keywords, and key phrases
- Use bullet points (• or -) for lists
- Use numbered lists (1., 2., etc.) for sequential steps
- Keep formatting clean and readable

Return ONLY valid JSON in this exact format:
{
  "title": "Main Title",
  "sections": [
    { "header": "Section Name", "content": "Formatted content with **bold text** and\\n• bullet points\\n• like this" }
  ]
}
- Maximum 20 sections
- Preserve the meaning and important details
- Make headers clear and descriptive
- If no clear sections, create logical groupings based on topics`
      : `You are a text parser that converts unstructured text into structured table data.
Identify column headers and extract rows of data.
Return ONLY valid JSON in this exact format:
{
  "columns": ["Column1", "Column2", "Column3"],
  "rows": [
    { "id": "1", "Column1": "value", "Column2": "value", "Column3": "value" }
  ],
  "title": "Optional Table Title"
}
- Maximum 25 columns
- Maximum 300 rows
- Each row must have a unique "id" field
- If dice roll patterns exist (1-2, 3-4, etc.), use "Roll" as the first column
- Column names should be clean and descriptive`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Convert this text:\n\n${rawText}` },
        ],
        temperature: 0.1, // Low temperature for consistent parsing
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate and enforce limits
    if (hint === "card") {
      const result: CardResult = {
        title: parsed.title || "Untitled",
        sections: (parsed.sections || []).slice(0, 20).map((s: { header?: string; content?: string }) => ({
          header: s.header || "Section",
          content: s.content || "",
        })),
      };
      return new Response(
        JSON.stringify({ success: true, type: "card", data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const columns = (parsed.columns || []).slice(0, 25);
      const rows = (parsed.rows || []).slice(0, 300).map((row: Record<string, string>, idx: number) => ({
        id: row.id || String(idx + 1),
        ...Object.fromEntries(
          columns.map((col: string) => [col, row[col] || ""])
        ),
      }));
      const result: TableResult = {
        columns,
        rows,
        title: parsed.title,
      };
      return new Response(
        JSON.stringify({ success: true, type: "table", data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("convert-text-to-table error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Conversion failed",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
