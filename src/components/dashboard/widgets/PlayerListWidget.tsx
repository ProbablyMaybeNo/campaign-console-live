import { useMemo, useState } from "react";
import { useAllPlayerSettings, PlayerSettings } from "@/hooks/usePlayerSettings";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Users, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateComponent } from "@/hooks/useDashboardComponents";

interface PlayerListWidgetProps {
  component: {
    id: string;
    campaign_id: string;
    config: unknown;
  };
  isGM: boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
}

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "faction", label: "Faction" },
  { key: "sub_faction", label: "Sub-Faction" },
  { key: "current_points", label: "Points/Gold" },
  { key: "warband_link", label: "Warband Link" },
  { key: "additional_info", label: "Additional Info" },
];

export function PlayerListWidget({ component, isGM }: PlayerListWidgetProps) {
  const { data: players, isLoading } = useAllPlayerSettings(component.campaign_id);
  const updateComponent = useUpdateComponent();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get enabled columns from config, default to name and faction
  const enabledColumns: string[] = useMemo(() => {
    const cfg = component.config as Record<string, unknown> | null;
    const configColumns = cfg?.columns;
    if (Array.isArray(configColumns) && configColumns.length > 0) {
      return configColumns as string[];
    }
    return ["name", "faction", "current_points"];
  }, [component.config]);

  const columns = useMemo(() => {
    return ALL_COLUMNS.map((col) => ({
      ...col,
      enabled: enabledColumns.includes(col.key),
    }));
  }, [enabledColumns]);

  const visibleColumns = columns.filter((c) => c.enabled);

  const handleToggleColumn = async (columnKey: string) => {
    const newColumns = enabledColumns.includes(columnKey)
      ? enabledColumns.filter((c) => c !== columnKey)
      : [...enabledColumns, columnKey];

    // Keep at least one column
    if (newColumns.length === 0) return;
    
    const existingConfig = (component.config as Record<string, unknown>) || {};

    await updateComponent.mutateAsync({
      id: component.id,
      config: {
        ...existingConfig,
        columns: newColumns,
      },
    });
  };

  const getCellValue = (player: PlayerSettings & { profile_display_name: string | null }, columnKey: string): React.ReactNode => {
    switch (columnKey) {
      case "name":
        return player.player_name || player.profile_display_name || "—";
      case "faction":
        return player.faction || "—";
      case "sub_faction":
        return player.sub_faction || "—";
      case "current_points":
        return player.current_points != null ? player.current_points.toLocaleString() : "—";
      case "warband_link":
        if (!player.warband_link) return "—";
        return (
          <a
            href={player.warband_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        );
      case "additional_info":
        if (!player.additional_info) return "—";
        const truncated = player.additional_info.length > 50 
          ? player.additional_info.slice(0, 50) + "..." 
          : player.additional_info;
        return (
          <span className="text-muted-foreground" title={player.additional_info}>
            {truncated}
          </span>
        );
      default:
        return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <TerminalLoader text="Loading players..." />
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Users className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs font-mono">No players in campaign</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with settings */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-wider">
            Player List
          </span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {players.length}
          </span>
        </div>

        {isGM && (
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Visible Columns
                </h4>
                <div className="space-y-2">
                  {ALL_COLUMNS.map((col) => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col.key}`}
                        checked={enabledColumns.includes(col.key)}
                        onCheckedChange={() => handleToggleColumn(col.key)}
                        disabled={enabledColumns.length === 1 && enabledColumns.includes(col.key)}
                      />
                      <Label
                        htmlFor={`col-${col.key}`}
                        className="text-sm font-mono cursor-pointer"
                      >
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className="font-mono text-xs uppercase">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.id}>
                {visibleColumns.map((col) => (
                  <TableCell key={col.key} className="font-mono text-sm">
                    {getCellValue(player, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
