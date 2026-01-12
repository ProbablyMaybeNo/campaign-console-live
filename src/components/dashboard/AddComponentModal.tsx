import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useRuleCategories, useRulesByCategory } from "@/hooks/useWargameRules";
import { useCampaign } from "@/hooks/useCampaigns";
import { Switch } from "@/components/ui/switch";
import { 
  Scroll, 
  Table, 
  LayoutList, 
  BookOpen, 
  Users, 
  Map, 
  MessageSquare, 
  Calendar,
  Dices,
  Image,
  Hash,
  Wrench,
  CheckSquare
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
  { type: "rules", label: "Rules Panel", icon: Scroll, description: "Display game rules from repository" },
  { type: "table", label: "Data Table", icon: Table, description: "Tabular data display" },
  { type: "card", label: "Card List", icon: LayoutList, description: "Warband/unit cards" },
  { type: "narrative", label: "Narrative", icon: BookOpen, description: "Campaign story events" },
  { type: "players", label: "Players", icon: Users, description: "Player roster & stats" },
  { type: "map", label: "Campaign Map", icon: Map, description: "Interactive territory map" },
  { type: "messages", label: "Messages", icon: MessageSquare, description: "Real-time chat feed" },
  { type: "schedule", label: "Schedule", icon: Calendar, description: "Game schedule & rounds" },
  { type: "counter", label: "Counter", icon: Hash, description: "Numeric tracker" },
  { type: "dice_roller", label: "Dice Roller", icon: Dices, description: "Roll dice" },
  { type: "image", label: "Image", icon: Image, description: "Display an image" },
];

const HIGHLIGHT_COLORS = [
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "none", label: "None", color: "bg-transparent border border-border" },
];

export function AddComponentModal({ open, onOpenChange, campaignId }: AddComponentModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [manualSetup, setManualSetup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRuleKey, setSelectedRuleKey] = useState<string>("");
  
  // Configuration options
  const [filterable, setFilterable] = useState(false);
  const [sortable, setSortable] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const [highlightColor, setHighlightColor] = useState<string>("none");
  
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

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    
    // Pre-populate name based on type
    const typeData = COMPONENT_TYPES.find(v => v.type === type);
    if (typeData) {
      setName(`New ${typeData.label}`);
    }
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    // Build config based on selections
    const config: Record<string, string | boolean | null> = {
      manual_setup: manualSetup,
      filterable,
      sortable,
      collapsible,
      highlight_color: highlightColor,
      rule_category: null,
      rule_key: null,
      rule_title: null,
    };

    if (!manualSetup && selectedCategory && selectedRuleKey) {
      config.rule_category = selectedCategory;
      config.rule_key = selectedRuleKey;
      
      // Find the selected rule data
      const selectedRule = categoryRules?.find(r => r.rule_key === selectedRuleKey);
      if (selectedRule) {
        config.rule_title = selectedRule.title;
      }
    }

    await createComponent.mutateAsync({
      campaign_id: campaignId,
      name: name.trim(),
      component_type: selectedType,
      config,
      position_x: Math.round(100 + Math.random() * 200),
      position_y: Math.round(100 + Math.random() * 200),
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setName("");
    setManualSetup(false);
    setSelectedCategory("");
    setSelectedRuleKey("");
    setFilterable(false);
    setSortable(false);
    setCollapsible(false);
    setHighlightColor("none");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMPONENT_TYPES.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`p-3 border rounded text-left transition-all ${
                    selectedType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${selectedType === type ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-mono uppercase">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Section - Only show when type is selected */}
          {selectedType && selectedTypeData && (
            <div className="space-y-4 border-t border-border pt-4">
              {/* Component Name */}
              <TerminalInput
                label="Component Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter component name..."
              />

              {/* Rules Set Section - Only for applicable component types */}
              {hasRulesRepo && ["table", "card", "rules"].includes(selectedType) && (
                <div className="space-y-3 border border-border/50 p-4 bg-muted/20 rounded">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                      <Scroll className="w-3 h-3" />
                      Rule Set Linked
                    </label>
                    
                    {/* Manual Setup Toggle */}
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
                        Custom (Manual)
                      </label>
                    </div>
                  </div>

                  {!manualSetup && hasRulesData && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      {/* Category Dropdown */}
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
                          <SelectContent className="bg-card border-border">
                            {ruleCategories.map(({ category }) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rule Selection Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rule Set
                        </label>
                        <Select 
                          value={selectedRuleKey} 
                          onValueChange={setSelectedRuleKey}
                          disabled={!selectedCategory || !categoryRules?.length}
                        >
                          <SelectTrigger className="w-full bg-input border-border">
                            <SelectValue placeholder="Select rule set..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
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
                      No rules found. Try re-syncing in campaign settings or check your repository.
                    </p>
                  )}

                  {selectedRuleKey && (
                    <div className="flex items-center gap-2 text-xs text-green-400 mt-2">
                      <CheckSquare className="w-4 h-4" />
                      <span>Component will auto-populate with selected rules</span>
                    </div>
                  )}
                </div>
              )}

              {/* Component Options */}
              {["table", "card", "rules"].includes(selectedType) && (
                <div className="grid grid-cols-3 gap-4 border border-border/50 p-4 bg-muted/20 rounded">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Filterable</label>
                    <Switch checked={filterable} onCheckedChange={setFilterable} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Sortable</label>
                    <Switch checked={sortable} onCheckedChange={setSortable} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Collapsible</label>
                    <Switch checked={collapsible} onCheckedChange={setCollapsible} />
                  </div>
                </div>
              )}

              {/* Highlight Color */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Highlight Row Color
                </label>
                <div className="flex gap-2">
                  {HIGHLIGHT_COLORS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setHighlightColor(value)}
                      className={`w-8 h-8 rounded ${color} ${
                        highlightColor === value ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      }`}
                      title={label}
                    />
                  ))}
                </div>
              </div>

              {/* Component Preview */}
              <div className="border border-dashed border-border/50 p-4 bg-muted/10 rounded">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Component Preview</p>
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
            {createComponent.isPending ? "Adding..." : "Add Component"}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
