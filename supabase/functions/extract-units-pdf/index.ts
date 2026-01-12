import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedUnit {
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

interface ExtractionRequest {
  pdfContent: string; // Base64 or text content
  faction?: string; // Optional faction filter
  gameSystem?: string; // e.g., "Lion Rampant", "Warhammer", etc.
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

    const { pdfContent, faction, gameSystem } = await req.json() as ExtractionRequest;

    if (!pdfContent) {
      return new Response(
        JSON.stringify({ error: "No PDF content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert wargaming rules parser. Your task is to extract unit datasheets from army book PDFs and convert them into structured JSON data.

EXTRACTION RULES:
1. Extract ALL units you find in the content
2. For each unit, capture:
   - Name: The unit's official name
   - Faction: The army/faction the unit belongs to
   - Sub-faction: Any sub-faction, warband type, or specialization (if applicable)
   - Base Cost: The point cost for the base unit
   - Stats: All stat lines (movement, combat skill, armor, etc.) - use the exact stat names from the game system
   - Abilities: Special rules, traits, or abilities with their effects
   - Equipment Options: Weapons, armor, and upgrades with their costs
     - Include any replacement rules (what equipment it replaces)
     - Include any requirements (what equipment is needed to take this)
     - Include any exclusions (what equipment cannot be taken with this)
   - Keywords: Unit types, roles, or special categorizations

STAT FORMATS:
- For movement, use the format as written (e.g., "6\\"" for 6 inches, or just "6" for abstract movement)
- For dice-based stats, use the number (e.g., "4+" becomes 4, "3D6" stays as "3D6")
- Preserve the original stat names from the game system

EQUIPMENT RULES:
- "replaces": The equipment being swapped out (e.g., "Sword" if taking a "Great Weapon" that replaces it)
- "requires": Equipment that must be taken to unlock this option
- "excludes": Equipment that cannot be taken alongside this option

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object in this exact format:
{
  "units": [
    {
      "name": "Unit Name",
      "faction": "Faction Name",
      "sub_faction": "Sub-faction or null",
      "base_cost": 6,
      "stats": {
        "move": "6\\"",
        "attack": 4,
        "defence": 3,
        "courage": 4,
        "armor": 2
      },
      "abilities": [
        {"name": "Ability Name", "effect": "Description of what it does"}
      ],
      "equipment_options": [
        {"name": "Great Weapon", "cost": 1, "replaces": "Hand Weapon"},
        {"name": "Shield", "cost": 1, "excludes": ["Two-Handed Weapon"]},
        {"name": "Crossbow", "cost": 2, "requires": ["Light Armour"]}
      ],
      "keywords": ["Infantry", "Elite", "Melee"]
    }
  ],
  "gameSystem": "Detected game system name",
  "extractionNotes": "Any notes about the extraction or potential issues"
}

${gameSystem ? `The game system is: ${gameSystem}` : "Try to detect the game system from the content."}
${faction ? `Focus on extracting units for the "${faction}" faction.` : "Extract all units you find."}

IMPORTANT:
- Do NOT include any explanation or markdown, ONLY the JSON object
- If you cannot extract any units, return {"units": [], "extractionNotes": "Reason why"}
- Be thorough - extract ALL equipment options, even minor ones
- Preserve exact wording from the source for ability effects`;

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
          { role: "user", content: `Extract unit datasheets from this army book content:\n\n${pdfContent.substring(0, 100000)}` }
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

    console.log("AI raw response length:", content.length);

    // Parse the JSON response
    let parsedData: { units: ExtractedUnit[]; gameSystem?: string; extractionNotes?: string };
    try {
      // Try to extract JSON from the response (may be wrapped in markdown)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response",
          units: [],
          extractionNotes: "The AI response could not be parsed as valid JSON. Try uploading a cleaner PDF or using a different section."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize units
    const validatedUnits = (parsedData.units || []).filter(unit => 
      unit.name && unit.faction && typeof unit.base_cost === "number"
    ).map(unit => ({
      ...unit,
      sub_faction: unit.sub_faction || null,
      stats: unit.stats || {},
      abilities: Array.isArray(unit.abilities) ? unit.abilities : [],
      equipment_options: Array.isArray(unit.equipment_options) ? unit.equipment_options : [],
      keywords: Array.isArray(unit.keywords) ? unit.keywords : [],
    }));

    console.log("Extracted units:", validatedUnits.length);

    return new Response(
      JSON.stringify({
        units: validatedUnits,
        gameSystem: parsedData.gameSystem || gameSystem || "Unknown",
        extractionNotes: parsedData.extractionNotes || `Successfully extracted ${validatedUnits.length} units.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unit extraction error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        units: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
