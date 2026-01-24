import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useJoinCampaign } from "@/hooks/useCampaigns";
import { useNavigate } from "react-router-dom";

interface JoinCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinCampaignModal({ open, onClose }: JoinCampaignModalProps) {
  const [campaignId, setCampaignId] = useState("");
  const joinCampaign = useJoinCampaign();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedId = campaignId.trim();
    if (!trimmedId) return;

    try {
      await joinCampaign.mutateAsync(trimmedId);
      resetForm();
      onClose();
      // Navigate to the campaign as a player
      navigate(`/campaign/${trimmedId}`);
    } catch {
      // Error is handled in the mutation
    }
  };

  const resetForm = () => {
    setCampaignId("");
  };

  const handleClose = () => {
    if (!joinCampaign.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-background border-primary/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary tracking-wider">
            [ JOIN CAMPAIGN ]
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
              Campaign ID
            </label>
            <TerminalInput
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="Enter the campaign ID from your GM..."
              disabled={joinCampaign.isPending}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Ask your Games Master for the campaign ID to join their campaign.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <TerminalButton
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={joinCampaign.isPending}
            >
              [ Cancel ]
            </TerminalButton>
            <TerminalButton
              type="submit"
              disabled={!campaignId.trim() || joinCampaign.isPending}
            >
              {joinCampaign.isPending ? (
                <TerminalLoader text="Joining" size="sm" />
              ) : (
                "[ Join Campaign ]"
              )}
            </TerminalButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
