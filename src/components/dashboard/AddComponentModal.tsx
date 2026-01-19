import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useRuleCategories, useRulesByCategory } from "@/hooks/useWargameRules";
import { useCampaign } from "@/hooks/useCampaigns";
import { 
  Table, 
  LayoutList, 
  Dices,
  Image,
  Hash,
  Wrench,
  CheckSquare,
  GitBranch
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRuleKey, setSelectedRuleKey] = useState<string>("");
  
  const createComponent = useCreateComponent();
  const { data: campaign } = useCampaign(campaignId);
  const ruleCategories = useRuleCategories(campaignId);
  const { data: categoryRules } = useRulesByCategory(campaignId, selectedCategory);

  const hasRulesRepo = !!campaign?.rules_repo_url;
  const hasRulesData = ruleCategories.length > 0;
  
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
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    // Build config based on selections
    const config: Record<string, string | boolean | number | null> = {
      manual_setup: manualSetup || !supportsRules,
    };

    // Add rules linking if applicable
    if (supportsRules && !manualSetup && selectedCategory && selectedRuleKey) {
      config.rule_category = selectedCategory;
      config.rule_key = selectedRuleKey;
      
      const selectedRule = categoryRules?.find(r => r.rule_key === selectedRuleKey);
      if (selectedRule) {
        config.rule_title = selectedRule.title;
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
              {supportsRules && hasRulesRepo && (
                <div className="space-y-3 border border-primary/30 p-4 bg-primary/5 rounded">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-2">
                      <GitBranch className="w-3 h-3" />
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

                  {!manualSetup && hasRulesData && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rule Category
                        </label>
                        <Select 
                          value={selectedCategory || undefined}
                          onValueChange={(val) => {
                            setSelectedCategory(val);
                            setSelectedRuleKey("");
                          }}
                        >
                          <SelectTrigger className="w-full bg-input border-border">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {ruleCategories.map(({ category }) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rule Set
                        </label>
                        <Select 
                          value={selectedRuleKey || undefined}
                          onValueChange={setSelectedRuleKey}
                          disabled={!selectedCategory || !categoryRules?.length}
                        >
                          <SelectTrigger className="w-full bg-input border-border">
                            <SelectValue placeholder="Select rule set..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border max-h-48">
                            {categoryRules?.map((rule) => (
                              <SelectItem key={rule.rule_key} value={rule.rule_key}>
                                {rule.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {!manualSetup && !hasRulesData && (
                    <p className="text-xs text-yellow-400">
                      No rules synced. Go to Campaign Settings to sync your rules repository.
                    </p>
                  )}

                  {!manualSetup && selectedRuleKey && (
                    <div className="flex items-center gap-2 text-xs text-green-400 mt-2">
                      <CheckSquare className="w-4 h-4" />
                      <span>Component will auto-populate with "{categoryRules?.find(r => r.rule_key === selectedRuleKey)?.title}"</span>
                    </div>
                  )}
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
