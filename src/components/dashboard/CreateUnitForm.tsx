import { useState } from "react";
import { useCreateCampaignUnit } from "@/hooks/useCampaignUnits";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Save, X } from "lucide-react";

interface CreateUnitFormProps {
  campaignId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface NewAbility {
  name: string;
  effect: string;
}

interface NewEquipment {
  name: string;
  cost: number;
  replaces?: string;
  requires?: string[];
  excludes?: string[];
}

export function CreateUnitForm({ campaignId, onComplete, onCancel }: CreateUnitFormProps) {
  const createMutation = useCreateCampaignUnit();
  
  const [name, setName] = useState("");
  const [faction, setFaction] = useState("");
  const [subFaction, setSubFaction] = useState("");
  const [baseCost, setBaseCost] = useState(0);
  const [stats, setStats] = useState<Record<string, string>>({});
  const [abilities, setAbilities] = useState<NewAbility[]>([]);
  const [equipment, setEquipment] = useState<NewEquipment[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // Stats management
  const addStat = () => {
    const key = `stat_${Date.now()}`;
    setStats(prev => ({ ...prev, [key]: "" }));
  };

  const updateStatKey = (oldKey: string, newKey: string) => {
    setStats(prev => {
      const value = prev[oldKey];
      const newStats = { ...prev };
      delete newStats[oldKey];
      newStats[newKey] = value;
      return newStats;
    });
  };

  const updateStatValue = (key: string, value: string) => {
    setStats(prev => ({ ...prev, [key]: value }));
  };

  const removeStat = (key: string) => {
    setStats(prev => {
      const newStats = { ...prev };
      delete newStats[key];
      return newStats;
    });
  };

  // Abilities management
  const addAbility = () => {
    setAbilities(prev => [...prev, { name: "", effect: "" }]);
  };

  const updateAbility = (index: number, field: "name" | "effect", value: string) => {
    setAbilities(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeAbility = (index: number) => {
    setAbilities(prev => prev.filter((_, i) => i !== index));
  };

  // Equipment management
  const addEquipment = () => {
    setEquipment(prev => [...prev, { name: "", cost: 0 }]);
  };

  const updateEquipment = (index: number, field: keyof NewEquipment, value: string | number | string[]) => {
    setEquipment(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeEquipment = (index: number) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };

  // Keywords management
  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords(prev => [...prev, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !faction.trim()) return;

    await createMutation.mutateAsync({
      campaign_id: campaignId,
      name: name.trim(),
      faction: faction.trim(),
      sub_faction: subFaction.trim() || null,
      base_cost: baseCost,
      stats,
      abilities,
      equipment_options: equipment,
      keywords,
      source: "manual",
      source_ref: null,
    });

    onComplete?.();
  };

  const isValid = name.trim() && faction.trim();

  return (
    <div className="border border-primary/30 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <h3 className="text-sm font-mono uppercase tracking-wider text-primary">Create New Unit</h3>
        {onCancel && (
          <TerminalButton variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </TerminalButton>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
            Unit Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Space Marine Sergeant"
            className="w-full text-sm font-mono bg-input border border-border px-3 py-2 focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
            Base Cost (pts)
          </label>
          <input
            type="number"
            value={baseCost}
            onChange={(e) => setBaseCost(parseInt(e.target.value) || 0)}
            className="w-full text-sm font-mono bg-input border border-border px-3 py-2 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
            Faction *
          </label>
          <input
            type="text"
            value={faction}
            onChange={(e) => setFaction(e.target.value)}
            placeholder="e.g. Space Marines"
            className="w-full text-sm font-mono bg-input border border-border px-3 py-2 focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
            Sub-Faction
          </label>
          <input
            type="text"
            value={subFaction}
            onChange={(e) => setSubFaction(e.target.value)}
            placeholder="e.g. Ultramarines"
            className="w-full text-sm font-mono bg-input border border-border px-3 py-2 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stats</label>
          <TerminalButton variant="ghost" size="sm" onClick={addStat} className="h-6 px-2">
            <Plus className="w-3 h-3 mr-1" /> Add Stat
          </TerminalButton>
        </div>
        {Object.keys(stats).length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1 bg-muted px-2 py-1">
                <input
                  type="text"
                  value={key.startsWith("stat_") ? "" : key}
                  onChange={(e) => updateStatKey(key, e.target.value)}
                  placeholder="Name"
                  className="w-12 text-[10px] font-mono uppercase bg-transparent border-b border-border/50 focus:border-primary outline-none"
                />
                <span className="text-muted-foreground">:</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateStatValue(key, e.target.value)}
                  placeholder="Val"
                  className="w-10 text-[10px] font-mono bg-transparent border-b border-border/50 focus:border-primary outline-none"
                />
                <button onClick={() => removeStat(key)} className="text-destructive hover:text-destructive/80 ml-1">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No stats added yet</p>
        )}
      </div>

      {/* Keywords Section */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">Keywords</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            placeholder="Add keyword..."
            className="flex-1 text-xs font-mono bg-input border border-border px-2 py-1 focus:border-primary/50 focus:outline-none"
          />
          <TerminalButton variant="ghost" size="sm" onClick={addKeyword} className="h-7 px-2">
            <Plus className="w-3 h-3" />
          </TerminalButton>
        </div>
        {keywords.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {keywords.map(kw => (
              <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0.5 gap-1">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No keywords added yet</p>
        )}
      </div>

      {/* Abilities Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Abilities</label>
          <TerminalButton variant="ghost" size="sm" onClick={addAbility} className="h-6 px-2">
            <Plus className="w-3 h-3 mr-1" /> Add Ability
          </TerminalButton>
        </div>
        {abilities.length > 0 ? (
          <div className="space-y-2">
            {abilities.map((ability, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={ability.name}
                  onChange={(e) => updateAbility(idx, "name", e.target.value)}
                  placeholder="Ability name"
                  className="w-32 text-xs font-mono bg-input border border-border px-2 py-1.5 focus:border-primary/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={ability.effect}
                  onChange={(e) => updateAbility(idx, "effect", e.target.value)}
                  placeholder="Effect description..."
                  className="flex-1 text-xs font-mono bg-input border border-border px-2 py-1.5 focus:border-primary/50 focus:outline-none"
                />
                <button onClick={() => removeAbility(idx)} className="text-destructive hover:text-destructive/80 p-1">
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No abilities added yet</p>
        )}
      </div>

      {/* Equipment Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Equipment Options</label>
          <TerminalButton variant="ghost" size="sm" onClick={addEquipment} className="h-6 px-2">
            <Plus className="w-3 h-3 mr-1" /> Add Equipment
          </TerminalButton>
        </div>
        {equipment.length > 0 ? (
          <div className="space-y-2">
            {equipment.map((equip, idx) => (
              <div key={idx} className="flex gap-2 items-start flex-wrap">
                <input
                  type="text"
                  value={equip.name}
                  onChange={(e) => updateEquipment(idx, "name", e.target.value)}
                  placeholder="Equipment name"
                  className="w-36 text-xs font-mono bg-input border border-border px-2 py-1.5 focus:border-primary/50 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={equip.cost}
                    onChange={(e) => updateEquipment(idx, "cost", parseInt(e.target.value) || 0)}
                    className="w-14 text-xs font-mono bg-input border border-border px-2 py-1.5 focus:border-primary/50 focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">pts</span>
                </div>
                <input
                  type="text"
                  value={equip.replaces || ""}
                  onChange={(e) => updateEquipment(idx, "replaces", e.target.value)}
                  placeholder="Replaces..."
                  className="w-28 text-xs font-mono bg-input border border-border px-2 py-1.5 focus:border-primary/50 focus:outline-none"
                />
                <button onClick={() => removeEquipment(idx)} className="text-destructive hover:text-destructive/80 p-1">
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No equipment added yet</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onCancel && (
          <TerminalButton variant="ghost" onClick={onCancel}>
            Cancel
          </TerminalButton>
        )}
        <TerminalButton
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {createMutation.isPending ? "Creating..." : "Create Unit"}
        </TerminalButton>
      </div>
    </div>
  );
}
