import { useState, useRef, useCallback } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { extractTextFromPDF, isValidPDF, ExtractionProgress } from "@/lib/pdfExtractor";
import { useCreateSource } from "@/hooks/useRulesSources";
import { useRulesIndexer } from "@/hooks/useRulesIndexer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";

interface PDFUploaderProps {
  campaignId: string;
  onComplete: (sourceId: string) => void;
  onCancel: () => void;
}

export function PDFUploader({ campaignId, onComplete, onCancel }: PDFUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSource = useCreateSource();
  const { indexSource, isIndexing, progress } = useRulesIndexer(campaignId);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!isValidPDF(selectedFile)) {
      toast.error("Please select a valid PDF file");
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.pdf$/i, ""));
    setIsExtracting(true);
    setExtractedText("");
    setExtractionProgress(null);

    try {
      const result = await extractTextFromPDF(selectedFile, (progress) => {
        setExtractionProgress(progress);
      });
      
      setExtractedText(result.text);
      toast.success(`Extracted ${result.pageCount} pages from PDF`);
    } catch (error) {
      console.error("PDF extraction error:", error);
      toast.error("Failed to extract text from PDF");
      setFile(null);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleCreate = async () => {
    if (!file || !extractedText || !title.trim()) {
      toast.error("Please select a PDF and provide a title");
      return;
    }

    setIsCreating(true);

    try {
      // Create the source record
      const source = await createSource.mutateAsync({
        campaignId,
        type: "pdf",
        title: title.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      });

      // Save the extracted pages directly (they'll be indexed later)
      const pages = extractedText.split("\n\n").filter(p => p.trim().length > 0);
      const pageRecords = pages.map((text, idx) => ({
        source_id: source.id,
        page_number: idx + 1,
        text,
        char_count: text.length,
      }));

      for (let i = 0; i < pageRecords.length; i += 50) {
        const batch = pageRecords.slice(i, i + 50);
        await supabase.from("rules_pages").insert(batch);
      }

      toast.success("Source created! Starting indexing...");
      
      // Auto-index the source
      await indexSource(source, file);
      
      onComplete(source.id);
    } catch (error) {
      console.error("Create source error:", error);
      toast.error("Failed to create source");
    } finally {
      setIsCreating(false);
    }
  };

  const isProcessing = isExtracting || isCreating || isIndexing;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="w-4 h-4 text-primary" />
        Upload PDF
      </div>

      <p className="text-xs text-muted-foreground">
        Upload a PDF rulebook. Text will be extracted and indexed automatically.
      </p>

      {/* File Drop Zone */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Drop a PDF here or click to browse
          </p>
        </div>
      )}

      {/* File Selected */}
      {file && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {extractedText && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>

          {/* Extraction Progress */}
          {isExtracting && extractionProgress && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${extractionProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Extracting page {extractionProgress.currentPage} of {extractionProgress.totalPages}
              </p>
            </div>
          )}

          {/* Indexing Progress */}
          {isIndexing && progress && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress.stage}: {progress.current}/{progress.total}
              </p>
            </div>
          )}

          {/* Text Preview */}
          {extractedText && !isExtracting && (
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">Preview:</p>
              <div className="bg-muted/50 rounded p-2 max-h-24 overflow-y-auto font-mono text-[10px]">
                {extractedText.slice(0, 500)}...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Details */}
      {file && extractedText && !isExtracting && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Title
            </label>
            <TerminalInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Core Rulebook"
              disabled={isProcessing}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Tags (comma separated)
            </label>
            <TerminalInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., core, v2.0, official"
              disabled={isProcessing}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <TerminalButton 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1"
          disabled={isProcessing}
        >
          Cancel
        </TerminalButton>
        <TerminalButton
          onClick={handleCreate}
          disabled={!file || !extractedText || isProcessing || !title.trim()}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isIndexing ? "Indexing..." : "Processing..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Create & Index
            </>
          )}
        </TerminalButton>
      </div>
    </div>
  );
}