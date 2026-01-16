import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  content: string;
  sourceType: "pdf" | "text";
  sourceName?: string;
}

interface ExtractedRule {
  category: string;
  rule_key: string;
  title: string;
  content: RuleContent;
  metadata: Record<string, unknown>;
}

type RuleContent = 
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "roll_table"; dice: string; entries: Array<{ roll: string; result: string }> }
  | { type: "stats_table"; columns: string[]; rows: Array<Record<string, string>> }
  | { type: "equipment"; items: Array<{ name: string; cost?: string; stats?: string; effect?: string }> };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { content, sourceType, sourceName } = await req.json() as ExtractRequest;

    if (!content || content.trim().length < 50) {
      return new Response(JSON.stringify({ 
        error: "Content too short. Please provide more text to extract rules from." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracting rules from ${sourceType} source: ${sourceName || "unnamed"}`);
    console.log(`Content length: ${content.length} characters`);

    const systemPrompt = `You are an expert at extracting and structuring tabletop wargaming rules from raw text. 
Your task is to identify and categorize rules into structured data.

CATEGORIES TO DETECT:
- "Core Rules" - Basic game mechanics, turn structure, movement, combat
- "Roll Tables" - D6/2D6/D66 tables with results (injuries, events, random effects)
- "Keywords" - Special abilities with names and effects
- "Equipment" - Weapons, armor, items with costs and stats
- "Unit Profiles" - Character/unit stat blocks
- "Abilities" - Special rules for units or factions
- "Scenarios" - Mission objectives and setup
- "Advancement" - Experience, skills, progression tables
- "Custom" - Other game-specific rules

OUTPUT FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "rules": [
    {
      "category": "Roll Tables",
      "rule_key": "injury_table",
      "title": "Injury Table",
      "content": {
        "type": "roll_table",
        "dice": "D6",
        "entries": [
          {"roll": "1", "result": "Dead"},
          {"roll": "2-3", "result": "Seriously Injured"},
          {"roll": "4-5", "result": "Light Wound"},
          {"roll": "6", "result": "Full Recovery"}
        ]
      }
    },
    {
      "category": "Keywords",
      "rule_key": "fearless",
      "title": "Fearless",
      "content": {
        "type": "text",
        "text": "This model never has to take morale tests."
      }
    },
    {
      "category": "Equipment",
      "rule_key": "weapons_list",
      "title": "Weapons",
      "content": {
        "type": "equipment",
        "items": [
          {"name": "Sword", "cost": "5 gc", "stats": "S+1", "effect": "Parry"},
          {"name": "Axe", "cost": "3 gc", "stats": "S+2", "effect": "-"}
        ]
      }
    },
    {
      "category": "Core Rules",
      "rule_key": "turn_sequence",
      "title": "Turn Sequence",
      "content": {
        "type": "list",
        "items": ["1. Initiative Phase", "2. Movement Phase", "3. Shooting Phase", "4. Combat Phase"]
      }
    }
  ]
}

CONTENT TYPE RULES:
- Use "roll_table" for any dice-based result table (D6, 2D6, D66, etc.)
- Use "list" for ordered steps, phases, or bullet points
- Use "equipment" for items with costs/stats
- Use "stats_table" for unit profiles with multiple columns
- Use "text" for narrative rules or single-paragraph descriptions

IMPORTANT:
- Generate unique rule_key values (lowercase, underscores, no spaces)
- Group related rules under appropriate categories
- Extract ALL tables you find, especially roll tables
- Preserve dice notation (D6, 2D6, D66)
- Include costs, stats, and modifiers where present
- Be thorough - extract everything that looks like a game rule`;

    const userPrompt = `Extract all wargaming rules from the following text. Be thorough and extract every rule, table, ability, and piece of equipment you can find.

SOURCE TEXT:
${content.substring(0, 100000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
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
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("AI raw response length:", aiContent.length);

    // Parse the JSON response
    let parsedRules: { rules: ExtractedRule[] };
    try {
      // Try to extract JSON from code blocks or raw response
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      parsedRules = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiContent.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: "Failed to parse extracted rules. Please try again." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and enhance rules with metadata
    const rules = (parsedRules.rules || []).map((rule, index) => ({
      ...rule,
      rule_key: rule.rule_key || `rule_${index}`,
      metadata: {
        source_type: sourceType,
        source_name: sourceName || "Unknown",
        extracted_at: new Date().toISOString(),
        ...rule.metadata
      }
    }));

    // Group by category for summary
    const categorySummary = rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("Extracted rules:", rules.length);
    console.log("Categories:", categorySummary);

    return new Response(JSON.stringify({ 
      success: true,
      rules,
      summary: {
        totalRules: rules.length,
        categories: categorySummary
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Extract rules error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
