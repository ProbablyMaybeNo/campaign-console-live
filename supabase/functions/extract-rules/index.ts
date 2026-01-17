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
  campaignId: string;
  // New: focused extraction parameters
  focusedSection?: {
    name: string;
    type: string;
    startPosition: number;
    endPosition: number;
  };
  extractionJobId?: string;
  // Preview mode: return rules without saving
  previewMode?: boolean;
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

    const { content, sourceType, sourceName, campaignId, focusedSection, extractionJobId, previewMode } = await req.json() as ExtractRequest;

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

    const isFocusedExtraction = !!focusedSection;
    console.log(`Extracting rules from ${sourceType} source: ${sourceName || "unnamed"}`);
    console.log(`Content length: ${content.length} characters`);
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Focused extraction: ${isFocusedExtraction ? focusedSection.name : "No (full document)"}`);
    console.log(`Preview mode: ${previewMode ? "Yes" : "No"}`);
    // Build the system prompt - adjust based on whether this is focused extraction
    const systemPrompt = buildSystemPrompt(focusedSection);

    // Build source text - either focused section or intelligent excerpts
    const sourceText = isFocusedExtraction
      ? extractFocusedContent(content, focusedSection)
      : buildSourceTextForExtraction(content);

    console.log(`Extraction source length: ${sourceText.length} characters`);

    const userPrompt = buildUserPrompt(sourceText, focusedSection);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 65000,
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
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      let jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      
      // Check if the AI returned a text explanation instead of JSON
      // This happens when the section isn't found in the provided content
      const looksLikeJson = jsonStr.trim().startsWith('{') || jsonStr.trim().startsWith('[');
      if (!looksLikeJson) {
        console.log("AI returned text explanation instead of JSON - section likely not in content");
        console.log("AI response preview:", aiContent.substring(0, 300));
        // Return empty rules with a message - this is not an error, just no rules found
        parsedRules = { rules: [] };
      } else {
        try {
          parsedRules = JSON.parse(jsonStr);
        } catch {
          console.log("Initial parse failed, attempting truncation recovery...");
          parsedRules = recoverTruncatedJson(jsonStr);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiContent.substring(0, 500));
      console.error("Parse error:", parseError);
      // Instead of returning 500, return empty rules so the UI can continue
      parsedRules = { rules: [] };
    }

    // Validate and enhance rules with metadata
    const rules = (parsedRules.rules || []).map((rule, index) => {
      const validationStatus = validateRule(rule);
      return {
        ...rule,
        rule_key: rule.rule_key || `rule_${index}`,
        metadata: {
          source_type: sourceType,
          source_name: sourceName || "Unknown",
          extracted_at: new Date().toISOString(),
          focused_section: focusedSection?.name,
          ...rule.metadata
        },
        validation_status: validationStatus,
      };
    });

    // Group by category for summary
    const categorySummary = rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("Extracted rules:", rules.length);
    console.log("Categories:", categorySummary);

    // If preview mode, return rules without saving - include source text for unparsed content view
    if (previewMode) {
      console.log("Preview mode: returning rules without saving");
      return new Response(JSON.stringify({ 
        success: true,
        previewMode: true,
        rules: rules.map(r => ({
          category: r.category,
          rule_key: r.rule_key,
          title: r.title,
          content: r.content,
          metadata: r.metadata,
          validation_status: r.validation_status,
        })),
        section: focusedSection?.name || "full_document",
        // Include source text for user to review unparsed content
        sourceText: sourceText.length > 100000 ? sourceText.slice(0, 100000) : sourceText,
        summary: {
          totalRules: rules.length,
          categories: categorySummary,
          incompleteRules: rules.filter(r => r.validation_status !== "complete").length,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAVE-FIRST: Insert rules directly into database
    const dbRules = rules.map((rule) => ({
      campaign_id: campaignId,
      category: rule.category,
      rule_key: rule.rule_key,
      title: rule.title,
      content: rule.content,
      metadata: rule.metadata,
      extraction_job_id: extractionJobId || null,
      source_section: focusedSection?.name || null,
      validation_status: rule.validation_status,
    }));

    const { data: insertedRules, error: insertError } = await supabase
      .from("wargame_rules")
      .insert(dbRules)
      .select("id, category, title, validation_status");

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

    // If this is part of an extraction job, update the timestamp
    if (extractionJobId) {
      await supabase
        .from("extraction_jobs")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", extractionJobId);
    }

    // Count validation issues
    const incompleteCount = rules.filter(r => r.validation_status !== "complete").length;

    // Return summary
    return new Response(JSON.stringify({ 
      success: true,
      saved: insertedRules?.length || 0,
      section: focusedSection?.name || "full_document",
      summary: {
        totalRules: rules.length,
        categories: categorySummary,
        incompleteRules: incompleteCount,
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

// Build system prompt - can be customized for focused extraction
function buildSystemPrompt(focusedSection?: { name: string; type: string }): string {
  const basePrompt = `You are an expert at extracting and structuring tabletop wargaming rules from raw text.
Your task is to identify and categorize ALL rules, tables, and game content into structured data.`;

  const focusedInstructions = focusedSection ? `

FOCUS: You are extracting specifically from the "${focusedSection.name}" section.
Give this section your FULL attention - extract EVERY detail, EVERY table entry, EVERY item.
Do not skip anything. Complete extraction is critical.` : "";

  return `${basePrompt}
${focusedInstructions}

PRIORITY SECTIONS TO FIND:
1. CAMPAIGN RULES - Sections about what happens before/after battles, between games, territory, income, experience, advancement
2. ALL TABLES - Every single table in the document with ALL their rows, no exceptions

CRITICAL: EXTRACT COMPLETE TABLES!
Scan the ENTIRE document for these table patterns:
- EXPLORATION/LOOT TABLES: Results for searching, scavenging, treasure, salvage, rewards (often tiered by rarity)
- SKILL TABLES: Character skills, abilities, talents organized by category (combat, shooting, stealth, etc.)
- INJURY TABLES: Wounds, casualties, critical hits, death results
- EVENT TABLES: Random events, encounters, weather, terrain effects
- ADVANCEMENT TABLES: Level up, experience spending, progression, promotions
- EQUIPMENT TABLES: Weapons, armor, gear, items with costs and/or stats
- WARBAND/ROSTER TABLES: Hiring costs, unit options, mercenaries, allies
- SCENARIO TABLES: Missions, objectives, deployment, victory conditions
- ANY numbered list with dice results (D6, 2D6, D66, D3, D10, D100, etc.)

TABLE DETECTION PATTERNS:
- Numbers like 1, 2, 3, 4, 5, 6 or 1-2, 3-4, 5-6 followed by text results
- Headers containing: Roll, Result, Effect, D6, 2D6, D66, Table, Chart
- Section titles with: Table, Chart, Results, Roll, or category names
- Tier labels: Common, Uncommon, Rare, Legendary, Epic, Minor, Major
- Structured lists that map numbers/ranges to outcomes

CATEGORIES TO USE:
- "Campaign Rules" - Pre/post-battle phases, territory, income, downtime activities
- "Exploration Tables" - Loot, treasure, salvage, scavenging results (use for ANY reward tables)
- "Skill Tables" - Character skills/abilities by category
- "Roll Tables" - Any dice result tables not covered above
- "Injury Tables" - Wounds, casualties, critical hits
- "Equipment" - Weapons, armor, items with costs/stats
- "Keywords" - Named special abilities with effects
- "Core Rules" - Basic mechanics, turn structure, combat resolution
- "Unit Profiles" - Character/unit stat blocks
- "Abilities" - Special rules for units or factions
- "Scenarios" - Mission types and objectives
- "Advancement" - Experience and progression systems
- "Warband Rules" - Army creation, composition, hiring
- "Custom" - Other game-specific content

OUTPUT FORMAT - Valid JSON only:
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
    }
  ]
}

CONTENT TYPE RULES:
- "roll_table": For ANY numbered/dice result table. MUST have dice type AND all entries.
- "equipment": For items with costs and/or stats.
- "stats_table": For unit profiles with columns and rows.
- "list": For ordered steps or bullet points.
- "text": For narrative rules or descriptions.

ABSOLUTE REQUIREMENTS:
1. EVERY table entry must be included - if a D6 table has 6 rows, include all 6
2. EACH distinct table becomes a SEPARATE rule entry
3. For skill tables: Create SEPARATE entries for EACH skill category (Combat Skills, Shooting Skills, etc.)
4. For exploration/loot tables: Create SEPARATE entries for EACH tier (Common, Rare, Legendary, etc.)
5. Preserve ALL numbers, modifiers, costs, and game terms EXACTLY as written
6. If a table has 36 entries (D66), include all 36
7. Generate unique rule_key values (lowercase_with_underscores)
8. COMPLETE each table before moving to the next - never leave a table partially extracted`;
}

// Build user prompt
function buildUserPrompt(sourceText: string, focusedSection?: { name: string; type: string }): string {
  if (focusedSection) {
    return `Extract ALL rules and tables from this "${focusedSection.name}" section.

IMPORTANT: This is a FOCUSED extraction. Extract EVERY detail from this section.
- If it contains tables, include EVERY row
- If it contains equipment, include EVERY item
- If it contains skills, include EVERY skill

Do not skip anything. Complete extraction is critical.

SOURCE TEXT:
${sourceText}`;
  }

  return `Extract ALL rules and tables from this wargaming rulebook.

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
}

// Extract content for a focused section
function extractFocusedContent(content: string, section: { startPosition: number; endPosition: number; name: string }): string {
  const lower = content.toLowerCase();
  const sectionNameLower = section.name.toLowerCase();
  
  // First, try to find the section by its name directly in the content
  let searchStart = lower.indexOf(sectionNameLower);
  
  // If exact name not found, try searching for key words from the section name
  if (searchStart === -1) {
    const words = sectionNameLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      const idx = lower.indexOf(word);
      if (idx !== -1) {
        searchStart = idx;
        break;
      }
    }
  }
  
  // Use the found position if available, otherwise fall back to provided positions
  let start: number;
  let end: number;
  
  if (searchStart !== -1) {
    // Found the section by name - extract a large chunk around it
    start = Math.max(0, searchStart - 1000);
    end = Math.min(content.length, searchStart + 60000);
    console.log(`Found section "${section.name}" by name at position ${searchStart}`);
  } else {
    // Fall back to provided positions
    start = Math.max(0, section.startPosition);
    end = Math.min(content.length, section.endPosition);
    
    // If the positions seem invalid (e.g., 0 to content.length), try intelligent excerpting
    if (start === 0 && end === content.length) {
      console.log(`Section "${section.name}" has full-document positions, using intelligent search`);
      return buildSourceTextForExtraction(content);
    }
    
    // Add context buffer
    start = Math.max(0, start - 2000);
    end = Math.min(content.length, end + 5000);
  }
  
  const extracted = content.slice(start, end);
  
  console.log(`Focused extraction for "${section.name}": ${extracted.length} characters (positions ${start}-${end})`);
  
  // Safety check: if we got very little content, fall back to full intelligent extraction
  if (extracted.length < 500) {
    console.log(`Extracted content too short (${extracted.length}), falling back to intelligent excerpting`);
    return buildSourceTextForExtraction(content);
  }
  
  return extracted;
}

// Original intelligent excerpting for full document extraction
function buildSourceTextForExtraction(raw: string): string {
  const total = raw.length;
  const lower = raw.toLowerCase();

  const keywords = [
    "post game", "post-game", "post battle", "post-battle",
    "after the battle", "after battle", "between games", "between battles",
    "campaign phase", "campaign rules", "campaign turn",
    "downtime", "recovery phase", "upkeep phase",
    "exploration", "explore", "loot", "treasure", "salvage", "scavenge",
    "reward", "income", "territory",
    "skill table", "skills table", "combat skill", "shooting skill",
    "melee skill", "ranged skill", "special skill", "learn skill", "gain skill",
    "injury table", "injuries table", "casualty", "wound table",
    "critical hit", "out of action", "recovery",
    "advancement", "experience", "level up", "promotion", "improve", "upgrade",
    "equipment list", "weapon list", "weapons table",
    "armour list", "armor list", "item list", "price list",
    "trading post", "market",
    "d6 table", "2d6 table", "d66 table", "roll table", "result table",
    "random table", "chart",
  ];

  type Interval = { start: number; end: number; reason: string };
  const intervals: Interval[] = [];

  const addInterval = (start: number, end: number, reason: string) => {
    const s = Math.max(0, Math.min(total, start));
    const e = Math.max(0, Math.min(total, end));
    if (e - s < 200) return;
    intervals.push({ start: Math.min(s, e), end: Math.max(s, e), reason });
  };

  const sliceSize = 60_000;
  addInterval(0, Math.min(sliceSize, total), "start");

  const midStart = Math.max(0, Math.floor(total / 2) - Math.floor(sliceSize / 2));
  addInterval(midStart, Math.min(midStart + sliceSize, total), "middle");

  addInterval(Math.max(0, total - sliceSize), total, "end");

  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    console.log(`Keyword hit: "${kw}" at ${idx}`);
    addInterval(idx - 12_000, idx + 48_000, `kw:${kw}`);
  }

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

// Recover truncated JSON
function recoverTruncatedJson(jsonStr: string): { rules: ExtractedRule[] } {
  const lastCompleteRule = jsonStr.lastIndexOf('}');
  if (lastCompleteRule > 0) {
    let cutPoint = lastCompleteRule;
    
    const patterns = ['},', '}\n    ]', '}\n  ]'];
    for (const pattern of patterns) {
      const idx = jsonStr.lastIndexOf(pattern);
      if (idx > cutPoint - 500 && idx > 0) {
        cutPoint = idx + 1;
        break;
      }
    }
    
    jsonStr = jsonStr.substring(0, cutPoint);
    
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    
    jsonStr = jsonStr.replace(/,\s*$/, '');
    
    jsonStr += '}}'.repeat(Math.max(0, openBraces - closeBraces - 1));
    jsonStr += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    jsonStr += '}';
    
    console.log("Recovered JSON length:", jsonStr.length);
    const result = JSON.parse(jsonStr);
    console.log("Truncation recovery successful, extracted rules:", result.rules?.length || 0);
    return result;
  } else {
    throw new Error("Could not find any complete rules in response");
  }
}

// Validate a rule for completeness
function validateRule(rule: ExtractedRule): string {
  const content = rule.content;
  
  if (content.type === "roll_table") {
    const entries = content.entries || [];
    const dice = (content.dice || "").toUpperCase();
    
    // Check expected entry counts
    if (dice.includes("D6") && !dice.includes("2D6") && !dice.includes("D66")) {
      if (entries.length < 6) return "incomplete";
    }
    if (dice.includes("2D6")) {
      if (entries.length < 11) return "incomplete";
    }
    if (dice.includes("D66")) {
      if (entries.length < 36) return "incomplete";
    }
  }
  
  if (content.type === "equipment") {
    const items = content.items || [];
    if (items.length === 0) return "incomplete";
  }
  
  return "complete";
}
