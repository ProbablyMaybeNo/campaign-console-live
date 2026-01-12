import { useState, useMemo } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { PointsTracker } from "./PointsTracker";
import { RosterValidationPanel } from "./RosterValidationPanel";
import { RosterUnit, useUpdateWarband } from "@/hooks/useWarband";
import { CampaignUnit, useCampaignUnits } from "@/hooks/useCampaignUnits";
import { validateRoster } from "@/lib/rosterValidation";
import { Plus, Trash2, Eye, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarbandRosterProps {
  warbandId: string;
  campaignId: string;
  roster: RosterUnit[];
  pointsLimit: number;
  faction: string;
  subFaction: string | null;
  onAddUnit: () => void;
  onViewUnit: (unitId: string) => void;
  onEditUnit: (rosterIndex: number) => void;
}

export function WarbandRoster({
  warbandId,
  campaignId,
  roster,
  pointsLimit,
  faction,
  subFaction,
  onAddUnit,
  onViewUnit,
  onEditUnit,
}: WarbandRosterProps) {
  const { data: units } = useCampaignUnits(campaignId);
  const updateWarband = useUpdateWarband();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const totalPoints = roster.reduce((sum, unit) => sum + unit.total_cost, 0);

  // Validate roster
  const rosterValidation = useMemo(() => 
    validateRoster(roster, units || [], pointsLimit),
    [roster, units, pointsLimit]
  );

  const getUnitData = (unitId: string): CampaignUnit | undefined => {
    return units?.find(u => u.id === unitId);
  };

  const handleDeleteUnit = async (index: number) => {
    setDeletingIndex(index);
    
    const newRoster = roster.filter((_, i) => i !== index);
    
    try {
      await updateWarband.mutateAsync({
        id: warbandId,
        campaign_id: campaignId,
        roster: newRoster,
      });
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Points Tracker */}
      <div className="bg-card border border-primary/30 rounded p-4">
        <PointsTracker currentPoints={totalPoints} maxPoints={pointsLimit} />
      </div>

      {/* Roster Validation */}
      <RosterValidationPanel
        validation={rosterValidation}
        roster={roster}
        units={units || []}
      />

      {/* Roster Table */}
      <div className="bg-card border border-primary/30 rounded overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-wider text-muted-foreground font-mono">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Unit</div>
            <div className="col-span-3">Equipment</div>
            <div className="col-span-2 text-right">Cost</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-primary/10">
          {roster.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-sm">
                No units in roster
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Click "+ Add Unit" to begin building your warband
              </p>
            </div>
          ) : (
            roster.map((rosterUnit, index) => {
              const unitData = getUnitData(rosterUnit.unit_id);
              const isDeleting = deletingIndex === index;

              return (
                <div 
                  key={`${rosterUnit.unit_id}-${index}`}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-4 py-3 items-center",
                    "hover:bg-primary/5 transition-colors",
                    isDeleting && "opacity-50"
                  )}
                >
                  {/* Index */}
                  <div className="col-span-1 text-muted-foreground font-mono text-sm">
                    {index + 1}
                  </div>

                  {/* Unit Name */}
                  <div className="col-span-4">
                    <p className="font-mono text-foreground">
                      {rosterUnit.custom_name || rosterUnit.unit_name}
                    </p>
                    {rosterUnit.custom_name && (
                      <p className="text-xs text-muted-foreground">
                        {rosterUnit.unit_name}
                      </p>
                    )}
                  </div>

                  {/* Equipment */}
                  <div className="col-span-3">
                    {rosterUnit.equipment.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rosterUnit.equipment.map((eq, i) => (
                          <span 
                            key={i}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Cost */}
                  <div className="col-span-2 text-right">
                    <span className="font-mono font-bold text-primary">
                      {rosterUnit.total_cost}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">pts</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end gap-1">
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewUnit(rosterUnit.unit_id)}
                      title="View Datasheet"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </TerminalButton>
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditUnit(index)}
                      title="Edit Equipment"
                      className="h-8 w-8 p-0"
                    >
                      <Wrench className="w-4 h-4" />
                    </TerminalButton>
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUnit(index)}
                      disabled={isDeleting}
                      title="Remove Unit"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </TerminalButton>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Unit Footer */}
        <div className="border-t border-primary/30 p-4">
          <TerminalButton
            onClick={onAddUnit}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </TerminalButton>
        </div>
      </div>

      {/* Summary Footer */}
      {roster.length > 0 && (
        <div className="bg-card border border-primary/30 rounded p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-mono text-sm">
              {roster.length} unit{roster.length !== 1 ? "s" : ""} in roster
            </span>
            <span className="font-mono">
              <span className="text-muted-foreground">Total: </span>
              <span className="text-primary font-bold">{totalPoints}</span>
              <span className="text-muted-foreground"> / {pointsLimit} pts</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
