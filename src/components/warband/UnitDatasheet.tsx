import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampaignUnit } from "@/hooks/useCampaignUnits";
import { Shield, Zap, Coins, Wrench, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitDatasheetProps {
  unit: CampaignUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDatasheet({ unit, open, onOpenChange }: UnitDatasheetProps) {
  if (!unit) return null;

  const statsEntries = Object.entries(unit.stats).filter(([_, value]) => value !== undefined && value !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/50 max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-primary font-mono uppercase tracking-wider text-xl">
                  {unit.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {unit.faction}{unit.sub_faction ? ` • ${unit.sub_faction}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 text-primary bg-primary/10 px-3 py-2 rounded">
                <Coins className="w-4 h-4" />
                <span className="font-mono font-bold text-xl">{unit.base_cost}</span>
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Keywords */}
            {unit.keywords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  Keywords
                </div>
                <div className="flex flex-wrap gap-1">
                  {unit.keywords.map((keyword, i) => (
                    <span 
                      key={i}
                      className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-1 rounded font-mono"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Table */}
            {statsEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Statistics
                </div>
                <div className="border border-primary/30 rounded overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-primary/20">
                    {statsEntries.map(([key, value]) => (
                      <div key={key} className="px-3 py-2 bg-background/50">
                        <p className="text-xs uppercase text-muted-foreground">{formatStatKey(key)}</p>
                        <p className="font-mono font-bold text-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Abilities */}
            {unit.abilities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  Abilities
                </div>
                <div className="space-y-2">
                  {unit.abilities.map((ability, i) => (
                    <div 
                      key={i} 
                      className="border border-primary/20 rounded p-3 bg-background/50"
                    >
                      <p className="font-mono font-bold text-primary text-sm">
                        {ability.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ability.effect}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Options */}
            {unit.equipment_options.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Wrench className="w-4 h-4" />
                  Equipment Options
                </div>
                <div className="border border-primary/30 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-primary/30">
                        <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground font-mono">
                          Equipment
                        </th>
                        <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground font-mono">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {unit.equipment_options.map((eq, i) => (
                        <tr key={i} className="hover:bg-primary/5">
                          <td className="px-3 py-2">
                            <span className="font-mono">{eq.name}</span>
                            {eq.replaces && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (replaces {eq.replaces})
                              </span>
                            )}
                            {eq.requires && eq.requires.length > 0 && (
                              <span className="text-xs text-yellow-500 ml-2">
                                (requires {eq.requires.join(", ")})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={cn(
                              "font-mono",
                              eq.cost > 0 && "text-primary",
                              eq.cost === 0 && "text-muted-foreground",
                              eq.cost < 0 && "text-green-500"
                            )}>
                              {eq.cost > 0 ? `+${eq.cost}` : eq.cost === 0 ? "Free" : eq.cost}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-primary/30 p-4">
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

function formatStatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
