import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { prompt, conversationHistory = [], sourceContent, sourceUrl } = await req.json() as BuilderRequest;

    // Build context for the AI
    let contentContext = "";
    
    if (sourceContent) {
      contentContext = `\n\nSOURCE CONTENT TO EXTRACT FROM:\n${sourceContent.substring(0, 50000)}`;
    }
    
    if (sourceUrl) {
      contentContext += `\n\nThe user has provided this source URL: ${sourceUrl}`;
    }

    const systemPrompt = `You are an AI assistant helping users create dashboard components for a wargaming campaign management app. You can create TABLE and CARD components by extracting data from source content (PDFs, text files, or URLs) that users provide.

IMPORTANT: You are having a conversation with the user. You can:
1. Answer questions about the content they've uploaded
2. List tables, sections, or data you find in the source
3. Create one or multiple components when they ask

When the user asks you to CREATE components, you MUST respond with a JSON object in this EXACT format:
{
  "message": "Your conversational response explaining what you found/created",
  "components": [
    {
      "type": "table",
      "data": {
        "title": "Component Title",
        "columns": ["Column1", "Column2"],
        "rows": [{"Column1": "value", "Column2": "value"}]
      }
    },
    {
      "type": "card",
      "data": {
        "title": "Cards Title",
        "cards": [
          {
            "id": "unique-id",
            "name": "Card Name",
            "description": "Description text",
            "properties": {"key": "value"}
          }
        ]
      }
    }
  ]
}

When the user is just asking questions or exploring (NOT creating):
{
  "message": "Your conversational response",
  "components": []
}

Guidelines:
- Be conversational and helpful
- When listing what you find, be specific about table names, sections, page references
- When creating components, extract ACCURATE data from the source
- You can create MULTIPLE components at once (e.g., 3 separate tables)
- Each component should be self-contained with all its data
- For wargames: look for injury tables, advancement charts, exploration results, weapon stats, ability lists, etc.
- If source doesn't contain requested data, explain what you could find instead

ALWAYS RESPOND WITH VALID JSON. The response must be parseable JSON with "message" and "components" fields.`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: `${prompt}${contentContext}` }
    ];

    console.log("Sending to AI with history length:", conversationHistory.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.4,
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

    console.log("AI raw response:", content.substring(0, 500));

    // Try to parse the JSON from the response
    let parsedData: { message: string; components: ComponentData[] };
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // If parsing fails, treat the whole content as a message with no components
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

    console.log("Returning components:", normalizedResponse.components.length);

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
