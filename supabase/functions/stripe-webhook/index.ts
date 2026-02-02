import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

function unixSecondsToIso(value: unknown): string | null {
  const seconds =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(seconds)) return null;
  const ms = seconds * 1000;
  if (!Number.isFinite(ms)) return null;

  // new Date(NaN) is valid object, but toISOString() throws RangeError("Invalid time value")
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not set" });
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  
  // Use any type to avoid complex generics issues
  const supabaseClient: SupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // IMPORTANT: Stripe signature verification requires the exact raw request payload.
    // Using req.text() can subtly change the bytes and cause signature mismatches.
    const rawBody = new Uint8Array(await req.arrayBuffer());
    const bodyText = new TextDecoder().decode(rawBody);
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("No Stripe signature found");
      }
      // Use async version for Deno/Edge Functions
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      // For development without webhook secret
      event = JSON.parse(bodyText) as Stripe.Event;
      logStep("WARNING: Processing webhook without signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          mode: session.mode,
          customerId: session.customer,
          metadata: session.metadata
        });

        if (session.mode === 'subscription') {
          // Handle subscription checkout
          await handleSubscriptionCheckout(supabaseClient, stripe, session);
        } else if (session.mode === 'payment' && session.metadata?.type === 'donation') {
          // Handle donation payment
          await handleDonationPayment(supabaseClient, session);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId: subscription.customer
        });
        await syncSubscriptionStatus(supabaseClient, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { 
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });
        await handleSubscriptionCanceled(supabaseClient, subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata
        });
        // Donation handling is done via checkout.session.completed
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleSubscriptionCheckout(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string;
  const userId = session.metadata?.user_id;

  if (!userId) {
    logStep("No user_id in session metadata, looking up by email");
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (!profile) {
      logStep("Could not find user for customer", { customerId });
      return;
    }
  }

  // Get subscription details
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    const subscription = subscriptions.data[0];
    const currentPeriodEndIso = unixSecondsToIso(subscription.current_period_end);
    if (!currentPeriodEndIso) {
      logStep("Warning: invalid current_period_end on subscription", {
        subscriptionId: subscription.id,
        current_period_end: subscription.current_period_end,
      });
    }
    const updateData = {
      stripe_customer_id: customerId,
      plan: 'supporter',
      subscription_status: subscription.status,
      current_period_end: currentPeriodEndIso,
    };

    if (userId) {
      await supabase.from('profiles').update(updateData).eq('id', userId);
    } else {
      await supabase.from('profiles').update(updateData).eq('stripe_customer_id', customerId);
    }
    
    logStep("Profile updated for subscription", { userId, customerId });
  }
}

async function handleDonationPayment(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const amountCents = parseInt(session.metadata?.amount_cents || '0', 10);

  if (!userId) {
    logStep("No user_id in donation session metadata");
    return;
  }

  // Insert donation record (idempotent via unique constraint)
  const { error } = await supabase.from('donations').upsert({
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    amount_cents: amountCents || (session.amount_total || 0),
    currency: session.currency || 'usd',
  }, {
    onConflict: 'stripe_checkout_session_id',
  });

  if (error) {
    logStep("Error inserting donation", { error: error.message });
  } else {
    logStep("Donation recorded", { userId, amountCents, sessionId: session.id });
  }
}

async function syncSubscriptionStatus(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  const currentPeriodEndIso = unixSecondsToIso(subscription.current_period_end);
  if (!currentPeriodEndIso) {
    logStep("Warning: invalid current_period_end on subscription sync", {
      subscriptionId: subscription.id,
      current_period_end: subscription.current_period_end,
      status: subscription.status,
    });
  }

  const updateData = {
    subscription_status: subscription.status,
    plan: ['active', 'trialing'].includes(subscription.status) ? 'supporter' : 'free',
    current_period_end: currentPeriodEndIso,
  };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    logStep("Error updating subscription status", { error: error.message });
  } else {
    logStep("Subscription status synced", { customerId, status: subscription.status });
  }
}

async function handleSubscriptionCanceled(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  
  const updateData = {
    subscription_status: 'canceled',
    plan: 'free',
    current_period_end: null,
  };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    logStep("Error handling subscription cancellation", { error: error.message });
  } else {
    logStep("Subscription canceled and profile updated", { customerId });
  }
}
