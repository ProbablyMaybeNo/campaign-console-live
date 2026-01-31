import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCampaign, useUpdateCampaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useSyncRepoRules, useDiscoverRepoRules } from "@/hooks/useWargameRules";
import { GitBranch, CheckCircle, AlertCircle, RefreshCw, Settings2, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CampaignSettingsModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

const ROUND_LENGTH_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const COLOR_PRESETS = [
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#eab308", label: "Gold" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#f97316", label: "Orange" },
];

export function CampaignSettingsModal({ open, onClose, campaignId }: CampaignSettingsModalProps) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  const syncRules = useSyncRepoRules();
  const discoverRules = useDiscoverRepoRules();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [totalRounds, setTotalRounds] = useState("");
  const [currentRound, setCurrentRound] = useState("");
  const [roundLength, setRoundLength] = useState("weekly");
  const [password, setPassword] = useState("");
  const [gameSystem, setGameSystem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(true);
  const [titleColor, setTitleColor] = useState("#22c55e");
  const [borderColor, setBorderColor] = useState("#22c55e");
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    showId: true,
    showPoints: true,
    showPlayers: true,
    showRound: true,
    showDates: true,
    showStatus: true,
    showGameSystem: true,
  });
  const [repoUrl, setRepoUrl] = useState("");
  const [repoValidated, setRepoValidated] = useState<boolean | null>(null);
  const [repoCategories, setRepoCategories] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showRepoSettings, setShowRepoSettings] = useState(false);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);

  // Populate form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setPointsLimit(String(campaign.points_limit || 1000));
      setMaxPlayers(String(campaign.max_players || 8));
      setTotalRounds(String(campaign.total_rounds || 10));
      setCurrentRound(String(campaign.current_round || 1));
      setRoundLength(campaign.round_length || "weekly");
      setPassword(campaign.password || "");
      setGameSystem(campaign.game_system || "");
      setStartDate(campaign.start_date || "");
      setEndDate(campaign.end_date || "");
      setStatus(campaign.status === "active");
      setTitleColor(campaign.title_color || "#22c55e");
      setBorderColor(campaign.border_color || "#22c55e");
      const ds = campaign.display_settings as DisplaySettings | null;
      if (ds) {
        setDisplaySettings({
          showId: ds.showId ?? true,
          showPoints: ds.showPoints ?? true,
          showPlayers: ds.showPlayers ?? true,
          showRound: ds.showRound ?? true,
          showDates: ds.showDates ?? true,
          showStatus: ds.showStatus ?? true,
          showGameSystem: ds.showGameSystem ?? true,
        });
      }
      setRepoUrl(campaign.rules_repo_url || "");
      if (campaign.rules_repo_url) {
        setRepoValidated(true);
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
      max_players: parseInt(maxPlayers) || 8,
      total_rounds: parseInt(totalRounds) || 10,
      current_round: parseInt(currentRound) || 1,
      round_length: roundLength,
      password: password || undefined,
      game_system: gameSystem || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: status ? "active" : "inactive",
      title_color: titleColor,
      border_color: borderColor,
      display_settings: displaySettings,
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

  const handleCopyJoinCode = () => {
    const joinCode = campaign?.join_code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopiedJoinCode(true);
      toast.success("Join code copied to clipboard!");
      setTimeout(() => setCopiedJoinCode(false), 2000);
    }
  };

  const toggleDisplaySetting = (key: keyof DisplaySettings) => {
    setDisplaySettings((prev) => ({ ...prev, [key]: !prev[key] }));
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
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Campaign Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Join Code Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/50 rounded">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Campaign Join Code</p>
              <p className="font-mono text-lg text-primary tracking-widest">{campaign?.join_code || "—"}</p>
            </div>
            <TerminalButton
              variant="outline"
              size="sm"
              onClick={handleCopyJoinCode}
              className="shrink-0"
            >
              {copiedJoinCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </TerminalButton>
          </div>

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
              className="flex w-full bg-input border border-border p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 min-h-[60px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TerminalInput
              label="Points Limit"
              type="number"
              value={pointsLimit}
              onChange={(e) => setPointsLimit(e.target.value)}
            />
            <TerminalInput
              label="Max Players"
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TerminalInput
              label="Current Round"
              type="number"
              value={currentRound}
              onChange={(e) => setCurrentRound(e.target.value)}
            />
            <TerminalInput
              label="Total Rounds"
              type="number"
              value={totalRounds}
              onChange={(e) => setTotalRounds(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Round Length
              </label>
              <Select value={roundLength} onValueChange={setRoundLength}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_LENGTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TerminalInput
            label="Wargame System"
            placeholder="e.g., Warhammer 40k, Age of Sigmar..."
            value={gameSystem}
            onChange={(e) => setGameSystem(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <TerminalInput
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TerminalInput
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border/30">
            <Label htmlFor="status-toggle" className="text-xs uppercase tracking-wider text-muted-foreground">
              Campaign Status
            </Label>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${!status ? "text-destructive" : "text-muted-foreground"}`}>
                Inactive
              </span>
              <Switch
                id="status-toggle"
                checked={status}
                onCheckedChange={setStatus}
              />
              <span className={`text-xs ${status ? "text-primary" : "text-muted-foreground"}`}>
                Active
              </span>
            </div>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Security & Appearance
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <TerminalInput
                label="Campaign Password (Optional)"
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Title Color
                  </label>
                  <Select value={titleColor} onValueChange={setTitleColor}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_PRESETS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Border Color
                  </label>
                  <Select value={borderColor} onValueChange={setBorderColor}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_PRESETS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Display Settings */}
          <Collapsible open={showDisplaySettings} onOpenChange={setShowDisplaySettings}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showDisplaySettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Campaign Console Display
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Toggle which information to show on the Campaign Console widget
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "showId", label: "Campaign ID" },
                  { key: "showPoints", label: "Points Limit" },
                  { key: "showPlayers", label: "Player Count" },
                  { key: "showRound", label: "Current Round" },
                  { key: "showDates", label: "Start/End Dates" },
                  { key: "showStatus", label: "Active Status" },
                  { key: "showGameSystem", label: "Game System" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Switch
                      id={item.key}
                      checked={displaySettings[item.key as keyof DisplaySettings] ?? true}
                      onCheckedChange={() => toggleDisplaySetting(item.key as keyof DisplaySettings)}
                    />
                    <Label htmlFor={item.key} className="text-xs">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* GitHub Repo Section */}
          <Collapsible open={showRepoSettings} onOpenChange={setShowRepoSettings}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showRepoSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <GitBranch className="w-4 h-4" />
              Rules Repository
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2 border border-border/50 p-4 bg-muted/20 rounded">
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
            </CollapsibleContent>
          </Collapsible>
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
