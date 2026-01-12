import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampaignUnit, useUnitsBySubFaction } from "@/hooks/useCampaignUnits";
import { RosterUnit } from "@/hooks/useWarband";
import { Search, Plus, Eye, Shield, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddUnitOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  faction: string;
  subFaction: string | null;
  onAddUnit: (rosterUnit: RosterUnit) => void;
  onViewUnit: (unit: CampaignUnit) => void;
}

export function AddUnitOverlay({
  open,
  onOpenChange,
  campaignId,
  faction,
  subFaction,
  onAddUnit,
  onViewUnit,
}: AddUnitOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const availableUnits = useUnitsBySubFaction(campaignId, faction, subFaction || undefined);

  const filteredUnits = availableUnits.filter(unit =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddUnit = (unit: CampaignUnit) => {
    const rosterUnit: RosterUnit = {
      unit_id: unit.id,
      unit_name: unit.name,
      base_cost: unit.base_cost,
      equipment: [],
      total_cost: unit.base_cost,
    };
    onAddUnit(rosterUnit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/50 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Select Unit
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {faction}{subFaction ? ` • ${subFaction}` : ""}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <TerminalInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search units..."
            className="pl-10"
          />
        </div>

        {/* Unit List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {filteredUnits.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground font-mono">
                {searchQuery ? "No matching units found" : "No units available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onAdd={() => handleAddUnit(unit)}
                  onView={() => onViewUnit(unit)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 border-t border-primary/20">
          <TerminalButton 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            [ Close ]
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnitCardProps {
  unit: CampaignUnit;
  onAdd: () => void;
  onView: () => void;
}

function UnitCard({ unit, onAdd, onView }: UnitCardProps) {
  return (
    <div className={cn(
      "border border-primary/20 rounded p-4",
      "hover:border-primary/40 transition-colors",
      "bg-background/50"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Unit Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-mono font-bold text-foreground truncate">
              {unit.name}
            </h3>
            {unit.sub_faction && (
              <span className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded">
                {unit.sub_faction}
              </span>
            )}
          </div>

          {/* Keywords */}
          {unit.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {unit.keywords.slice(0, 4).map((keyword, i) => (
                <span 
                  key={i}
                  className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded"
                >
                  {keyword}
                </span>
              ))}
              {unit.keywords.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{unit.keywords.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {unit.stats.move && (
              <span>Move: {unit.stats.move}</span>
            )}
            {unit.stats.fight && (
              <span>Fight: {unit.stats.fight}+</span>
            )}
            {unit.abilities.length > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {unit.abilities.length} abilities
              </span>
            )}
          </div>
        </div>

        {/* Cost & Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-primary">
            <Coins className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{unit.base_cost}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>

          <div className="flex gap-1">
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={onView}
              title="View Datasheet"
            >
              <Eye className="w-4 h-4" />
            </TerminalButton>
            <TerminalButton
              size="sm"
              onClick={onAdd}
              title="Add to Roster"
            >
              <Plus className="w-4 h-4" />
            </TerminalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
