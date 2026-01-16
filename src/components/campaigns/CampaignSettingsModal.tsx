import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { RulesImporter } from "./RulesImporter";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { Settings2, FileUp } from "lucide-react";

interface CampaignSettingsModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

export function CampaignSettingsModal({ open, onClose, campaignId }: CampaignSettingsModalProps) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");

  // Populate form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setPointsLimit(String(campaign.points_limit || 1000));
    }
  }, [campaign]);

  const handleSave = async () => {
    await updateCampaign.mutateAsync({
      id: campaignId,
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
    });
    
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="bg-card border-primary/30">
          <div className="flex justify-center py-8">
            <TerminalLoader text="Loading" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Campaign Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30">
            <TabsTrigger value="general" className="text-xs font-mono">
              <Settings2 className="w-3 h-3 mr-1.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs font-mono">
              <FileUp className="w-3 h-3 mr-1.5" />
              Import Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <TerminalInput
                label="Campaign Name"
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <TerminalInput
                label="Points Limit"
                type="number"
                value={pointsLimit}
                onChange={(e) => setPointsLimit(e.target.value)}
              />

              <div className="flex gap-3 pt-2 border-t border-border">
                <TerminalButton
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </TerminalButton>
                <TerminalButton
                  onClick={handleSave}
                  className="flex-1"
                  disabled={!name.trim() || updateCampaign.isPending}
                >
                  {updateCampaign.isPending ? (
                    <TerminalLoader text="Saving" size="sm" />
                  ) : (
                    "Save Settings"
                  )}
                </TerminalButton>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="flex-1 overflow-auto mt-4">
            <RulesImporter campaignId={campaignId} onComplete={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
