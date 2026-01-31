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
  const [joinCode, setJoinCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const joinCampaign = useJoinCampaign();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) return;

    try {
      const campaignId = await joinCampaign.mutateAsync({
        joinCode: trimmedCode,
        password: password || undefined,
      });
      resetForm();
      onClose();
      // Navigate to the campaign as a player
      navigate(`/campaign/${campaignId}`);
    } catch (error: any) {
      // If password is required, show password field
      if (error.message?.includes("password")) {
        setShowPassword(true);
      }
    }
  };

  const resetForm = () => {
    setJoinCode("");
    setPassword("");
    setShowPassword(false);
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
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code (e.g., AB123C)"
              disabled={joinCampaign.isPending}
              className="font-mono uppercase"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Ask your Games Master for the campaign ID to join their campaign.
            </p>
          </div>

          {showPassword && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
                Password
              </label>
              <TerminalInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter campaign password..."
                disabled={joinCampaign.isPending}
                className="font-mono"
              />
              <p className="text-xs text-destructive">
                This campaign requires a password to join.
              </p>
            </div>
          )}

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
              disabled={!joinCode.trim() || joinCampaign.isPending}
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
