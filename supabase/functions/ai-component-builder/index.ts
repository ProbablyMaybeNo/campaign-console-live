import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuilderRequest {
  prompt: string;
  componentType: "table" | "card";
  sourceContent?: string; // Extracted text from PDF or fetched content
  sourceUrl?: string; // URL to fetch content from
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

    const { prompt, componentType, sourceContent, sourceUrl } = await req.json() as BuilderRequest;

    // Build context for the AI
    let contentContext = "";
    
    if (sourceContent) {
      contentContext = `\n\nSOURCE CONTENT TO EXTRACT FROM:\n${sourceContent.substring(0, 50000)}`; // Limit to 50k chars
    }
    
    if (sourceUrl) {
      // Try to fetch content from URL (for repos, we'd need GitHub API, but for now just note it)
      contentContext += `\n\nThe user has provided this source URL: ${sourceUrl}`;
    }

    const systemPrompt = componentType === "table" 
      ? `You are a data extraction expert. The user wants to create a TABLE component for a wargame campaign dashboard.

Your job is to extract structured tabular data from the provided source content based on the user's request.

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "title": "Table title",
  "columns": ["Column1", "Column2", "Column3"],
  "rows": [
    {"Column1": "value1", "Column2": "value2", "Column3": "value3"},
    {"Column1": "value1", "Column2": "value2", "Column3": "value3"}
  ]
}

Guidelines:
- Extract the exact data the user is asking for
- Use clear, concise column names
- Include all relevant rows from the source
- If the source doesn't contain the requested data, create a reasonable structure with placeholder content
- For wargame data: look for stats, profiles, costs, abilities, weapons, etc.`
      : `You are a data extraction expert. The user wants to create a CARD component for a wargame campaign dashboard.

Your job is to extract structured card data from the provided source content based on the user's request.

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "title": "Cards title",
  "cards": [
    {
      "id": "unique-id-1",
      "name": "Card Name",
      "description": "Card description or effect",
      "properties": {
        "property1": "value1",
        "property2": "value2"
      }
    }
  ]
}

Guidelines:
- Extract individual items as cards (abilities, units, weapons, etc.)
- Each card should have a unique id, name, and description
- Put any additional stats/values in the properties object
- If the source doesn't contain the requested data, create reasonable examples
- For wargame data: look for abilities, special rules, unit profiles, equipment, etc.`;

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
          { role: "user", content: `${prompt}${contentContext}` }
        ],
        temperature: 0.3,
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

    // Try to parse the JSON from the response
    let parsedData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Return raw content for debugging
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response",
        rawContent: content 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: parsedData,
      componentType 
    }), {
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
