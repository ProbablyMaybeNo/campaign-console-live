import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { RepoImporter } from "./RepoImporter";
import { ManualRuleCreator } from "./ManualRuleCreator";
import { SimpleAIFormatter } from "./SimpleAIFormatter";
import { RulesPreview } from "../RulesPreview";
import { useSaveRules } from "@/hooks/useRulesManagement";
import type { ExtractedRule, PreviewRule } from "@/types/rules";
import { 
  Github, 
  PenLine, 
  Wand2,
  X,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface RulesImportHubProps {
  campaignId: string;
  onComplete: (summary: { totalRules: number; categories: Record<string, number> }) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

type ImportMethod = "repo" | "manual" | "ai";
type HubStep = "select" | "import" | "preview" | "complete";

export function RulesImportHub({ 
  campaignId, 
  onComplete, 
  onCancel,
  showCancelButton = false 
}: RulesImportHubProps) {
  const [step, setStep] = useState<HubStep>("select");
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>("manual");
  const [collectedRules, setCollectedRules] = useState<ExtractedRule[]>([]);
  const [finalResult, setFinalResult] = useState<{ totalRules: number; categories: Record<string, number> } | null>(null);

  const saveRules = useSaveRules();

  const importMethods = [
    {
      id: "repo" as ImportMethod,
      label: "Repository",
      icon: Github,
      description: "Import from community JSON/YAML data repos",
      recommended: true
    },
    {
      id: "manual" as ImportMethod,
      label: "Manual Entry",
      icon: PenLine,
      description: "Create rules with structured forms"
    },
    {
      id: "ai" as ImportMethod,
      label: "AI Formatter",
      icon: Wand2,
      description: "Paste text and AI formats it"
    }
  ];

  const handleAddRules = (rules: ExtractedRule[]) => {
    setCollectedRules(prev => [...prev, ...rules]);
  };

  const handleImportComplete = (rules: ExtractedRule[]) => {
    setCollectedRules(prev => [...prev, ...rules]);
    setStep("preview");
  };

  const handleMethodComplete = () => {
    if (collectedRules.length > 0) {
      setStep("preview");
    }
  };

  const handleBackToMethod = () => {
    setStep("import");
  };

  const handleSaveAll = async () => {
    if (collectedRules.length === 0) return;

    try {
      await saveRules.mutateAsync({
        campaignId,
        rules: collectedRules
      });

      const categories = collectedRules.reduce((acc, rule) => {
        acc[rule.category] = (acc[rule.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setFinalResult({ totalRules: collectedRules.length, categories });
      setStep("complete");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleUpdatePreviewRule = (index: number, rule: PreviewRule) => {
    setCollectedRules(prev => prev.map((r, i) => i === index ? rule as ExtractedRule : r));
  };

  const handleDeletePreviewRule = (index: number) => {
    setCollectedRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setStep("select");
    setCollectedRules([]);
    setFinalResult(null);
  };

  // Complete step
  if (step === "complete" && finalResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Saved {finalResult.totalRules} rules in {Object.keys(finalResult.categories).length} categories
            </span>
          </div>
          <TerminalButton variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Import More
          </TerminalButton>
        </div>

        <div className="border border-border rounded max-h-64 overflow-y-auto">
          {Object.entries(finalResult.categories).map(([category, count]) => (
            <div key={category} className="border-b border-border last:border-b-0">
              <div className="w-full flex items-center justify-between p-3 text-left">
                <span className="text-sm font-mono text-primary">{category}</span>
                <span className="text-xs text-muted-foreground">{count} rules</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {showCancelButton && onCancel && (
            <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </TerminalButton>
          )}
          <TerminalButton onClick={() => onComplete(finalResult)} className="flex-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            Done
          </TerminalButton>
        </div>
      </div>
    );
  }

  // Preview step
  if (step === "preview") {
    return (
      <RulesPreview
        rules={collectedRules as PreviewRule[]}
        sourceTexts={[]}
        onUpdateRule={handleUpdatePreviewRule}
        onDeleteRule={handleDeletePreviewRule}
        onAddRule={(rule) => setCollectedRules(prev => [...prev, rule as ExtractedRule])}
        onSaveAll={handleSaveAll}
        onCancel={handleBackToMethod}
        isSaving={saveRules.isPending}
      />
    );
  }

  // Import step - show selected method
  if (step === "import") {
    return (
      <div className="space-y-4">
        {/* Method tabs */}
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as ImportMethod)}>
          <TabsList className="w-full grid grid-cols-3">
            {importMethods.map((method) => {
              const Icon = method.icon;
              return (
                <TabsTrigger key={method.id} value={method.id} className="text-xs">
                  <Icon className="w-3 h-3 mr-1" />
                  {method.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="repo" className="mt-4">
            <RepoImporter
              campaignId={campaignId}
              onImportComplete={handleImportComplete}
              onCancel={() => setStep("select")}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualRuleCreator
              onAddRule={(rule) => handleAddRules([rule])}
              onComplete={handleMethodComplete}
              onCancel={() => setStep("select")}
              existingRules={collectedRules}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <SimpleAIFormatter
              campaignId={campaignId}
              onAddRules={handleAddRules}
              onComplete={handleMethodComplete}
              onCancel={() => setStep("select")}
              existingRules={collectedRules}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Select method step
  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-sm font-medium">Import Rules</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose how you'd like to add rules to your campaign
        </p>
      </div>

      <div className="grid gap-3">
        {importMethods.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                setStep("import");
              }}
              className={`flex items-start gap-3 p-4 text-left border rounded-lg transition-all hover:border-primary/50 hover:bg-primary/5 ${
                method.recommended ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className={`p-2 rounded ${method.recommended ? "bg-primary/20 text-primary" : "bg-muted"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{method.label}</span>
                  {method.recommended && (
                    <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {showCancelButton && onCancel && (
        <TerminalButton variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </TerminalButton>
      )}
    </div>
  );
}
