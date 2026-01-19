import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WarbandHeaderProps {
  campaignId: string;
  name: string;
  faction: string | null;
  subFaction: string | null;
  factions: string[];
  subFactions: string[];
  totalPoints: number;
  pointsLimit: number;
  pointsRemaining: number;
  isOverLimit: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isEditing: boolean;
  onNameChange: (name: string) => void;
  onFactionChange: (faction: string | null) => void;
  onSubFactionChange: (subFaction: string | null) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function WarbandHeader({
  campaignId,
  name,
  faction,
  subFaction,
  factions,
  subFactions,
  totalPoints,
  pointsLimit,
  pointsRemaining,
  isOverLimit,
  hasUnsavedChanges,
  isSaving,
  isEditing,
  onNameChange,
  onFactionChange,
  onSubFactionChange,
  onSave,
  onDelete,
}: WarbandHeaderProps) {
  return (
    <div className="border-b border-border bg-card p-4">
      {/* Top row: Back button + Actions */}
      <div className="flex items-center justify-between mb-4">
        <Link 
          to={`/campaign/${campaignId}?overlay=warbands`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Campaign</span>
        </Link>

        <div className="flex items-center gap-2">
          {isEditing && (
            <TerminalButton
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </TerminalButton>
          )}
          <TerminalButton
            onClick={onSave}
            disabled={isSaving || !name.trim()}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Saving..." : hasUnsavedChanges ? "Save*" : "Save"}
          </TerminalButton>
        </div>
      </div>

      {/* Main header content */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Warband name input */}
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            Warband Name
          </label>
          <TerminalInput
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter warband name..."
            className="text-lg font-medium"
          />
        </div>

        {/* Faction selector */}
        <div className="w-full lg:w-48">
          <label className="text-xs text-muted-foreground mb-1 block">
            Faction
          </label>
          <Select
            value={faction || ""}
            onValueChange={(v) => onFactionChange(v || null)}
          >
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Select faction..." />
            </SelectTrigger>
            <SelectContent>
              {factions.length === 0 ? (
                <SelectItem value="" disabled>
                  No factions available
                </SelectItem>
              ) : (
                factions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-faction selector */}
        {subFactions.length > 0 && (
          <div className="w-full lg:w-48">
            <label className="text-xs text-muted-foreground mb-1 block">
              Sub-Faction
            </label>
            <Select
              value={subFaction || ""}
              onValueChange={(v) => onSubFactionChange(v || null)}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Optional..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {subFactions.map((sf) => (
                  <SelectItem key={sf} value={sf}>
                    {sf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Points display */}
        <div className="flex items-center gap-3 p-3 bg-background border border-border rounded">
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              isOverLimit ? "text-destructive" : "text-primary"
            )}>
              {totalPoints}
            </div>
            <div className="text-xs text-muted-foreground">Used</div>
          </div>
          <div className="text-2xl text-muted-foreground">/</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {pointsLimit}
            </div>
            <div className="text-xs text-muted-foreground">Limit</div>
          </div>
          <Badge 
            variant={isOverLimit ? "destructive" : pointsRemaining < 50 ? "outline" : "secondary"}
            className="ml-2"
          >
            {isOverLimit ? `${Math.abs(pointsRemaining)} over` : `${pointsRemaining} left`}
          </Badge>
        </div>
      </div>
    </div>
  );
}
