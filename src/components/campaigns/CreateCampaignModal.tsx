import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCreateCampaign } from "@/hooks/useCampaigns";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("1000");
  
  const createCampaign = useCreateCampaign();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
    });
    
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsLimit("1000");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm">
            [Create New Campaign]
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

          <p className="text-xs text-muted-foreground">
            You can import rules after creating the campaign via the Rules overlay.
          </p>

          <div className="flex gap-3 pt-2">
            <TerminalButton
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={createCampaign.isPending}
            >
              Cancel
            </TerminalButton>
            <TerminalButton
              type="submit"
              className="flex-1"
              disabled={!name.trim() || createCampaign.isPending}
            >
              {createCampaign.isPending ? (
                <TerminalLoader text="Creating" size="sm" />
              ) : (
                "Create Campaign"
              )}
            </TerminalButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
