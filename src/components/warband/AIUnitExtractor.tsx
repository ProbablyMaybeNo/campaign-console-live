import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { supabase } from "@/integrations/supabase/client";
import { useCreateCampaignUnit, CampaignUnit } from "@/hooks/useCampaignUnits";
import { 
  Upload, 
  Brain, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExtractedUnit {
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

interface ExtractionResult {
  units: ExtractedUnit[];
  gameSystem?: string;
  extractionNotes?: string;
  error?: string;
}

interface AIUnitExtractorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function AIUnitExtractor({ open, onOpenChange, campaignId }: AIUnitExtractorProps) {
  const createUnit = useCreateCampaignUnit();
  
  const [step, setStep] = useState<"upload" | "processing" | "review" | "importing">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [gameSystem, setGameSystem] = useState("");
  
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setTextContent("");
    setFactionFilter("");
    setGameSystem("");
    setExtractionResult(null);
    setSelectedUnits(new Set());
    setExpandedUnits(new Set());
    setImportProgress(0);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTextContent(content);
      };
      
      if (selectedFile.type === "application/pdf") {
        // For PDFs, we'll send the raw text that the AI can parse
        // In production, you'd use a PDF parsing library
        reader.readAsText(selectedFile);
      } else {
        reader.readAsText(selectedFile);
      }
    }
  };

  const handleExtract = async () => {
    if (!textContent.trim()) {
      toast.error("Please upload a file or paste content first");
      return;
    }

    setStep("processing");

    try {
      const { data, error } = await supabase.functions.invoke("extract-units-pdf", {
        body: {
          pdfContent: textContent,
          faction: factionFilter || undefined,
          gameSystem: gameSystem || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setExtractionResult(data as ExtractionResult);
      
      // Select all units by default
      if (data.units && data.units.length > 0) {
        setSelectedUnits(new Set(data.units.map((_: ExtractedUnit, i: number) => i)));
        setStep("review");
      } else {
        toast.error(data.extractionNotes || "No units found in the content");
        setStep("upload");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract units");
      setStep("upload");
    }
  };

  const toggleUnit = (index: number) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedUnits(newSelected);
  };

  const toggleUnitExpanded = (index: number) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedUnits(newExpanded);
  };

  const handleImport = async () => {
    if (!extractionResult?.units || selectedUnits.size === 0) return;

    setStep("importing");
    const unitsToImport = extractionResult.units.filter((_, i) => selectedUnits.has(i));
    let imported = 0;

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
          source: "ai_extraction",
          source_ref: file?.name || "pasted_content",
        });
        imported++;
        setImportProgress(Math.round((imported / unitsToImport.length) * 100));
      } catch (error) {
        console.error(`Failed to import ${unit.name}:`, error);
      }
    }

    toast.success(`Successfully imported ${imported} of ${unitsToImport.length} units`);
    onOpenChange(false);
    resetState();
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/50 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Unit Extractor
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {step === "upload" && (
            <div className="space-y-6 pb-4">
              {/* File Upload */}
              <div className="space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">
                  Upload Army Book (PDF, TXT, MD)
                </Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    "border-primary/30 hover:border-primary/50",
                    file && "border-primary bg-primary/5"
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.markdown"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <FileText className="w-6 h-6" />
                        <span className="font-mono">{file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground text-sm">
                          Click to upload or drag and drop
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Or paste content */}
              <div className="relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border" />
                <span className="relative bg-card px-4 text-xs text-muted-foreground uppercase mx-auto block w-fit">
                  Or paste content
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Paste Unit Datasheets
                </Label>
                <textarea
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    setFile(null);
                  }}
                  placeholder="Paste the unit entries from your army book here..."
                  className={cn(
                    "w-full h-32 px-3 py-2 rounded",
                    "bg-background border border-primary/30",
                    "text-sm font-mono text-foreground",
                    "placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-1 focus:ring-primary"
                  )}
                />
              </div>

              {/* Optional filters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Faction (optional filter)
                  </Label>
                  <TerminalInput
                    value={factionFilter}
                    onChange={(e) => setFactionFilter(e.target.value)}
                    placeholder="e.g., English"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Game System (optional)
                  </Label>
                  <TerminalInput
                    value={gameSystem}
                    onChange={(e) => setGameSystem(e.target.value)}
                    placeholder="e.g., Lion Rampant"
                  />
                </div>
              </div>

              <TerminalButton
                onClick={handleExtract}
                disabled={!textContent.trim()}
                className="w-full"
              >
                <Brain className="w-4 h-4 mr-2" />
                Extract Units with AI
              </TerminalButton>
            </div>
          )}

          {step === "processing" && (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <div>
                <p className="text-primary font-mono">ANALYZING CONTENT...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Extracting unit datasheets, stats, and equipment options
                </p>
              </div>
            </div>
          )}

          {step === "review" && extractionResult && (
            <div className="space-y-4 pb-4">
              {/* Extraction summary */}
              <div className="bg-primary/10 border border-primary/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-mono text-primary">
                      Found {extractionResult.units.length} units
                      {extractionResult.gameSystem && ` • ${extractionResult.gameSystem}`}
                    </p>
                    {extractionResult.extractionNotes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractionResult.extractionNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Select all / none */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedUnits.size} of {extractionResult.units.length} selected
                </span>
                <div className="flex gap-2">
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUnits(new Set(extractionResult.units.map((_, i) => i)))}
                  >
                    Select All
                  </TerminalButton>
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUnits(new Set())}
                  >
                    Clear
                  </TerminalButton>
                </div>
              </div>

              {/* Units list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {extractionResult.units.map((unit, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded transition-colors",
                      selectedUnits.has(index)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={selectedUnits.has(index)}
                        onCheckedChange={() => toggleUnit(index)}
                      />
                      <button
                        onClick={() => toggleUnitExpanded(index)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {expandedUnits.has(index) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <Shield className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{unit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {unit.faction}
                          {unit.sub_faction && ` • ${unit.sub_faction}`}
                          {" • "}{unit.base_cost} pts
                        </p>
                      </div>
                    </div>

                    {expandedUnits.has(index) && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/30 text-xs space-y-2">
                        {/* Stats */}
                        {Object.keys(unit.stats).length > 0 && (
                          <div>
                            <span className="text-muted-foreground uppercase">Stats: </span>
                            <span className="font-mono">
                              {Object.entries(unit.stats).map(([k, v]) => `${k}: ${v}`).join(", ")}
                            </span>
                          </div>
                        )}
                        
                        {/* Abilities */}
                        {unit.abilities.length > 0 && (
                          <div>
                            <span className="text-muted-foreground uppercase">Abilities: </span>
                            <span>{unit.abilities.map(a => a.name).join(", ")}</span>
                          </div>
                        )}
                        
                        {/* Equipment */}
                        {unit.equipment_options.length > 0 && (
                          <div>
                            <span className="text-muted-foreground uppercase">Equipment: </span>
                            <span>
                              {unit.equipment_options.map(e => `${e.name} (+${e.cost})`).join(", ")}
                            </span>
                          </div>
                        )}
                        
                        {/* Keywords */}
                        {unit.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {unit.keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <TerminalButton
                  variant="outline"
                  onClick={() => setStep("upload")}
                  className="flex-1"
                >
                  [ Back ]
                </TerminalButton>
                <TerminalButton
                  onClick={handleImport}
                  disabled={selectedUnits.size === 0}
                  className="flex-1"
                >
                  Import {selectedUnits.size} Units
                </TerminalButton>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <div>
                <p className="text-primary font-mono">IMPORTING UNITS...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {importProgress}% complete
                </p>
              </div>
              <div className="w-full max-w-xs mx-auto h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
