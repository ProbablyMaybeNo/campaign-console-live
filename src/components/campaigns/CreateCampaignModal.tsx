import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCreateCampaign } from "@/hooks/useCampaigns";
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
  const [step, setStep] = useState<"details" | "creating" | "rules" | "done">("details");
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [rulesSummary, setRulesSummary] = useState<{ totalRules: number; categories: Record<string, number> } | null>(null);
  
  const createCampaign = useCreateCampaign();

  const handleCreateAndImportRules = async () => {
    setStep("creating");
    try {
      const campaign = await createCampaign.mutateAsync({
        name,
        description: description || undefined,
        points_limit: parseInt(pointsLimit) || 1000,
      });

      if (campaign) {
        setCreatedCampaignId(campaign.id);
        setStep("rules");
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
      setStep("details");
    }
  };

  const handleSkipRules = async () => {
    setStep("creating");
    try {
      await createCampaign.mutateAsync({
        name,
        description: description || undefined,
        points_limit: parseInt(pointsLimit) || 1000,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to create campaign:", error);
      setStep("details");
    }
  };

  const handleExtractionComplete = (summary: { totalRules: number; categories: Record<string, number> }) => {
    setRulesSummary(summary);
    setStep("done");
  };

  const handleFinish = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsLimit("1000");
    setStep("details");
    setCreatedCampaignId(null);
    setRulesSummary(null);
  };

  const handleClose = () => {
    // If campaign was created, just close (don't reset)
    if (createdCampaignId) {
      onClose();
      // Reset after close animation
      setTimeout(resetForm, 300);
    } else {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm">
            {step === "details" && "[Create New Campaign]"}
            {step === "creating" && "[Creating Campaign]"}
            {step === "rules" && "[Import Rules]"}
            {step === "done" && "[Campaign Created]"}
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
                onClick={handleCreateAndImportRules}
                className="flex-1"
                disabled={!name.trim()}
              >
                Next: Import Rules
              </TerminalButton>
            </div>
          </div>
        )}

        {step === "creating" && (
          <div className="flex flex-col items-center justify-center py-12">
            <TerminalLoader text="Creating campaign" />
          </div>
        )}

        {step === "rules" && createdCampaignId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border">
              <Gamepad2 className="w-4 h-4" />
              <span>Upload a PDF or paste text to import your wargame rules</span>
            </div>

            <RulesImporter
              campaignId={createdCampaignId}
              onExtractionComplete={handleExtractionComplete}
              onCancel={handleFinish}
              showCancelButton={false}
            />

            <div className="flex gap-3 pt-2 border-t border-border">
              <TerminalButton
                variant="ghost"
                onClick={handleFinish}
                className="flex-1"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip for Now
              </TerminalButton>
            </div>
          </div>
        )}

        {step === "done" && rulesSummary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded border border-primary/30">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                Campaign created with {rulesSummary.totalRules} rules
              </span>
            </div>

            <div className="border border-border rounded max-h-48 overflow-y-auto p-3">
              {Object.entries(rulesSummary.categories).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-mono text-primary">{count}</span>
                </div>
              ))}
            </div>

            <TerminalButton onClick={handleFinish} className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Open Campaign
            </TerminalButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
