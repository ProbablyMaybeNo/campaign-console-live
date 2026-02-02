import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Crown, CreditCard, Heart, Check, ExternalLink, Loader2, Gift } from "lucide-react";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const PRESET_AMOUNTS = [5, 10, 25];
const MIN_DONATION = 1;
const MAX_DONATION = 250;

export function BillingSettings() {
  const { user } = useAuth();
  const {
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    stripeCustomerId,
    isLoading,
    donations,
    donationsLoading,
    createCheckoutSession,
    openCustomerPortal,
    createDonation,
    checkSubscription,
    fetchDonations,
  } = useSubscription();

  const [searchParams, setSearchParams] = useSearchParams();
  const [donationAmount, setDonationAmount] = useState("");
  const [donationError, setDonationError] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isDonating, setIsDonating] = useState(false);

  // Handle success/cancel URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "subscription") {
      toast.success("Welcome to Campaign Console Supporter! 🎉", {
        description: "Thank you for your support!",
      });
      checkSubscription();
      setSearchParams({});
    } else if (success === "donation") {
      toast.success("Thank you for your donation! 💚", {
        description: "Your support means a lot to us!",
      });
      fetchDonations();
      setSearchParams({});
    } else if (canceled === "true") {
      toast.info("Payment canceled", {
        description: "No charges were made.",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, checkSubscription, fetchDonations]);

  const validateDonation = (value: string): number | null => {
    // Clean input
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed) || parsed <= 0) {
      setDonationError("Please enter a valid amount");
      return null;
    }

    if (parsed < MIN_DONATION) {
      setDonationError(`Minimum donation is $${MIN_DONATION}`);
      return null;
    }

    if (parsed > MAX_DONATION) {
      setDonationError(`Maximum donation is $${MAX_DONATION}`);
      return null;
    }

    setDonationError("");
    return parsed;
  };

  const handleDonationInputChange = (value: string) => {
    setDonationAmount(value);
    if (value) {
      validateDonation(value);
    } else {
      setDonationError("");
    }
  };

  const handlePresetClick = (amount: number) => {
    setDonationAmount(amount.toString());
    setDonationError("");
  };

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      await createCheckoutSession();
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsManaging(true);
      await openCustomerPortal();
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setIsManaging(false);
    }
  };

  const handleDonate = async () => {
    const amount = validateDonation(donationAmount);
    if (!amount) return;

    try {
      setIsDonating(true);
      await createDonation(amount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process donation";
      toast.error(message);
    } finally {
      setIsDonating(false);
    }
  };

  if (!user) {
    return (
      <TerminalCard className="p-6">
        <div className="text-center text-muted-foreground">
          Please log in to manage billing.
        </div>
      </TerminalCard>
    );
  }

  const isSupporter = plan === "supporter" && subscriptionStatus === "active";

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <TerminalCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-mono font-semibold text-primary">
            Current Plan
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading subscription status...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold" style={{ color: isSupporter ? "hsl(142, 76%, 55%)" : "hsl(0, 0%, 70%)" }}>
                  {isSupporter ? "Supporter" : "Free"}
                </p>
                {isSupporter && currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {format(new Date(currentPeriodEnd), "MMM d, yyyy")}
                  </p>
                )}
                {subscriptionStatus === "past_due" && (
                  <p className="text-sm text-destructive">Payment past due</p>
                )}
                {subscriptionStatus === "canceled" && (
                  <p className="text-sm text-warning">Subscription canceled</p>
                )}
              </div>

              {isSupporter && (
                <div className="flex items-center gap-2 px-3 py-1 rounded bg-primary/20 border border-primary/40">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-mono">Active</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {!isSupporter && (
                <TerminalButton
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="gap-2"
                >
                  {isUpgrading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Upgrade to Supporter ($2.99/mo)
                </TerminalButton>
              )}

              {stripeCustomerId && (
                <TerminalButton
                  variant="secondary"
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                  className="gap-2"
                >
                  {isManaging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Manage Subscription
                </TerminalButton>
              )}
            </div>
          </div>
        )}
      </TerminalCard>

      {/* One-Time Donation */}
      <TerminalCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-5 w-5" style={{ color: "hsl(0, 80%, 60%)" }} />
          <h3 className="text-lg font-mono font-semibold" style={{ color: "hsl(0, 80%, 60%)" }}>
            Support with a One-Time Donation
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Help keep Campaign Console running with a one-time contribution.
        </p>

        <div className="space-y-4">
          {/* Preset Buttons */}
          <div className="flex gap-2 flex-wrap">
            {PRESET_AMOUNTS.map((amount) => (
              <TerminalButton
                key={amount}
                variant={donationAmount === amount.toString() ? "default" : "secondary"}
                onClick={() => handlePresetClick(amount)}
                className="min-w-[70px]"
              >
                ${amount}
              </TerminalButton>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <TerminalInput
                  type="text"
                  placeholder="Custom amount"
                  value={donationAmount}
                  onChange={(e) => handleDonationInputChange(e.target.value)}
                  className="pl-7"
                />
              </div>
              {donationError && (
                <p className="text-sm text-destructive mt-1">{donationError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Min: ${MIN_DONATION} · Max: ${MAX_DONATION}
              </p>
            </div>

            <TerminalButton
              onClick={handleDonate}
              disabled={isDonating || !donationAmount || !!donationError}
              className="gap-2"
            >
              {isDonating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Donate
            </TerminalButton>
          </div>
        </div>
      </TerminalCard>

      {/* Donation History */}
      {donations.length > 0 && (
        <TerminalCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-5 w-5 text-secondary" />
            <h3 className="text-lg font-mono font-semibold text-secondary">
              Donation History
            </h3>
          </div>

          {donationsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading donations...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex justify-between items-center py-2 border-b border-border/50 last:border-0"
                >
                  <span className="font-mono text-primary">
                    ${(donation.amount_cents / 100).toFixed(2)} {donation.currency.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(donation.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TerminalCard>
      )}
    </div>
  );
}
