import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { 
  ChevronRight, 
  ChevronLeft, 
  UserCog, 
  MessageSquare, 
  Scroll, 
  Map,
  BookOpen,
  Calendar,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to the Campaign!",
    description: "You've successfully joined this campaign. Let's take a quick tour of the features available to you as a player.",
    color: "hsl(142, 76%, 50%)",
  },
  {
    icon: UserCog,
    title: "Player Settings",
    description: "Set up your player profile with your name, faction, warband details, and points. Access it anytime via the floating button in the bottom-right corner.",
    color: "hsl(142, 76%, 50%)",
  },
  {
    icon: MessageSquare,
    title: "Campaign Messages",
    description: "Stay connected with your Games Master and fellow players through the messaging system. You'll see a notification badge when there are new messages.",
    color: "hsl(200, 100%, 65%)",
  },
  {
    icon: Scroll,
    title: "Campaign Rules",
    description: "Access all the campaign rules and reference material your GM has published. Keep them handy during games!",
    color: "hsl(280, 80%, 60%)",
  },
  {
    icon: Map,
    title: "Campaign Map",
    description: "Explore the campaign map to see territories, objectives, and points of interest marked by your GM.",
    color: "hsl(15, 90%, 55%)",
  },
  {
    icon: BookOpen,
    title: "Your Narrative",
    description: "Write your own narrative entries to chronicle your warband's adventures. Tell your story!",
    color: "hsl(330, 80%, 60%)",
  },
  {
    icon: Calendar,
    title: "Schedule",
    description: "Check the campaign schedule to see upcoming rounds, events, and important dates.",
    color: "hsl(45, 100%, 50%)",
  },
];

interface PlayerOnboardingModalProps {
  campaignId: string;
  campaignName: string;
  open: boolean;
  onClose: () => void;
}

export function PlayerOnboardingModal({ 
  campaignId, 
  campaignName,
  open, 
  onClose 
}: PlayerOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Mark onboarding as complete
      localStorage.setItem(`campaign-${campaignId}-onboarded`, "true");
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    localStorage.setItem(`campaign-${campaignId}-onboarded`, "true");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="bg-background border-primary/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary tracking-wider text-center">
            [ PLAYER GUIDE ]
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {campaignName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              {/* Icon */}
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${step.color}20`,
                  boxShadow: `0 0 30px ${step.color}40`
                }}
              >
                <step.icon 
                  className="w-8 h-8" 
                  style={{ color: step.color }}
                />
              </div>

              {/* Content */}
              <h3 className="text-xl font-mono font-medium text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <TerminalButton
            variant="ghost"
            size="sm"
            onClick={handleSkip}
          >
            Skip Tour
          </TerminalButton>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </TerminalButton>
            )}
            <TerminalButton
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if player needs onboarding
export function usePlayerOnboarding(campaignId: string, isPlayer: boolean) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isPlayer || !campaignId) return;

    // Check if already onboarded
    const onboarded = localStorage.getItem(`campaign-${campaignId}-onboarded`);
    if (!onboarded) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [campaignId, isPlayer]);

  return {
    showOnboarding,
    closeOnboarding: () => setShowOnboarding(false),
  };
}
