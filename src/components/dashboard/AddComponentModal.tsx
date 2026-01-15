import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useRuleCategories, useRulesByCategory } from "@/hooks/useWargameRules";
import { useMasterRuleCategories, useMasterRulesByCategory, useGameSystem } from "@/hooks/useGameSystems";
import { useCampaign } from "@/hooks/useCampaigns";
import { 
  Table, 
  LayoutList, 
  Dices,
  Image,
  Hash,
  Wrench,
  CheckSquare,
  Library,
  Gamepad2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const COMPONENT_TYPES = [
  { type: "table", label: "Table", icon: Table, description: "Data table with rows and columns", supportsRules: true },
  { type: "card", label: "Card", icon: LayoutList, description: "Card list with expandable items", supportsRules: true },
  { type: "counter", label: "Counter", icon: Hash, description: "Numeric tracker with +/- controls" },
  { type: "image", label: "Image", icon: Image, description: "Display an image or map" },
  { type: "dice_roller", label: "Dice Roller", icon: Dices, description: "Roll configurable dice" },
];

export function AddComponentModal({ open, onOpenChange, campaignId }: AddComponentModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [manualSetup, setManualSetup] = useState(false);
  const [ruleSource, setRuleSource] = useState<"game_system" | "campaign">("game_system");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRuleKey, setSelectedRuleKey] = useState<string>("");
  
  const createComponent = useCreateComponent();
  const { data: campaign } = useCampaign(campaignId);
  const { data: gameSystem } = useGameSystem(campaign?.game_system_id || undefined);
  
  // Campaign-level rules (legacy / custom)
  const campaignRuleCategories = useRuleCategories(campaignId);
  const { data: campaignCategoryRules } = useRulesByCategory(campaignId, ruleSource === "campaign" ? selectedCategory : undefined);
  
  // Master rules from linked game system
  const masterRuleCategories = useMasterRuleCategories(campaign?.game_system_id || undefined);
  const { data: masterCategoryRules } = useMasterRulesByCategory(
    ruleSource === "game_system" ? campaign?.game_system_id || undefined : undefined,
    ruleSource === "game_system" ? selectedCategory : undefined
  );

  // Determine available sources
  const hasGameSystem = !!campaign?.game_system_id && masterRuleCategories.length > 0;
  const hasCampaignRules = campaignRuleCategories.length > 0;
  const hasRulesRepo = !!campaign?.rules_repo_url;
  const hasAnyRulesSource = hasGameSystem || hasCampaignRules;
  
  // Use appropriate data based on source
  const activeCategories = ruleSource === "game_system" ? masterRuleCategories : campaignRuleCategories;
  const activeCategoryRules = ruleSource === "game_system" ? masterCategoryRules : campaignCategoryRules;
  
  const selectedTypeData = useMemo(() => 
    COMPONENT_TYPES.find(v => v.type === selectedType), 
    [selectedType]
  );

  const supportsRules = selectedTypeData?.supportsRules ?? false;

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    const typeData = COMPONENT_TYPES.find(v => v.type === type);
    if (typeData) {
      setName(`New ${typeData.label}`);
    }
    // Reset rules selection when changing type
    setManualSetup(false);
    setSelectedCategory("");
    setSelectedRuleKey("");
    // Default to game system if available
    setRuleSource(hasGameSystem ? "game_system" : "campaign");
  };

  const handleSourceChange = (source: "game_system" | "campaign") => {
    setRuleSource(source);
    setSelectedCategory("");
    setSelectedRuleKey("");
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    // Build config based on selections
    const config: Record<string, string | boolean | number | null> = {
      manual_setup: manualSetup || !supportsRules,
    };

    // Add rules linking if applicable
    if (supportsRules && !manualSetup && selectedCategory) {
      // For tables: populate ALL rules in category (no individual rule selection)
      // For cards: still use individual rule selection
      const isTableType = selectedType === "table";
      
      if (isTableType || selectedRuleKey) {
        if (ruleSource === "game_system") {
          config.rule_source = "game_system";
          config.game_system_id = campaign?.game_system_id || null;
        } else {
          config.rule_source = "campaign";
        }
        
        config.rule_category = selectedCategory;
        
        if (isTableType) {
          // Tables populate all rules in category
          config.populate_all_in_category = true;
        } else {
          // Cards use individual rule
          config.rule_key = selectedRuleKey;
          const selectedRule = activeCategoryRules?.find(r => r.rule_key === selectedRuleKey);
          if (selectedRule) {
            config.rule_title = selectedRule.title;
          }
        }
      }
    }

    // Add default config based on type
    if (selectedType === "counter") {
      config.value = 0;
      config.min = 0;
      config.max = 100;
      config.step = 1;
      config.label = name;
    }

    if (selectedType === "dice_roller") {
      config.sides = 6;
      config.count = 1;
    }

    await createComponent.mutateAsync({
      campaign_id: campaignId,
      name: name.trim(),
      component_type: selectedType,
      config,
      position_x: Math.round(100 + Math.random() * 200),
      position_y: Math.round(100 + Math.random() * 200),
      width: selectedType === "counter" || selectedType === "dice_roller" ? 200 : 350,
      height: selectedType === "counter" || selectedType === "dice_roller" ? 200 : 300,
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setName("");
    setManualSetup(false);
    setRuleSource(hasGameSystem ? "game_system" : "campaign");
    setSelectedCategory("");
    setSelectedRuleKey("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">{">"}</span>
            Add Component
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Component Type Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Select Component Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COMPONENT_TYPES.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`p-3 border rounded text-center transition-all ${
                    selectedType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${selectedType === type ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-mono uppercase">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Section */}
          {selectedType && selectedTypeData && (
            <div className="space-y-4 border-t border-border pt-4 animate-fade-in">
              {/* Component Name */}
              <TerminalInput
                label="Component Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter component name..."
              />

              {/* Rules Integration - Only for table and card */}
              {supportsRules && hasAnyRulesSource && (
                <div className="space-y-3 border border-primary/30 p-4 bg-primary/5 rounded">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-2">
                      <Library className="w-3 h-3" />
                      Auto-Populate from Rules
                    </label>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="manual-setup"
                        checked={manualSetup}
                        onCheckedChange={(checked) => {
                          setManualSetup(checked === true);
                          if (checked) {
                            setSelectedCategory("");
                            setSelectedRuleKey("");
                          }
                        }}
                      />
                      <label 
                        htmlFor="manual-setup" 
                        className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        Manual Setup
                      </label>
                    </div>
                  </div>

                  {!manualSetup && (
                    <>
                      {/* Rule Source Selection */}
                      {hasGameSystem && hasCampaignRules && (
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => handleSourceChange("game_system")}
                            className={`flex-1 px-3 py-2 text-xs font-mono uppercase rounded border transition-colors flex items-center justify-center gap-1.5 ${
                              ruleSource === "game_system"
                                ? "bg-primary/20 border-primary text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <Gamepad2 className="w-3 h-3" />
                            {gameSystem?.name || "Game System"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSourceChange("campaign")}
                            className={`flex-1 px-3 py-2 text-xs font-mono uppercase rounded border transition-colors flex items-center justify-center gap-1.5 ${
                              ruleSource === "campaign"
                                ? "bg-primary/20 border-primary text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <Library className="w-3 h-3" />
                            Campaign Rules
                          </button>
                        </div>
                      )}
                      
                      {/* Show game system label if only source */}
                      {hasGameSystem && !hasCampaignRules && (
                        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                          <Gamepad2 className="w-3 h-3" />
                          <span>From: <span className="text-primary font-medium">{gameSystem?.name}</span></span>
                        </div>
                      )}

                      {activeCategories.length > 0 ? (
                        <div className={`grid gap-3 ${selectedType === "table" ? "grid-cols-1" : "grid-cols-2"}`}>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Rule Category
                            </label>
                            <Select 
                              value={selectedCategory} 
                              onValueChange={(val) => {
                                setSelectedCategory(val);
                                setSelectedRuleKey("");
                              }}
                            >
                              <SelectTrigger className="w-full bg-input border-border">
                                <SelectValue placeholder="Select category..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border max-h-48">
                                {activeCategories.map(({ category, ruleCount }) => (
                                  <SelectItem key={category} value={category}>
                                    {category} ({ruleCount})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Rule Set dropdown - only show for non-table types */}
                          {selectedType !== "table" && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Rule Set
                              </label>
                              <Select 
                                value={selectedRuleKey} 
                                onValueChange={setSelectedRuleKey}
                                disabled={!selectedCategory || !activeCategoryRules?.length}
                              >
                                <SelectTrigger className="w-full bg-input border-border">
                                  <SelectValue placeholder="Select rule set..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border max-h-48">
                                  {activeCategoryRules?.map((rule) => (
                                    <SelectItem key={rule.rule_key} value={rule.rule_key}>
                                      {rule.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-yellow-400">
                          {ruleSource === "game_system" 
                            ? "No rules found in the linked game system."
                            : "No campaign-specific rules found."
                          }
                        </p>
                      )}

                      {/* Confirmation message - different for tables vs cards */}
                      {selectedType === "table" && selectedCategory && (
                        <div className="flex items-center gap-2 text-xs text-green-400 mt-2">
                          <CheckSquare className="w-4 h-4" />
                          <span>Table will auto-populate with all {activeCategoryRules?.length || 0} rules from "{selectedCategory}"</span>
                        </div>
                      )}
                      {selectedType !== "table" && selectedRuleKey && (
                        <div className="flex items-center gap-2 text-xs text-green-400 mt-2">
                          <CheckSquare className="w-4 h-4" />
                          <span>Component will auto-populate with "{activeCategoryRules?.find(r => r.rule_key === selectedRuleKey)?.title}"</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* No rules available message */}
              {supportsRules && !hasAnyRulesSource && (
                <div className="border border-border p-4 bg-muted/10 rounded">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Library className="w-4 h-4" />
                    No game system linked. Go to Settings to select a rules system, or the component will start empty.
                  </p>
                </div>
              )}

              {/* Type-specific hints */}
              {selectedType === "counter" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Counter starts at 0. You can configure min, max, step, and label after adding.
                </p>
              )}

              {selectedType === "dice_roller" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Defaults to 1d6. You can configure dice type and count after adding.
                </p>
              )}

              {selectedType === "image" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Upload an image or paste a URL after adding the component.
                </p>
              )}

              {/* Preview */}
              <div className="border border-dashed border-border/50 p-4 bg-muted/10 rounded">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-3 p-3 bg-card border border-primary/30 rounded">
                  <selectedTypeData.icon className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm font-mono text-primary">{name || "New Component"}</p>
                    <p className="text-xs text-muted-foreground">{selectedTypeData.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <TerminalButton variant="outline" onClick={handleClose}>
            Cancel
          </TerminalButton>
          <TerminalButton
            onClick={handleCreate}
            disabled={!selectedType || !name.trim() || createComponent.isPending}
          >
            {createComponent.isPending ? "Adding..." : "[ Add Component ]"}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
