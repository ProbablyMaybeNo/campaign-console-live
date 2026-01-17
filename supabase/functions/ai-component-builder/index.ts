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
  dataSource?: string;
  linkedRuleId?: string;
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

    const { prompt, conversationHistory = [], sourceContent, sourceUrl, campaignId } = await req.json() as BuilderRequest;

    // Fetch campaign data if campaignId is provided
    let rulesContext = "";
    let liveDataContext = "";
    let availableCategories: string[] = [];

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

      // Fetch schedule entries
      const { data: scheduleEntries } = await supabase
        .from("schedule_entries")
        .select("id, title, round_number, scheduled_date, status, scenario")
        .eq("campaign_id", campaignId)
        .order("round_number", { ascending: true });

      // Fetch ALL wargame rules with full content
      const { data: rules, error: rulesError } = await supabase
        .from("wargame_rules")
        .select("id, title, category, rule_key, content, metadata")
        .eq("campaign_id", campaignId)
        .order("category", { ascending: true });

      if (rulesError) {
        console.error("Error fetching rules:", rulesError);
      }

      console.log(`Fetched ${rules?.length || 0} rules for campaign`);

      // Build structured rules context - this is the PRIMARY data source
      if (rules && rules.length > 0) {
        // Group rules by category
        const rulesByCategory: Record<string, typeof rules> = {};
        rules.forEach((rule) => {
          if (!rulesByCategory[rule.category]) {
            rulesByCategory[rule.category] = [];
          }
          rulesByCategory[rule.category].push(rule);
        });

        availableCategories = Object.keys(rulesByCategory);

        rulesContext = `\n\n=== CAMPAIGN RULES LIBRARY (${rules.length} rules) ===\nYou MUST use this exact data when creating components. DO NOT invent content.\n`;
        
        for (const [category, categoryRules] of Object.entries(rulesByCategory)) {
          rulesContext += `\n--- Category: "${category}" (${categoryRules.length} rules) ---\n`;
          
          categoryRules.forEach((rule) => {
            rulesContext += `\nRULE ID: ${rule.id}\n`;
            rulesContext += `TITLE: "${rule.title}"\n`;
            rulesContext += `KEY: ${rule.rule_key}\n`;
            
            // Format content based on type
            const content = rule.content as Record<string, unknown>;
            if (content) {
              if (content.type === "roll_table" && content.entries) {
                rulesContext += `TYPE: roll_table\n`;
                rulesContext += `DICE: ${content.dice || "D6"}\n`;
                rulesContext += `ENTRIES:\n`;
                (content.entries as Array<{roll: string; result: string}>).forEach((entry) => {
                  rulesContext += `  - Roll "${entry.roll}": "${entry.result}"\n`;
                });
              } else if (content.type === "list" && content.items) {
                rulesContext += `TYPE: list\n`;
                rulesContext += `ITEMS:\n`;
                (content.items as string[]).forEach((item, i) => {
                  rulesContext += `  ${i + 1}. "${item}"\n`;
                });
              } else if (content.type === "text" && content.text) {
                rulesContext += `TYPE: text\n`;
                rulesContext += `TEXT: "${content.text}"\n`;
              } else if (content.type === "equipment" && content.items) {
                rulesContext += `TYPE: equipment\n`;
                rulesContext += `ITEMS:\n`;
                (content.items as Array<{name: string; cost?: string; effect?: string}>).forEach((item) => {
                  rulesContext += `  - "${item.name}"${item.cost ? ` (Cost: ${item.cost})` : ""}${item.effect ? `: ${item.effect}` : ""}\n`;
                });
              } else if (content.type === "stats_table" && content.headers && content.rows) {
                rulesContext += `TYPE: stats_table\n`;
                rulesContext += `HEADERS: ${JSON.stringify(content.headers)}\n`;
                rulesContext += `ROWS: ${JSON.stringify(content.rows)}\n`;
              } else {
                rulesContext += `CONTENT: ${JSON.stringify(content)}\n`;
              }
            }
          });
        }
        
        rulesContext += `\n=== END RULES LIBRARY ===\n`;
        rulesContext += `\nAVAILABLE CATEGORIES: ${availableCategories.join(", ")}\n`;
      } else {
        rulesContext = "\n\n[NO RULES IMPORTED YET - Tell user to import rules first]\n";
      }

      // Build live data context
      liveDataContext = `\n\n=== LIVE CAMPAIGN DATA ===\n`;
      
      if (players && players.length > 0) {
        liveDataContext += `\nPLAYERS (${players.length}):\n`;
        players.forEach((p) => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          liveDataContext += `  - ${profile?.display_name || "Unknown"} (${p.role})\n`;
        });
      }
      
      if (warbands && warbands.length > 0) {
        liveDataContext += `\nWARBANDS (${warbands.length}):\n`;
        warbands.forEach((w) => {
          liveDataContext += `  - "${w.name}" (${w.faction}, ${w.points_total || 0}pts)\n`;
        });
      }
      
      if (scheduleEntries && scheduleEntries.length > 0) {
        liveDataContext += `\nSCHEDULE (${scheduleEntries.length} rounds):\n`;
        scheduleEntries.forEach((s) => {
          liveDataContext += `  - Round ${s.round_number}: "${s.title}" (${s.status})\n`;
        });
      }
      
      liveDataContext += `=== END LIVE DATA ===\n`;
    }

    // Build content context from uploads
    let contentContext = "";
    if (sourceContent) {
      contentContext = `\n\nUPLOADED SOURCE CONTENT:\n${sourceContent.substring(0, 50000)}`;
    }
    if (sourceUrl) {
      contentContext += `\n\nSOURCE URL: ${sourceUrl}`;
    }

    const systemPrompt = `You are an AI that creates dashboard components for a wargaming campaign app.

CRITICAL: You MUST ONLY use data from the CAMPAIGN RULES LIBRARY or LIVE CAMPAIGN DATA provided in this conversation. NEVER invent, fabricate, or make up content. Use EXACT text from the rules.

OUTPUT FORMAT - Always respond with valid JSON:
{
  "message": "Your explanation",
  "components": [
    {
      "type": "table",
      "data": {
        "title": "Exact Title From Rules",
        "columns": ["Column1", "Column2"],
        "rows": [{"Column1": "exact value", "Column2": "exact value"}]
      },
      "dataSource": "rules:CategoryName",
      "linkedRuleId": "the-exact-rule-uuid"
    }
  ]
}

HOW TO CREATE COMPONENTS FROM RULES:

1. For ROLL_TABLE rules:
   - Create a table with columns: ["Roll", "Result"]
   - Each row uses the exact "roll" and "result" values from ENTRIES
   - Example: {"Roll": "2-6", "Result": "Failure"}

2. For LIST rules:
   - Create a table with columns: ["#", "Description"] or just ["Action"]
   - Each row contains one exact item from the ITEMS array

3. For TEXT rules:
   - Create a card component with the exact TEXT content

4. For EQUIPMENT rules:
   - Create a table with columns: ["Name", "Cost", "Effect"]
   - Use exact values from each item

5. For STATS_TABLE rules:
   - Use the exact HEADERS as columns
   - Use the exact ROWS data

REQUIREMENTS:
- ALWAYS include "linkedRuleId" with the rule's UUID when creating from rules
- NEVER generate placeholder text like "Example result" or "Sample data"
- If a rule exists but has empty content, say so
- If user asks for something not in the data, list what IS available

When just answering questions (not creating):
{
  "message": "Available categories: X, Y, Z. Rules include: ...",
  "components": []
}`;

    // Put the data context in the user message so it's clearly visible
    const userMessageWithContext = `${prompt}

${rulesContext}${liveDataContext}${contentContext}`;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessageWithContext }
    ];

    console.log("Sending to AI - Rules context length:", rulesContext.length, "Categories:", availableCategories);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.2, // Lower temperature for more deterministic output
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

    console.log("AI raw response (first 1000 chars):", content.substring(0, 1000));

    // Parse the JSON from the response
    let parsedData: { message: string; components: ComponentData[] };
    try {
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Return the raw content as a message
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

    console.log("Returning", normalizedResponse.components.length, "components");

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
