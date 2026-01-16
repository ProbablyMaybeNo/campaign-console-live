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
Your task is to identify and categorize ALL rules, tables, and game content into structured data.

CRITICAL: FIND ALL TABLES!
Look very carefully for these table patterns:
- EXPLORATION TABLES: Common/Rare/Legendary exploration results, loot tables, treasure tables
- SKILL TABLES: Combat skills, shooting skills, academic skills, strength skills, speed skills, etc.
- INJURY TABLES: Injury results, casualty tables, wound tables
- EVENT TABLES: Random events, campaign events, battle events
- ADVANCEMENT TABLES: Level up rewards, experience tables
- EQUIPMENT TABLES: Weapons, armor, gear with costs/stats
- ANY numbered list with dice results (1-6, 2D6, D66, etc.)

TABLE DETECTION HINTS:
- Numbers followed by results (1. Something, 2. Something OR 1-2: Result, 3-4: Result)
- Headers like "Roll", "Result", "Effect", "D6", "2D6"
- Section titles containing "Table", "Chart", "Results", "Exploration", "Skills"
- Grouped items under rarity labels (Common, Rare, Legendary, Uncommon)

CATEGORIES TO USE:
- "Exploration Tables" - Loot, treasure, exploration results (Common/Rare/Legendary)
- "Skill Tables" - Combat skills, shooting skills, academic skills, etc.
- "Roll Tables" - Any other D6/2D6/D66 result tables
- "Injury Tables" - Injury, casualty, wound tables
- "Equipment" - Weapons, armor, items with costs and stats
- "Keywords" - Special abilities with names and effects
- "Core Rules" - Basic game mechanics, turn structure, movement, combat
- "Unit Profiles" - Character/unit stat blocks
- "Abilities" - Special rules for units or factions
- "Scenarios" - Mission objectives and setup
- "Advancement" - Experience and progression rules
- "Custom" - Other game-specific rules

OUTPUT FORMAT - Respond with valid JSON:
{
  "rules": [
    {
      "category": "Exploration Tables",
      "rule_key": "common_exploration",
      "title": "Common Exploration Table",
      "content": {
        "type": "roll_table",
        "dice": "D6",
        "entries": [
          {"roll": "1", "result": "Nothing Found"},
          {"roll": "2", "result": "Scrap Metal - Worth 5 ducats"},
          {"roll": "3-4", "result": "Supplies - Gain 1 supply token"},
          {"roll": "5-6", "result": "Hidden Cache - Roll on Rare table"}
        ]
      }
    },
    {
      "category": "Skill Tables",
      "rule_key": "combat_skills",
      "title": "Combat Skills",
      "content": {
        "type": "roll_table",
        "dice": "D6",
        "entries": [
          {"roll": "1", "result": "Weapon Master - +1 to hit in melee"},
          {"roll": "2", "result": "Parry - May re-roll one failed defence"},
          {"roll": "3", "result": "Riposte - On successful parry, make free attack"}
        ]
      }
    },
    {
      "category": "Equipment",
      "rule_key": "melee_weapons",
      "title": "Melee Weapons",
      "content": {
        "type": "equipment",
        "items": [
          {"name": "Sword", "cost": "10 ducats", "stats": "Melee, +1 Attack", "effect": "Parry"},
          {"name": "Great Axe", "cost": "15 ducats", "stats": "Melee, +2 Damage", "effect": "Two-handed"}
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
    }
  ]
}

CONTENT TYPE RULES:
- "roll_table": For ANY numbered/dice result table. Include dice type and all entries.
- "equipment": For items with costs/stats. Each item has name, cost, stats, effect.
- "stats_table": For unit profiles. Include columns array and rows array.
- "list": For ordered steps or bullet points.
- "text": For narrative rules or descriptions.

CRITICAL INSTRUCTIONS:
1. EXTRACT EVERY TABLE - Don't skip any! Each distinct table should be its own rule entry.
2. For skill tables, create SEPARATE entries for each skill category (Combat Skills, Shooting Skills, etc.)
3. For exploration tables, create SEPARATE entries for each rarity tier (Common, Rare, Legendary)
4. Preserve all numbers, modifiers, and game-specific terms exactly as written
5. Generate unique rule_key values (lowercase with underscores)
6. Be extremely thorough - extract EVERYTHING that could be a game rule or table`;

    const userPrompt = `Extract ALL wargaming rules from the following text. Pay special attention to:
1. EXPLORATION TABLES - Look for Common/Rare/Legendary result tables, loot tables
2. SKILL TABLES - Look for lists of skills organized by category (Combat, Shooting, Academic, etc.)
3. EQUIPMENT TABLES - Weapons, armor, and gear with costs
4. ANY other numbered result tables

Be EXTREMELY thorough. Every table should become a separate rule entry.

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
