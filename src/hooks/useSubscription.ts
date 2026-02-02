import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionState {
  plan: 'free' | 'supporter';
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface Donation {
  id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    subscriptionStatus: 'none',
    currentPeriodEnd: null,
    stripeCustomerId: null,
    isLoading: true,
    error: null,
  });
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setState({
        plan: data.plan || 'free',
        subscriptionStatus: data.subscription_status || 'none',
        currentPeriodEnd: data.current_period_end || null,
        stripeCustomerId: data.stripe_customer_id || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription',
      }));
    }
  }, [user]);

  const fetchDonations = useCallback(async () => {
    if (!user) return;

    try {
      setDonationsLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select('id, amount_cents, currency, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDonations(data || []);
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setDonationsLoading(false);
    }
  }, [user]);

  const createCheckoutSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      throw err;
    }
  };

  const createDonation = async (amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: { amount },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error creating donation:', err);
      throw err;
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Fetch donations when user is available
  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // Refresh subscription status periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...state,
    donations,
    donationsLoading,
    checkSubscription,
    fetchDonations,
    createCheckoutSession,
    openCustomerPortal,
    createDonation,
    isSupporter: state.plan === 'supporter' && state.subscriptionStatus === 'active',
  };
}
