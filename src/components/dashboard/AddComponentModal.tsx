import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { Scroll, Table, List, BookOpen, Users, Map, MessageSquare, Calendar } from "lucide-react";

interface AddComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const COMPONENT_TYPES = [
  { type: "rules", label: "Rules Panel", icon: Scroll, description: "Display game rules from repository" },
  { type: "table", label: "Data Table", icon: Table, description: "Tabular data display" },
  { type: "card_list", label: "Card List", icon: List, description: "Warband/unit cards" },
  { type: "narrative", label: "Narrative", icon: BookOpen, description: "Campaign story events" },
  { type: "players", label: "Players", icon: Users, description: "Player roster & stats" },
  { type: "map", label: "Campaign Map", icon: Map, description: "Interactive territory map" },
  { type: "messages", label: "Messages", icon: MessageSquare, description: "Real-time chat feed" },
  { type: "schedule", label: "Schedule", icon: Calendar, description: "Game schedule & rounds" },
];

export function AddComponentModal({ open, onOpenChange, campaignId }: AddComponentModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const createComponent = useCreateComponent();

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    await createComponent.mutateAsync({
      campaign_id: campaignId,
      name: name.trim(),
      component_type: selectedType,
      position_x: 100 + Math.random() * 200,
      position_y: 100 + Math.random() * 200,
    });

    setSelectedType(null);
    setName("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedType(null);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider">
            {">"} Add Component
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Component Type Selection */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
              Select Component Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMPONENT_TYPES.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-3 border rounded text-left transition-all ${
                    selectedType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <p className="text-xs font-mono uppercase">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Component Name */}
          {selectedType && (
            <div className="animate-fade-in">
              <TerminalInput
                label="Component Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter component name..."
              />
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
            {createComponent.isPending ? "Creating..." : "Add Component"}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
