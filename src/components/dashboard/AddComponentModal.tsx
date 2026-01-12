import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useRuleCategories, useRulesByCategory } from "@/hooks/useWargameRules";
import { useCampaign } from "@/hooks/useCampaigns";
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
  ChevronDown,
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

const COMPONENT_VIEWS = [
  { type: "table", label: "Table", icon: Table, description: "Tabular data with rows & columns" },
  { type: "card", label: "Card", icon: LayoutList, description: "Information card with text content" },
  { type: "map", label: "Map", icon: Map, description: "Interactive territory or battle map" },
  { type: "counter", label: "Counter", icon: Hash, description: "Numeric counter with +/- controls" },
  { type: "dice_roller", label: "Dice Roller", icon: Dices, description: "Roll dice with customizable sides" },
  { type: "image", label: "Image", icon: Image, description: "Display an image or gallery" },
  { type: "rules", label: "Rules Panel", icon: Scroll, description: "Display game rules reference" },
  { type: "narrative", label: "Narrative", icon: BookOpen, description: "Campaign story and events" },
  { type: "players", label: "Players", icon: Users, description: "Player roster & stats" },
  { type: "messages", label: "Messages", icon: MessageSquare, description: "Real-time chat feed" },
  { type: "schedule", label: "Schedule", icon: Calendar, description: "Game schedule & rounds" },
];

export function AddComponentModal({ open, onOpenChange, campaignId }: AddComponentModalProps) {
  const [step, setStep] = useState<"view" | "config">("view");
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [manualSetup, setManualSetup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRuleKey, setSelectedRuleKey] = useState<string>("");
  
  const createComponent = useCreateComponent();
  const { data: campaign } = useCampaign(campaignId);
  const ruleCategories = useRuleCategories(campaignId);
  const { data: categoryRules } = useRulesByCategory(campaignId, selectedCategory);

  const hasRulesRepo = !!campaign?.rules_repo_url;
  
  const selectedViewData = useMemo(() => 
    COMPONENT_VIEWS.find(v => v.type === selectedView), 
    [selectedView]
  );

  const handleViewSelect = (viewType: string) => {
    setSelectedView(viewType);
    setStep("config");
    
    // Pre-populate name based on view type
    const view = COMPONENT_VIEWS.find(v => v.type === viewType);
    if (view) {
      setName(`New ${view.label}`);
    }
  };

  const handleCreate = async () => {
    if (!selectedView || !name.trim()) return;

    // Build config based on selections
    const config: Record<string, string | boolean | null> = {
      manual_setup: manualSetup,
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
      component_type: selectedView,
      config,
      position_x: Math.round(100 + Math.random() * 200),
      position_y: Math.round(100 + Math.random() * 200),
    });

    handleClose();
  };

  const handleClose = () => {
    setStep("view");
    setSelectedView(null);
    setName("");
    setManualSetup(false);
    setSelectedCategory("");
    setSelectedRuleKey("");
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep("view");
    setSelectedView(null);
    setName("");
    setManualSetup(false);
    setSelectedCategory("");
    setSelectedRuleKey("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <span>{">"}</span>
            {step === "view" ? "Choose Component View" : "Configure Component"}
          </DialogTitle>
        </DialogHeader>

        {step === "view" && (
          <div className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMPONENT_VIEWS.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => handleViewSelect(type)}
                  className="p-3 border border-border rounded text-left transition-all hover:border-primary/50 hover:bg-accent group"
                >
                  <Icon className="w-5 h-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-xs font-mono uppercase">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "config" && selectedViewData && (
          <div className="space-y-5 py-4">
            {/* Selected View Preview */}
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded">
              <selectedViewData.icon className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-mono uppercase text-primary">{selectedViewData.label}</p>
                <p className="text-xs text-muted-foreground">{selectedViewData.description}</p>
              </div>
            </div>

            {/* Component Name */}
            <TerminalInput
              label="Component Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter component name..."
            />

            {/* Rules Set Section */}
            {hasRulesRepo && ruleCategories.length > 0 && (
              <div className="space-y-3 border border-border/50 p-4 bg-muted/20 rounded">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                    <Scroll className="w-3 h-3" />
                    Rules Set
                  </label>
                  
                  {/* Manual Setup Checkbox */}
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
                  <div className="space-y-3 animate-fade-in">
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
                          <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ruleCategories.map(({ category }) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rule Selection Dropdown */}
                    {selectedCategory && categoryRules && categoryRules.length > 0 && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rule Set
                        </label>
                        <Select value={selectedRuleKey} onValueChange={setSelectedRuleKey}>
                          <SelectTrigger className="w-full bg-input border-border">
                            <SelectValue placeholder="Select a rule set..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryRules.map((rule) => (
                              <SelectItem key={rule.rule_key} value={rule.rule_key}>
                                {rule.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedRuleKey && (
                      <div className="flex items-center gap-2 text-xs text-green-400 mt-2">
                        <CheckSquare className="w-4 h-4" />
                        <span>Component will auto-populate with selected rules</span>
                      </div>
                    )}
                  </div>
                )}

                {manualSetup && (
                  <p className="text-xs text-muted-foreground italic">
                    You'll be able to manually add content after creating the component.
                  </p>
                )}
              </div>
            )}

            {/* No Rules Repo Message */}
            {!hasRulesRepo && (
              <div className="p-4 border border-border/50 bg-muted/20 rounded">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span>
                    No rules repository configured. Content will be set up manually.
                    You can add a GitHub rules repo in campaign settings.
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t border-border">
          {step === "config" && (
            <TerminalButton variant="outline" onClick={handleBack}>
              ← Back
            </TerminalButton>
          )}
          <div className="flex gap-3 ml-auto">
            <TerminalButton variant="outline" onClick={handleClose}>
              Cancel
            </TerminalButton>
            {step === "config" && (
              <TerminalButton
                onClick={handleCreate}
                disabled={!selectedView || !name.trim() || createComponent.isPending}
              >
                {createComponent.isPending ? "Creating..." : "Create Component"}
              </TerminalButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
