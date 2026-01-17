import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  content: string;
  sourceName?: string;
}

interface DetectedSection {
  name: string;
  type: "table" | "rules" | "equipment" | "skills" | "other";
  priority: "high" | "medium" | "low";
  estimatedComplexity: number; // 1-5
  startPosition: number;
  endPosition: number;
  indicators: string[];
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

    const { content, sourceName } = await req.json() as AnalyzeRequest;

    if (!content || content.trim().length < 100) {
      return new Response(JSON.stringify({ 
        error: "Content too short for analysis." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Analyzing document structure: ${sourceName || "unnamed"}`);
    console.log(`Content length: ${content.length} characters`);

    // Quick structural scan - sample the document at intervals
    const sampleSize = Math.min(content.length, 80000);
    const sample = content.length <= sampleSize 
      ? content 
      : [
          content.slice(0, 30000),
          content.slice(Math.floor(content.length / 2) - 15000, Math.floor(content.length / 2) + 15000),
          content.slice(-30000)
        ].join("\n\n--- DOCUMENT CONTINUES ---\n\n");

    const systemPrompt = `You are an expert at analyzing tabletop wargaming rulebook structure.
Your task is to quickly identify the major sections of a rulebook for targeted extraction.

Analyze the document and identify distinct sections that contain:
1. TABLES (roll tables, result tables, charts) - HIGHEST priority
2. CAMPAIGN RULES (post-battle, territory, income, advancement)
3. SKILL LISTS (skills by category)
4. EQUIPMENT LISTS (weapons, armor, items with costs)
5. CORE RULES (basic mechanics)
6. UNIT PROFILES (stat blocks)
7. SCENARIOS/MISSIONS

For each section found, provide:
- name: A descriptive name for the section
- type: "table" | "rules" | "equipment" | "skills" | "other"
- priority: "high" for tables and campaign rules, "medium" for equipment/skills, "low" for core rules
- estimatedComplexity: 1-5 based on content density
- indicators: Key phrases or headers that identify this section

OUTPUT FORMAT - Valid JSON only:
{
  "sections": [
    {
      "name": "Exploration Tables",
      "type": "table",
      "priority": "high",
      "estimatedComplexity": 4,
      "indicators": ["exploration", "common items", "rare finds", "d6 result"]
    },
    {
      "name": "Combat Skills",
      "type": "skills",
      "priority": "medium",
      "estimatedComplexity": 3,
      "indicators": ["combat skills", "shooting skills", "melee abilities"]
    }
  ],
  "documentInfo": {
    "estimatedPages": 50,
    "gameSystem": "Detected game name if recognizable",
    "hasComplexTables": true
  }
}

Focus on FINDING sections, not extracting content. Be thorough but fast.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this wargaming rulebook and identify its major sections:\n\n${sample}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
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

    // Parse the JSON response
    let analysis: { sections: DetectedSection[]; documentInfo?: Record<string, unknown> };
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent.substring(0, 500));
      // Fall back to basic section detection
      analysis = {
        sections: detectSectionsFromText(content),
        documentInfo: { estimatedPages: Math.ceil(content.length / 3000) }
      };
    }

    // Enrich sections with position data from the original content
    const enrichedSections = analysis.sections.map((section, idx) => {
      const position = findSectionPosition(content, section.indicators);
      return {
        ...section,
        id: `section_${idx}`,
        startPosition: position.start,
        endPosition: position.end,
      };
    });

    console.log(`Detected ${enrichedSections.length} sections`);

    return new Response(JSON.stringify({
      success: true,
      sections: enrichedSections,
      documentInfo: analysis.documentInfo || {},
      totalCharacters: content.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analyze document error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback: basic text pattern detection
function detectSectionsFromText(content: string): DetectedSection[] {
  const lower = content.toLowerCase();
  const sections: DetectedSection[] = [];

  const patterns = [
    { name: "Exploration Tables", type: "table" as const, priority: "high" as const, keywords: ["exploration", "loot table", "treasure table", "salvage"] },
    { name: "Skill Tables", type: "skills" as const, priority: "high" as const, keywords: ["skill table", "skills table", "combat skills", "shooting skills"] },
    { name: "Equipment List", type: "equipment" as const, priority: "medium" as const, keywords: ["equipment", "weapons", "armour list", "armor list", "price list"] },
    { name: "Campaign Rules", type: "rules" as const, priority: "high" as const, keywords: ["post-game", "post game", "campaign phase", "between battles"] },
    { name: "Injury Tables", type: "table" as const, priority: "medium" as const, keywords: ["injury table", "casualty", "wound table", "out of action"] },
    { name: "Core Rules", type: "rules" as const, priority: "low" as const, keywords: ["core rules", "basic rules", "game sequence", "turn structure"] },
  ];

  for (const pattern of patterns) {
    const found = pattern.keywords.some(kw => lower.includes(kw));
    if (found) {
      sections.push({
        name: pattern.name,
        type: pattern.type,
        priority: pattern.priority,
        estimatedComplexity: pattern.priority === "high" ? 4 : 3,
        startPosition: 0,
        endPosition: content.length,
        indicators: pattern.keywords.filter(kw => lower.includes(kw)),
      });
    }
  }

  return sections;
}

// Find approximate position of a section in the document
function findSectionPosition(content: string, indicators: string[]): { start: number; end: number } {
  const lower = content.toLowerCase();
  let minStart = content.length;
  let maxEnd = 0;
  let foundAny = false;

  for (const indicator of indicators) {
    const idx = lower.indexOf(indicator.toLowerCase());
    if (idx !== -1) {
      foundAny = true;
      // Capture more context: 2000 chars before, 50000 chars after (to get complete tables)
      minStart = Math.min(minStart, Math.max(0, idx - 2000));
      maxEnd = Math.max(maxEnd, Math.min(content.length, idx + 50000));
    }
  }

  // If no indicators found, return full document
  if (!foundAny || minStart >= maxEnd) {
    return { start: 0, end: content.length };
  }

  // Try to extend to next major section boundary (look for common headers)
  const sectionBoundaries = [
    "\n\n## ", "\n\n### ", "\n\nCHAPTER", "\n\nSECTION",
    "\nTABLE", "\nRULES", "\nEQUIPMENT", "\nSKILLS", "\nSCENARIO"
  ];
  
  const afterSection = content.slice(maxEnd);
  let nextBoundary = afterSection.length;
  
  for (const boundary of sectionBoundaries) {
    const idx = afterSection.toLowerCase().indexOf(boundary.toLowerCase());
    if (idx !== -1 && idx < nextBoundary && idx < 30000) {
      nextBoundary = idx;
    }
  }
  
  // Extend to the next boundary but cap at 80k total
  const extendedEnd = Math.min(content.length, maxEnd + nextBoundary, minStart + 80000);

  return { start: minStart, end: extendedEnd };
}
