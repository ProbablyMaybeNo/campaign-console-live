import { Trash2, Minus, Plus, Swords, Info } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RosterUnit } from "@/hooks/useWarbandBuilder";

interface RosterPanelProps {
  roster: RosterUnit[];
  onRemoveUnit: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export function RosterPanel({
  roster,
  onRemoveUnit,
  onUpdateQuantity,
}: RosterPanelProps) {
  if (roster.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4">
        <Swords className="w-12 h-12 mb-4 opacity-50" />
        <div className="text-center">
          <p className="font-medium mb-1">No Units in Roster</p>
          <p className="text-sm">
            Add units from the library on the left to build your warband.
          </p>
        </div>
      </div>
    );
  }

  // Group roster by unit name for display
  const totalUnitCount = roster.reduce((sum, u) => sum + u.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="text-sm font-medium">
          Your Roster
        </div>
        <Badge variant="outline">
          {totalUnitCount} {totalUnitCount === 1 ? "model" : "models"}
        </Badge>
      </div>

      {/* Roster list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {roster.map((unit) => (
            <RosterUnitCard
              key={unit.id}
              unit={unit}
              onRemove={() => onRemoveUnit(unit.id)}
              onQuantityChange={(qty) => onUpdateQuantity(unit.id, qty)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface RosterUnitCardProps {
  unit: RosterUnit;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
}

function RosterUnitCard({ unit, onRemove, onQuantityChange }: RosterUnitCardProps) {
  const totalCost = unit.cost * unit.quantity;

  return (
    <TerminalCard className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{unit.name}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Stats:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(unit.stats).map(([key, value]) => (
                        <span 
                          key={key}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {unit.abilities.length > 0 && (
                    <div>
                      <span className="font-medium">Abilities:</span>
                      <div className="text-xs mt-1">
                        {unit.abilities.join(", ")}
                      </div>
                    </div>
                  )}
                  {unit.keywords.length > 0 && (
                    <div>
                      <span className="font-medium">Keywords:</span>
                      <div className="text-xs mt-1">
                        {unit.keywords.join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Cost breakdown */}
          <div className="text-sm text-muted-foreground">
            {unit.cost} pts × {unit.quantity} = <span className="text-primary font-medium">{totalCost} pts</span>
          </div>

          {/* Equipment if any */}
          {unit.equipment.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {unit.equipment.map((eq, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {eq}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Quantity controls */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <TerminalButton
              size="sm"
              variant="ghost"
              onClick={() => onQuantityChange(unit.quantity - 1)}
              disabled={unit.quantity <= 1}
              className="h-7 w-7 p-0"
            >
              <Minus className="w-3 h-3" />
            </TerminalButton>
            <span className="w-6 text-center font-medium">
              {unit.quantity}
            </span>
            <TerminalButton
              size="sm"
              variant="ghost"
              onClick={() => onQuantityChange(unit.quantity + 1)}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3 h-3" />
            </TerminalButton>
          </div>
          
          <TerminalButton
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-destructive hover:text-destructive h-7 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove
          </TerminalButton>
        </div>
      </div>
    </TerminalCard>
  );
}
