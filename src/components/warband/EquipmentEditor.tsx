import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { CampaignUnit, EquipmentOption } from "@/hooks/useCampaignUnits";
import { RosterUnit } from "@/hooks/useWarband";
import { 
  getEquipmentWithValidation, 
  validateLoadout,
  calculateEquipmentCost,
  getDependentEquipment,
  ValidationResult 
} from "@/lib/equipmentValidation";
import { 
  Wrench, 
  Check, 
  X, 
  AlertTriangle, 
  Lock,
  Unlock,
  ArrowRight,
  Coins,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EquipmentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: CampaignUnit;
  rosterUnit: RosterUnit;
  onSave: (updatedUnit: RosterUnit) => void;
}

export function EquipmentEditor({
  open,
  onOpenChange,
  unit,
  rosterUnit,
  onSave,
}: EquipmentEditorProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");

  // Initialize state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEquipment([...rosterUnit.equipment]);
      setCustomName(rosterUnit.custom_name || "");
    }
  }, [open, rosterUnit]);

  // Get equipment with validation status
  const equipmentWithValidation = useMemo(() => 
    getEquipmentWithValidation(selectedEquipment, unit.equipment_options),
    [selectedEquipment, unit.equipment_options]
  );

  // Validate current loadout
  const loadoutValidation = useMemo(() => 
    validateLoadout(selectedEquipment, unit.equipment_options),
    [selectedEquipment, unit.equipment_options]
  );

  // Calculate costs
  const equipmentCost = useMemo(() => 
    calculateEquipmentCost(selectedEquipment, unit.equipment_options),
    [selectedEquipment, unit.equipment_options]
  );

  const totalCost = unit.base_cost + equipmentCost;

  // Toggle equipment selection
  const toggleEquipment = (equipmentName: string) => {
    const isSelected = selectedEquipment.includes(equipmentName);
    
    if (isSelected) {
      // Check for dependent equipment
      const dependents = getDependentEquipment(equipmentName, selectedEquipment, unit.equipment_options);
      if (dependents.length > 0) {
        // Remove dependents too
        setSelectedEquipment(prev => 
          prev.filter(eq => eq !== equipmentName && !dependents.includes(eq))
        );
        toast.info(`Also removed: ${dependents.join(", ")}`);
      } else {
        setSelectedEquipment(prev => prev.filter(eq => eq !== equipmentName));
      }
    } else {
      // Check if can be added
      const validation = equipmentWithValidation.find(e => e.name === equipmentName);
      if (validation?.canSelect) {
        setSelectedEquipment(prev => [...prev, equipmentName]);
      }
    }
  };

  // Save changes
  const handleSave = () => {
    if (!loadoutValidation.isValid) {
      toast.error("Cannot save invalid loadout");
      return;
    }

    const updatedUnit: RosterUnit = {
      ...rosterUnit,
      custom_name: customName.trim() || undefined,
      equipment: selectedEquipment,
      total_cost: totalCost,
    };

    onSave(updatedUnit);
    onOpenChange(false);
  };

  // Group equipment by "replaces" for better organization
  const groupedEquipment = useMemo(() => {
    const groups: Record<string, EquipmentOption[]> = {
      "Standard Equipment": [],
      "Weapon Options": [],
      "Armor & Protection": [],
      "Other Upgrades": [],
    };

    unit.equipment_options.forEach(option => {
      if (option.replaces) {
        groups["Weapon Options"].push(option);
      } else if (option.name.toLowerCase().includes("armour") || 
                 option.name.toLowerCase().includes("armor") ||
                 option.name.toLowerCase().includes("shield")) {
        groups["Armor & Protection"].push(option);
      } else if (option.cost === 0) {
        groups["Standard Equipment"].push(option);
      } else {
        groups["Other Upgrades"].push(option);
      }
    });

    // Filter out empty groups
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [unit.equipment_options]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/50 max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Edit Equipment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{unit.name}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Custom Name */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground font-mono">
                Custom Name (Optional)
              </label>
              <TerminalInput
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={unit.name}
              />
            </div>

            {/* Validation Errors */}
            {!loadoutValidation.isValid && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-mono text-destructive">Invalid Loadout</p>
                    <ul className="text-xs text-destructive/80 mt-1 space-y-1">
                      {loadoutValidation.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {loadoutValidation.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <ul className="text-xs text-yellow-600 space-y-1">
                    {loadoutValidation.warnings.map((warn, i) => (
                      <li key={i}>• {warn}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Equipment Options */}
            {unit.equipment_options.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground font-mono text-sm">
                  No equipment options available
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedEquipment.map(([groupName, options]) => (
                  <div key={groupName} className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      {groupName}
                    </h4>
                    <div className="space-y-1">
                      {options.map((option) => {
                        const validation = equipmentWithValidation.find(e => e.name === option.name);
                        const isSelected = validation?.isSelected || false;
                        const canSelect = validation?.canSelect || false;
                        const reason = validation?.reason;

                        return (
                          <button
                            key={option.name}
                            onClick={() => toggleEquipment(option.name)}
                            disabled={!isSelected && !canSelect}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded border transition-all text-left",
                              isSelected 
                                ? "border-primary bg-primary/10" 
                                : canSelect
                                  ? "border-border hover:border-primary/50 hover:bg-primary/5"
                                  : "border-border/50 opacity-50 cursor-not-allowed"
                            )}
                          >
                            {/* Selection indicator */}
                            <div className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                              isSelected 
                                ? "border-primary bg-primary text-primary-foreground" 
                                : canSelect
                                  ? "border-muted-foreground"
                                  : "border-muted-foreground/30"
                            )}>
                              {isSelected && <Check className="w-3 h-3" />}
                              {!isSelected && !canSelect && <Lock className="w-3 h-3" />}
                            </div>

                            {/* Equipment info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-mono text-sm",
                                  isSelected ? "text-foreground" : "text-foreground/70"
                                )}>
                                  {option.name}
                                </span>
                                {option.replaces && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" />
                                    replaces {option.replaces}
                                  </span>
                                )}
                              </div>
                              
                              {/* Constraints */}
                              {(option.requires || option.excludes || reason) && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {reason && !isSelected && (
                                    <span className="text-destructive/70">{reason}</span>
                                  )}
                                  {!reason && option.requires && option.requires.length > 0 && (
                                    <span className="text-yellow-600">
                                      Requires: {option.requires.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Cost */}
                            <div className={cn(
                              "flex items-center gap-1 flex-shrink-0",
                              option.cost > 0 ? "text-primary" : "text-muted-foreground"
                            )}>
                              {option.cost > 0 ? (
                                <>
                                  <span className="font-mono text-sm">+{option.cost}</span>
                                  <Coins className="w-3 h-3" />
                                </>
                              ) : (
                                <span className="text-xs">Free</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 border-t border-primary/20 space-y-3">
          {/* Cost Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-mono">Total Cost</span>
            <div className="font-mono">
              <span className="text-muted-foreground">{unit.base_cost}</span>
              {equipmentCost > 0 && (
                <>
                  <span className="text-muted-foreground"> + </span>
                  <span className="text-primary">{equipmentCost}</span>
                </>
              )}
              <span className="text-muted-foreground"> = </span>
              <span className="text-primary font-bold">{totalCost}</span>
              <span className="text-muted-foreground text-xs ml-1">pts</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <TerminalButton
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              [ Cancel ]
            </TerminalButton>
            <TerminalButton
              onClick={handleSave}
              disabled={!loadoutValidation.isValid}
              className="flex-1"
            >
              [ Save Equipment ]
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
