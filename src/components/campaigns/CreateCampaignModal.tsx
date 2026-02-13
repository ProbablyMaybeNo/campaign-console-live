import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCreateCampaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useEntitlements } from "@/hooks/useEntitlements";
import { getConsoleSpawnPosition } from "@/lib/canvasPlacement";
import { ChevronDown, ChevronRight, CalendarIcon } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { CampaignLimitModal } from "./CampaignLimitModal";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
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

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("1000");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [totalRounds, setTotalRounds] = useState("10");
  const [roundLength, setRoundLength] = useState("weekly");
  const [password, setPassword] = useState("");
  const [gameSystem, setGameSystem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(true); // true = active
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const createComponent = useCreateComponent();
  const { entitlements, canCreateCampaign, refetch: refetchEntitlements } = useEntitlements();

  // Check limit when modal opens
  useEffect(() => {
    if (open && !canCreateCampaign) {
      setShowLimitModal(true);
    }
  }, [open, canCreateCampaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check limit before submitting
    if (!canCreateCampaign) {
      setShowLimitModal(true);
      return;
    }
    
    const campaign = await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
      max_players: parseInt(maxPlayers) || 8,
      total_rounds: parseInt(totalRounds) || 10,
      round_length: roundLength,
      password: password || undefined,
      game_system: gameSystem || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: status ? "active" : "inactive",
      title_color: titleColor,
      border_color: borderColor,
      display_settings: displaySettings,
    });
    
    // Campaign Console dimensions
    const CONSOLE_WIDTH = 560;
    const CONSOLE_HEIGHT = 280;

    // Spawn at top-center of canvas
    const { position_x, position_y } = getConsoleSpawnPosition(CONSOLE_WIDTH, CONSOLE_HEIGHT);

    // Auto-create the Campaign Console widget at the canvas center
    await createComponent.mutateAsync({
      campaign_id: campaign.id,
      name: "Campaign Console",
      component_type: "campaign-console",
      data_source: "campaign",
      config: {},
      position_x,
      position_y,
      width: CONSOLE_WIDTH,
      height: CONSOLE_HEIGHT,
    });
    
    resetForm();
    onClose();
    // Navigate with ?new=1 to trigger getting started guide
    navigate(`/campaign/${campaign.id}?new=1`);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsLimit("1000");
    setMaxPlayers("8");
    setTotalRounds("10");
    setRoundLength("weekly");
    setPassword("");
    setGameSystem("");
    setStartDate("");
    setEndDate("");
    setStatus(true);
    setTitleColor("#22c55e");
    setBorderColor("#22c55e");
    setDisplaySettings({
      showId: true,
      showPoints: true,
      showPlayers: true,
      showRound: true,
      showDates: true,
      showStatus: true,
      showGameSystem: true,
    });
    setShowAdvanced(false);
    setShowDisplaySettings(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleDisplaySetting = (key: keyof DisplaySettings) => {
    setDisplaySettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="create-campaign-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-primary uppercase tracking-widest text-sm">
              [Create New Campaign]
            </DialogTitle>
            <HelpButton variant="icon" />
          </div>
          <DialogDescription className="sr-only">
            Create a new campaign with name, description, and optional settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Fields */}
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
              className="flex w-full bg-input border border-border p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 min-h-[60px] resize-none"
              placeholder="Describe your campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TerminalInput
              label="Points Limit"
              type="number"
              placeholder="1000"
              value={pointsLimit}
              onChange={(e) => setPointsLimit(e.target.value)}
            />
            <TerminalInput
              label="Max Players"
              type="number"
              placeholder="8"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TerminalInput
              label="Number of Rounds"
              type="number"
              placeholder="10"
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
                    {startDate ? format(parse(startDate, "yyyy-MM-dd", new Date()), "PPP") : <span>Pick a date</span>}
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
                    {endDate ? format(parse(endDate, "yyyy-MM-dd", new Date()), "PPP") : <span>Pick a date</span>}
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

          {/* Advanced Settings Collapsible */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Advanced Settings
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

          {/* Display Settings Collapsible */}
          <Collapsible open={showDisplaySettings} onOpenChange={setShowDisplaySettings}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {showDisplaySettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Display Settings
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
                      checked={displaySettings[item.key as keyof DisplaySettings]}
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

          <p className="text-xs text-muted-foreground">
            A unique Campaign ID will be auto-generated for players to join.
          </p>

          {/* Support Button - hidden for now */}
          {/* <Link
            to="/settings?tab=billing"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded border border-[hsl(200,100%,70%)] bg-transparent font-mono text-sm font-medium uppercase tracking-wider transition-all hover:bg-[hsl(200,100%,70%)]/10"
            style={{
              color: 'hsl(200, 100%, 70%)',
              boxShadow: '0 0 15px hsl(200 100% 60% / 0.3), 0 0 30px hsl(200 100% 50% / 0.15)',
              textShadow: '0 0 10px hsl(200 100% 60% / 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="w-4 h-4" />
            Support Campaign Console
          </Link> */}

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

      {/* Campaign Limit Modal */}
      <CampaignLimitModal
        open={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          if (!canCreateCampaign) {
            handleClose();
          }
        }}
        activeCampaignCount={entitlements.active_campaign_count}
        maxCampaigns={entitlements.max_active_campaigns}
      />
    </Dialog>
  );
}
