import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wand2, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RULE_CATEGORIES, type ExtractedRule } from "@/types/rules";

interface SimpleAIFormatterProps {
  campaignId: string;
  onAddRules: (rules: ExtractedRule[]) => void;
  onComplete: () => void;
  onCancel: () => void;
  existingRules: ExtractedRule[];
}

export function SimpleAIFormatter({ 
  campaignId,
  onAddRules, 
  onComplete,
  onCancel,
  existingRules 
}: SimpleAIFormatterProps) {
  const [pastedText, setPastedText] = useState("");
  const [category, setCategory] = useState<string>("Core Rules");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formattedRules, setFormattedRules] = useState<ExtractedRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatWithAI = async () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some text to format");
      return;
    }

    if (pastedText.trim().length < 20) {
      toast.error("Please paste more text (at least 20 characters)");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFormattedRules([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("extract-rules", {
        body: {
          content: pastedText,
          sourceType: "text",
          sourceName: "Pasted text",
          campaignId,
          previewMode: true,
          simpleFormat: true, // Signal to just format, not extract from PDF
          suggestedCategory: category,
        },
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || "Failed to format text");

      const rules = (data.rules || []) as ExtractedRule[];
      
      if (rules.length === 0) {
        setError("Could not identify any structured rules in the pasted text. Try pasting a clearer table or list format.");
      } else {
        setFormattedRules(rules);
        toast.success(`Formatted ${rules.length} rule${rules.length !== 1 ? "s" : ""}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to format text";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptRules = () => {
    if (formattedRules.length === 0) return;
    onAddRules(formattedRules);
    setFormattedRules([]);
    setPastedText("");
    toast.success(`Added ${formattedRules.length} rules`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wand2 className="w-4 h-4 text-primary" />
        AI Text Formatter
      </div>

      <p className="text-xs text-muted-foreground">
        Paste a table or list from a rulebook, and AI will format it into structured data.
        <strong className="text-foreground"> This works best with clearly formatted tables.</strong>
      </p>

      {/* Added rules counter */}
      {existingRules.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-xs">{existingRules.length} rule{existingRules.length !== 1 ? "s" : ""} added so far</span>
        </div>
      )}

      {/* Category Hint */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Suggested Category
        </label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Paste Text Here
          </label>
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setPastedText(text);
                toast.success("Pasted from clipboard");
              } catch {
                toast.error("Could not read clipboard");
              }
            }}
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Paste
          </button>
        </div>
        <Textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder={`Example:
D6  EXPLORATION TABLE
1   Find Nothing
2   Discover Treasure (1D6 Gold)
3   Encounter Enemy Scout
4   Find Hidden Path
5   Locate Ancient Relic
6   Ambush! Roll for initiative`}
          className="min-h-[150px] font-mono text-xs resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          {pastedText.length} characters
        </p>
      </div>

      {/* Format Button */}
      <TerminalButton 
        onClick={formatWithAI}
        disabled={isProcessing || pastedText.trim().length < 20}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Formatting...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Format with AI
          </>
        )}
      </TerminalButton>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-xs text-destructive">{error}</div>
        </div>
      )}

      {/* Formatted Rules Preview */}
      {formattedRules.length > 0 && (
        <div className="space-y-2 border border-primary/30 rounded p-3 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{formattedRules.length} rules formatted</span>
            </div>
            <TerminalButton size="sm" onClick={handleAcceptRules}>
              Accept All
            </TerminalButton>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-1">
            {formattedRules.map((rule, idx) => (
              <div key={idx} className="p-2 bg-background border border-border rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-medium">{rule.title}</span>
                  <span className="text-[10px] text-muted-foreground">{rule.content.type}</span>
                </div>
                {rule.content.type === "roll_table" && (
                  <span className="text-muted-foreground">
                    {(rule.content as { entries?: unknown[] }).entries?.length || 0} entries
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </TerminalButton>
        <TerminalButton
          onClick={onComplete}
          disabled={existingRules.length === 0}
          className="flex-1"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Save {existingRules.length} Rules
        </TerminalButton>
      </div>
    </div>
  );
}
