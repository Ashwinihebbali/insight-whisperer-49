import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, analysisData } = await req.json();
    console.log(`Chatbot query: ${message}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build system prompt with analysis data
    let systemPrompt = "You are a helpful AI assistant for a sentiment analysis platform. ";
    
    if (analysisData && analysisData.totalComments > 0) {
      systemPrompt += `The user has analyzed ${analysisData.totalComments} comments with the following results:\n`;
      systemPrompt += `- Positive: ${analysisData.sentimentCounts.positive} (${((analysisData.sentimentCounts.positive / analysisData.totalComments) * 100).toFixed(1)}%)\n`;
      systemPrompt += `- Negative: ${analysisData.sentimentCounts.negative} (${((analysisData.sentimentCounts.negative / analysisData.totalComments) * 100).toFixed(1)}%)\n`;
      systemPrompt += `- Neutral: ${analysisData.sentimentCounts.neutral} (${((analysisData.sentimentCounts.neutral / analysisData.totalComments) * 100).toFixed(1)}%)\n\n`;
      
      // Include sample comments
      if (analysisData.comments.length > 0) {
        systemPrompt += "Sample analyzed comments:\n";
        analysisData.comments.slice(0, 20).forEach((item: any, idx: number) => {
          systemPrompt += `${idx + 1}. [${item.sentiment.toUpperCase()}] ${item.comment}\n`;
        });
      }
      
      systemPrompt += "\n\nUse this sentiment analysis data to answer questions. Provide insights, identify patterns, and make recommendations based on the actual analyzed data. Be specific and reference the data when appropriate.";
    } else {
      systemPrompt += "Help users understand:\n";
      systemPrompt += "- How to use the sentiment analysis tool\n";
      systemPrompt += "- How to interpret sentiment results (positive, negative, neutral)\n";
      systemPrompt += "- Best practices for e-consultation analysis\n";
      systemPrompt += "- Understanding visualizations (pie charts, bar charts, word clouds)\n";
      systemPrompt += "Keep responses concise and helpful.";
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...(history || []),
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      console.error(`AI API error: ${response.status}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log(`Chatbot response generated`);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chatbot:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
