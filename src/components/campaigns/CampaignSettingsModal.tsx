import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useSyncRepoRules, useDiscoverRepoRules } from "@/hooks/useWargameRules";
import { GitBranch, CheckCircle, AlertCircle, RefreshCw, Settings2 } from "lucide-react";

interface CampaignSettingsModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

export function CampaignSettingsModal({ open, onClose, campaignId }: CampaignSettingsModalProps) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  const syncRules = useSyncRepoRules();
  const discoverRules = useDiscoverRepoRules();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoValidated, setRepoValidated] = useState<boolean | null>(null);
  const [repoCategories, setRepoCategories] = useState<string[]>([]);

  // Populate form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setPointsLimit(String(campaign.points_limit || 1000));
      setRepoUrl(campaign.rules_repo_url || "");
      if (campaign.rules_repo_url) {
        setRepoValidated(true); // Assume valid if already saved
      }
    }
  }, [campaign]);

  const handleValidateRepo = async () => {
    if (!repoUrl.trim()) return;
    
    setRepoValidated(null);
    try {
      const categories = await discoverRules.mutateAsync(repoUrl);
      setRepoCategories(categories.map(c => c.category));
      setRepoValidated(true);
    } catch {
      setRepoValidated(false);
      setRepoCategories([]);
    }
  };

  const handleSyncRules = async () => {
    if (!repoUrl.trim() || !repoValidated) return;
    
    await syncRules.mutateAsync({
      repoUrl,
      campaignId,
    });
  };

  const handleSave = async () => {
    await updateCampaign.mutateAsync({
      id: campaignId,
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
      rules_repo_url: repoValidated ? repoUrl : undefined,
    });
    
    // If repo is validated but hasn't been synced yet, sync it
    if (repoValidated && repoUrl && repoUrl !== campaign?.rules_repo_url) {
      await syncRules.mutateAsync({
        repoUrl,
        campaignId,
      });
    }
    
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
      <DialogContent className="bg-card border-primary/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Campaign Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {/* GitHub Repo Section */}
          <div className="space-y-3 border border-border/50 p-4 bg-muted/20 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranch className="w-4 h-4" />
              <span className="font-medium uppercase">Wargame Rules Repository</span>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <TerminalInput
                  placeholder="https://github.com/username/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    if (e.target.value !== campaign?.rules_repo_url) {
                      setRepoValidated(null);
                      setRepoCategories([]);
                    }
                  }}
                />
              </div>
              <TerminalButton
                type="button"
                variant="outline"
                onClick={handleValidateRepo}
                disabled={!repoUrl.trim() || discoverRules.isPending}
                className="shrink-0"
              >
                {discoverRules.isPending ? (
                  <TerminalLoader text="" size="sm" />
                ) : (
                  "Validate"
                )}
              </TerminalButton>
            </div>

            {/* Validation Status */}
            {repoValidated === true && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-green-400 bg-green-400/10 p-2 border border-green-400/30">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Repository validated!</p>
                    {repoCategories.length > 0 && (
                      <p className="text-green-400/70 mt-1">
                        Categories: {repoCategories.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Sync Button */}
                {campaign?.rules_repo_url === repoUrl && (
                  <TerminalButton
                    type="button"
                    variant="outline"
                    onClick={handleSyncRules}
                    disabled={syncRules.isPending}
                    className="w-full"
                  >
                    {syncRules.isPending ? (
                      <TerminalLoader text="Syncing" size="sm" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-sync Rules from Repository
                      </>
                    )}
                  </TerminalButton>
                )}
              </div>
            )}
            
            {repoValidated === false && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 border border-destructive/30">
                <AlertCircle className="w-4 h-4" />
                <span>Could not access repository. Check the URL and try again.</span>
              </div>
            )}
          </div>
        </div>

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
            disabled={!name.trim() || updateCampaign.isPending || syncRules.isPending}
          >
            {updateCampaign.isPending || syncRules.isPending ? (
              <TerminalLoader text="Saving" size="sm" />
            ) : (
              "Save Settings"
            )}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
