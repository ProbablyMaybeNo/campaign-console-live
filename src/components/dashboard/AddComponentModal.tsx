import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useEntitlements, isFeatureLocked } from "@/hooks/useEntitlements";
import { getSpawnPosition } from "@/lib/canvasPlacement";
import { PasteWizardOverlay } from "./PasteWizardOverlay";
import { 
  Table, 
  LayoutList, 
  Dices,
  Image,
  Hash,
  Map,
  Users,
  Calendar,
  Activity,
  History,
  Megaphone,
  FileText,
  Sticker,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AddComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

type SupporterFeatureType = 'smart_paste' | 'themes' | 'banner' | 'text_widget' | 'stickers';

interface ComponentTypeConfig {
  type: string;
  label: string;
  icon: React.ElementType;
  description: string;
  usesPasteWizard?: boolean;
  saveToRules?: boolean;
  isCustom?: boolean;
  supporterFeature?: SupporterFeatureType;
}

const COMPONENT_TYPES: ComponentTypeConfig[] = [
  { type: "rules_table", label: "Rules Table", icon: Table, description: "Table linked to Rules overlay", usesPasteWizard: true, saveToRules: true, supporterFeature: "smart_paste" },
  { type: "rules_card", label: "Rules Card", icon: LayoutList, description: "Card linked to Rules overlay", usesPasteWizard: true, saveToRules: true, supporterFeature: "smart_paste" },
  { type: "custom_table", label: "Custom Table", icon: Table, description: "Blank table for manual entry", usesPasteWizard: true, isCustom: true, saveToRules: true },
  { type: "custom_card", label: "Custom Card", icon: LayoutList, description: "Blank card for manual entry", usesPasteWizard: true, isCustom: true, saveToRules: true },
  { type: "narrative_table", label: "Narrative", icon: LayoutList, description: "Display narrative events" },
  { type: "counter", label: "Counter", icon: Hash, description: "Numeric tracker with +/- controls" },
  { type: "image", label: "Image", icon: Image, description: "Display an image or map" },
  { type: "dice_roller", label: "Dice Roller", icon: Dices, description: "Roll configurable dice" },
  { type: "roll_recorder", label: "Roll History", icon: History, description: "Track dice roll history" },
  { type: "map", label: "Map", icon: Map, description: "Live campaign map with markers" },
  { type: "player_list", label: "Player List", icon: Users, description: "Configurable player roster table" },
  { type: "calendar", label: "Calendar", icon: Calendar, description: "Monthly view of rounds and events" },
  { type: "activity_feed", label: "Activity", icon: Activity, description: "Real-time campaign activity log" },
  { type: "announcements", label: "Announce", icon: Megaphone, description: "GM notice board" },
  { type: "text", label: "Text", icon: FileText, description: "Markdown notes widget", supporterFeature: "text_widget" },
  { type: "sticker", label: "Sticker", icon: Sticker, description: "Decorative icon marker", supporterFeature: "stickers" },
];

export function AddComponentModal({ open, onOpenChange, campaignId }: AddComponentModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [showPasteWizard, setShowPasteWizard] = useState(false);
  const navigate = useNavigate();
  
  const createComponent = useCreateComponent();
  const { entitlements } = useEntitlements();

  const selectedTypeData = useMemo(() => 
    COMPONENT_TYPES.find(v => v.type === selectedType), 
    [selectedType]
  );

  const handleTypeSelect = (type: string) => {
    const typeData = COMPONENT_TYPES.find(v => v.type === type);
    
    // Check if feature is locked
    if (typeData?.supporterFeature && isFeatureLocked(entitlements, typeData.supporterFeature)) {
      // Don't proceed - show upgrade prompt
      return;
    }
    
    // If type uses paste wizard, open it immediately
    if (typeData?.usesPasteWizard) {
      setSelectedType(type);
      setName(`New ${typeData.label}`);
      setShowPasteWizard(true);
    } else {
      setSelectedType(type);
      if (typeData) {
        setName(`New ${typeData.label}`);
      }
    }
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    // Build config based on type
    const config: Record<string, string | boolean | number | string[] | null> = {};

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

    if (selectedType === "text") {
      config.content = "";
    }

    if (selectedType === "sticker") {
      config.icon = "Star";
      config.size = "md";
      config.color = "hsl(142, 76%, 55%)";
    }

    // Determine component size based on type
    let width = 350;
    let height = 300;
    if (selectedType === "counter" || selectedType === "dice_roller") {
      width = 200;
      height = 200;
    } else if (selectedType === "map") {
      width = 450;
      height = 400;
    } else if (selectedType === "player_list") {
      width = 500;
      height = 350;
      config.columns = ["name", "faction", "current_points"];
    } else if (selectedType === "calendar") {
      width = 450;
      height = 400;
    } else if (selectedType === "activity_feed") {
      width = 350;
      height = 400;
    } else if (selectedType === "roll_recorder") {
      width = 320;
      height = 350;
    } else if (selectedType === "announcements") {
      width = 380;
      height = 400;
    } else if (selectedType === "text") {
      width = 300;
      height = 250;
    } else if (selectedType === "sticker") {
      width = 120;
      height = 120;
    }

    // Spawn at canvas center with slight offset to not overlap existing components
    const offset = { x: Math.random() * 100 - 50, y: Math.random() * 100 - 50 };
    const placement = getSpawnPosition(width, height, offset);

    await createComponent.mutateAsync({
      campaign_id: campaignId,
      name: name.trim(),
      component_type: selectedType,
      config,
      position_x: placement.position_x,
      position_y: placement.position_y,
      width,
      height,
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setName("");
    setShowPasteWizard(false);
    onOpenChange(false);
  };

  const handlePasteWizardClose = () => {
    setShowPasteWizard(false);
    setSelectedType(null);
    setName("");
  };

  const handlePasteWizardComplete = () => {
    handleClose();
  };

  // Show paste wizard if selected type uses it
  if (showPasteWizard && selectedType && selectedTypeData) {
    const componentType = selectedType.includes('table') ? 'table' : 'card';
    return (
      <PasteWizardOverlay
        open={showPasteWizard}
        onOpenChange={(open) => {
          if (!open) handlePasteWizardClose();
        }}
        campaignId={campaignId}
        componentType={componentType as "table" | "card"}
        saveToRules={selectedTypeData.saveToRules}
        isCustom={selectedTypeData.isCustom}
        onComplete={handlePasteWizardComplete}
      />
    );
  }

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
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {COMPONENT_TYPES.map(({ type, label, icon: Icon, supporterFeature }) => {
                const isLocked = supporterFeature && isFeatureLocked(entitlements, supporterFeature);
                
                const buttonContent = (
                  <button
                    key={type}
                    onClick={() => !isLocked && handleTypeSelect(type)}
                    className={`p-2.5 border rounded text-center transition-all duration-200 relative group ${
                      selectedType === type
                        ? "border-primary bg-primary/15 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                        : isLocked
                          ? "border-border/30 bg-muted/20 cursor-not-allowed"
                          : "border-border hover:border-primary/60 hover:bg-primary/10 hover:scale-105 hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                    }`}
                    disabled={isLocked}
                  >
                    <div className={`transition-all duration-200 ${isLocked ? "opacity-40" : "group-hover:scale-110"}`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 transition-colors duration-200 ${
                        selectedType === type ? "text-primary" : 
                        isLocked ? "text-muted-foreground" : "text-muted-foreground group-hover:text-primary"
                      }`} />
                      <p className={`text-[10px] font-mono uppercase leading-tight transition-colors duration-200 ${
                        !isLocked && "group-hover:text-foreground"
                      }`}>{label}</p>
                    </div>
                    {isLocked && (
                      <div className="flex flex-col items-center mt-1">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground uppercase">Locked</span>
                      </div>
                    )}
                  </button>
                );

                if (isLocked) {
                  return (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        {buttonContent}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs mb-2">
                          Unlock {label} with Supporter ($2.99/mo)
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/settings?tab=billing");
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Upgrade →
                        </button>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return buttonContent;
              })}
            </div>
          </div>

          {/* Configuration Section - Only for non-paste-wizard types */}
          {selectedType && selectedTypeData && !selectedTypeData.usesPasteWizard && (
            <div className="space-y-4 border-t border-border pt-4 animate-fade-in">
              {/* Component Name */}
              <TerminalInput
                label="Component Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter component name..."
              />

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

              {selectedType === "map" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Shows the campaign map with live updates. Configure the map via the Map overlay.
                </p>
              )}

              {selectedType === "player_list" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Shows a configurable table of all players. Choose which columns to display (name, faction, points, etc.) from the widget settings.
                </p>
              )}

              {selectedType === "calendar" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Displays a monthly calendar with rounds and events. Manage schedule via the Schedule overlay.
                </p>
              )}

              {selectedType === "activity_feed" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Shows real-time campaign activity including player joins, messages, and warband updates.
                </p>
              )}

              {selectedType === "roll_recorder" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  Displays a real-time log of all dice rolls from Dice Roller widgets, showing player name, roll results, and timestamp.
                </p>
              )}

              {selectedType === "announcements" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  GM notice board for campaign updates. Optionally send announcements as private messages to selected players.
                </p>
              )}

              {selectedType === "text" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  A text widget for notes and markdown content. Perfect for house rules, session notes, or any custom text.
                </p>
              )}

              {selectedType === "sticker" && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                  A decorative icon marker. Choose from dozens of icons to mark objectives, danger zones, or points of interest.
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

        {/* Actions - Only show for non-paste-wizard types */}
        {selectedType && selectedTypeData && !selectedTypeData.usesPasteWizard && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
