import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useDiscoverRepoRules, useSyncRepoRules } from "@/hooks/useWargameRules";
import { GitBranch, CheckCircle, AlertCircle, Gamepad2 } from "lucide-react";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

const WARGAME_PRESETS = [
  { value: "custom", label: "Custom / No Preset", description: "Set up rules manually" },
  { value: "github", label: "Import from GitHub", description: "Load rules from a repository" },
];

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("1000");
  const [wargameOption, setWargameOption] = useState<string>("custom");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoValidated, setRepoValidated] = useState<boolean | null>(null);
  const [repoCategories, setRepoCategories] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const createCampaign = useCreateCampaign();
  const discoverRules = useDiscoverRepoRules();
  const syncRules = useSyncRepoRules();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the campaign first
    const campaign = await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
      rules_repo_url: wargameOption === "github" && repoValidated ? repoUrl : undefined,
    });
    
    // If we have a validated repo, sync the rules immediately after creating
    if (wargameOption === "github" && repoValidated && repoUrl && campaign) {
      setIsSyncing(true);
      try {
        await syncRules.mutateAsync({
          repoUrl,
          campaignId: campaign.id,
        });
      } catch (error) {
        console.error("Failed to sync rules:", error);
        // Don't block campaign creation if sync fails
      }
      setIsSyncing(false);
    }
    
    // Reset form and close
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsLimit("1000");
    setWargameOption("custom");
    setRepoUrl("");
    setRepoValidated(null);
    setRepoCategories([]);
    setIsSyncing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isCreating = createCampaign.isPending || isSyncing;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg">
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

          {/* Wargame Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <Gamepad2 className="w-3 h-3" />
              Wargame Rules Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WARGAME_PRESETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setWargameOption(option.value);
                    if (option.value === "custom") {
                      setRepoUrl("");
                      setRepoValidated(null);
                      setRepoCategories([]);
                    }
                  }}
                  className={`p-3 border text-left transition-all ${
                    wargameOption === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <p className="text-xs font-mono uppercase">{option.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* GitHub Repo Input */}
          {wargameOption === "github" && (
            <div className="space-y-3 animate-fade-in border border-border/50 p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GitBranch className="w-4 h-4" />
                <span>Enter the GitHub repository URL containing your wargame rules</span>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <TerminalInput
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setRepoValidated(null);
                      setRepoCategories([]);
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
                    <TerminalLoader text="Validating" size="sm" />
                  ) : (
                    "Validate"
                  )}
                </TerminalButton>
              </div>

              {/* Validation Status */}
              {repoValidated === true && (
                <div className="flex items-start gap-2 text-xs text-green-400 bg-green-400/10 p-2 border border-green-400/30">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Repository validated!</p>
                    <p className="text-green-400/70 mt-1">
                      Found {repoCategories.length} rule categories: {repoCategories.join(", ")}
                    </p>
                    <p className="text-green-400/60 mt-1 text-[10px]">
                      Rules will be synced when you create the campaign.
                    </p>
                  </div>
                </div>
              )}
              
              {repoValidated === false && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 border border-destructive/30">
                  <AlertCircle className="w-4 h-4" />
                  <span>Could not access repository. Check the URL and ensure it's public.</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <TerminalButton
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isCreating}
            >
              Cancel
            </TerminalButton>
            <TerminalButton
              type="submit"
              className="flex-1"
              disabled={
                !name.trim() || 
                isCreating ||
                (wargameOption === "github" && !repoValidated)
              }
            >
              {isCreating ? (
                <TerminalLoader text={isSyncing ? "Syncing Rules" : "Creating"} size="sm" />
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
