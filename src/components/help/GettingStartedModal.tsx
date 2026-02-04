import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, 
  Plus, 
  Map, 
  Users, 
  BookOpen, 
  Calendar, 
  Eye,
  Keyboard,
  MessageSquare,
  Dice5,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  HelpCircle,
  Activity,
  Swords
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GettingStartedModalProps {
  open: boolean;
  onClose: () => void;
  joinCode?: string;
  onCopyJoinCode?: () => void;
}

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  tip?: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    icon: Share2,
    title: "Share Your Campaign ID",
    description: "Give this join code to your players so they can enter the campaign. They'll use the 'Join' button on their Campaigns page.",
    tip: "Your join code is shown in the Campaign Console widget. Click it to copy!",
  },
  {
    icon: Plus,
    title: "Add Your First Components",
    description: "Click the green ➕ Add Component button (bottom-right) to place widgets on the board. See the ? FAQ for details on each component type. Once created, manage components from the Components menu in the side panel.",
    tip: "Start with 6-12 components. You can always add more later.",
  },
  {
    icon: Activity,
    title: "Track Campaign Activity",
    description: "The Activity Feed widget shows real-time updates: player joins, dice rolls, messages, and warband changes. Add one to your dashboard to stay informed of all campaign happenings at a glance.",
    tip: "Activity Feed is view-only for players but shows them relevant updates too.",
  },
  {
    icon: Map,
    title: "Set Up the Campaign Map",
    description: "Set up your map using the Map settings in the side panel. Deploy a Map component onto the dashboard via the ➕ component button.",
    tip: "Place markers with custom legends and use fog of war to control what players can see.",
    optional: true,
  },
  {
    icon: Users,
    title: "Review Player Info",
    description: "Open the Players panel to see names, factions, and notes as players join. You can also edit player details directly.",
    tip: "Players set their own info via 'My Settings' when they join.",
  },
  {
    icon: BookOpen,
    title: "Post Your First Narrative",
    description: "Manage, edit, and create narrative entries via the Narrative menu in the side panel. Add a Narrative tracker component to the dashboard via the ➕ button.",
    tip: "Add narrative entries early to set the tone and hook players.",
  },
  {
    icon: Calendar,
    title: "Schedule Sessions & Rounds",
    description: "Add, edit, remove, and manage campaign schedule, rounds, events, and dates via the Schedule menu in the side panel. Add a Calendar component containing scheduled dates and rounds via the ➕ button.",
    tip: "Players see the Calendar widget but can't edit the schedule.",
  },
  {
    icon: Swords,
    title: "Manage Battles & Pairings",
    description: "Use the Battles panel in the side menu to create rounds, generate pairings (Random, Swiss, or Manual), and track match results. Players can submit battle reports which you approve or resolve disputes.",
    tip: "Add a Battle Tracker widget to the dashboard so players can see their upcoming matches and submit results.",
    optional: true,
  },
  {
    icon: Users,
    title: "Join as a Player",
    description: "Want to take part in the campaign as a player? Use the Players panel in the side menu to add yourself as a player.",
    tip: "GMs can also participate as players while maintaining GM controls.",
    optional: true,
  },
  {
    icon: Eye,
    title: "Preview the Player View",
    description: "Click the 'Games Master' badge in the header to toggle 'Preview as Player' mode. This shows exactly what players see.",
    tip: "GM-only widgets and controls are hidden in preview mode.",
  },
];

const BONUS_TIPS = [
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    description: "Press Shift+? to see all shortcuts. Use Ctrl+K for the Command Palette.",
  },
  {
    icon: MessageSquare,
    title: "Announcements",
    description: "Use the Messages panel to send campaign-wide announcements to all players.",
  },
  {
    icon: Dice5,
    title: "Shared Dice",
    description: "Add a Dice Roller widget for transparent, shared rolling everyone can see.",
  },
  {
    icon: HelpCircle,
    title: "Need Help?",
    description: "Click the ? button anytime to access the full FAQ and documentation.",
  },
];

export function GettingStartedModal({ open, onClose, joinCode, onCopyJoinCode }: GettingStartedModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showBonusTips, setShowBonusTips] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowBonusTips(true);
    }
  };

  const handlePrev = () => {
    if (showBonusTips) {
      setShowBonusTips(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setShowBonusTips(false);
    onClose();
  };

  const handleSkipToEnd = () => {
    setShowBonusTips(true);
  };

  const step = STEPS[currentStep];
  const StepIcon = step?.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-primary uppercase tracking-widest text-sm">
              Getting Started
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Your campaign is ready! Here's how to set it up for success.
          </DialogDescription>
        </DialogHeader>

        {!showBonusTips ? (
          <>
            {/* Step Progress */}
            <div className="flex items-center gap-1.5 mb-4">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all",
                    idx === currentStep
                      ? "bg-primary"
                      : idx < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Current Step Content */}
            <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
                  <StepIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {currentStep + 1}. {step.title}
                    </h3>
                    {step.optional && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {step.tip && (
                <div className="bg-primary/10 border border-primary/20 rounded px-3 py-2">
                  <p className="text-xs text-primary font-mono">
                    💡 {step.tip}
                  </p>
                </div>
              )}

              {/* Show join code on first step */}
              {currentStep === 0 && joinCode && (
                <div className="flex items-center gap-3 bg-background/50 border border-border rounded p-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Your Join Code:
                  </span>
                  <button
                    onClick={onCopyJoinCode}
                    className="font-mono text-lg font-bold text-primary hover:text-primary/80 transition-colors tracking-widest"
                  >
                    {joinCode}
                  </button>
                  <span className="text-xs text-muted-foreground">(click to copy)</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </TerminalButton>

              <button
                onClick={handleSkipToEnd}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Skip to end
              </button>

              <TerminalButton
                size="sm"
                onClick={handleNext}
                className="gap-1"
              >
                {currentStep < STEPS.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  "Bonus Tips →"
                )}
              </TerminalButton>
            </div>
          </>
        ) : (
          <>
            {/* Bonus Tips */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                🎯 Pro Tips
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {BONUS_TIPS.map((tip, idx) => {
                  const TipIcon = tip.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-muted/30 border border-border rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <TipIcon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {tip.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final CTA */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                🎲 You're all set! Time to run your campaign.
              </p>
              <p className="text-xs text-muted-foreground">
                You can reopen this guide anytime from the Help menu.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Steps
              </TerminalButton>

              <TerminalButton onClick={handleClose}>
                Start Campaign
              </TerminalButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
