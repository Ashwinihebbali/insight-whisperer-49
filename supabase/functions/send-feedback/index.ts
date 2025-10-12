import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  name: string;
  feedback: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, feedback }: FeedbackRequest = await req.json();

    console.log("Saving feedback to database:", { name, feedback });

    // Validate input
    if (!name || !feedback || name.trim().length === 0 || feedback.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name and feedback are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (feedback.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Feedback must be less than 2000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Insert feedback into database
    const { data, error } = await supabase
      .from("feedback")
      .insert([{ name: name.trim(), feedback: feedback.trim() }])
      .select();

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to save feedback: ${error.message}`);
    }

    console.log("Feedback saved successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error saving feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
