import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Link2, Loader2 } from "lucide-react";

interface PlayerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  playerId: string; // campaign_players.id
  currentWarbandLink: string | null;
}

export function PlayerSettingsModal({
  open,
  onClose,
  campaignId,
  playerId,
  currentWarbandLink,
}: PlayerSettingsModalProps) {
  const [warbandLink, setWarbandLink] = useState(currentWarbandLink || "");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (link: string | null) => {
      const { error } = await supabase
        .from("campaign_players")
        .update({ warband_link: link })
        .eq("id", playerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-players", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-owner", campaignId] });
      toast.success("Player settings updated");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to update settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const link = warbandLink.trim() || null;
    updateMutation.mutate(link);
  };

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Player Settings
          </DialogTitle>
          <DialogDescription>
            Configure your settings for this campaign
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="warband-link">Warband Link</Label>
            <Input
              id="warband-link"
              type="url"
              placeholder="https://newrecruit.eu/..."
              value={warbandLink}
              onChange={(e) => setWarbandLink(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Link to your warband on New Recruit or another roster builder. 
              Other players can click this to view your army list.
            </p>
            {warbandLink && !isValidUrl(warbandLink) && (
              <p className="text-xs text-destructive">
                Please enter a valid URL
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !isValidUrl(warbandLink)}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
