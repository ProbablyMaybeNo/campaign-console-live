import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface BuilderRequest {
  prompt: string;
  conversationHistory?: ConversationMessage[];
  sourceContent?: string;
  sourceUrl?: string;
  campaignId?: string;
  rulesContext?: string;
}

interface ComponentData {
  type: "table" | "card";
  data: {
    title: string;
    columns?: string[];
    rows?: Record<string, string>[];
    cards?: Array<{
      id: string;
      name: string;
      description: string;
      properties?: Record<string, string>;
    }>;
  };
  dataSource?: string; // 'live:players', 'live:warbands', etc.
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { prompt, conversationHistory = [], sourceContent, sourceUrl, campaignId, rulesContext } = await req.json() as BuilderRequest;

    // Fetch campaign data if campaignId is provided
    let campaignContext = "";
    let liveDataAvailable: Record<string, unknown[]> = {};

    if (campaignId) {
      console.log("Fetching campaign data for:", campaignId);

      // Fetch players with profiles
      const { data: players } = await supabase
        .from("campaign_players")
        .select(`
          user_id,
          role,
          joined_at,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq("campaign_id", campaignId);

      // Fetch warbands
      const { data: warbands } = await supabase
        .from("warbands")
        .select("id, name, faction, sub_faction, points_total, owner_id, narrative")
        .eq("campaign_id", campaignId);

      // Fetch narrative events
      const { data: narrativeEvents } = await supabase
        .from("narrative_events")
        .select("id, title, content, event_type, event_date, author_id, visibility")
        .eq("campaign_id", campaignId)
        .order("event_date", { ascending: false });

      // Fetch schedule entries
      const { data: scheduleEntries } = await supabase
        .from("schedule_entries")
        .select("id, title, round_number, scheduled_date, status, scenario")
        .eq("campaign_id", campaignId)
        .order("round_number", { ascending: true });

      // Fetch wargame rules
      const { data: rules } = await supabase
        .from("wargame_rules")
        .select("id, title, category, rule_key, content")
        .eq("campaign_id", campaignId);

      // Store live data for reference
      liveDataAvailable = {
        players: players || [],
        warbands: warbands || [],
        narrativeEvents: narrativeEvents || [],
        scheduleEntries: scheduleEntries || [],
        rules: rules || [],
      };

      // Create context string for AI
      campaignContext = `

LIVE CAMPAIGN DATA AVAILABLE:
You have access to real-time data from this campaign's database. When the user asks for components using campaign data, extract from the following:

PLAYERS (${players?.length || 0}):
${JSON.stringify(players?.map(p => {
  const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  return {
    user_id: p.user_id,
    display_name: profile?.display_name || "Unknown",
    role: p.role,
    joined_at: p.joined_at
  };
}) || [], null, 2)}
  role: p.role,
  joined_at: p.joined_at
})) || [], null, 2)}

WARBANDS (${warbands?.length || 0}):
${JSON.stringify(warbands || [], null, 2)}

NARRATIVE EVENTS (${narrativeEvents?.length || 0}):
${JSON.stringify(narrativeEvents?.slice(0, 20) || [], null, 2)}

SCHEDULE ENTRIES (${scheduleEntries?.length || 0}):
${JSON.stringify(scheduleEntries || [], null, 2)}

WARGAME RULES CATEGORIES:
${[...new Set(rules?.map(r => r.category) || [])].join(", ") || "None synced"}

When creating components from live data:
- For player lists: include display_name, faction (from their warband), warband link, narrative link
- For warband lists: include name, faction, points_total, owner name
- For schedule tables: include round_number, title, scheduled_date, status
- Mark data as coming from the database so the component can update dynamically
`;
    }

    // Build content context
    let contentContext = "";
    
    if (rulesContext) {
      contentContext += `\n\nSELECTED RULES CONTEXT (from campaign's imported rules):\n${rulesContext}`;
    }
    
    if (sourceContent) {
      contentContext += `\n\nSOURCE CONTENT TO EXTRACT FROM:\n${sourceContent.substring(0, 50000)}`;
    }
    
    if (sourceUrl) {
      contentContext += `\n\nThe user has provided this source URL: ${sourceUrl}`;
    }

    const systemPrompt = `You are an AI assistant helping users create dashboard components for a wargaming campaign management app. You can create TABLE and CARD components by:
1. Extracting data from source content (PDFs, text files, or URLs)
2. Using LIVE DATA from the campaign database (players, warbands, narrative events, schedule, rules)

IMPORTANT: You are having a conversation with the user. You can:
1. Answer questions about the content they've uploaded OR the campaign data
2. List tables, sections, or data you find in any source
3. Create one or multiple components when they ask

When the user asks you to CREATE components, you MUST respond with a JSON object in this EXACT format:
{
  "message": "Your conversational response explaining what you found/created",
  "components": [
    {
      "type": "table",
      "data": {
        "title": "Component Title",
        "columns": ["Column1", "Column2"],
        "rows": [{"Column1": "value", "Column2": "value"}]
      },
      "dataSource": "live:players"
    }
  ]
}

DATA SOURCE OPTIONS:
- "static" - Data is embedded in the component (from PDFs, URLs, or manual entry)
- "live:players" - Component shows campaign player data
- "live:warbands" - Component shows warband data
- "live:narrative" - Component shows narrative events
- "live:schedule" - Component shows schedule entries
- "live:rules" - Component shows wargame rules

When the user is just asking questions or exploring (NOT creating):
{
  "message": "Your conversational response",
  "components": []
}

Guidelines:
- Be conversational and helpful
- When creating player lists: match player user_ids to their warbands to show faction info
- When creating links: use format "[View](/campaign/{campaignId}/warband/{id})" for warbands
- You can create MULTIPLE components at once
- Each component should be self-contained with all its data
- For wargames: injury tables, advancement charts, weapon stats, ability lists
- If data doesn't exist yet, explain what's available

ALWAYS RESPOND WITH VALID JSON. The response must be parseable JSON with "message" and "components" fields.`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: `${prompt}${campaignContext}${contentContext}` }
    ];

    console.log("Sending to AI with campaign context:", !!campaignId, "history length:", conversationHistory.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI raw response:", content.substring(0, 500));

    // Try to parse the JSON from the response
    let parsedData: { message: string; components: ComponentData[] };
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      parsedData = {
        message: content,
        components: []
      };
    }

    // Validate and normalize the response
    const normalizedResponse = {
      message: parsedData.message || "Here's what I found.",
      components: Array.isArray(parsedData.components) 
        ? parsedData.components.filter((c: ComponentData) => 
            c && c.type && c.data && c.data.title
          )
        : []
    };

    console.log("Returning components:", normalizedResponse.components.length);

    return new Response(JSON.stringify(normalizedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI component builder error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
