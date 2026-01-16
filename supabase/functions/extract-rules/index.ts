import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  content: string;
  sourceType: "pdf" | "text";
  sourceName?: string;
  campaignId: string;  // Required for save-first mode
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

    const { content, sourceType, sourceName, campaignId } = await req.json() as ExtractRequest;

    if (!campaignId) {
      return new Response(JSON.stringify({ 
        error: "Campaign ID is required for save-first extraction." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!content || content.trim().length < 50) {
      return new Response(JSON.stringify({ 
        error: "Content too short. Please provide more text to extract rules from." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token from request for Supabase client
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    console.log(`Extracting rules from ${sourceType} source: ${sourceName || "unnamed"}`);
    console.log(`Content length: ${content.length} characters`);
    console.log(`Campaign ID: ${campaignId}`);

    const systemPrompt = `You are an expert at extracting and structuring tabletop wargaming rules from raw text.
Your task is to identify and categorize ALL rules, tables, and game content into structured data.

PRIORITY SECTIONS TO FIND:
1. CAMPAIGN RULES - Any section titled "Campaign", "Campaign Rules", "Campaign Phase", "Post-Battle", "Between Games"
2. ALL TABLES - Every single table in the document, no exceptions

CRITICAL: FIND ALL TABLES!
Scan the ENTIRE document for these table patterns:
- EXPLORATION TABLES: Common/Rare/Legendary exploration results, loot tables, treasure tables, salvage tables
- SKILL TABLES: Combat skills, shooting skills, academic skills, strength skills, speed skills, agility skills, etc.
- INJURY TABLES: Injury results, casualty tables, wound tables, critical hit tables
- EVENT TABLES: Random events, campaign events, battle events, weather tables
- ADVANCEMENT TABLES: Level up rewards, experience tables, progression tables
- EQUIPMENT TABLES: Weapons, armor, gear, relics, artifacts with costs/stats
- WARBAND TABLES: Hiring costs, warband composition, mercenary tables
- SCENARIO TABLES: Deployment, objectives, victory conditions
- ANY numbered list with dice results (D6, 2D6, D66, D3, etc.)

TABLE DETECTION - LOOK FOR:
- Numbers 1-6, 1-2, 3-4, 5-6 followed by text results
- Headers containing: "Roll", "Result", "Effect", "D6", "2D6", "D66", "Table", "Chart"
- Section titles with: "Table", "Chart", "Results", "Exploration", "Skills", "Rewards"
- Rarity labels: Common, Uncommon, Rare, Legendary, Epic
- Column layouts with multiple entries per row
- Bullet points or numbered lists that describe game effects

CATEGORIES TO USE:
- "Campaign Rules" - Post-battle sequences, campaign phases, territory, income
- "Exploration Tables" - Loot, treasure, exploration results by rarity tier
- "Skill Tables" - Skills organized by type (Combat, Shooting, Academic, Strength, Speed, etc.)
- "Roll Tables" - Any other D6/2D6/D66 result tables
- "Injury Tables" - Injury, casualty, wound, critical hit tables
- "Equipment" - Weapons, armor, items with costs and stats
- "Keywords" - Special abilities with names and effects
- "Core Rules" - Basic game mechanics, turn structure, movement, combat
- "Unit Profiles" - Character/unit stat blocks with stats
- "Abilities" - Special rules for units or factions
- "Scenarios" - Mission objectives and setup rules
- "Advancement" - Experience and progression rules
- "Warband Rules" - Warband creation, hiring, composition
- "Custom" - Other game-specific rules

OUTPUT FORMAT - Respond with valid JSON:
{
  "rules": [
    {
      "category": "Campaign Rules",
      "rule_key": "post_battle_sequence",
      "title": "Post-Battle Sequence",
      "content": {
        "type": "list",
        "items": ["1. Determine Victory", "2. Roll for Injuries", "3. Collect Income", "4. Roll for Exploration", "5. Buy Equipment"]
      }
    },
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
          {"name": "Sword", "cost": "10 ducats", "stats": "Melee, +1 Attack", "effect": "Parry"}
        ]
      }
    }
  ]
}

CONTENT TYPE RULES:
- "roll_table": For ANY numbered/dice result table. MUST include dice type and ALL entries.
- "equipment": For items with costs/stats.
- "stats_table": For unit profiles with columns and rows.
- "list": For ordered steps or bullet points.
- "text": For narrative rules or descriptions.

CRITICAL INSTRUCTIONS:
1. SCAN THE ENTIRE DOCUMENT - Read from start to finish, don't miss anything
2. EXTRACT EVERY SINGLE TABLE - Each distinct table = separate rule entry
3. For skill tables: Create SEPARATE entries for EACH skill category
4. For exploration tables: Create SEPARATE entries for EACH rarity tier (Common, Rare, Legendary)
5. For campaign rules: Extract the FULL sequence and all sub-rules
6. Preserve ALL numbers, modifiers, costs, and game terms EXACTLY as written
7. If a table has 6 entries, include all 6. If it has 36, include all 36.
8. Generate unique rule_key values (lowercase_with_underscores)`;

    function buildSourceTextForExtraction(raw: string): string {
      const total = raw.length;
      const lower = raw.toLowerCase();

      const keywords = [
        "campaign rules",
        "campaign",
        "post-battle",
        "between games",
        "exploration",
        "common exploration",
        "rare exploration",
        "legendary exploration",
        "skills",
        "skill",
        "advancement",
        "injury",
      ];

      type Interval = { start: number; end: number; reason: string };
      const intervals: Interval[] = [];

      const addInterval = (start: number, end: number, reason: string) => {
        const s = Math.max(0, Math.min(total, start));
        const e = Math.max(0, Math.min(total, end));
        if (e - s < 200) return;
        intervals.push({ start: Math.min(s, e), end: Math.max(s, e), reason });
      };

      // Always include start + end, because many books place tables later.
      addInterval(0, Math.min(120_000, total), "start");
      addInterval(Math.max(0, total - 90_000), total, "end");

      for (const kw of keywords) {
        const idx = lower.indexOf(kw);
        if (idx === -1) continue;
        console.log(`Keyword hit: "${kw}" at ${idx}`);
        addInterval(idx - 15_000, idx + 55_000, `kw:${kw}`);
      }

      // Merge overlaps
      intervals.sort((a, b) => a.start - b.start);
      const merged: Interval[] = [];
      for (const it of intervals) {
        const last = merged[merged.length - 1];
        if (!last) {
          merged.push({ ...it });
          continue;
        }
        if (it.start <= last.end + 2_000) {
          last.end = Math.max(last.end, it.end);
          last.reason = `${last.reason}|${it.reason}`;
        } else {
          merged.push({ ...it });
        }
      }

      const maxTotalChars = 180_000;
      let used = 0;
      const parts: string[] = [];

      for (const m of merged) {
        if (used >= maxTotalChars) break;
        let slice = raw.slice(m.start, m.end);
        if (used + slice.length > maxTotalChars) {
          slice = slice.slice(0, maxTotalChars - used);
        }
        parts.push(`\n\n--- EXCERPT (${m.start}-${m.end}) [${m.reason}] ---\n\n`);
        parts.push(slice);
        used += slice.length;
      }

      return parts.join("");
    }

    const sourceText = buildSourceTextForExtraction(content);
    console.log(`Extraction source length: ${sourceText.length} characters`);

    const userPrompt = `Extract ALL rules and tables from this wargaming rulebook.

IMPORTANT - THOROUGHLY SCAN FOR:
1. CAMPAIGN RULES SECTION - Post-battle, between games, territory, income
2. ALL EXPLORATION TABLES - Common, Rare, Legendary (each as separate entries)
3. ALL SKILL TABLES - Every skill category as a separate entry
4. ALL EQUIPMENT/WEAPON TABLES
5. ALL INJURY/CASUALTY TABLES
6. EVERY OTHER TABLE or titled results section in the document

If something is clearly a named section (e.g. "Common Exploration", "Shooting Skills") but the formatting is messy, STILL extract it as a rule entry (use type "list" or "text" if needed).

Create a SEPARATE rule entry for each distinct table/section. Do not combine tables.
Include EVERY entry in each table - if a D6 table has 6 results, include all 6.

SOURCE TEXT:
${sourceText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 32000,
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

    // Parse the JSON response - handle truncation gracefully
    let parsedRules: { rules: ExtractedRule[] };
    try {
      // Try to extract JSON from code blocks or raw response
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      let jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      
      // If JSON is truncated, try to recover by closing arrays/objects
      try {
        parsedRules = JSON.parse(jsonStr);
      } catch {
        console.log("Initial parse failed, attempting truncation recovery...");
        
        // Find last complete rule object by looking for closing braces
        const lastCompleteRule = jsonStr.lastIndexOf('}');
        if (lastCompleteRule > 0) {
          // Try to find a clean cut point after a complete rule
          let cutPoint = lastCompleteRule;
          
          // Look backwards for the pattern "},\n" or "}\n" which indicates end of a rule
          const patterns = ['},', '}\n    ]', '}\n  ]'];
          for (const pattern of patterns) {
            const idx = jsonStr.lastIndexOf(pattern);
            if (idx > cutPoint - 500 && idx > 0) {
              cutPoint = idx + 1;
              break;
            }
          }
          
          jsonStr = jsonStr.substring(0, cutPoint);
          
          // Count open braces/brackets and close them
          const openBraces = (jsonStr.match(/{/g) || []).length;
          const closeBraces = (jsonStr.match(/}/g) || []).length;
          const openBrackets = (jsonStr.match(/\[/g) || []).length;
          const closeBrackets = (jsonStr.match(/\]/g) || []).length;
          
          // Remove trailing comma if present
          jsonStr = jsonStr.replace(/,\s*$/, '');
          
          // Close remaining open structures
          jsonStr += '}}'.repeat(Math.max(0, openBraces - closeBraces - 1));
          jsonStr += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
          jsonStr += '}';
          
          console.log("Recovered JSON length:", jsonStr.length);
          parsedRules = JSON.parse(jsonStr);
          console.log("Truncation recovery successful, extracted rules:", parsedRules.rules?.length || 0);
        } else {
          throw new Error("Could not find any complete rules in response");
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiContent.substring(0, 500));
      console.error("Parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Failed to parse extracted rules. The AI response was incomplete. Please try again." 
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

    // SAVE-FIRST: Insert rules directly into database
    const dbRules = rules.map((rule) => ({
      campaign_id: campaignId,
      category: rule.category,
      rule_key: rule.rule_key,
      title: rule.title,
      content: rule.content,
      metadata: rule.metadata,
    }));

    const { data: insertedRules, error: insertError } = await supabase
      .from("wargame_rules")
      .insert(dbRules)
      .select("id, category, title");

    if (insertError) {
      console.error("Failed to save rules:", insertError);
      return new Response(JSON.stringify({ 
        error: `Failed to save rules to database: ${insertError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Saved rules to database:", insertedRules?.length || 0);

    // Return only summary - client will fetch full rules from database
    return new Response(JSON.stringify({ 
      success: true,
      saved: insertedRules?.length || 0,
      summary: {
        totalRules: rules.length,
        categories: categorySummary
      }
    }, null, 0), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
      },
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
