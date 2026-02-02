import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_AMOUNT_CENTS = 100;  // $1.00
const MAX_AMOUNT_CENTS = 25000; // $250.00

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse and validate amount
    const body = await req.json();
    let amountCents: number;

    if (typeof body.amount === 'string') {
      // Clean up input: remove $, commas, whitespace
      const cleaned = body.amount.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) {
        throw new Error("Invalid amount format");
      }
      amountCents = Math.round(parsed * 100);
    } else if (typeof body.amount === 'number') {
      amountCents = Math.round(body.amount * 100);
    } else {
      throw new Error("Amount is required");
    }

    // Validate range
    if (amountCents < MIN_AMOUNT_CENTS) {
      throw new Error(`Minimum donation is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}`);
    }
    if (amountCents > MAX_AMOUNT_CENTS) {
      throw new Error(`Maximum donation is $${(MAX_AMOUNT_CENTS / 100).toFixed(2)}`);
    }

    logStep("Amount validated", { amountCents, amountDollars: (amountCents / 100).toFixed(2) });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://campaign-console.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Campaign Console Donation',
              description: 'Thank you for supporting Campaign Console!',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/settings?tab=billing&success=donation`,
      cancel_url: `${origin}/settings?tab=billing&canceled=true`,
      metadata: {
        user_id: user.id,
        type: 'donation',
        amount_cents: amountCents.toString(),
      },
    });

    logStep("Donation checkout session created", { sessionId: session.id, amountCents });

    return new Response(JSON.stringify({ url: session.url }), {
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
