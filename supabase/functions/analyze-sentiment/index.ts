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

    // Batch comments for analysis (10 at a time to avoid rate limits)
    const batchSize = 10;
    const results: { comment: string; sentiment: string }[] = [];
    
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize);
      const commentsText = batch.map((c: string, idx: number) => `${idx + 1}. ${c}`).join('\n');
      
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
              content: "You are a sentiment analysis expert. Analyze the sentiment of each comment and respond with a JSON array of sentiments. Each sentiment must be exactly 'positive', 'negative', or 'neutral'. Format: [{\"sentiment\": \"positive\"}, {\"sentiment\": \"negative\"}]"
            },
            {
              role: "user",
              content: `Analyze these comments:\n${commentsText}`
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API error ${response.status}:`, errorText);
        
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment or upload fewer comments.");
        }
        if (response.status === 402) {
          throw new Error("AI usage limit reached. Please add credits to continue.");
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse JSON response
      let sentiments;
      try {
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        sentiments = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        // Fallback: treat all as neutral
        sentiments = batch.map(() => ({ sentiment: "neutral" }));
      }
      
      // Map results back to comments
      batch.forEach((comment: string, idx: number) => {
        const sentiment = sentiments[idx]?.sentiment?.toLowerCase() || 'neutral';
        results.push({
          comment,
          sentiment: ['positive', 'negative', 'neutral'].includes(sentiment) ? sentiment : 'neutral'
        });
      });
      
      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < comments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
