import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Download, Loader2, FileJson, Check } from "lucide-react";
import { toast } from "sonner";

interface CampaignExportModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

interface ExportOptions {
  campaign: boolean;
  players: boolean;
  components: boolean;
  rules: boolean;
  warbands: boolean;
  messages: boolean;
  narrative: boolean;
  schedule: boolean;
  map: boolean;
}

export function CampaignExportModal({ open, onClose, campaignId }: CampaignExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    campaign: true,
    players: true,
    components: true,
    rules: true,
    warbands: true,
    messages: false,
    narrative: true,
    schedule: true,
    map: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleToggle = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      // Campaign metadata
      if (options.campaign) {
        const { data } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaignId)
          .single();
        exportData.campaign = data;
      }

      // Players
      if (options.players) {
        const { data } = await supabase
          .from("campaign_players")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.players = data;
      }

      // Dashboard components
      if (options.components) {
        const { data } = await supabase
          .from("dashboard_components")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.components = data;
      }

      // Rules
      if (options.rules) {
        const { data } = await supabase
          .from("wargame_rules")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.rules = data;
      }

      // Warbands
      if (options.warbands) {
        const { data } = await supabase
          .from("warbands")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.warbands = data;
      }

      // Messages
      if (options.messages) {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true });
        exportData.messages = data;
      }

      // Narrative events
      if (options.narrative) {
        const { data } = await supabase
          .from("narrative_events")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.narrativeEvents = data;

        const { data: playerNarratives } = await supabase
          .from("player_narrative_entries")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.playerNarratives = playerNarratives;
      }

      // Schedule
      if (options.schedule) {
        const { data } = await supabase
          .from("schedule_entries")
          .select("*")
          .eq("campaign_id", campaignId);
        exportData.schedule = data;
      }

      // Map data
      if (options.map) {
        const { data: mapData } = await supabase
          .from("campaign_maps")
          .select("*")
          .eq("campaign_id", campaignId)
          .single();
        
        if (mapData) {
          exportData.map = mapData;

          const { data: markers } = await supabase
            .from("map_markers")
            .select("*")
            .eq("map_id", mapData.id);
          exportData.mapMarkers = markers;

          const { data: legendItems } = await supabase
            .from("map_legend_items")
            .select("*")
            .eq("map_id", mapData.id);
          exportData.mapLegend = legendItems;
        }
      }

      // Generate and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const campaignName = campaign?.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "campaign";
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `${campaignName}_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      toast.success("Campaign data exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export campaign data");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = Object.values(options).filter(Boolean).length;

  const exportOptions: { key: keyof ExportOptions; label: string; description: string }[] = [
    { key: "campaign", label: "Campaign Settings", description: "Name, description, game system, dates" },
    { key: "players", label: "Players", description: "Player list, factions, points" },
    { key: "components", label: "Dashboard Widgets", description: "All widget configurations and positions" },
    { key: "rules", label: "Campaign Rules", description: "Custom rules and reference tables" },
    { key: "warbands", label: "Warbands", description: "Player warbands and rosters" },
    { key: "narrative", label: "Narrative Content", description: "Story events and player narratives" },
    { key: "schedule", label: "Schedule", description: "Rounds and scheduled events" },
    { key: "map", label: "Map Data", description: "Map markers and legend items" },
    { key: "messages", label: "Messages", description: "All campaign messages (may be large)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-[hsl(142,76%,65%)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-[hsl(142,76%,50%)]">
            <FileJson className="w-5 h-5" />
            Export Campaign Data
          </DialogTitle>
          <DialogDescription>
            Select what data to include in your backup file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
          {exportOptions.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={key}
                checked={options[key]}
                onCheckedChange={() => handleToggle(key)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="text-xs text-muted-foreground mr-auto">
            {selectedCount} section{selectedCount !== 1 ? "s" : ""} selected
          </div>
          <TerminalButton variant="outline" onClick={onClose}>
            Cancel
          </TerminalButton>
          <TerminalButton
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <Check className="w-4 h-4" />
                Exported
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export JSON
              </>
            )}
          </TerminalButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
