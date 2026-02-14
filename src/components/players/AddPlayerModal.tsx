import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Swords,
  Link2,
  FileText,
  Bot,
  Loader2,
} from "lucide-react";

interface AddPlayerModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

export function AddPlayerModal({ open, onClose, campaignId }: AddPlayerModalProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [faction, setFaction] = useState("");
  const [subFaction, setSubFaction] = useState("");
  const [currentPoints, setCurrentPoints] = useState("");
  const [warbandLink, setWarbandLink] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const resetForm = () => {
    setPlayerName("");
    setFaction("");
    setSubFaction("");
    setCurrentPoints("");
    setWarbandLink("");
    setAdditionalInfo("");
  };

  const handleSave = async () => {
    if (!playerName.trim()) {
      toast.error("Player name is required");
      return;
    }

    setIsSaving(true);
    try {
      const ghostUserId = crypto.randomUUID();

      const { error } = await supabase.from("campaign_players").insert({
        campaign_id: campaignId,
        user_id: ghostUserId,
        player_name: playerName.trim(),
        faction: faction.trim() || null,
        sub_faction: subFaction.trim() || null,
        current_points: currentPoints ? parseInt(currentPoints, 10) : null,
        warband_link: warbandLink.trim() || null,
        additional_info: additionalInfo.trim() || null,
        is_ghost: true,
        role: "player",
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["campaign-players", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["all-player-settings", campaignId] });
      toast.success(`Added ghost player "${playerName.trim()}"`);
      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add player");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose(); } }}>
      <DialogContent className="bg-background border-primary/50 max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary tracking-wider flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Add Ghost Player
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <p className="text-[10px] text-muted-foreground font-mono">
            Create an AI / ghost player for solo play or placeholder slots. This player won't be tied to a real account.
          </p>

          {/* Player Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <User className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Player Info</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TerminalInput
                label="Name *"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name..."
              />
              <TerminalInput
                label="Points / Gold"
                value={currentPoints}
                onChange={(e) => setCurrentPoints(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Faction */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <Swords className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Faction</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TerminalInput
                label="Faction"
                value={faction}
                onChange={(e) => setFaction(e.target.value)}
                placeholder="e.g., Space Marines"
              />
              <TerminalInput
                label="Sub-Faction"
                value={subFaction}
                onChange={(e) => setSubFaction(e.target.value)}
                placeholder="e.g., Ultramarines"
              />
            </div>
          </div>

          {/* Warband Link */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <Link2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Warband Link</span>
            </div>
            <TerminalInput
              value={warbandLink}
              onChange={(e) => setWarbandLink(e.target.value)}
              placeholder="https://newrecruit.eu/..."
            />
          </div>

          {/* Additional Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Additional Info</span>
            </div>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Warband list or notes..."
              className="min-h-[80px] font-mono text-xs bg-input border-border"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <TerminalButton variant="ghost" size="sm" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </TerminalButton>
            <TerminalButton size="sm" onClick={handleSave} disabled={isSaving || !playerName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 mr-1" />
                  Add Player
                </>
              )}
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
