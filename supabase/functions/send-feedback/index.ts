import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send email notification
    try {
      const emailResponse = await resend.emails.send({
        from: "E-Consultation Feedback <onboarding@resend.dev>",
        to: ["ashwinihebbali068@gmail.com"],
        subject: "New Feedback Received - E-Consultation Platform",
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Feedback:</strong></p>
          <p>${feedback}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Submitted at: ${new Date().toLocaleString()}</p>
        `,
      });
      console.log("Email notification sent:", emailResponse);
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the request if email fails
    }

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
