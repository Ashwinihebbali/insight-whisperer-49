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
    const { comments } = await req.json();
    console.log(`Analyzing ${comments.length} comments`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const results = [];
    
    for (const comment of comments) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a sentiment analysis expert. Analyze the sentiment of comments and respond with ONLY one word: positive, negative, or neutral. No explanation needed."
            },
            {
              role: "user",
              content: `Analyze this comment: "${comment}"`
            }
          ],
        }),
      });

      if (!response.ok) {
        console.error(`AI API error: ${response.status}`);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const sentiment = data.choices[0].message.content.toLowerCase().trim();
      
      results.push({
        comment,
        sentiment: sentiment.includes('positive') ? 'positive' : 
                  sentiment.includes('negative') ? 'negative' : 'neutral'
      });
    }

    console.log(`Analysis complete: ${results.length} results`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-sentiment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
