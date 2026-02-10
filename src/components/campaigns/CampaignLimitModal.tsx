import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Archive, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleArchive = () => {
    onClose();
    // Scroll to campaign list and user can archive from there
    // Could add a highlight effect in the future
  };

  const handleUpgrade = () => {
    onClose();
    navigate("/settings");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Unlock className="w-5 h-5" />
            Campaign Limit Reached
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-foreground">
            Free tier supports <strong>{maxCampaigns} active campaign</strong>.
          </p>
          
          <p className="text-muted-foreground text-sm">
            You currently have {activeCampaignCount} active campaign{activeCampaignCount !== 1 ? 's' : ''}. 
            You can archive a campaign to start a new one.
          </p>

          <div className="bg-muted/30 p-3 rounded border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Archived campaigns keep all their data and can be restored anytime. 
              Players won't be able to access archived campaigns until restored.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <TerminalButton
            variant="secondary"
            onClick={handleArchive}
            className="flex-1 gap-2"
          >
            <Archive className="w-4 h-4" />
            Archive a Campaign
          </TerminalButton>
          
          {/* Upgrade button - hidden for now */}
          {/* <TerminalButton
            onClick={handleUpgrade}
            className="flex-1 gap-2"
          >
            <Unlock className="w-4 h-4" />
            Upgrade ($2.99/mo)
          </TerminalButton> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
