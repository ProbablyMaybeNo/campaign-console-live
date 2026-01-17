import { useState, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { useExtractRules } from "@/hooks/useRulesManagement";
import { useAnalyzeDocument, usePreviewExtraction, useSavePreviewedRules, DetectedSection, ExtractedRule } from "@/hooks/useExtractionJob";
import { RulesPreview, PreviewRule } from "./RulesPreview";
import { extractTextFromPDF, isValidPDF, ExtractionProgress } from "@/lib/pdfExtractor";
import { 
  Upload, 
  FileText, 
  Bot, 
  CheckCircle, 
  AlertCircle,
  X,
  Scan,
  Table,
  BookOpen,
  Sword,
  Star,
  Loader2,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface RulesImporterProps {
  campaignId: string;
  onExtractionComplete: (summary: { totalRules: number; categories: Record<string, number> }) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

type ImportStep = "upload" | "select-sections" | "extracting" | "preview" | "complete";

const sectionTypeIcons: Record<string, React.ReactNode> = {
  table: <Table className="w-4 h-4" />,
  rules: <BookOpen className="w-4 h-4" />,
  equipment: <Sword className="w-4 h-4" />,
  skills: <Star className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

const priorityColors: Record<string, string> = {
  high: "text-red-400 border-red-400/30",
  medium: "text-yellow-400 border-yellow-400/30",
  low: "text-muted-foreground border-border",
};

export function RulesImporter({ 
  campaignId,
  onExtractionComplete, 
  onCancel,
  showCancelButton = false 
}: RulesImporterProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "text">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [extractionResult, setExtractionResult] = useState<{ totalRules: number; categories: Record<string, number> } | null>(null);
  
  // Section selection state
  const [detectedSections, setDetectedSections] = useState<DetectedSection[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  
  // Preview state
  const [previewRules, setPreviewRules] = useState<PreviewRule[]>([]);
  const [sourceTexts, setSourceTexts] = useState<Array<{ section: string; text: string }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeDocument = useAnalyzeDocument();
  const extractRules = useExtractRules();
  const previewExtraction = usePreviewExtraction();
  const savePreviewedRules = useSavePreviewedRules(campaignId);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isValidPDF(file)) {
      toast.error("Please select a valid PDF file");
      return;
    }

    setPdfFile(file);
    setIsExtracting(true);
    setExtractedText("");
    setExtractionProgress(null);

    try {
      const result = await extractTextFromPDF(file, (progress) => {
        setExtractionProgress(progress);
      });
      
      setExtractedText(result.text);
      toast.success(`Extracted ${result.pageCount} pages from ${result.fileName}`);
    } catch (error) {
      console.error("PDF extraction error:", error);
      toast.error("Failed to extract text from PDF. Please try a different file.");
      setPdfFile(null);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Step 1: Analyze document structure
  const handleAnalyzeDocument = async () => {
    const content = activeTab === "pdf" ? extractedText : pastedText;
    
    if (!content || content.trim().length < 50) {
      toast.error("Please provide more text content to analyze.");
      return;
    }

    try {
      const sections = await analyzeDocument.mutateAsync({ content });
      
      if (sections.length === 0) {
        toast.warning("No sections detected. Using full document extraction.");
        // Fall back to single-pass extraction
        handleLegacyExtraction();
        return;
      }

      setDetectedSections(sections);
      // Pre-select high priority sections
      const highPriority = sections.filter(s => s.priority === "high").map(s => s.id);
      setSelectedSectionIds(new Set(highPriority.length > 0 ? highPriority : sections.map(s => s.id)));
      setStep("select-sections");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze document. Trying direct extraction...");
      handleLegacyExtraction();
    }
  };

  // Fallback to original single-pass extraction
  const handleLegacyExtraction = async () => {
    const content = activeTab === "pdf" ? extractedText : pastedText;
    
    setStep("extracting");
    
    try {
      const result = await extractRules.mutateAsync({
        content,
        sourceType: activeTab,
        sourceName: activeTab === "pdf" ? pdfFile?.name : "Pasted text",
        campaignId,
      });

      setExtractionResult(result.summary);
      setStep("complete");
      toast.success(`Saved ${result.saved} rules to campaign`);
    } catch (error) {
      console.error("Extraction error:", error);
      setStep("upload");
    }
  };

  // Step 2: Extract selected sections with preview
  const handleExtractSelected = async () => {
    const content = activeTab === "pdf" ? extractedText : pastedText;
    const selectedSections = detectedSections.filter(s => selectedSectionIds.has(s.id));
    
    if (selectedSections.length === 0) {
      toast.error("Please select at least one section to extract.");
      return;
    }

    setStep("extracting");
    
    try {
      const result = await previewExtraction.mutateAsync({
        content,
        campaignId,
        sections: selectedSections,
        sourceType: activeTab,
        sourceName: activeTab === "pdf" ? pdfFile?.name : "Pasted text"
      });

      console.log("Extraction result:", { 
        rulesCount: result?.rules?.length, 
        sourceTextsCount: result?.sourceTexts?.length,
        sourceTexts: result?.sourceTexts 
      });

      // Always go to preview step - user can manually add rules even if AI extracted 0
      const extractedRules = result?.rules || [];
      const extractedSourceTexts = result?.sourceTexts || [];
      
      setPreviewRules(extractedRules as PreviewRule[]);
      setSourceTexts(extractedSourceTexts);
      setStep("preview");
      
      if (extractedRules.length > 0) {
        toast.success(`Extracted ${extractedRules.length} rules - review before saving`);
      } else if (extractedSourceTexts.length > 0) {
        toast.warning("No rules auto-extracted. Review source text to manually add rules.");
      } else {
        toast.info("No rules extracted. You can manually add rules from the preview screen.");
      }
    } catch (error) {
      console.error("Preview extraction error:", error);
      setStep("select-sections");
    }
  };

  // Update a rule in preview
  const handleUpdatePreviewRule = (index: number, updatedRule: PreviewRule) => {
    setPreviewRules(prev => prev.map((rule, i) => i === index ? updatedRule : rule));
  };

  // Delete a rule from preview
  const handleDeletePreviewRule = (index: number) => {
    setPreviewRules(prev => prev.filter((_, i) => i !== index));
  };

  // Save all previewed rules
  const handleSavePreviewedRules = async () => {
    try {
      const result = await savePreviewedRules.mutateAsync({
        rules: previewRules as ExtractedRule[],
        sourceType: activeTab,
        sourceName: activeTab === "pdf" ? pdfFile?.name : "Pasted text"
      });

      const categories = previewRules.reduce((acc, rule) => {
        acc[rule.category] = (acc[rule.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setExtractionResult({ totalRules: result.saved, categories });
      setStep("complete");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const selectAllSections = () => {
    setSelectedSectionIds(new Set(detectedSections.map(s => s.id)));
  };

  const deselectAllSections = () => {
    setSelectedSectionIds(new Set());
  };

  const handleConfirmRules = () => {
    if (extractionResult) {
      onExtractionComplete(extractionResult);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setExtractedText("");
    setPastedText("");
    setExtractionResult(null);
    setDetectedSections([]);
    setSelectedSectionIds(new Set());
    setPreviewRules([]);
    setSourceTexts([]);
    setStep("upload");
  };

  // Step: Complete
  if (step === "complete" && extractionResult) {
    const { totalRules, categories } = extractionResult;
    const categoryCount = Object.keys(categories).length;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Saved {totalRules} rules in {categoryCount} categories
            </span>
          </div>
          <TerminalButton variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Import More
          </TerminalButton>
        </div>

        <div className="border border-border rounded max-h-64 overflow-y-auto">
          {Object.entries(categories).map(([category, count]) => (
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
          <TerminalButton onClick={handleConfirmRules} className="flex-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            Done
          </TerminalButton>
        </div>
      </div>
    );
  }

  // Step: Preview extracted rules
  if (step === "preview") {
    return (
      <RulesPreview
        rules={previewRules}
        sourceTexts={sourceTexts}
        onUpdateRule={handleUpdatePreviewRule}
        onDeleteRule={handleDeletePreviewRule}
        onAddRule={(rule) => setPreviewRules(prev => [...prev, rule])}
        onSaveAll={handleSavePreviewedRules}
        onCancel={() => setStep("select-sections")}
        isSaving={savePreviewedRules.isPending}
      />
    );
  }

  // Step: Extracting with progress
  if (step === "extracting") {
    const selectedCount = detectedSections.filter(s => selectedSectionIds.has(s.id)).length || 1;

    return (
      <div className="space-y-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-sm font-medium mb-2">Extracting Rules...</p>
          <p className="text-xs text-muted-foreground">
            Processing {selectedCount} section{selectedCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-2">
          <div className="h-2 bg-muted rounded overflow-hidden">
            <div 
              className="h-full bg-primary animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            AI is analyzing document sections...
          </p>
        </div>
      </div>
    );
  }

  // Step: Section Selection
  if (step === "select-sections") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Select Sections to Extract</p>
            <p className="text-xs text-muted-foreground">
              {detectedSections.length} sections detected • {selectedSectionIds.size} selected
            </p>
          </div>
          <div className="flex gap-2">
            <TerminalButton variant="ghost" size="sm" onClick={selectAllSections}>
              All
            </TerminalButton>
            <TerminalButton variant="ghost" size="sm" onClick={deselectAllSections}>
              None
            </TerminalButton>
          </div>
        </div>

        <div className="border border-border rounded max-h-64 overflow-y-auto">
          {detectedSections.map(section => (
            <div 
              key={section.id} 
              className={`flex items-center gap-3 p-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30 ${selectedSectionIds.has(section.id) ? "bg-primary/5" : ""}`}
              onClick={() => toggleSection(section.id)}
            >
              <Checkbox 
                checked={selectedSectionIds.has(section.id)} 
                onCheckedChange={() => toggleSection(section.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {sectionTypeIcons[section.type] || sectionTypeIcons.other}
                  <span className="text-sm font-mono truncate">{section.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[section.priority]}`}>
                    {section.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {section.indicators.slice(0, 2).join(", ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <TerminalButton variant="outline" onClick={() => setStep("upload")} className="flex-1">
            Back
          </TerminalButton>
          <TerminalButton 
            onClick={handleExtractSelected} 
            disabled={selectedSectionIds.size === 0}
            className="flex-1"
          >
            <Bot className="w-4 h-4 mr-2" />
            Extract {selectedSectionIds.size} Section{selectedSectionIds.size !== 1 ? "s" : ""}
          </TerminalButton>
        </div>
      </div>
    );
  }

  // Step: Upload
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pdf" | "text")}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="pdf" className="text-xs uppercase tracking-wider">
            <Upload className="w-3 h-3 mr-2" />
            Upload PDF
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs uppercase tracking-wider">
            <FileText className="w-3 h-3 mr-2" />
            Paste Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="space-y-4 mt-4">
          {!pdfFile && !isExtracting && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a PDF here, or click to select
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Text will be extracted locally before AI processing
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}

          {isExtracting && (
            <div className="border border-border rounded-lg p-8 text-center">
              <TerminalLoader text="Extracting text from PDF" />
              {extractionProgress && (
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${extractionProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Page {extractionProgress.currentPage} of {extractionProgress.totalPages}
                  </p>
                </div>
              )}
            </div>
          )}

          {pdfFile && !isExtracting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono">{pdfFile.name}</span>
                </div>
                <TerminalButton variant="ghost" size="sm" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </TerminalButton>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Extracted Text Preview ({extractedText.length.toLocaleString()} chars)
                </label>
                <div className="w-full bg-input border border-border rounded p-3 text-xs font-mono h-32 overflow-y-auto text-muted-foreground">
                  {extractedText.slice(0, 500)}...
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Paste your rules content
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full bg-input border border-border rounded p-3 text-xs font-mono h-64 resize-none focus:outline-none focus:border-primary/50"
              placeholder="Paste rules text here... Copy from rulebooks, PDFs, or web pages."
            />
            <p className="text-[10px] text-muted-foreground">
              {pastedText.length.toLocaleString()} characters
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Process Button */}
      <div className="flex gap-3">
        {showCancelButton && onCancel && (
          <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </TerminalButton>
        )}
        <TerminalButton
          onClick={handleAnalyzeDocument}
          disabled={
            analyzeDocument.isPending ||
            (activeTab === "pdf" && !extractedText) ||
            (activeTab === "text" && !pastedText.trim())
          }
          className="flex-1"
        >
          {analyzeDocument.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Document...</span>
            </div>
          ) : (
            <>
              <Scan className="w-4 h-4 mr-2" />
              Scan & Select Sections
            </>
          )}
        </TerminalButton>
      </div>

      {analyzeDocument.isError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded border border-destructive/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to analyze document. Please try again.</span>
        </div>
      )}
    </div>
  );
}
