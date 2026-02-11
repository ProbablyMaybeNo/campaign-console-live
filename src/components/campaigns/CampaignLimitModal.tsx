import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Unlock, ExternalLink } from "lucide-react";

interface CampaignLimitModalProps {
  open: boolean;
  onClose: () => void;
  activeCampaignCount: number;
  maxCampaigns: number;
}

export function CampaignLimitModal({
  open,
  onClose,
  activeCampaignCount,
  maxCampaigns,
}: CampaignLimitModalProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleClose = () => {
    setShowComingSoon(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Unlock className="w-5 h-5" />
            Campaign Limit Reached
          </DialogTitle>
        </DialogHeader>

        {!showComingSoon ? (
          <div className="space-y-4 py-2">
            <p className="text-foreground text-sm leading-relaxed">
              Due to the free nature of the app, users are limited to running <strong>1 active campaign</strong> at a time.
            </p>

            <div className="bg-muted/30 p-3 rounded border border-border space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                You can archive campaigns you've created by clicking the <strong>Archive</strong> icon on your campaign row in the Campaign Directory, or via <strong>Campaign Settings</strong> inside a campaign dashboard.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Archived campaigns can be reactivated at any time using the <strong>Restore</strong> icon in the <strong>Archived</strong> tab and will remain in your archive indefinitely — or until you delete them.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Users are limited to archiving <strong>10 created campaigns</strong> at one time. Players can have as many active campaigns as they want and always play for free.
              </p>
            </div>

            <p className="text-foreground text-sm leading-relaxed">
              If you would like to increase your active and archived campaign limits by becoming a subscriber, please click the button below. In addition to increased campaign limits, you'll unlock a variety of customization options and quality-of-life improvements.
            </p>

            <p className="text-sm text-muted-foreground italic">
              Thank you for your understanding — enjoy the Campaign Console!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <TerminalButton
                onClick={() => setShowComingSoon(true)}
                className="flex-1 gap-2"
              >
                <Unlock className="w-4 h-4" />
                Become a Subscriber
              </TerminalButton>
              <TerminalButton
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Got It
              </TerminalButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-foreground text-sm leading-relaxed">
              Thank you for your interest in becoming a <strong>Campaign Console subscriber</strong>!
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              I am currently working on gauging interest in a <strong>$2.99/month</strong> subscription tier and developing a variety of exciting features available exclusively to subscribers.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Stay tuned for more info on the Campaign Console. Join the Discord to follow along and share your feedback!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <TerminalButton
                onClick={() => window.open("https://discord.gg/PmMn3NVt", "_blank")}
                className="flex-1 gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Join the Discord
              </TerminalButton>
              <TerminalButton
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Close
              </TerminalButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
