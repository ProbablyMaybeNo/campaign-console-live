import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useUpdateCampaign, Campaign } from "@/hooks/useCampaigns";

interface EditCampaignModalProps {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
}

export function EditCampaignModal({ campaign, open, onClose }: EditCampaignModalProps) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [pointsLimit, setPointsLimit] = useState(String(campaign.points_limit || 1000));
  const updateCampaign = useUpdateCampaign();

  // Reset form when campaign changes
  useEffect(() => {
    setName(campaign.name);
    setDescription(campaign.description || "");
    setPointsLimit(String(campaign.points_limit || 1000));
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateCampaign.mutateAsync({
      id: campaign.id,
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm">
            [Edit Campaign]
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TerminalInput
            label="Campaign Name"
            placeholder="Enter campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Description
            </label>
            <textarea
              className="flex w-full bg-input border border-border p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 min-h-[80px] resize-none"
              placeholder="Describe your campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <TerminalInput
            label="Points Limit"
            type="number"
            placeholder="1000"
            value={pointsLimit}
            onChange={(e) => setPointsLimit(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <TerminalButton
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </TerminalButton>
            <TerminalButton
              type="submit"
              className="flex-1"
              disabled={!name.trim() || updateCampaign.isPending}
            >
              {updateCampaign.isPending ? (
                <TerminalLoader text="Saving" size="sm" />
              ) : (
                "Save Changes"
              )}
            </TerminalButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
