import { useState, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useExtractRules, ExtractedRule } from "@/hooks/useRulesManagement";
import { extractTextFromPDF, isValidPDF, ExtractionProgress } from "@/lib/pdfExtractor";
import { 
  Upload, 
  FileText, 
  Bot, 
  CheckCircle, 
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

interface RulesImporterProps {
  onRulesExtracted: (rules: ExtractedRule[]) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export function RulesImporter({ 
  onRulesExtracted, 
  onCancel,
  showCancelButton = false 
}: RulesImporterProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "text">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractRules = useExtractRules();

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
      setShowPreview(true);
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

  const handleProcessWithAI = async () => {
    const content = activeTab === "pdf" ? extractedText : pastedText;
    
    if (!content || content.trim().length < 50) {
      toast.error("Please provide more text content to extract rules from.");
      return;
    }

    try {
      const result = await extractRules.mutateAsync({
        content,
        sourceType: activeTab,
        sourceName: activeTab === "pdf" ? pdfFile?.name : "Pasted text",
      });

      setExtractedRules(result.rules);
      
      // Expand all categories by default
      const categories = new Set(result.rules.map(r => r.category));
      setExpandedCategories(categories);
      
      toast.success(`Found ${result.rules.length} rules across ${Object.keys(result.summary.categories).length} categories`);
    } catch (error) {
      console.error("AI extraction error:", error);
    }
  };

  const handleConfirmRules = () => {
    if (extractedRules.length > 0) {
      onRulesExtracted(extractedRules);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setExtractedText("");
    setPastedText("");
    setExtractedRules([]);
    setShowPreview(false);
  };

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const groupedRules = extractedRules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, ExtractedRule[]>);

  // Show extracted rules for confirmation
  if (extractedRules.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Found {extractedRules.length} rules in {Object.keys(groupedRules).length} categories
            </span>
          </div>
          <TerminalButton variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Start Over
          </TerminalButton>
        </div>

        <div className="border border-border rounded max-h-64 overflow-y-auto">
          {Object.entries(groupedRules).map(([category, rules]) => (
            <div key={category} className="border-b border-border last:border-b-0">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/30 text-left"
              >
                <span className="text-sm font-mono text-primary">{category}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{rules.length} rules</span>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </span>
              </button>
              {expandedCategories.has(category) && (
                <div className="px-3 pb-3 space-y-1">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground pl-3 border-l border-border">
                      {rule.title}
                    </div>
                  ))}
                </div>
              )}
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
            Use These Rules
          </TerminalButton>
        </div>
      </div>
    );
  }

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

              {showPreview && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Extracted Text Preview (editable)
                  </label>
                  <textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="w-full bg-input border border-border rounded p-3 text-xs font-mono h-48 resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Extracted text will appear here..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {extractedText.length.toLocaleString()} characters extracted
                  </p>
                </div>
              )}
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
          onClick={handleProcessWithAI}
          disabled={
            extractRules.isPending ||
            (activeTab === "pdf" && !extractedText) ||
            (activeTab === "text" && !pastedText.trim())
          }
          className="flex-1"
        >
          {extractRules.isPending ? (
            <TerminalLoader text="Processing with AI" size="sm" />
          ) : (
            <>
              <Bot className="w-4 h-4 mr-2" />
              Process with AI
            </>
          )}
        </TerminalButton>
      </div>

      {extractRules.isError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded border border-destructive/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to extract rules. Please try again or adjust your content.</span>
        </div>
      )}
    </div>
  );
}
