import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smartphone, Check, X, Lightbulb } from "lucide-react";

const STORAGE_KEY = "campaign-console-mobile-onboarding-seen";

interface MobileOnboardingModalProps {
  isPhone: boolean;
}

export function MobileOnboardingModal({ isPhone }: MobileOnboardingModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isPhone && !localStorage.getItem(STORAGE_KEY)) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isPhone]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  if (!isPhone) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DialogContent 
        className="max-w-sm mx-4 border-2 border-primary bg-background p-0 overflow-hidden"
        style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}
      >
        <ScrollArea className="max-h-[80vh]">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mb-2">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
              <h2 
                className="text-xl font-bold text-primary font-mono uppercase tracking-wider"
                style={{ textShadow: "0 0 15px hsl(var(--primary) / 0.5)" }}
              >
                Mobile Mode
              </h2>
              <p className="text-sm text-muted-foreground">
                Welcome to Campaign Console on your phone!
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* What's Included */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-mono text-primary uppercase tracking-wider">
                  What's Included
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  View all campaign widgets
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Access Rules, Map, Calendar & Narrative
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Read & send messages
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Roll dice & view activity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>GMs:</strong> Add widgets & manage players</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Copy & share join codes
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Desktop Only */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <X className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-mono text-destructive uppercase tracking-wider">
                  Desktop Only
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  Drag-and-drop dashboard layout
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  Resize & reposition widgets
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  Infinite canvas & zoom controls
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  Multi-select & bulk editing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  Keyboard shortcuts (Ctrl+K, etc.)
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Tip */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  For full dashboard editing, switch to a tablet or desktop. 
                  Your changes sync instantly!
                </p>
              </div>
            </div>

            {/* Button */}
            <TerminalButton 
              className="w-full" 
              onClick={handleDismiss}
            >
              Got it! 👍
            </TerminalButton>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
