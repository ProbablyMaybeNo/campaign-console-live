import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { AlertCircle, RefreshCw, FileQuestion, ExternalLink } from "lucide-react";
import type { RulesSource } from "@/types/rules";

interface SourceDiagnosticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: RulesSource;
  onReindex: () => void;
}

const errorSuggestions: Record<string, { title: string; description: string; action?: string }> = {
  extraction: {
    title: "Text Extraction Failed",
    description: "The PDF might be scanned (image-based) or password-protected. Try uploading a different version or use the Paste option to manually enter the text.",
    action: "Try pasting text manually",
  },
  fetch: {
    title: "Failed to Fetch Content",
    description: "Could not download the file. Check if the storage path is valid or if there are permission issues.",
    action: "Re-upload the file",
  },
  parse: {
    title: "JSON Parse Error",
    description: "The GitHub JSON file has invalid syntax. Verify the file is valid JSON and follows the expected structure.",
    action: "Check JSON format",
  },
  github: {
    title: "GitHub API Error",
    description: "Could not access the repository. Check that the URL is correct and the repository is public.",
    action: "Verify repository URL",
  },
  empty: {
    title: "No Content Found",
    description: "The source appears to be empty or contains no extractable text. Try a different file or paste the content manually.",
    action: "Use manual paste",
  },
  scanned_pdf: {
    title: "Scanned PDF Detected",
    description: "This file appears to be image-only or has very little extractable text. Use OCR or upload a text-based PDF.",
    action: "Use OCR or paste text",
  },
  timeout: {
    title: "Processing Timeout",
    description: "The file is too large or complex to process in the allowed time. Try splitting it into smaller sections.",
    action: "Split into smaller files",
  },
};

export function SourceDiagnostics({ open, onOpenChange, source, onReindex }: SourceDiagnosticsProps) {
  const error = source.index_error;
  const stage = error?.stage || "unknown";
  const suggestion = errorSuggestions[stage] || {
    title: "Indexing Error",
    description: error?.message || "An unknown error occurred during indexing.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-destructive/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive font-mono uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Diagnostics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Info */}
          <div className="text-sm">
            <span className="text-muted-foreground">Source:</span>{" "}
            <span className="text-foreground font-mono">{source.title}</span>
          </div>

          {/* Error Details */}
          <div className="bg-destructive/10 border border-destructive/30 rounded p-4 space-y-2">
            <div className="flex items-start gap-2">
              <FileQuestion className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">{suggestion.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
              </div>
            </div>
          </div>

          {/* Raw Error */}
          {error?.message && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Error Details</p>
              <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto font-mono text-destructive/80">
                {error.message}
              </pre>
            </div>
          )}

          {source.index_stats && (
            <div className="space-y-2 text-xs">
              <p className="uppercase tracking-wider text-muted-foreground">Index Stats</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Pages: {source.index_stats.pagesExtracted ?? source.index_stats.pages ?? 0}</span>
                <span>Empty Pages: {source.index_stats.emptyPages ?? 0}</span>
                <span>Chunks: {source.index_stats.chunks ?? 0}</span>
                <span>Tables: {(source.index_stats.tablesHigh ?? 0) + (source.index_stats.tablesLow ?? 0)}</span>
              </div>
              {source.index_stats.timeMsByStage && (
                <div className="space-y-1">
                  <p className="uppercase tracking-wider text-muted-foreground">Timing (ms)</p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    {Object.entries(source.index_stats.timeMsByStage).map(([key, value]) => (
                      <span key={key}>{key}: {value}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <TerminalButton onClick={onReindex} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-run Indexing
            </TerminalButton>
            <TerminalButton variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
