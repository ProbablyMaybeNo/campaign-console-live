import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  extractedText: string;
  gameSystem?: string;
  parseMode: "units" | "rules" | "both";
}

interface ParsedUnit {
  name: string;
  faction: string;
  sub_faction?: string;
  base_cost: number;
  stats: Record<string, string | number>;
  abilities: Array<{ name: string; effect: string }>;
  equipment_options: Array<{
    name: string;
    cost: number;
    replaces?: string;
    requires?: string[];
    excludes?: string[];
  }>;
  keywords: string[];
}

interface ParsedRule {
  category: string;
  title: string;
  content: string;
  rule_key: string;
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

    const { extractedText, gameSystem, parseMode } = await req.json() as ParseRequest;

    if (!extractedText) {
      return new Response(
        JSON.stringify({ error: "No text content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing PDF text, length:", extractedText.length, "mode:", parseMode);

    const systemPrompt = `You are an expert wargaming rules parser. Your task is to extract and categorize content from wargaming rulebooks and army books.

EXTRACTION MODE: ${parseMode}

${parseMode === "units" || parseMode === "both" ? `
UNIT EXTRACTION:
Extract ALL unit datasheets you find. For each unit capture:
- name: The unit's official name
- faction: The army/faction the unit belongs to
- sub_faction: Any sub-faction or specialization (if applicable)
- base_cost: The point cost for the base unit (number)
- stats: All stat lines using exact game terminology
- abilities: Special rules with their effects
- equipment_options: Weapons/armor/upgrades with costs and any rules:
  - replaces: Equipment this option replaces
  - requires: Prerequisites needed
  - excludes: Incompatible options
- keywords: Unit types, roles, categorizations
` : ""}

${parseMode === "rules" || parseMode === "both" ? `
RULES EXTRACTION:
Extract and categorize game rules into sections:
- Core Rules: Basic game mechanics (movement, combat, morale)
- Special Rules: Named special abilities that units can have
- Equipment: Weapon profiles, armor types, and their effects
- Magic/Psychic: Spells, powers, and their effects (if applicable)
- Scenarios: Mission types and victory conditions
- Army Building: List construction rules and restrictions

For each rule section:
- category: One of the categories above
- title: Clear section title
- content: The full rule text, properly formatted
- rule_key: Unique snake_case identifier
` : ""}

${gameSystem ? `The game system is: ${gameSystem}` : "Try to detect the game system from the content."}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "gameSystem": "Detected or provided game system name",
  "units": [...], // Array of unit objects (if parseMode includes units)
  "rules": [...], // Array of rule objects (if parseMode includes rules)
  "summary": "Brief summary of what was extracted"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanations
- Be thorough - extract ALL content you find
- Preserve exact wording for rules and abilities
- If content is unclear, make reasonable interpretations`;

    // Limit text to avoid token limits
    const maxChars = 80000; // ~20k tokens
    const truncatedText = extractedText.length > maxChars 
      ? extractedText.substring(0, maxChars) + "\n\n[Content truncated...]"
      : extractedText;

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
          { role: "user", content: `Parse the following wargaming rulebook/army book content:\n\n${truncatedText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response length:", content.length);

    // Parse the JSON response
    let parsedData: {
      gameSystem?: string;
      units?: ParsedUnit[];
      rules?: ParsedRule[];
      summary?: string;
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response",
          units: [],
          rules: [],
          summary: "Parsing failed. The content may not be in a recognizable format."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize data
    const validatedUnits = (parsedData.units || []).filter(unit => 
      unit.name && typeof unit.base_cost === "number"
    ).map(unit => ({
      ...unit,
      faction: unit.faction || "Unknown",
      sub_faction: unit.sub_faction || null,
      stats: unit.stats || {},
      abilities: Array.isArray(unit.abilities) ? unit.abilities : [],
      equipment_options: Array.isArray(unit.equipment_options) ? unit.equipment_options : [],
      keywords: Array.isArray(unit.keywords) ? unit.keywords : [],
    }));

    const validatedRules = (parsedData.rules || []).filter(rule =>
      rule.category && rule.title && rule.content
    ).map(rule => ({
      ...rule,
      rule_key: rule.rule_key || rule.title.toLowerCase().replace(/\s+/g, "_").substring(0, 50),
    }));

    console.log("Extracted:", validatedUnits.length, "units,", validatedRules.length, "rules");

    return new Response(
      JSON.stringify({
        gameSystem: parsedData.gameSystem || gameSystem || "Unknown",
        units: validatedUnits,
        rules: validatedRules,
        summary: parsedData.summary || `Extracted ${validatedUnits.length} units and ${validatedRules.length} rule sections.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Parse error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        units: [],
        rules: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
