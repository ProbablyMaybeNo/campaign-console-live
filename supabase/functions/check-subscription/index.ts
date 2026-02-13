import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free plan");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: 'free',
        subscription_status: 'none',
        current_period_end: null,
        stripe_customer_id: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let plan = 'free';
    let subscriptionStatus = 'none';
    let currentPeriodEnd: string | null = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      plan = 'supporter';
      subscriptionStatus = subscription.status;
      // Safely parse the timestamp
      const endTimestamp = subscription.current_period_end;
      if (endTimestamp && typeof endTimestamp === 'number') {
        currentPeriodEnd = new Date(endTimestamp * 1000).toISOString();
      }
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        status: subscriptionStatus,
        endDate: currentPeriodEnd 
      });
    } else {
      // Check for other statuses
      const allSubs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
      if (allSubs.data.length > 0) {
        const latestSub = allSubs.data[0];
        subscriptionStatus = latestSub.status;
        if (latestSub.status === 'trialing') {
          plan = 'supporter';
          const endTimestamp = latestSub.current_period_end;
          if (endTimestamp && typeof endTimestamp === 'number') {
            currentPeriodEnd = new Date(endTimestamp * 1000).toISOString();
          }
        }
      }
      logStep("No active subscription", { latestStatus: subscriptionStatus });
    }

    // Update profile in database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        plan,
        subscription_status: subscriptionStatus,
        current_period_end: currentPeriodEnd,
      })
      .eq('id', user.id);

    if (updateError) {
      logStep("Warning: Failed to update profile", { error: updateError.message });
    }

    return new Response(JSON.stringify({
      subscribed: plan === 'supporter',
      plan,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      stripe_customer_id: customerId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
