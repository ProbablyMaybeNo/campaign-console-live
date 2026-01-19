import { useState, useMemo } from "react";
import { Search, Plus, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CampaignUnit } from "@/hooks/useWarbandBuilder";

interface UnitLibraryProps {
  units: CampaignUnit[];
  selectedFaction: string | null;
  onAddUnit: (unit: CampaignUnit) => void;
  isLoading?: boolean;
}

export function UnitLibrary({ 
  units, 
  selectedFaction, 
  onAddUnit,
  isLoading 
}: UnitLibraryProps) {
  const [search, setSearch] = useState("");
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set());

  // Filter units by search
  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const searchLower = search.toLowerCase();
    return units.filter(u => 
      u.name.toLowerCase().includes(searchLower) ||
      u.faction.toLowerCase().includes(searchLower) ||
      (u.keywords as string[])?.some(k => k.toLowerCase().includes(searchLower))
    );
  }, [units, search]);

  // Group units by faction
  const unitsByFaction = useMemo(() => {
    const grouped: Record<string, CampaignUnit[]> = {};
    filteredUnits.forEach(unit => {
      if (!grouped[unit.faction]) {
        grouped[unit.faction] = [];
      }
      grouped[unit.faction].push(unit);
    });
    return grouped;
  }, [filteredUnits]);

  const factionNames = Object.keys(unitsByFaction).sort();

  const toggleFaction = (faction: string) => {
    setExpandedFactions(prev => {
      const next = new Set(prev);
      if (next.has(faction)) {
        next.delete(faction);
      } else {
        next.add(faction);
      }
      return next;
    });
  };

  // Auto-expand selected faction
  if (selectedFaction && !expandedFactions.has(selectedFaction)) {
    setExpandedFactions(prev => new Set([...prev, selectedFaction]));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="animate-pulse mb-2">Loading units...</div>
        </div>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4">
        <Shield className="w-12 h-12 mb-4 opacity-50" />
        <div className="text-center">
          <p className="font-medium mb-1">No Units Available</p>
          <p className="text-sm">
            Import unit data from the Rules Library to start building your warband.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <TerminalInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search units..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Unit list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {factionNames.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No units match your search.
            </div>
          ) : (
            factionNames.map(faction => (
              <Collapsible
                key={faction}
                open={expandedFactions.has(faction)}
                onOpenChange={() => toggleFaction(faction)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded",
                      "text-left hover:bg-accent transition-colors",
                      selectedFaction === faction && "bg-primary/10 border-l-2 border-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {expandedFactions.has(faction) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{faction}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {unitsByFaction[faction].length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 pr-2 py-2 space-y-2">
                    {unitsByFaction[faction].map(unit => (
                      <UnitCard 
                        key={unit.id} 
                        unit={unit} 
                        onAdd={() => onAddUnit(unit)}
                        disabled={selectedFaction !== null && unit.faction !== selectedFaction}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface UnitCardProps {
  unit: CampaignUnit;
  onAdd: () => void;
  disabled?: boolean;
}

function UnitCard({ unit, onAdd, disabled }: UnitCardProps) {
  const stats = unit.stats as Record<string, unknown>;
  const keywords = (unit.keywords as string[]) || [];

  return (
    <TerminalCard className={cn(
      "p-3 transition-opacity",
      disabled && "opacity-50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{unit.name}</span>
            <Badge className="shrink-0">{unit.base_cost} pts</Badge>
          </div>
          
          {/* Stats preview */}
          {Object.keys(stats).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(stats).slice(0, 4).map(([key, value]) => (
                <span 
                  key={key} 
                  className="text-xs bg-muted px-1.5 py-0.5 rounded"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((kw, i) => (
                <span 
                  key={i}
                  className="text-xs text-muted-foreground"
                >
                  {kw}{i < Math.min(keywords.length, 3) - 1 && ","}
                </span>
              ))}
              {keywords.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{keywords.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <TerminalButton
          size="sm"
          variant="ghost"
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0"
        >
          <Plus className="w-4 h-4" />
        </TerminalButton>
      </div>
    </TerminalCard>
  );
}
