import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Crown, CreditCard, Heart, Check, ExternalLink, Loader2, Gift, ChevronDown, MessageSquare, Send } from "lucide-react";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { format } from "date-fns";

const PRESET_AMOUNTS = [5, 10, 25];
const MIN_DONATION = 1;
const MAX_DONATION = 250;

export function BillingSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const campaignsQuery = useCampaigns();
  const {
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    stripeCustomerId,
    hasDonated,
    isLoading,
    donations,
    donationsLoading,
    createCheckoutSession,
    openCustomerPortal,
    createDonation,
    checkSubscription,
    fetchDonations,
    submitDonorFeedback,
  } = useSubscription();

  const [searchParams, setSearchParams] = useSearchParams();
  const [donationAmount, setDonationAmount] = useState("");
  const [donationError, setDonationError] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
      
      // Redirect to a campaign dashboard with supporter=welcome to show welcome modal
      // Find the most recent campaign the user has access to
      const campaigns = campaignsQuery.data;
      if (campaigns && campaigns.length > 0) {
        const firstCampaign = campaigns[0];
        setTimeout(() => {
          navigate(`/campaign/${firstCampaign.id}?supporter=welcome`);
        }, 1000);
      }
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
  }, [searchParams, setSearchParams, checkSubscription, fetchDonations, campaignsQuery.data, navigate]);

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

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    
    try {
      setIsSubmittingFeedback(true);
      await submitDonorFeedback(feedbackMessage.trim());
      toast.success("Thank you for your feedback! 💚");
      setFeedbackMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit feedback";
      toast.error(message);
    } finally {
      setIsSubmittingFeedback(false);
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
      {/* Unified Billing Card */}
      <div
        className="rounded-lg p-6 space-y-8"
        style={{
          border: "2px solid hsl(142, 76%, 65%)",
          boxShadow: "0 0 20px hsla(142, 76%, 65%, 0.3), inset 0 0 20px hsla(142, 76%, 65%, 0.05)",
          backgroundColor: "hsl(var(--card))",
        }}
      >
        {/* About Blurb */}
        <p className="text-sm leading-relaxed" style={{ color: "hsl(0, 0%, 95%)" }}>
          Campaign Console is a solo-dev project built for people who love narrative campaigns. 
          Your subscription helps keep it online, supports ongoing development, and unlocks more 
          customization as the app grows. You're not just upgrading—you're helping shape what gets built next.
        </p>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: "hsla(142, 76%, 65%, 0.3)" }} />

        {/* Current Plan Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5" style={{ color: "hsl(142, 76%, 65%)" }} />
            <h3 className="text-lg font-mono font-semibold" style={{ color: "hsl(142, 76%, 65%)" }}>
              Current Plan
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2" style={{ color: "hsl(0, 0%, 85%)" }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading subscription status...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold" style={{ color: isSupporter ? "hsl(142, 76%, 55%)" : "hsl(0, 0%, 90%)" }}>
                    {isSupporter ? "Supporter" : "Free"}
                  </p>
                  {isSupporter && currentPeriodEnd && (
                    <p className="text-sm" style={{ color: "hsl(0, 0%, 75%)" }}>
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
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded"
                    style={{ 
                      backgroundColor: "hsla(142, 76%, 65%, 0.2)", 
                      border: "1px solid hsla(142, 76%, 65%, 0.4)" 
                    }}
                  >
                    <Check className="h-4 w-4" style={{ color: "hsl(142, 76%, 65%)" }} />
                    <span className="text-sm font-mono" style={{ color: "hsl(142, 76%, 65%)" }}>Active</span>
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
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: "hsla(142, 76%, 65%, 0.3)" }} />

        {/* One-Time Donation Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-5 w-5" style={{ color: "hsl(0, 80%, 60%)" }} />
            <h3 className="text-lg font-mono font-semibold" style={{ color: "hsl(0, 80%, 60%)" }}>
              Help keep Campaign Console running with a one-time contribution.
            </h3>
          </div>

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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(0, 0%, 70%)" }}>
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
        </div>
      </div>

      {/* Donor Feedback Section - Only for donors */}
      {hasDonated && (
        <div
          className="rounded-lg p-6"
          style={{
            border: "2px solid hsl(200, 100%, 70%)",
            boxShadow: "0 0 20px hsla(200, 100%, 70%, 0.3)",
            backgroundColor: "hsl(var(--card))",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="h-5 w-5" style={{ color: "hsl(200, 100%, 70%)" }} />
            <h3 className="text-lg font-mono font-semibold" style={{ color: "hsl(200, 100%, 70%)" }}>
              Donor Feedback
            </h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Your donation gives you a voice! Suggest features, report bugs, or share ideas for Campaign Console.
          </p>
          
          <div className="space-y-3">
            <Textarea
              placeholder="Share your feedback, suggestions, or bug reports..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              className="min-h-[100px] bg-background border-border"
            />
            
            <div className="flex justify-end">
              <TerminalButton
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                className="gap-2"
              >
                {isSubmittingFeedback ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Feedback
              </TerminalButton>
            </div>
          </div>
        </div>

      {/* Donation History - Collapsible */}
      {donations.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-card/80"
              style={{
                border: "1px solid hsla(142, 76%, 65%, 0.4)",
                backgroundColor: "hsl(var(--card))",
              }}
            >
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5" style={{ color: "hsl(200, 100%, 70%)" }} />
                <span className="text-lg font-mono font-semibold" style={{ color: "hsl(200, 100%, 70%)" }}>
                  Donation History ({donations.length})
                </span>
              </div>
              <ChevronDown
                className="h-5 w-5 transition-transform duration-200"
                style={{ 
                  color: "hsl(200, 100%, 70%)",
                  transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)"
                }}
              />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div
              className="mt-2 p-4 rounded-lg"
              style={{
                border: "1px solid hsla(142, 76%, 65%, 0.3)",
                backgroundColor: "hsl(var(--card))",
              }}
            >
              {donationsLoading ? (
                <div className="flex items-center gap-2" style={{ color: "hsl(0, 0%, 85%)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading donations...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {donations.map((donation) => (
                    <div
                      key={donation.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                      style={{ borderColor: "hsla(142, 76%, 65%, 0.2)" }}
                    >
                      <span className="font-mono" style={{ color: "hsl(142, 76%, 65%)" }}>
                        ${(donation.amount_cents / 100).toFixed(2)} {donation.currency.toUpperCase()}
                      </span>
                      <span className="text-sm" style={{ color: "hsl(0, 0%, 75%)" }}>
                        {format(new Date(donation.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
