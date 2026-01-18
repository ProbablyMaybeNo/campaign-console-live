import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSource } from "@/hooks/useRulesSources";
import { useRulesIndexer } from "@/hooks/useRulesIndexer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ClipboardPaste, 
  Loader2,
  FileText
} from "lucide-react";

interface PasteImporterProps {
  campaignId: string;
  onComplete: (sourceId: string) => void;
  onCancel: () => void;
}

export function PasteImporter({ campaignId, onComplete, onCancel }: PasteImporterProps) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const createSource = useCreateSource();
  const { indexSource, isIndexing, progress } = useRulesIndexer(campaignId);

  const handleCreate = async () => {
    if (!content.trim() || !title.trim()) {
      toast.error("Please provide content and a title");
      return;
    }

    if (content.trim().length < 50) {
      toast.error("Please provide more content (at least 50 characters)");
      return;
    }

    setIsCreating(true);

    try {
      // Create the source record
      const source = await createSource.mutateAsync({
        campaignId,
        type: "paste",
        title: title.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      });

      // Create pseudo-pages (split content into ~6000 char chunks)
      const pageSize = 6000;
      const pages: string[] = [];
      let remaining = content;
      
      while (remaining.length > 0) {
        // Try to split at a paragraph boundary
        let splitPoint = Math.min(pageSize, remaining.length);
        if (splitPoint < remaining.length) {
          const lastParagraph = remaining.lastIndexOf("\n\n", splitPoint);
          if (lastParagraph > pageSize * 0.5) {
            splitPoint = lastParagraph;
          }
        }
        
        pages.push(remaining.slice(0, splitPoint).trim());
        remaining = remaining.slice(splitPoint).trim();
      }

      // Save pages
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
      await indexSource(source);
      
      onComplete(source.id);
    } catch (error) {
      console.error("Create source error:", error);
      toast.error("Failed to create source");
    } finally {
      setIsCreating(false);
    }
  };

  const isProcessing = isCreating || isIndexing;
  const charCount = content.length;
  const estimatedPages = Math.max(1, Math.ceil(charCount / 6000));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ClipboardPaste className="w-4 h-4 text-primary" />
        Paste Text
      </div>

      <p className="text-xs text-muted-foreground">
        Paste rules text directly. The content will be normalized into pages and indexed.
      </p>

      {/* Content Area */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Rules Content
        </label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your rules content here..."
          className="min-h-[200px] font-mono text-xs"
          disabled={isProcessing}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {charCount.toLocaleString()} characters
          </span>
          <span className="text-[10px] text-muted-foreground">
            ~{estimatedPages} pseudo-page{estimatedPages !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Source Details */}
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Title *
          </label>
          <TerminalInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Combat Rules Summary"
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
            placeholder="e.g., combat, homebrew"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Indexing Progress */}
      {isIndexing && progress && (
        <div className="space-y-2 p-3 bg-primary/5 border border-primary/30 rounded">
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
          disabled={!content.trim() || isProcessing || !title.trim() || content.length < 50}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isIndexing ? "Indexing..." : "Processing..."}
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Create & Index
            </>
          )}
        </TerminalButton>
      </div>
    </div>
  );
}