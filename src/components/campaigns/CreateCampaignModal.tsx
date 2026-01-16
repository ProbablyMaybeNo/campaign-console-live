import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useSaveRules, ExtractedRule } from "@/hooks/useRulesManagement";
import { RulesImporter } from "@/components/rules/RulesImporter";
import { Gamepad2, FileText, SkipForward, CheckCircle } from "lucide-react";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsLimit, setPointsLimit] = useState("1000");
  const [step, setStep] = useState<"details" | "rules">("details");
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const createCampaign = useCreateCampaign();
  const saveRules = useSaveRules();

  const handleDetailsNext = () => {
    if (name.trim()) {
      setStep("rules");
    }
  };

  const handleRulesExtracted = (rules: ExtractedRule[]) => {
    setExtractedRules(rules);
  };

  const handleCreateCampaign = async (skipRules: boolean = false) => {
    setIsSaving(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        name,
        description: description || undefined,
        points_limit: parseInt(pointsLimit) || 1000,
      });

      // Save rules if we have them
      if (!skipRules && extractedRules.length > 0 && campaign) {
        await saveRules.mutateAsync({
          campaignId: campaign.id,
          rules: extractedRules,
        });
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsLimit("1000");
    setStep("details");
    setExtractedRules([]);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isCreating = createCampaign.isPending || saveRules.isPending || isSaving;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm">
            {step === "details" ? "[Create New Campaign]" : "[Import Rules]"}
          </DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
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

            <div className="flex gap-3 pt-2">
              <TerminalButton
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleDetailsNext}
                className="flex-1"
                disabled={!name.trim()}
              >
                Next: Import Rules
              </TerminalButton>
            </div>
          </div>
        )}

        {step === "rules" && (
          <div className="space-y-4">
            {extractedRules.length === 0 ? (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Upload a PDF or paste text to import your wargame rules</span>
                </div>

                <RulesImporter
                  onRulesExtracted={handleRulesExtracted}
                  onCancel={() => setStep("details")}
                  showCancelButton={false}
                />

                <div className="flex gap-3 pt-2 border-t border-border">
                  <TerminalButton
                    variant="outline"
                    onClick={() => setStep("details")}
                    className="flex-1"
                  >
                    Back
                  </TerminalButton>
                  <TerminalButton
                    variant="ghost"
                    onClick={() => handleCreateCampaign(true)}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip for Now
                  </TerminalButton>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded border border-primary/30">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {extractedRules.length} rules ready to import
                  </span>
                </div>

                <div className="border border-border rounded max-h-48 overflow-y-auto p-3">
                  {Object.entries(
                    extractedRules.reduce((acc, r) => {
                      acc[r.category] = (acc[r.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between text-xs py-1">
                      <span className="text-muted-foreground">{cat}</span>
                      <span className="font-mono text-primary">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <TerminalButton
                    variant="outline"
                    onClick={() => setExtractedRules([])}
                    className="flex-1"
                    disabled={isCreating}
                  >
                    Import Different
                  </TerminalButton>
                  <TerminalButton
                    onClick={() => handleCreateCampaign(false)}
                    className="flex-1"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <TerminalLoader text="Creating" size="sm" />
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </TerminalButton>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
