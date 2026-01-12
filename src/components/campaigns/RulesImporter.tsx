import { useState, useCallback } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useCreateCampaignUnit } from "@/hooks/useCampaignUnits";
import { useQueryClient } from "@tanstack/react-query";
import { extractTextFromPDF, PDFExtractionProgress, estimateTokens } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import { 
  FileUp, 
  FileText, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown,
  ChevronRight,
  Shield,
  BookOpen,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedUnit {
  name: string;
  faction: string;
  sub_faction?: string | null;
  base_cost: number;
  stats: Record<string, string | number>;
  abilities: Array<{ name: string; effect: string }>;
  equipment_options: Array<{
    name: string;
    cost: number;
    replaces?: string;
    requires?: string[];
    excludes?: string[];
  }>;
  keywords: string[];
}

interface ParsedRule {
  category: string;
  title: string;
  content: string;
  rule_key: string;
}

interface ParseResult {
  gameSystem?: string;
  units: ParsedUnit[];
  rules: ParsedRule[];
  summary?: string;
  error?: string;
}

interface RulesImporterProps {
  campaignId: string;
  onComplete?: () => void;
}

type ImportStep = "upload" | "extracting" | "parsing" | "review" | "importing";

export function RulesImporter({ campaignId, onComplete }: RulesImporterProps) {
  const createUnit = useCreateCampaignUnit();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<PDFExtractionProgress | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState(0);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setExtractionProgress(null);
    setExtractedText("");
    setParseResult(null);
    setSelectedUnits(new Set());
    setSelectedRules(new Set());
    setExpandedItems(new Set());
    setImportProgress(0);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setFile(selectedFile);
    setStep("extracting");

    try {
      // Extract text from PDF in browser
      const result = await extractTextFromPDF(selectedFile, (progress) => {
        setExtractionProgress(progress);
      });

      setExtractedText(result.text);
      const tokens = estimateTokens(result.text);
      
      toast.success(`Extracted ${result.pageCount} pages (~${tokens.toLocaleString()} tokens)`);
      
      // Automatically start AI parsing
      setStep("parsing");
      await parseWithAI(result.text);
      
    } catch (error) {
      console.error("PDF extraction error:", error);
      toast.error("Failed to extract text from PDF");
      setStep("upload");
    }
  };

  const parseWithAI = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("parse-rules-pdf", {
        body: {
          extractedText: text,
          parseMode: "both",
        },
      });

      if (error) throw new Error(error.message);

      const result = data as ParseResult;
      setParseResult(result);

      // Select all by default
      if (result.units?.length) {
        setSelectedUnits(new Set(result.units.map((_, i) => i)));
      }
      if (result.rules?.length) {
        setSelectedRules(new Set(result.rules.map((_, i) => i)));
      }

      setStep("review");
      
      if (result.units?.length || result.rules?.length) {
        toast.success(result.summary || "Content parsed successfully");
      } else {
        toast.warning("No units or rules found in the document");
      }

    } catch (error) {
      console.error("AI parsing error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse content");
      setStep("upload");
    }
  };

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setStep("importing");
    let totalItems = selectedUnits.size + selectedRules.size;
    let imported = 0;

    // Import units
    const unitsToImport = parseResult.units.filter((_, i) => selectedUnits.has(i));
    for (const unit of unitsToImport) {
      try {
        await createUnit.mutateAsync({
          campaign_id: campaignId,
          name: unit.name,
          faction: unit.faction,
          sub_faction: unit.sub_faction || null,
          base_cost: unit.base_cost,
          stats: unit.stats,
          abilities: unit.abilities,
          equipment_options: unit.equipment_options,
          keywords: unit.keywords,
          source: "pdf_import",
          source_ref: file?.name || "imported_pdf",
        });
        imported++;
        setImportProgress(Math.round((imported / totalItems) * 100));
      } catch (error) {
        console.error(`Failed to import unit ${unit.name}:`, error);
      }
    }

    // Import rules
    const rulesToImport = parseResult.rules.filter((_, i) => selectedRules.has(i));
    for (const rule of rulesToImport) {
      try {
        await supabase.from("wargame_rules").upsert({
          campaign_id: campaignId,
          category: rule.category,
          title: rule.title,
          content: { text: rule.content },
          rule_key: `pdf_${rule.rule_key}`,
        }, {
          onConflict: "campaign_id,rule_key",
        });
        imported++;
        setImportProgress(Math.round((imported / totalItems) * 100));
      } catch (error) {
        console.error(`Failed to import rule ${rule.title}:`, error);
      }
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["campaign_units", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["wargame_rules", campaignId] });

    toast.success(`Imported ${imported} of ${totalItems} items`);
    
    if (onComplete) {
      onComplete();
    }
    
    resetState();
  };

  return (
    <div className="space-y-4">
      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Upload your wargame rulebook or army book PDF. The text will be extracted locally in your browser, 
            then AI will parse it into units and rules.
          </div>
          
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              "border-primary/30 hover:border-primary/50 hover:bg-primary/5",
              file && "border-primary bg-primary/5"
            )}
            onClick={() => document.getElementById("pdf-import-input")?.click()}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-import-input"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <FileText className="w-6 h-6" />
                <span className="font-mono">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Click to upload a PDF rulebook
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Text extraction happens in your browser - no file upload to servers
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extracting Step */}
      {step === "extracting" && (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
          <div>
            <p className="text-primary font-mono">EXTRACTING TEXT...</p>
            {extractionProgress && (
              <>
                <p className="text-sm text-muted-foreground mt-2">
                  Page {extractionProgress.currentPage} of {extractionProgress.totalPages}
                </p>
                <Progress value={extractionProgress.percentage} className="w-48 mx-auto mt-2" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Parsing Step */}
      {step === "parsing" && (
        <div className="py-8 text-center space-y-4">
          <Brain className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <div>
            <p className="text-primary font-mono">AI PARSING CONTENT...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Identifying units, rules, and equipment
            </p>
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === "review" && parseResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-primary/10 border border-primary/30 rounded p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono text-primary">
                  {parseResult.gameSystem && `${parseResult.gameSystem} • `}
                  {parseResult.units.length} units, {parseResult.rules.length} rules
                </p>
                {parseResult.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{parseResult.summary}</p>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[300px] border border-border/50 rounded">
            <div className="p-3 space-y-4">
              {/* Units Section */}
              {parseResult.units.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-mono text-primary">
                      <Shield className="w-4 h-4" />
                      Units ({selectedUnits.size}/{parseResult.units.length})
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUnits(new Set(parseResult.units.map((_, i) => i)))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedUnits(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  {parseResult.units.map((unit, i) => (
                    <div
                      key={`unit-${i}`}
                      className={cn(
                        "border rounded text-sm",
                        selectedUnits.has(i) ? "border-primary/50 bg-primary/5" : "border-border/30"
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={selectedUnits.has(i)}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedUnits);
                            newSet.has(i) ? newSet.delete(i) : newSet.add(i);
                            setSelectedUnits(newSet);
                          }}
                        />
                        <button
                          onClick={() => toggleExpanded(`unit-${i}`)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedItems.has(`unit-${i}`) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono">{unit.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {unit.faction} • {unit.base_cost} pts
                          </span>
                        </div>
                      </div>
                      
                      {expandedItems.has(`unit-${i}`) && (
                        <div className="px-3 pb-2 pt-1 border-t border-border/30 text-xs space-y-1 text-muted-foreground">
                          {Object.keys(unit.stats).length > 0 && (
                            <div>Stats: {Object.entries(unit.stats).map(([k, v]) => `${k}: ${v}`).join(", ")}</div>
                          )}
                          {unit.abilities.length > 0 && (
                            <div>Abilities: {unit.abilities.map(a => a.name).join(", ")}</div>
                          )}
                          {unit.keywords.length > 0 && (
                            <div>Keywords: {unit.keywords.join(", ")}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rules Section */}
              {parseResult.rules.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-mono text-primary">
                      <BookOpen className="w-4 h-4" />
                      Rules ({selectedRules.size}/{parseResult.rules.length})
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRules(new Set(parseResult.rules.map((_, i) => i)))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedRules(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  {parseResult.rules.map((rule, i) => (
                    <div
                      key={`rule-${i}`}
                      className={cn(
                        "border rounded text-sm",
                        selectedRules.has(i) ? "border-primary/50 bg-primary/5" : "border-border/30"
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={selectedRules.has(i)}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedRules);
                            newSet.has(i) ? newSet.delete(i) : newSet.add(i);
                            setSelectedRules(newSet);
                          }}
                        />
                        <button
                          onClick={() => toggleExpanded(`rule-${i}`)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedItems.has(`rule-${i}`) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono">{rule.title}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            [{rule.category}]
                          </span>
                        </div>
                      </div>
                      
                      {expandedItems.has(`rule-${i}`) && (
                        <div className="px-3 pb-2 pt-1 border-t border-border/30 text-xs text-muted-foreground whitespace-pre-wrap">
                          {rule.content.substring(0, 300)}
                          {rule.content.length > 300 && "..."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {parseResult.units.length === 0 && parseResult.rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No units or rules could be extracted</p>
                  <p className="text-xs mt-1">Try a different PDF or check the file format</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-3">
            <TerminalButton
              variant="outline"
              onClick={resetState}
              className="flex-1"
            >
              Cancel
            </TerminalButton>
            <TerminalButton
              onClick={handleImport}
              disabled={selectedUnits.size === 0 && selectedRules.size === 0}
              className="flex-1"
            >
              Import {selectedUnits.size + selectedRules.size} Items
            </TerminalButton>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === "importing" && (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
          <div>
            <p className="text-primary font-mono">IMPORTING...</p>
            <Progress value={importProgress} className="w-48 mx-auto mt-3" />
            <p className="text-sm text-muted-foreground mt-2">{importProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
