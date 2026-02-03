import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { 
  Sparkles, 
  Palette, 
  Image, 
  FileText, 
  Sticker, 
  Wand2,
  Crown,
  Database,
  CheckCircle
} from "lucide-react";

interface SupporterWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const UNLOCKED_FEATURES = [
  {
    icon: Database,
    title: "5 Active Campaigns",
    description: "Manage up to 5 campaigns simultaneously instead of just 1.",
    howToAccess: "Create new campaigns from the Campaign Directory.",
  },
  {
    icon: Wand2,
    title: "Smart Paste (AI)",
    description: "Convert pasted text into structured tables and cards using AI.",
    howToAccess: "Use 'AI Convert' in the Add Component → Rules Table/Card wizard.",
  },
  {
    icon: Palette,
    title: "Dashboard Themes",
    description: "Choose from 5 unique themes: Dark, Light, Aquatic, Parchment, and Hazard.",
    howToAccess: "Campaign Settings → Appearance → Theme Selector.",
  },
  {
    icon: Image,
    title: "Campaign Banners",
    description: "Display a custom banner image in your Campaign Console widget.",
    howToAccess: "Campaign Settings → Appearance → Banner URL.",
  },
  {
    icon: FileText,
    title: "Text Widgets",
    description: "Add markdown-enabled text notes anywhere on your dashboard.",
    howToAccess: "Add Component → Text widget.",
  },
  {
    icon: Sticker,
    title: "Sticker Widgets",
    description: "Place decorative icons as visual markers on your dashboard.",
    howToAccess: "Add Component → Sticker widget.",
  },
];

export function SupporterWelcomeModal({ open, onClose }: SupporterWelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Red X close button in top-right */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full bg-destructive/20 hover:bg-destructive/40 transition-colors group z-10"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-destructive group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <DialogHeader>
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(200, 100%, 60%), hsl(280, 100%, 60%))',
                boxShadow: '0 0 20px hsl(200 100% 60% / 0.5)'
              }}
            >
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Welcome, Supporter!
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Thank you for supporting Campaign Console! Here's what you've unlocked.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {UNLOCKED_FEATURES.map((feature, idx) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-muted/30 border border-primary/20 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                      <FeatureIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        {feature.title}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                  <p className="text-[10px] text-primary/80 font-mono uppercase tracking-wide">
                    → {feature.howToAccess}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Start Tips */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Start
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
              <li className="list-disc">Try changing your theme in Campaign Settings → Appearance</li>
              <li className="list-disc">Add a Text widget for house rules or session notes</li>
              <li className="list-disc">Use Smart Paste to quickly import rules from PDFs or docs</li>
              <li className="list-disc">Place Stickers to mark important locations on your dashboard</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Return to Campaign
          </button>
          <TerminalButton onClick={onClose}>
            Get Started
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
