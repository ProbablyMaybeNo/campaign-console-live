import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useWarband, useCreateWarband, useUpdateWarband, RosterUnit } from "@/hooks/useWarband";
import { useCampaignUnits, CampaignUnit } from "@/hooks/useCampaignUnits";
import { useCampaign } from "@/hooks/useCampaigns";
import { useWargameRules } from "@/hooks/useWargameRules";
import { 
  Swords, 
  Plus, 
  Trash2, 
  FileDown,
  ChevronDown,
  Shield,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WarbandManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
}

// Use imported types from useCampaignUnits

export function WarbandManagerOverlay({
  open,
  onOpenChange,
  campaignId,
  userId,
}: WarbandManagerOverlayProps) {
  const { data: warband, isLoading: warbandLoading } = useWarband(campaignId, userId);
  const { data: campaign } = useCampaign(campaignId);
  const { data: units = [] } = useCampaignUnits(campaignId);
  const { data: rules = [] } = useWargameRules(campaignId);
  const createWarband = useCreateWarband();
  const updateWarband = useUpdateWarband();

  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null);
  const [warbandName, setWarbandName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [selectedSubFaction, setSelectedSubFaction] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get unique factions and sub-factions from units
  const factions = useMemo(() => {
    const factionSet = new Set(units.map(u => u.faction).filter(Boolean));
    return Array.from(factionSet);
  }, [units]);

  const subFactions = useMemo(() => {
    if (!selectedFaction) return [];
    const subFactionSet = new Set(
      units
        .filter(u => u.faction === selectedFaction && u.sub_faction)
        .map(u => u.sub_faction)
    );
    return Array.from(subFactionSet) as string[];
  }, [units, selectedFaction]);

  // Filter units by selected faction
  const availableUnits = useMemo(() => {
    if (!selectedFaction && !warband?.faction) return [];
    const faction = selectedFaction || warband?.faction;
    return units.filter(u => u.faction === faction);
  }, [units, selectedFaction, warband?.faction]);

  // Get faction rules
  const factionRules = useMemo(() => {
    const faction = selectedFaction || warband?.faction;
    if (!faction) return [];
    return rules.filter(r => 
      r.category === "faction" && 
      r.title.toLowerCase().includes(faction.toLowerCase())
    );
  }, [rules, selectedFaction, warband?.faction]);

  // Calculate points
  const currentPoints = warband?.points_total || 0;
  const maxPoints = campaign?.points_limit || 0;
  const remainingPoints = maxPoints - currentPoints;

  const handleCreateWarband = async () => {
    if (!warbandName.trim() || !selectedFaction) {
      toast.error("Please enter a warband name and select a faction");
      return;
    }

    await createWarband.mutateAsync({
      campaign_id: campaignId,
      owner_id: userId,
      name: warbandName.trim(),
      faction: selectedFaction,
      sub_faction: selectedSubFaction || null,
    });

    setShowCreateForm(false);
    setWarbandName("");
    setSelectedFaction("");
    setSelectedSubFaction("");
  };

  const handleAddUnit = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !warband) return;

    const newRosterUnit: RosterUnit = {
      unit_id: unit.id,
      unit_name: unit.name,
      base_cost: unit.base_cost,
      equipment: [],
      total_cost: unit.base_cost,
    };

    const newRoster = [...warband.roster, newRosterUnit];
    
    await updateWarband.mutateAsync({
      id: warband.id,
      campaign_id: campaignId,
      roster: newRoster,
    });

    toast.success(`${unit.name} added to warband`);
  };

  const handleRemoveUnit = async (index: number) => {
    if (!warband) return;

    const newRoster = warband.roster.filter((_, i) => i !== index);
    
    await updateWarband.mutateAsync({
      id: warband.id,
      campaign_id: campaignId,
      roster: newRoster,
    });

    if (selectedUnitIndex === index) {
      setSelectedUnitIndex(null);
    }

    toast.success("Unit removed from warband");
  };

  const handleExportPDF = () => {
    toast.info("PDF export coming soon");
  };

  const selectedUnit = selectedUnitIndex !== null ? warband?.roster[selectedUnitIndex] : null;
  const selectedUnitData = selectedUnit 
    ? units.find(u => u.id === selectedUnit.unit_id) 
    : null;

  if (warbandLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-primary/30">
          <div className="flex items-center justify-center py-16">
            <TerminalLoader text="Loading warband" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show create form if no warband exists
  if (!warband && !showCreateForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-primary/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Create Your Warband
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You don't have a warband in this campaign yet. Create one to start building your roster.
            </p>
            
            <TerminalButton 
              onClick={() => setShowCreateForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Warband
            </TerminalButton>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showCreateForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-primary/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
              <Swords className="w-4 h-4" />
              New Warband
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Warband Name *
              </label>
              <TerminalInput
                value={warbandName}
                onChange={(e) => setWarbandName(e.target.value)}
                placeholder="Enter warband name"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Faction *
              </label>
              <select
                value={selectedFaction}
                onChange={(e) => {
                  setSelectedFaction(e.target.value);
                  setSelectedSubFaction("");
                }}
                className="w-full bg-input border border-primary/30 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              >
                <option value="">Select faction...</option>
                {factions.map(faction => (
                  <option key={faction} value={faction}>{faction}</option>
                ))}
              </select>
            </div>

            {subFactions.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Sub-Faction
                </label>
                <select
                  value={selectedSubFaction}
                  onChange={(e) => setSelectedSubFaction(e.target.value)}
                  className="w-full bg-input border border-primary/30 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                >
                  <option value="">Select sub-faction...</option>
                  {subFactions.map(subFaction => (
                    <option key={subFaction} value={subFaction}>{subFaction}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <TerminalButton
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleCreateWarband}
                disabled={createWarband.isPending}
                className="flex-1"
              >
                {createWarband.isPending ? (
                  <TerminalLoader text="Creating" size="sm" />
                ) : (
                  "Create"
                )}
              </TerminalButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Swords className="w-4 h-4" />
            {warband?.name || "Warband Builder"}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {warband?.faction} {warband?.sub_faction && `• ${warband.sub_faction}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Points Summary */}
        <div className="px-6 py-3 border-b border-primary/10 bg-primary/5">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</p>
              <p className="text-lg font-mono text-foreground">{currentPoints}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Maximum</p>
              <p className="text-lg font-mono text-primary">{maxPoints}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
              <p className={cn(
                "text-lg font-mono",
                remainingPoints < 0 ? "text-destructive" : "text-primary"
              )}>
                {remainingPoints}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Units</p>
              <p className="text-lg font-mono text-foreground">{warband?.roster.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Faction Dropdown */}
        <div className="px-6 py-3 border-b border-primary/10 flex gap-4">
          <div className="flex-1">
            <select
              value={warband?.faction || ""}
              disabled
              className="w-full bg-muted/20 border border-border rounded px-3 py-2 text-sm font-mono"
            >
              <option>{warband?.faction || "No faction"}</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={warband?.sub_faction || ""}
              disabled
              className="w-full bg-muted/20 border border-border rounded px-3 py-2 text-sm font-mono"
            >
              <option>{warband?.sub_faction || "No sub-faction"}</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Unit Roster Table */}
          <div className="w-1/2 border-r border-primary/20 flex flex-col">
            <div className="p-3 border-b border-primary/10 flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Roster ({warband?.roster.length || 0})
              </p>
              <div className="relative group">
                <TerminalButton size="sm" variant="outline">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Unit
                  <ChevronDown className="w-3 h-3 ml-1" />
                </TerminalButton>
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-primary/30 rounded shadow-lg z-10 hidden group-hover:block max-h-48 overflow-y-auto">
                  {availableUnits.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No units available</p>
                  ) : (
                    availableUnits.map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => handleAddUnit(unit.id)}
                        className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-primary/10 flex justify-between"
                      >
                        <span>{unit.name}</span>
                        <span className="text-primary">{unit.base_cost}pts</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!warband?.roster.length ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Shield className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">No units in roster</p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {warband.roster.map((rosterUnit, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedUnitIndex(index)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                        selectedUnitIndex === index 
                          ? "bg-primary/10 border-l-2 border-primary" 
                          : "hover:bg-accent/20"
                      )}
                    >
                      <div>
                        <p className="text-sm font-mono">{rosterUnit.unit_name}</p>
                        {rosterUnit.custom_name && (
                          <p className="text-[10px] text-muted-foreground">
                            "{rosterUnit.custom_name}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-primary">
                          {rosterUnit.total_cost}pts
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUnit(index);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unit Datasheet */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {selectedUnit && selectedUnitData ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-mono text-primary">{selectedUnit.unit_name}</h3>
                  <span className="text-sm font-mono">{selectedUnit.total_cost}pts</span>
                </div>

                {/* Stats */}
                <div className="border border-primary/30 rounded overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 text-[10px] uppercase tracking-wider text-primary flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Characteristics
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {Object.entries(selectedUnitData.stats || {}).slice(0, 10).map(([key, value]) => (
                        <div key={key} className="bg-muted/10 rounded p-2">
                          <p className="text-[8px] uppercase text-muted-foreground">{key.slice(0, 3)}</p>
                          <p className="text-sm font-mono">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Abilities */}
                {selectedUnitData.abilities && Array.isArray(selectedUnitData.abilities) && (
                  <div className="border border-border rounded overflow-hidden">
                    <div className="bg-muted/10 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      Abilities
                    </div>
                    <div className="p-3 space-y-2">
                      {selectedUnitData.abilities.map((ability, i) => (
                        <p key={i} className="text-xs">
                          <strong>{ability.name}:</strong> {ability.effect}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {selectedUnitData.keywords && Array.isArray(selectedUnitData.keywords) && (
                  <div className="flex flex-wrap gap-1">
                    {(selectedUnitData.keywords as string[]).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] bg-primary/10 border border-primary/30 rounded font-mono"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Shield className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-xs font-mono">Select a unit to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Faction Rules */}
        {factionRules.length > 0 && (
          <div className="px-6 py-3 border-t border-primary/20 bg-muted/5 max-h-32 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Faction Rules
            </p>
            <div className="text-xs text-foreground space-y-1">
              {factionRules.map(rule => (
                <p key={rule.id}>• {rule.title}</p>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-primary/20 flex items-center justify-end">
          <TerminalButton variant="outline" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}