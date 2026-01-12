import { useState } from "react";
import { CampaignUnit, UnitStats, EquipmentOption, useUpdateCampaignUnit, useDeleteCampaignUnit } from "@/hooks/useCampaignUnits";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  Save, 
  X, 
  Trash2, 
  Plus, 
  Minus,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UnitEditorProps {
  unit: CampaignUnit;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function UnitEditor({ unit, isExpanded, onToggleExpand }: UnitEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUnit, setEditedUnit] = useState<Partial<CampaignUnit>>({});
  
  const updateMutation = useUpdateCampaignUnit();
  const deleteMutation = useDeleteCampaignUnit();

  const startEditing = () => {
    setEditedUnit({
      name: unit.name,
      base_cost: unit.base_cost,
      faction: unit.faction,
      sub_faction: unit.sub_faction,
      stats: { ...unit.stats },
      abilities: [...unit.abilities],
      equipment_options: [...unit.equipment_options],
      keywords: [...unit.keywords],
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedUnit({});
    setIsEditing(false);
  };

  const saveChanges = async () => {
    await updateMutation.mutateAsync({
      id: unit.id,
      campaign_id: unit.campaign_id,
      ...editedUnit,
    });
    setIsEditing(false);
    setEditedUnit({});
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: unit.id, campaignId: unit.campaign_id });
  };

  const updateStat = (key: string, value: string) => {
    setEditedUnit(prev => ({
      ...prev,
      stats: {
        ...(prev.stats || {}),
        [key]: value,
      },
    }));
  };

  const addStat = () => {
    const newKey = `stat_${Date.now()}`;
    setEditedUnit(prev => ({
      ...prev,
      stats: {
        ...(prev.stats || {}),
        [newKey]: "",
      },
    }));
  };

  const removeStat = (key: string) => {
    setEditedUnit(prev => {
      const newStats = { ...(prev.stats || {}) };
      delete newStats[key];
      return { ...prev, stats: newStats };
    });
  };

  const updateAbility = (index: number, field: "name" | "effect", value: string) => {
    setEditedUnit(prev => {
      const abilities = [...(prev.abilities || [])];
      abilities[index] = { ...abilities[index], [field]: value };
      return { ...prev, abilities };
    });
  };

  const addAbility = () => {
    setEditedUnit(prev => ({
      ...prev,
      abilities: [...(prev.abilities || []), { name: "", effect: "" }],
    }));
  };

  const removeAbility = (index: number) => {
    setEditedUnit(prev => ({
      ...prev,
      abilities: (prev.abilities || []).filter((_, i) => i !== index),
    }));
  };

  const updateEquipment = (index: number, field: keyof EquipmentOption, value: string | number | string[]) => {
    setEditedUnit(prev => {
      const equipment = [...(prev.equipment_options || [])];
      equipment[index] = { ...equipment[index], [field]: value };
      return { ...prev, equipment_options: equipment };
    });
  };

  const addEquipment = () => {
    setEditedUnit(prev => ({
      ...prev,
      equipment_options: [...(prev.equipment_options || []), { name: "", cost: 0 }],
    }));
  };

  const removeEquipment = (index: number) => {
    setEditedUnit(prev => ({
      ...prev,
      equipment_options: (prev.equipment_options || []).filter((_, i) => i !== index),
    }));
  };

  const updateKeywords = (value: string) => {
    setEditedUnit(prev => ({
      ...prev,
      keywords: value.split(",").map(k => k.trim()).filter(k => k),
    }));
  };

  const currentStats = isEditing ? (editedUnit.stats || {}) : unit.stats;
  const currentAbilities = isEditing ? (editedUnit.abilities || []) : unit.abilities;
  const currentEquipment = isEditing ? (editedUnit.equipment_options || []) : unit.equipment_options;
  const currentKeywords = isEditing ? (editedUnit.keywords || []) : unit.keywords;

  return (
    <div className="px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={onToggleExpand}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-primary shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              {isEditing ? (
                <input
                  type="text"
                  value={editedUnit.name || ""}
                  onChange={(e) => setEditedUnit(prev => ({ ...prev, name: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-sm text-foreground bg-input border border-border px-2 py-0.5 w-40"
                />
              ) : (
                <h4 className="font-mono text-sm text-foreground">{unit.name}</h4>
              )}
            </button>
            
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editedUnit.base_cost || 0}
                  onChange={(e) => setEditedUnit(prev => ({ ...prev, base_cost: parseInt(e.target.value) || 0 }))}
                  className="w-16 text-xs text-secondary font-mono bg-input border border-border px-1 py-0.5"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            ) : (
              <span className="text-xs text-secondary font-mono">{unit.base_cost} pts</span>
            )}
          </div>

          {unit.sub_faction && !isEditing && (
            <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">{unit.sub_faction}</p>
          )}

          {isEditing && (
            <div className="flex gap-2 mt-2 ml-4">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase">Faction</label>
                <input
                  type="text"
                  value={editedUnit.faction || ""}
                  onChange={(e) => setEditedUnit(prev => ({ ...prev, faction: e.target.value }))}
                  className="w-full text-xs font-mono bg-input border border-border px-2 py-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase">Sub-Faction</label>
                <input
                  type="text"
                  value={editedUnit.sub_faction || ""}
                  onChange={(e) => setEditedUnit(prev => ({ ...prev, sub_faction: e.target.value || null }))}
                  className="w-full text-xs font-mono bg-input border border-border px-2 py-1"
                />
              </div>
            </div>
          )}

          {/* Expandable Content */}
          {isExpanded && (
            <div className="mt-3 ml-4 space-y-3">
              {/* Stats */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stats</label>
                  {isEditing && (
                    <button onClick={addStat} className="text-primary hover:text-primary/80">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(currentStats).map(([stat, value]) => (
                    <div key={stat} className="px-1.5 py-0.5 bg-muted text-[10px] font-mono flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={stat}
                            onChange={(e) => {
                              const oldValue = currentStats[stat];
                              removeStat(stat);
                              updateStat(e.target.value, String(oldValue || ""));
                            }}
                            className="w-12 bg-transparent border-b border-border uppercase text-muted-foreground"
                          />
                          <span>:</span>
                          <input
                            type="text"
                            value={String(value || "")}
                            onChange={(e) => updateStat(stat, e.target.value)}
                            className="w-10 bg-transparent border-b border-border text-foreground"
                          />
                          <button onClick={() => removeStat(stat)} className="text-destructive hover:text-destructive/80 ml-1">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground uppercase">{stat}:</span>
                          <span className="text-foreground">{value}</span>
                        </>
                      )}
                    </div>
                  ))}
                  {Object.keys(currentStats).length === 0 && !isEditing && (
                    <span className="text-[10px] text-muted-foreground italic">No stats defined</span>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Keywords</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={(editedUnit.keywords || []).join(", ")}
                    onChange={(e) => updateKeywords(e.target.value)}
                    placeholder="Comma-separated keywords..."
                    className="w-full text-xs font-mono bg-input border border-border px-2 py-1"
                  />
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {currentKeywords.map(kw => (
                      <Badge key={kw} variant="secondary" className="text-[9px] px-1 py-0">
                        {kw}
                      </Badge>
                    ))}
                    {currentKeywords.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No keywords</span>
                    )}
                  </div>
                )}
              </div>

              {/* Abilities */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Abilities</label>
                  {isEditing && (
                    <button onClick={addAbility} className="text-primary hover:text-primary/80">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {currentAbilities.map((ability, idx) => (
                    <div key={idx} className={isEditing ? "flex gap-2 items-start" : ""}>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={ability.name}
                            onChange={(e) => updateAbility(idx, "name", e.target.value)}
                            placeholder="Name"
                            className="w-24 text-xs font-mono bg-input border border-border px-2 py-1 text-primary"
                          />
                          <input
                            type="text"
                            value={ability.effect}
                            onChange={(e) => updateAbility(idx, "effect", e.target.value)}
                            placeholder="Effect"
                            className="flex-1 text-xs font-mono bg-input border border-border px-2 py-1"
                          />
                          <button onClick={() => removeAbility(idx)} className="text-destructive hover:text-destructive/80">
                            <Minus className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="text-[10px]">
                          <span className="text-primary font-medium">{ability.name}:</span>{" "}
                          <span className="text-muted-foreground">{ability.effect}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {currentAbilities.length === 0 && !isEditing && (
                    <span className="text-[10px] text-muted-foreground italic">No abilities</span>
                  )}
                </div>
              </div>

              {/* Equipment Options */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Equipment Options</label>
                  {isEditing && (
                    <button onClick={addEquipment} className="text-primary hover:text-primary/80">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {currentEquipment.map((equip, idx) => (
                    <div key={idx} className={isEditing ? "flex gap-2 items-start flex-wrap" : "text-[10px]"}>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={equip.name}
                            onChange={(e) => updateEquipment(idx, "name", e.target.value)}
                            placeholder="Equipment name"
                            className="w-32 text-xs font-mono bg-input border border-border px-2 py-1"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={equip.cost}
                              onChange={(e) => updateEquipment(idx, "cost", parseInt(e.target.value) || 0)}
                              className="w-14 text-xs font-mono bg-input border border-border px-2 py-1"
                            />
                            <span className="text-[10px] text-muted-foreground">pts</span>
                          </div>
                          <input
                            type="text"
                            value={equip.replaces || ""}
                            onChange={(e) => updateEquipment(idx, "replaces", e.target.value)}
                            placeholder="Replaces..."
                            className="w-24 text-xs font-mono bg-input border border-border px-2 py-1"
                          />
                          <button onClick={() => removeEquipment(idx)} className="text-destructive hover:text-destructive/80">
                            <Minus className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-foreground">{equip.name}</span>
                          <span className="text-secondary ml-1">(+{equip.cost} pts)</span>
                          {equip.replaces && (
                            <span className="text-muted-foreground ml-1">replaces {equip.replaces}</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {currentEquipment.length === 0 && !isEditing && (
                    <span className="text-[10px] text-muted-foreground italic">No equipment options</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              <TerminalButton
                variant="default"
                size="sm"
                onClick={saveChanges}
                disabled={updateMutation.isPending}
                className="h-7 px-2"
              >
                <Save className="w-3 h-3" />
              </TerminalButton>
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                className="h-7 px-2"
              >
                <X className="w-3 h-3" />
              </TerminalButton>
            </>
          ) : (
            <>
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={startEditing}
                className="h-7 px-2"
              >
                <Pencil className="w-3 h-3" />
              </TerminalButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </TerminalButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
