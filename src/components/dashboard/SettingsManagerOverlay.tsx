import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useGameSystem, useRepoCatalogueFiles, useImportCatalogue, CatalogueFile } from "@/hooks/useGameSystems";
import { GameSystemPicker } from "@/components/campaigns/GameSystemPicker";
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
  Key,
  Gamepad2,
  FileCode,
  Download,
  Loader2
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
  const { data: currentGameSystem } = useGameSystem(campaign?.game_system_id ?? undefined);
  const { data: catalogueFiles, isLoading: loadingCatalogues } = useRepoCatalogueFiles(currentGameSystem?.repo_url);
  const importCatalogue = useImportCatalogue();
  const updateCampaign = useUpdateCampaign();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");
  const [gameSystemId, setGameSystemId] = useState<string | null>(null);
  const [status, setStatus] = useState<CampaignStatus>("active");
  const [gmIsPlayer, setGmIsPlayer] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [importingFile, setImportingFile] = useState<string | null>(null);

  // Initialize form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setPointsLimit(campaign.points_limit?.toString() || "");
      setGameSystemId(campaign.game_system_id || null);
      setHasChanges(false);
    }
  }, [campaign]);

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
      game_system_id: gameSystemId,
    });

    setHasChanges(false);
    toast.success("Settings saved");
  };

  const handleChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setHasChanges(true);
  };

  const handleImportCatalogue = async (file: CatalogueFile) => {
    if (!currentGameSystem?.id) return;
    
    setImportingFile(file.fileName);
    try {
      await importCatalogue.mutateAsync({
        downloadUrl: file.downloadUrl,
        fileName: file.fileName,
        gameSystemId: currentGameSystem.id,
      });
    } finally {
      setImportingFile(null);
    }
  };

  // Filter catalogue files to show only non-faction catalogues (like Campaign Rules)
  const importableCatalogues = catalogueFiles?.filter(f => 
    f.type === 'catalogue' && 
    (f.name.toLowerCase().includes('campaign') || 
     f.name.toLowerCase().includes('rules') ||
     f.name.toLowerCase().includes('core'))
  ) || [];

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

          {/* Game System */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
              <Gamepad2 className="w-3 h-3" />
              Game System
            </h3>
            
            <GameSystemPicker
              value={gameSystemId}
              onChange={(id) => handleChange(setGameSystemId, id)}
            />
            
            {currentGameSystem && gameSystemId === campaign?.game_system_id && (
              <p className="text-[10px] text-muted-foreground">
                Currently using: <span className="text-primary">{currentGameSystem.name}</span>
                {currentGameSystem.version && ` v${currentGameSystem.version}`}
              </p>
            )}
          </div>

          {/* Campaign Rules Import - Only show if game system has a repo URL */}
          {currentGameSystem?.repo_url && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                <FileCode className="w-3 h-3" />
                Import Campaign Rules
              </h3>
              
              <p className="text-[10px] text-muted-foreground">
                Import additional rule sets from the game system repository (e.g., Campaign Rules, Exploration Tables, Injury Charts).
              </p>
              
              {loadingCatalogues ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading available catalogues...
                </div>
              ) : catalogueFiles && catalogueFiles.length > 0 ? (
                <div className="space-y-2">
                  {catalogueFiles.map((file) => (
                    <div 
                      key={file.fileName}
                      className="flex items-center justify-between border border-border rounded p-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-mono">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.type === 'gamesystem' ? 'Game System' : 'Catalogue'}
                          </p>
                        </div>
                      </div>
                      <TerminalButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleImportCatalogue(file)}
                        disabled={importingFile !== null}
                      >
                        {importingFile === file.fileName ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </TerminalButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-yellow-400">
                  No catalogue files found in the repository.
                </p>
              )}
            </div>
          )}

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