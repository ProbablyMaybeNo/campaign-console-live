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
import { supabase } from "@/integrations/supabase/client";
import { useJoinCampaign } from "@/hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import { Users, Info, Shield } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";

interface CampaignPreview {
  id: string;
  name: string;
  description: string | null;
  game_system: string | null;
  player_count: number;
  max_players: number | null;
  hasPassword: boolean;
}

interface JoinCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinCampaignModal({ open, onClose }: JoinCampaignModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [password, setPassword] = useState("");
  const [campaignPreview, setCampaignPreview] = useState<CampaignPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const joinCampaign = useJoinCampaign();
  const navigate = useNavigate();

  const handleCodeChange = async (code: string) => {
    const upperCode = code.toUpperCase();
    setJoinCode(upperCode);
    setPreviewError(null);
    setCampaignPreview(null);
    setPassword("");

    // Only lookup when we have a complete 6-character code
    if (upperCode.length === 6) {
      setIsLoadingPreview(true);
      try {
        // Use secure RPC function for campaign lookup (doesn't expose password)
        const { data: campaigns, error } = await supabase
          .rpc("lookup_campaign_by_code", { join_code_input: upperCode });

        if (error) throw error;

        if (!campaigns || campaigns.length === 0) {
          setPreviewError("No campaign found with this code.");
          setIsLoadingPreview(false);
          return;
        }

        const campaign = campaigns[0];

        setCampaignPreview({
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          game_system: campaign.game_system,
          player_count: Number(campaign.player_count) || 0,
          max_players: campaign.max_players,
          hasPassword: campaign.has_password,
        });
      } catch (error) {
        setPreviewError("Failed to lookup campaign.");
      }
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode || !campaignPreview) return;

    try {
      const campaignId = await joinCampaign.mutateAsync({
        joinCode: trimmedCode,
        password: password || undefined,
      });
      resetForm();
      onClose();
      navigate(`/campaign/${campaignId}`);
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setJoinCode("");
    setPassword("");
    setCampaignPreview(null);
    setPreviewError(null);
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
          <div className="flex items-center justify-between">
            <DialogTitle className="font-mono text-primary tracking-wider">
              [ JOIN CAMPAIGN ]
            </DialogTitle>
            <HelpButton variant="icon" />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
              Join Code
            </label>
            <TerminalInput
              value={joinCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter 6-character code (e.g., AB123C)"
              disabled={joinCampaign.isPending}
              className="font-mono uppercase text-lg tracking-widest text-center"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Ask your Games Master for the campaign's join code.
            </p>
          </div>

          {/* Loading preview */}
          {isLoadingPreview && (
            <div className="flex items-center justify-center py-4">
              <TerminalLoader text="Looking up campaign" size="sm" />
            </div>
          )}

          {/* Preview error */}
          {previewError && (
            <div className="border border-destructive/50 bg-destructive/10 rounded p-3 text-center">
              <p className="text-sm text-destructive font-mono">{previewError}</p>
            </div>
          )}

          {/* Campaign Preview */}
          {campaignPreview && (
            <div className="border border-primary/50 bg-primary/5 rounded p-4 space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-foreground font-medium text-base truncate">
                    {campaignPreview.name}
                  </h3>
                  {campaignPreview.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {campaignPreview.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {campaignPreview.game_system && (
                  <span className="font-mono">🎮 {campaignPreview.game_system}</span>
                )}
                <span className="flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3" />
                  {campaignPreview.player_count}
                  {campaignPreview.max_players && ` / ${campaignPreview.max_players}`} players
                </span>
              </div>

              {campaignPreview.hasPassword && (
                <div className="border-t border-primary/30 pt-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-500 font-mono uppercase">
                      Password Required
                    </span>
                  </div>
                  <TerminalInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter campaign password..."
                    disabled={joinCampaign.isPending}
                    className="font-mono"
                  />
                </div>
              )}
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
              disabled={!campaignPreview || (campaignPreview.hasPassword && !password.trim()) || joinCampaign.isPending}
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
