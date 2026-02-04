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

  // Neon colors
  const neonBlue = "hsl(200, 100%, 70%)";
  const neonBlueGlow = "hsla(200, 100%, 70%, 0.3)";
  const neonGreen = "hsl(142, 76%, 65%)";
  const neonGreenFaint = "hsla(142, 76%, 65%, 0.4)";

  return (
    <div className="space-y-6">
      {/* Main Support Card */}
      <div
        className="rounded-lg p-6 space-y-6 font-mono"
        style={{
          border: `2px solid ${neonGreen}`,
          boxShadow: `0 0 20px hsla(142, 76%, 65%, 0.3), inset 0 0 20px hsla(142, 76%, 65%, 0.05)`,
          backgroundColor: "hsl(var(--card))",
        }}
      >
        {/* Mission Statement */}
        <p className="text-sm leading-relaxed" style={{ color: "hsl(0, 0%, 95%)" }}>
          Campaign Console is a one-person passion project that grew out of my personal need for a better way to host and manage tabletop campaigns. Your support helps keep Campaign Console alive and lets me spend more time developing new features and upgrades. Below is a list of some core and supporter features I'm working on right now.
        </p>

        {/* Section Header - Pipeline Features */}
        <div 
          className="text-center text-xs tracking-widest py-2"
          style={{ 
            borderTop: `1px dashed ${neonGreenFaint}`,
            borderBottom: `1px dashed ${neonGreenFaint}`,
            color: neonGreen 
          }}
        >
          PIPELINE FEATURES // IN DEVELOPMENT
        </div>

        {/* Pipeline Features */}
        <div className="space-y-4 text-sm" style={{ color: "hsl(0, 0%, 85%)" }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: neonBlue }}>[WAR BAND BUILDER + AI AUTO-IMPORT]</p>
            <p className="leading-relaxed">
              Build and manage warbands inside Campaign Console.<br />
              Prefer another builder? Paste a link or upload a file — AI extracts the roster,<br />
              auto-fills a Warband component, and keeps it editable + shareable all campaign long.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: neonBlue }}>[ADVANCED RULES MANAGEMENT // RULES AGENT UPGRADE]</p>
            <p className="leading-relaxed">
              Import rules from PDFs, spreadsheets, GitHub rules repos, or pasted homebrew text.<br />
              The Rules Agent extracts, organizes, stores, and enables fast lookup +<br />
              auto-generated rules components.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: neonBlue }}>[RULES LIBRARY // PERSISTENT + REUSABLE]</p>
            <p className="leading-relaxed">
              Upload a rules system once. Reuse it across campaigns.<br />
              Faster setup, consistent play, and instant component creation for every new campaign.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: neonBlue }}>[ADVANCED MAP MANAGEMENT]</p>
            <p className="leading-relaxed">
              Enhanced maps with RPG assets, tokens/icons, drawing/shapes, layers, templates,<br />
              and optional live GM + player interaction — run sessions from your dashboard.
            </p>
          </div>

          <p className="italic" style={{ color: neonBlue }}>
            ...AND MORE // new components, integrations, upgrades, QoL improvements
          </p>
        </div>

        {/* Supporter Benefits Intro */}
        <p className="text-sm leading-relaxed" style={{ color: "hsl(0, 0%, 95%)" }}>
          In return for your support, you'll receive extra perks like customization options, quality-of-life upgrades, and early access to future features. The core tools will always stay available to everyone.
        </p>

        {/* Subscribe Section */}
        {/* Section Header - Subscribe */}
        <div 
          className="text-center text-xs tracking-widest py-2"
          style={{ 
            borderTop: `1px dashed ${neonGreenFaint}`,
            borderBottom: `1px dashed ${neonGreenFaint}`,
            color: neonGreen 
          }}
        >
          SUBSCRIBE // $2.99 / MONTH
        </div>

        <div className="space-y-4">
          {/* Current Status */}
          {isLoading ? (
            <div className="flex items-center gap-2" style={{ color: "hsl(0, 0%, 85%)" }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading subscription status...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {isSupporter && (
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded"
                    style={{ 
                      backgroundColor: "hsla(142, 76%, 65%, 0.2)", 
                      border: "1px solid hsla(142, 76%, 65%, 0.4)" 
                    }}
                  >
                    <Check className="h-4 w-4" style={{ color: "hsl(142, 76%, 65%)" }} />
                    <span className="text-sm font-mono" style={{ color: "hsl(142, 76%, 65%)" }}>Active Supporter</span>
                  </div>
                  {currentPeriodEnd && (
                    <span className="text-sm" style={{ color: "hsl(0, 0%, 75%)" }}>
                      Renews {format(new Date(currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              )}
              {subscriptionStatus === "past_due" && (
                <p className="text-sm text-destructive">Payment past due</p>
              )}
              {subscriptionStatus === "canceled" && (
                <p className="text-sm text-warning">Subscription canceled</p>
              )}
            </div>
          )}

          {/* Unlock Benefits */}
          <div>
            <p className="text-xs tracking-widest mb-3" style={{ color: neonBlue }}>
              UNLOCK: SUPPORTER BENEFITS
            </p>
            <div className="space-y-1 text-sm" style={{ color: "hsl(0, 0%, 90%)" }}>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> SMART PASTE <span style={{ color: "hsl(0, 0%, 60%)" }}>// AI text-to-table/card conversion</span></p>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> DASHBOARD THEMES <span style={{ color: "hsl(0, 0%, 60%)" }}>// custom visuals beyond default</span></p>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> BANNER URL <span style={{ color: "hsl(0, 0%, 60%)" }}>// custom campaign banner images</span></p>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> DASHBOARD TEXT <span style={{ color: "hsl(0, 0%, 60%)" }}>// place labels directly on the dashboard</span></p>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> STICKERS <span style={{ color: "hsl(0, 0%, 60%)" }}>// add Lucide icons + markers anywhere</span></p>
              <p><span style={{ color: "hsl(142, 76%, 65%)" }}>+</span> CAMPAIGN LIMIT <span style={{ color: "hsl(0, 0%, 60%)" }}>// up to 5 active campaigns (free = 1)</span></p>
            </div>
          </div>

          {/* Subscribe / Manage Buttons */}
          <div className="flex gap-3 flex-wrap">
            {!isSupporter && (
              <TerminalButton
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="gap-2"
                style={{
                  backgroundColor: neonBlue,
                  color: "hsl(0, 0%, 5%)",
                  boxShadow: `0 0 15px ${neonBlueGlow}`,
                }}
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Subscribe — $2.99/mo
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

        {/* One-Time Support Section */}
        {/* Section Header - One-Time Support */}
        <div 
          className="text-center text-xs tracking-widest py-2"
          style={{ 
            borderTop: `1px dashed ${neonGreenFaint}`,
            borderBottom: `1px dashed ${neonGreenFaint}`,
            color: neonGreen 
          }}
        >
          ONE-TIME SUPPORT // OPTIONAL
        </div>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "hsl(0, 0%, 85%)" }}>
            One-time contributors won't unlock supporter features, but you will get a neat supporter badge to add flair to your campaign dashboard. Plus, all donations include a direct message you can use to offer your expertise, suggest new features, voice your annoyances, confess your darkest secrets, or talk smack about your partner.
          </p>

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

        {/* Community Support Section */}
        {/* Section Header - Community */}
        <div 
          className="text-center text-xs tracking-widest py-2"
          style={{ 
            borderTop: `1px dashed ${neonGreenFaint}`,
            borderBottom: `1px dashed ${neonGreenFaint}`,
            color: neonGreen 
          }}
        >
          OTHER WAYS TO SHOW YOUR SUPPORT
        </div>

        <div className="space-y-3">
          <p className="text-sm" style={{ color: "hsl(0, 0%, 85%)" }}>
            Join the community: share suggestions, report bugs, discuss ideas, or organize campaigns.
          </p>
          <a
            href="https://discord.gg/quKEdF6yaf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-mono transition-colors hover:underline"
            style={{ color: neonBlue }}
          >
            <ExternalLink className="h-4 w-4" />
            DISCORD: discord.gg/quKEdF6yaf
          </a>
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
      )}

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
