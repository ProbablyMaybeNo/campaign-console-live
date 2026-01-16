import { useState, useCallback } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { extractTextFromPDF, PDFExtractionProgress, estimateTokens } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import { 
  FileUp, 
  FileText, 
  Brain, 
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  ClipboardPaste,
  Save,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractedRule {
  category: string;
  title: string;
  rule_key: string;
  content: {
    type: "text" | "roll_table" | "keyword" | "equipment" | "unit_profile";
    text?: string;
    dice?: string;
    entries?: Array<{ roll: string; result: string; effect?: string }>;
    name?: string;
    effect?: string;
    cost?: number;
    stats?: Record<string, string | number>;
    properties?: Record<string, string>;
  };
}

interface ExtractResult {
  gameSystem?: string;
  rules: ExtractedRule[];
  summary?: string;
  error?: string;
}

interface RulesImporterProps {
  campaignId: string;
  onComplete?: () => void;
}

type ImportStep = "input" | "extracting" | "parsing" | "review" | "importing";
type InputMethod = "pdf" | "paste";

export function RulesImporter({ campaignId, onComplete }: RulesImporterProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>("input");
  const [inputMethod, setInputMethod] = useState<InputMethod>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [keepPdf, setKeepPdf] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<PDFExtractionProgress | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState(0);

  const resetState = useCallback(() => {
    setStep("input");
    setFile(null);
    setPastedText("");
    setExtractionProgress(null);
    setExtractedText("");
    setExtractResult(null);
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
      setStep("input");
    }
  };

  const handlePastedTextProcess = async () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some text first");
      return;
    }

    setExtractedText(pastedText);
    setStep("parsing");
    await parseWithAI(pastedText);
  };

  const parseWithAI = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("extract-rules", {
        body: {
          extractedText: text,
        },
      });

      if (error) throw new Error(error.message);

      const result = data as ExtractResult;
      setExtractResult(result);

      // Select all by default
      if (result.rules?.length) {
        setSelectedRules(new Set(result.rules.map((_, i) => i)));
      }

      setStep("review");
      
      if (result.rules?.length) {
        toast.success(result.summary || "Rules extracted successfully");
      } else {
        toast.warning("No structured rules found in the document");
      }

    } catch (error) {
      console.error("AI parsing error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse content");
      setStep("input");
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
    if (!extractResult) return;

    setStep("importing");
    const rulesToImport = extractResult.rules.filter((_, i) => selectedRules.has(i));
    let imported = 0;

    // Optionally save PDF to storage
    if (keepPdf && file) {
      try {
        const filePath = `${campaignId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("campaign-documents")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Failed to upload PDF:", uploadError);
        } else {
          // Save reference to campaign_documents table
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("campaign_documents").insert({
              campaign_id: campaignId,
              name: file.name,
              file_path: filePath,
              file_type: "application/pdf",
              file_size: file.size,
              uploaded_by: user.id,
            });
          }
        }
      } catch (error) {
        console.error("Error saving PDF:", error);
      }
    }

    // Import rules
    for (const rule of rulesToImport) {
      try {
        await supabase.from("wargame_rules").upsert({
          campaign_id: campaignId,
          category: rule.category,
          title: rule.title,
          content: rule.content,
          rule_key: `imported_${rule.rule_key}`,
        }, {
          onConflict: "campaign_id,rule_key",
        });
        imported++;
        setImportProgress(Math.round((imported / rulesToImport.length) * 100));
      } catch (error) {
        console.error(`Failed to import rule ${rule.title}:`, error);
      }
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["wargame_rules", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign_documents", campaignId] });

    toast.success(`Imported ${imported} of ${rulesToImport.length} rules`);
    
    if (onComplete) {
      onComplete();
    }
    
    resetState();
  };

  // Group rules by category for display
  const groupedRules = extractResult?.rules.reduce((acc, rule, index) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push({ ...rule, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<ExtractedRule & { originalIndex: number }>>) || {};

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "roll_table": return "🎲";
      case "keyword": return "⚡";
      case "equipment": return "⚔️";
      case "unit_profile": return "👤";
      default: return "📜";
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Step */}
      {step === "input" && (
        <div className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as InputMethod)}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                Upload PDF
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" />
                Paste Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Upload your wargame rulebook or campaign supplement PDF. Text is extracted locally in your browser, 
                then AI parses it into structured rules.
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

              {/* Keep PDF Option */}
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="keep-pdf"
                  checked={keepPdf}
                  onCheckedChange={(checked) => setKeepPdf(checked === true)}
                />
                <label htmlFor="keep-pdf" className="text-muted-foreground cursor-pointer">
                  Keep PDF for future reference (uses storage)
                </label>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Paste text directly from your rulebook. Great for copying specific sections like injury tables,
                campaign rules, or equipment lists.
              </div>

              <Textarea
                placeholder="Paste your rules text here...&#10;&#10;Example:&#10;INJURY TABLE (2D6)&#10;2-4: Dead - Remove model from campaign&#10;5-6: Serious Injury - Miss next game&#10;7-9: Minor Wound - No effect&#10;10-12: Full Recovery"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {pastedText.length > 0 && `~${estimateTokens(pastedText).toLocaleString()} tokens`}
                </span>
                <TerminalButton
                  onClick={handlePastedTextProcess}
                  disabled={!pastedText.trim()}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Process with AI
                </TerminalButton>
              </div>
            </TabsContent>
          </Tabs>
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
            <p className="text-primary font-mono">AI EXTRACTING RULES...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Detecting tables, keywords, equipment, and campaign rules
            </p>
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === "review" && extractResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-primary/10 border border-primary/30 rounded p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono text-primary">
                  {extractResult.gameSystem && `${extractResult.gameSystem} • `}
                  {extractResult.rules.length} rules extracted
                </p>
                {extractResult.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{extractResult.summary}</p>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[350px] border border-border/50 rounded">
            <div className="p-3 space-y-4">
              {Object.entries(groupedRules).map(([category, rules]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-mono text-primary">
                      <BookOpen className="w-4 h-4" />
                      {category} ({rules.filter(r => selectedRules.has(r.originalIndex)).length}/{rules.length})
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedRules);
                          rules.forEach(r => newSet.add(r.originalIndex));
                          setSelectedRules(newSet);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedRules);
                          rules.forEach(r => newSet.delete(r.originalIndex));
                          setSelectedRules(newSet);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  {rules.map((rule) => (
                    <div
                      key={`rule-${rule.originalIndex}`}
                      className={cn(
                        "border rounded text-sm",
                        selectedRules.has(rule.originalIndex) ? "border-primary/50 bg-primary/5" : "border-border/30"
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={selectedRules.has(rule.originalIndex)}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedRules);
                            newSet.has(rule.originalIndex) ? newSet.delete(rule.originalIndex) : newSet.add(rule.originalIndex);
                            setSelectedRules(newSet);
                          }}
                        />
                        <button
                          onClick={() => toggleExpanded(`rule-${rule.originalIndex}`)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedItems.has(`rule-${rule.originalIndex}`) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-base">{getRuleTypeIcon(rule.content.type)}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono">{rule.title}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            [{rule.content.type}]
                          </span>
                        </div>
                      </div>
                      
                      {expandedItems.has(`rule-${rule.originalIndex}`) && (
                        <div className="px-3 pb-2 pt-1 border-t border-border/30 text-xs text-muted-foreground">
                          {rule.content.type === "roll_table" && rule.content.entries && (
                            <div className="space-y-1">
                              <p className="text-primary font-mono">{rule.content.dice || "Roll"}</p>
                              {rule.content.entries.slice(0, 5).map((entry, i) => (
                                <p key={i}><strong>{entry.roll}:</strong> {entry.result} {entry.effect && `- ${entry.effect}`}</p>
                              ))}
                              {rule.content.entries.length > 5 && (
                                <p className="italic">...and {rule.content.entries.length - 5} more entries</p>
                              )}
                            </div>
                          )}
                          {rule.content.type === "keyword" && (
                            <p><strong>{rule.content.name}:</strong> {rule.content.effect}</p>
                          )}
                          {rule.content.type === "equipment" && (
                            <div>
                              <p><strong>{rule.content.name}</strong> {rule.content.cost && `(${rule.content.cost} pts)`}</p>
                              {rule.content.properties && (
                                <p>{Object.entries(rule.content.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
                              )}
                            </div>
                          )}
                          {rule.content.type === "text" && (
                            <p className="whitespace-pre-wrap">{rule.content.text?.substring(0, 300)}{(rule.content.text?.length || 0) > 300 && "..."}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-2">
            <TerminalButton variant="ghost" onClick={resetState}>
              <Trash2 className="w-4 h-4 mr-2" />
              Start Over
            </TerminalButton>
            <TerminalButton
              onClick={handleImport}
              disabled={selectedRules.size === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Import {selectedRules.size} Rules
            </TerminalButton>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === "importing" && (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
          <div>
            <p className="text-primary font-mono">IMPORTING RULES...</p>
            <Progress value={importProgress} className="w-48 mx-auto mt-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {importProgress}% complete
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
