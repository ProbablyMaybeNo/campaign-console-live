import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useDeleteCampaign, Campaign } from "@/hooks/useCampaigns";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
}

export function DeleteConfirmModal({ campaign, open, onClose }: DeleteConfirmModalProps) {
  const deleteCampaign = useDeleteCampaign();

  const handleDelete = async () => {
    await deleteCampaign.mutateAsync(campaign.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-destructive/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive uppercase tracking-widest text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            [Confirm Deletion]
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Are you sure you want to delete this campaign?</p>
            <p className="mt-2 text-foreground font-medium">
              "{campaign.name}"
            </p>
            <p className="mt-4 text-xs text-destructive">
              [WARNING] This action cannot be undone. All campaign data, components, messages, and warbands will be permanently deleted.
            </p>
          </div>

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
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
              disabled={deleteCampaign.isPending}
            >
              {deleteCampaign.isPending ? (
                <TerminalLoader text="Deleting" size="sm" />
              ) : (
                "Delete Campaign"
              )}
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
