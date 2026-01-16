import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { RulesImporter } from "./RulesImporter";
import { GameSystemPicker } from "./GameSystemPicker";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { Gamepad2, FileUp, ChevronDown, ChevronUp } from "lucide-react";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

type CreateFlowStep = "setup" | "pdf";

type WargameOption = "library" | "pdf";

const WARGAME_PRESETS: Array<{
  value: WargameOption;
  label: string;
  description: string;
  icon: typeof Gamepad2;
}> = [
  { value: "library", label: "Game Library", description: "Choose from imported systems", icon: Gamepad2 },
  { value: "pdf", label: "Upload PDF / Paste Text", description: "Import rules from PDF or text", icon: FileUp },
];

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [flowStep, setFlowStep] = useState<CreateFlowStep>("setup");
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("1000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Game system selection
  const [wargameOption, setWargameOption] = useState<WargameOption>("library");
  const [selectedGameSystemId, setSelectedGameSystemId] = useState<string | null>(null);
  const [selectedGameSystemName, setSelectedGameSystemName] = useState<string>("");

  const createCampaign = useCreateCampaign();

  const resetForm = () => {
    setFlowStep("setup");
    setCreatedCampaignId(null);

    setName("");
    setDescription("");
    setPointsLimit("1000");
    setShowAdvanced(false);
    setWargameOption("library");
    setSelectedGameSystemId(null);
    setSelectedGameSystemName("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create the campaign first
    const campaign = await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      points_limit: parseInt(pointsLimit) || 1000,
      game_system_id: wargameOption === "library" && selectedGameSystemId ? selectedGameSystemId : undefined,
    });

    // PDF flow: keep modal open and jump into importer
    if (wargameOption === "pdf" && campaign?.id) {
      setCreatedCampaignId(campaign.id);
      setFlowStep("pdf");
      return;
    }

    // Otherwise: close
    resetForm();
    onClose();
  };

  const isCreating = createCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className={
          flowStep === "pdf"
            ? "bg-card border-primary/30 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            : "bg-card border-primary/30 max-w-lg"
        }
      >
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm">
            {flowStep === "pdf" ? "[Import Rules]" : "[Create New Campaign]"}
          </DialogTitle>
        </DialogHeader>

        {flowStep === "setup" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <TerminalInput
              label="Campaign Name"
              placeholder="Enter campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Description
              </label>
              <textarea
                className="flex w-full bg-input border border-border p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 min-h-[80px] resize-none"
                placeholder="Describe your campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <TerminalInput
              label="Points Limit"
              type="number"
              placeholder="1000"
              value={pointsLimit}
              onChange={(e) => setPointsLimit(e.target.value)}
            />

            {/* Game System Selection */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                <Gamepad2 className="w-3 h-3" />
                Game System
              </label>
              <GameSystemPicker
                value={selectedGameSystemId}
                onChange={(id, name) => {
                  setSelectedGameSystemId(id);
                  setSelectedGameSystemName(name || "");
                  if (id) setWargameOption("library");
                }}
              />
              {selectedGameSystemName && (
                <p className="text-[10px] text-primary/70">
                  Units and rules from {selectedGameSystemName} will be available in this campaign
                </p>
              )}
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-4 animate-fade-in border border-border/50 p-4 bg-muted/20">
                {/* Wargame Source Options */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Import Custom Rules
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {WARGAME_PRESETS.filter(p => p.value !== "library").map((option) => {
                      const Icon = option.icon;
                      const isActive = wargameOption === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setWargameOption(option.value);
                            setSelectedGameSystemId(null);
                            setSelectedGameSystemName("");
                          }}
                          className={`p-3 border text-left transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent"
                          }`}
                        >
                          <p className="text-xs font-mono uppercase flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            {option.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <TerminalButton
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isCreating}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                type="submit"
                className="flex-1"
                disabled={!name.trim() || isCreating}
              >
                {isCreating ? (
                  <TerminalLoader text="Creating" size="sm" />
                ) : wargameOption === "pdf" ? (
                  "Create & Import Rules"
                ) : (
                  "Create Campaign"
                )}
              </TerminalButton>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {createdCampaignId ? (
              <div className="flex-1 min-h-0 overflow-auto">
                <RulesImporter campaignId={createdCampaignId} onComplete={handleClose} />
              </div>
            ) : (
              <div className="flex justify-center py-10">
                <TerminalLoader text="Preparing importer" />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border mt-4">
              <TerminalButton type="button" variant="outline" onClick={handleClose} className="flex-1">
                Skip for now
              </TerminalButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
