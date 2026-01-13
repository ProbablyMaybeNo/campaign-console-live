import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { 
  Settings, 
  Save, 
  Copy, 
  Check,
  Pause,
  Play,
  Lock,
  Users,
  Swords,
  Key
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

type CampaignStatus = "active" | "paused" | "closed";

export function SettingsManagerOverlay({
  open,
  onOpenChange,
  campaignId,
}: SettingsManagerOverlayProps) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("active");
  const [gmIsPlayer, setGmIsPlayer] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when campaign loads
  useState(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setPointsLimit(campaign.points_limit?.toString() || "");
    }
  });

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(campaignId);
    setCopiedId(true);
    toast.success("Campaign ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    await updateCampaign.mutateAsync({
      id: campaignId,
      name: name.trim(),
      description: description.trim() || null,
      points_limit: pointsLimit ? parseInt(pointsLimit) : null,
    });

    setHasChanges(false);
    toast.success("Settings saved");
  };

  const handleChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-primary/30">
          <div className="flex items-center justify-center py-16">
            <TerminalLoader text="Loading settings" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Campaign Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Campaign ID */}
          <div className="border border-primary/20 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Campaign ID
                </p>
                <p className="text-sm font-mono mt-1 text-foreground">
                  {campaignId.slice(0, 8)}...{campaignId.slice(-8)}
                </p>
              </div>
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={handleCopyId}
              >
                {copiedId ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </TerminalButton>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Share this ID with players to invite them to your campaign
            </p>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              Basic Information
            </h3>
            
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Campaign Name *
              </label>
              <TerminalInput
                value={name}
                onChange={(e) => handleChange(setName, e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => handleChange(setDescription, e.target.value)}
                placeholder="Campaign description..."
                className="w-full bg-input border border-primary/30 rounded px-3 py-2 text-sm font-mono min-h-[80px] resize-none focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Points Limit
              </label>
              <TerminalInput
                type="number"
                value={pointsLimit}
                onChange={(e) => handleChange(setPointsLimit, e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          </div>

          {/* Campaign Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              Campaign Status
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <StatusButton
                icon={<Play className="w-4 h-4" />}
                label="Active"
                description="Campaign is live"
                active={status === "active"}
                onClick={() => setStatus("active")}
              />
              <StatusButton
                icon={<Pause className="w-4 h-4" />}
                label="Paused"
                description="Temporarily halted"
                active={status === "paused"}
                onClick={() => setStatus("paused")}
              />
              <StatusButton
                icon={<Lock className="w-4 h-4" />}
                label="Closed"
                description="Campaign ended"
                active={status === "closed"}
                onClick={() => setStatus("closed")}
              />
            </div>
          </div>

          {/* GM Options */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              GM Options
            </h3>
            
            <div className="border border-border rounded p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords className="w-5 h-5 text-primary/50" />
                <div>
                  <p className="text-sm font-mono">GM is also a player</p>
                  <p className="text-[10px] text-muted-foreground">
                    Allow GM to have their own warband
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGmIsPlayer(!gmIsPlayer)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  gmIsPlayer ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    gmIsPlayer ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              Access Control
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary/50" />
                  <p className="text-xs font-mono">Player Invites</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Players join using Campaign ID
                </p>
              </div>
              
              <div className="border border-border rounded p-4 opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-primary/50" />
                  <p className="text-xs font-mono">Password Protection</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Coming soon
                </p>
              </div>
            </div>
          </div>

          {/* Rules Repository Info */}
          {campaign?.rules_repo_url && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                Rules Repository
              </h3>
              
              <div className="bg-muted/10 border border-border rounded p-4">
                <p className="text-xs font-mono text-foreground break-all">
                  {campaign.rules_repo_url}
                </p>
                {campaign.rules_repo_ref && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Branch: {campaign.rules_repo_ref}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-primary/20 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {hasChanges ? "You have unsaved changes" : "All changes saved"}
          </p>
          <TerminalButton
            onClick={handleSave}
            disabled={!hasChanges || updateCampaign.isPending}
          >
            {updateCampaign.isPending ? (
              <TerminalLoader text="Saving" size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StatusButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function StatusButton({ icon, label, description, active, onClick }: StatusButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border rounded p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={active ? "text-primary" : "text-muted-foreground"}>
          {icon}
        </span>
        <span className="text-xs font-mono">{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </button>
  );
}