import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCampaign, useUpdateCampaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useEntitlements } from "@/hooks/useEntitlements";
import { LockedFeature } from "@/components/ui/LockedFeature";
import { THEMES } from "@/lib/themes";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import { 
  Settings2, 
  Copy, 
  Check,
  Palette,
  Shield,
  Info,
  CalendarIcon,
  Lock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
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
  const { isSupporter } = useEntitlements();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [totalRounds, setTotalRounds] = useState("");
  const [currentRound, setCurrentRound] = useState("");
  const [roundLength, setRoundLength] = useState("weekly");
  const [password, setPassword] = useState("");
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [gameSystem, setGameSystem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(true);
  const [titleColor, setTitleColor] = useState("#22c55e");
  const [borderColor, setBorderColor] = useState("#22c55e");
  const [themeId, setThemeId] = useState("dark");
  const [bannerUrl, setBannerUrl] = useState("");
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    showId: true,
    showPoints: true,
    showPlayers: true,
    showRound: true,
    showDates: true,
    showStatus: true,
    showGameSystem: true,
  });
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
      // Don't populate password - we can't read hashed passwords
      setPassword("");
      // Check if campaign has a password set (password_hash exists)
      setHasExistingPassword(!!(campaign as any).password_hash);
      setStartDate(campaign.start_date || "");
      setEndDate(campaign.end_date || "");
      setStatus(campaign.status === "active");
      setTitleColor(campaign.title_color || "#22c55e");
      setBorderColor(campaign.border_color || "#22c55e");
      setThemeId(campaign.theme_id || "dark");
      setBannerUrl(campaign.banner_url || "");
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
    }
  }, [campaign]);

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
      // Only send password if user entered a new one
      password: password.trim() ? password : undefined,
      game_system: gameSystem || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: status ? "active" : "inactive",
      title_color: titleColor,
      border_color: borderColor,
      theme_id: isSupporter ? themeId : "dark",
      banner_url: isSupporter ? (bannerUrl || undefined) : undefined,
      display_settings: displaySettings,
    });
    
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
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Campaign Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="general" className="text-xs">
              <Info className="w-3 h-3 mr-1.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="w-3 h-3 mr-1.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">
              <Users className="w-3 h-3 mr-1.5" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs">
              <Shield className="w-3 h-3 mr-1.5" />
              Security
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {/* General Tab */}
            <TabsContent value="general" className="mt-0 space-y-4">
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
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-md border border-primary/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        {startDate && isValid(parse(startDate, "yyyy-MM-dd", new Date())) 
                          ? format(parse(startDate, "yyyy-MM-dd", new Date()), "PPP") 
                          : <span>Pick a date</span>}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate && isValid(parse(startDate, "yyyy-MM-dd", new Date())) ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-md border border-primary/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        {endDate && isValid(parse(endDate, "yyyy-MM-dd", new Date())) 
                          ? format(parse(endDate, "yyyy-MM-dd", new Date()), "PPP") 
                          : <span>Pick a date</span>}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate && isValid(parse(endDate, "yyyy-MM-dd", new Date())) ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="mt-0 space-y-4">
              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Dashboard Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {THEMES.map((theme) => {
                    const ThemeIcon = theme.icon;
                    const isLocked = theme.supporterOnly && !isSupporter;
                    const isActive = themeId === theme.id;
                    
                    return (
                      <div
                        key={theme.id}
                        data-theme={theme.id}
                        onClick={() => !isLocked && setThemeId(theme.id)}
                        className={cn(
                          "relative rounded-md overflow-hidden border-2 transition-all cursor-pointer group",
                          isActive 
                            ? "border-primary ring-2 ring-primary/30" 
                            : "border-border hover:border-primary/50",
                          isLocked && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {/* Mini Preview Area */}
                        <div 
                          className="p-2 min-h-[60px]"
                          style={{ backgroundColor: `hsl(${theme.preview.background})` }}
                        >
                          {/* Mini card preview */}
                          <div 
                            className="rounded-sm p-1 mb-1"
                            style={{ 
                              backgroundColor: `hsl(${theme.preview.card})`,
                              border: `1px solid hsl(${theme.preview.border})`
                            }}
                          >
                            <div 
                              className="text-[7px] font-mono font-bold truncate"
                              style={{ color: `hsl(${theme.preview.primary})` }}
                            >
                              {theme.name}
                            </div>
                          </div>

                          {/* Color swatches */}
                          <div className="flex gap-0.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
                            />
                            <div 
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: `hsl(${theme.preview.secondary})` }}
                            />
                            <div 
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: `hsl(${theme.preview.accent})` }}
                            />
                          </div>
                        </div>

                        {/* Theme Info Footer */}
                        <div className="bg-card p-1.5 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <ThemeIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[9px] font-mono font-semibold uppercase text-foreground truncate">
                                {theme.name}
                              </span>
                            </div>
                            {isActive && (
                              <Check className="w-3 h-3 text-primary" />
                            )}
                            {isLocked && !isActive && (
                              <Lock className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!isSupporter && (
                  <p className="text-xs text-muted-foreground">
                    🔒 9 OS-inspired themes available with Supporter subscription
                  </p>
                )}
              </div>

              {/* Banner URL */}
              <LockedFeature isLocked={!isSupporter} featureName="Banner Image">
                <TerminalInput
                  label="Banner Image URL"
                  placeholder="https://example.com/banner.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </LockedFeature>

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

              <div className="pt-4 border-t border-border/30">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                  Campaign Console Display
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Toggle which information to show on the Campaign Console widget
                </p>
                <div className="grid grid-cols-2 gap-3">
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
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-0 space-y-4">
              <div className="p-3 bg-muted/30 border border-border/50 rounded">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Join Code</p>
                <p className="font-mono text-lg text-primary tracking-widest">{campaign?.join_code || "—"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with players to let them join your campaign.
                </p>
              </div>

              {hasExistingPassword && !password && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded">
                  <p className="text-xs text-primary uppercase tracking-wider">
                    🔒 Password protection is enabled
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a new password below to change it, or leave empty to keep the current password.
                  </p>
                </div>
              )}

              <TerminalInput
                label={hasExistingPassword ? "New Password (leave empty to keep current)" : "Campaign Password (Optional)"}
                type="password"
                placeholder={hasExistingPassword ? "Enter new password to change..." : "Leave empty for no password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground -mt-2">
                {password ? "Password will be securely hashed when saved." : "If set, players will need to enter this password when joining."}
              </p>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="mt-0">
              <PermissionsTab campaignId={campaignId} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t border-border mt-4">
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
      </DialogContent>
    </Dialog>
  );
}