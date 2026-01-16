import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  extractedText: string;
  gameSystem?: string;
}

interface ExtractedRule {
  category: string;
  title: string;
  rule_key: string;
  content: {
    type: "text" | "roll_table" | "keyword" | "equipment" | "unit_profile";
    text?: string;
    dice?: string;
    entries?: Array<{ roll: string; result: string; effect?: string }>;
    name?: string;
    effect?: string;
    cost?: number;
    stats?: Record<string, string | number>;
    properties?: Record<string, string>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { extractedText, gameSystem } = await req.json() as ExtractRequest;

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text provided for extraction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-rules] Processing ${extractedText.length} chars for ${gameSystem || 'unknown'} system`);

    const systemPrompt = `You are an expert wargame rules parser. Your task is to extract structured rules from wargame rulebooks, army books, and campaign supplements.

EXTRACTION CATEGORIES:
1. **Core Rules** - Turn structure, phases, basic mechanics, movement, combat resolution
2. **Roll Tables** - Injury tables, exploration tables, advancement tables, random events (D6, 2D6, D66 format)
3. **Keywords & Abilities** - Special rules with name and effect description
4. **Equipment & Battlekit** - Weapons, armor, items with costs and effects
5. **Unit Profiles** - Stat blocks with movement, combat, defense values
6. **Campaign Rules** - Progression, patrons, territory, between-game sequences

OUTPUT FORMAT (JSON):
{
  "gameSystem": "detected game system name or provided value",
  "rules": [
    {
      "category": "Roll Tables",
      "title": "Injury Table",
      "rule_key": "injury_table",
      "content": {
        "type": "roll_table",
        "dice": "2D6",
        "entries": [
          { "roll": "2-4", "result": "Dead", "effect": "Remove model from campaign" },
          { "roll": "5-6", "result": "Serious Injury", "effect": "Miss next game" }
        ]
      }
    },
    {
      "category": "Keywords",
      "title": "Fearless",
      "rule_key": "keyword_fearless",
      "content": {
        "type": "keyword",
        "name": "Fearless",
        "effect": "This model automatically passes all morale tests"
      }
    },
    {
      "category": "Core Rules",
      "title": "Movement Phase",
      "rule_key": "movement_phase",
      "content": {
        "type": "text",
        "text": "During the movement phase, each model may move up to its Movement characteristic in inches..."
      }
    },
    {
      "category": "Equipment",
      "title": "Heavy Bolter",
      "rule_key": "equipment_heavy_bolter",
      "content": {
        "type": "equipment",
        "name": "Heavy Bolter",
        "cost": 15,
        "properties": {
          "range": "36\"",
          "strength": "5",
          "ap": "-1",
          "damage": "2",
          "special": "Heavy, Sustained Hits 1"
        }
      }
    }
  ],
  "summary": "Extracted X core rules, Y roll tables, Z keywords..."
}

IMPORTANT EXTRACTION RULES:
1. Preserve exact roll ranges (e.g., "2-4", "5-6", "7+") for tables
2. Keep effects and descriptions verbatim from the source
3. Generate unique rule_keys using snake_case (e.g., "injury_table", "keyword_fearless")
4. Detect dice notation (D6, 2D6, D66, D3, etc.) for roll tables
5. Extract ALL tables you find - they are critical for campaign play
6. Group related rules under appropriate categories
7. For stat blocks, include all numeric values found

${gameSystem ? `The game system is: ${gameSystem}` : 'Detect the game system from the content if possible.'}`;

    // Truncate input if too long (keep ~100k chars to leave room for response)
    const maxInputLength = 100000;
    const truncatedText = extractedText.length > maxInputLength 
      ? extractedText.substring(0, maxInputLength) + "\n\n[Content truncated due to length...]"
      : extractedText;

    console.log(`[extract-rules] Sending ${truncatedText.length} chars to AI`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all rules, tables, keywords, and structured content from the following wargame text:\n\n${truncatedText}` }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[extract-rules] AI API error: ${status} - ${errorText}`);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log(`[extract-rules] AI response length: ${aiContent.length}`);

    // Parse the AI response (handle markdown code blocks)
    let parsed;
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[extract-rules] JSON parse error:', parseError);
      console.log('[extract-rules] Raw AI content:', aiContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and normalize the response
    const rules: ExtractedRule[] = Array.isArray(parsed.rules) ? parsed.rules : [];
    
    // Ensure each rule has required fields
    const validatedRules = rules
      .filter(rule => rule.title && rule.category && rule.content)
      .map(rule => ({
        category: String(rule.category),
        title: String(rule.title),
        rule_key: rule.rule_key || `rule_${rule.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
        content: rule.content,
      }));

    // Group by category for summary
    const categoryCount = validatedRules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summaryParts = Object.entries(categoryCount)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    const result = {
      gameSystem: parsed.gameSystem || gameSystem || 'Unknown',
      rules: validatedRules,
      summary: validatedRules.length > 0 
        ? `Extracted ${validatedRules.length} rules: ${summaryParts}`
        : 'No structured rules found in the document',
    };

    console.log(`[extract-rules] Extracted ${validatedRules.length} rules across ${Object.keys(categoryCount).length} categories`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-rules] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
