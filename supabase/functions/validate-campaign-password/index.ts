import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the auth header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { joinCode, password } = await req.json();

    if (!joinCode || typeof joinCode !== "string") {
      return new Response(
        JSON.stringify({ error: "Join code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the campaign using service role (bypasses RLS)
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("id, owner_id, password_hash")
      .eq("join_code", joinCode.toUpperCase())
      .maybeSingle();

    if (campaignError) {
      console.error("Campaign lookup error:", campaignError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup campaign" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is the owner
    if (campaign.owner_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You are the Games Master of this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already a member
    const { data: existingMembership } = await supabaseAdmin
      .from("campaign_players")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      return new Response(
        JSON.stringify({ error: "You have already joined this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password if the campaign has one
    if (campaign.password_hash) {
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password is required for this campaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      }

      // Use pgcrypto's crypt function to verify the password
      const { data: validPassword, error: verifyError } = await supabaseAdmin.rpc(
        "verify_campaign_password",
        { campaign_id: campaign.id, input_password: password }
      );

      if (verifyError) {
        console.error("Password verification error:", verifyError);
        return new Response(
          JSON.stringify({ error: "Failed to verify password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!validPassword) {
        return new Response(
          JSON.stringify({ error: "Incorrect password" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // All checks passed - add user to campaign
    const { error: joinError } = await supabaseAdmin
      .from("campaign_players")
      .insert({
        campaign_id: campaign.id,
        user_id: user.id,
        role: "player",
      });

    if (joinError) {
      console.error("Join error:", joinError);
      return new Response(
        JSON.stringify({ error: "Failed to join campaign" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, campaignId: campaign.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
