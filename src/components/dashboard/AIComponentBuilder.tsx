import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bot, 
  Upload, 
  Link, 
  Table, 
  LayoutList,
  Loader2,
  FileText,
  Sparkles,
  X
} from "lucide-react";

interface AIComponentBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

type ComponentType = "table" | "card";

interface ParsedTableData {
  title: string;
  columns: string[];
  rows: Record<string, string>[];
}

interface ParsedCardData {
  title: string;
  cards: Array<{
    id: string;
    name: string;
    description: string;
    properties?: Record<string, string>;
  }>;
}

export function AIComponentBuilder({ open, onOpenChange, campaignId }: AIComponentBuilderProps) {
  const [componentType, setComponentType] = useState<ComponentType>("table");
  const [prompt, setPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedTableData | ParsedCardData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createComponent = useCreateComponent();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // For text files, read directly
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setSourceContent(text);
      toast.success(`Loaded ${file.name}`);
      return;
    }

    // For PDFs, we'd need a PDF parser - for now, show instructions
    if (file.type === "application/pdf") {
      toast.info("PDF uploaded. The AI will extract content from it.");
      // In a real implementation, you'd parse the PDF here or send it to an edge function
      // For now, we'll use a placeholder
      const reader = new FileReader();
      reader.onload = () => {
        // Store base64 for potential future PDF parsing
        setSourceContent(`[PDF Content from: ${file.name}]`);
      };
      reader.readAsDataURL(file);
      return;
    }

    toast.error("Unsupported file type. Please use .txt, .md, or .pdf files.");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want to create");
      return;
    }

    setIsLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-component-builder", {
        body: {
          prompt,
          componentType,
          sourceContent: sourceContent || undefined,
          sourceUrl: sourceUrl || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success && data.data) {
        setPreview(data.data);
        toast.success("Component data generated! Review and create.");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate component. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!preview) return;

    try {
      let config: Record<string, string | boolean | number | string[] | Record<string, string>[] | Array<{ id: string; name: string; description: string; properties?: Record<string, string> }>> = {
        manual_setup: true,
        title: preview.title,
      };

      if (componentType === "table" && "columns" in preview) {
        config = {
          ...config,
          columns: preview.columns,
          rows: preview.rows,
        };
      } else if (componentType === "card" && "cards" in preview) {
        config = {
          ...config,
          cards: preview.cards,
          isManual: true,
        };
      }

      await createComponent.mutateAsync({
        campaign_id: campaignId,
        name: preview.title,
        component_type: componentType,
        config: config as unknown as import("@/integrations/supabase/types").Json,
        position_x: Math.round(100 + Math.random() * 200),
        position_y: Math.round(100 + Math.random() * 200),
        width: 400,
        height: 350,
      });

      toast.success("Component created!");
      handleClose();
    } catch (error) {
      console.error("Create component error:", error);
      toast.error("Failed to create component");
    }
  };

  const handleClose = () => {
    setComponentType("table");
    setPrompt("");
    setSourceUrl("");
    setSourceContent("");
    setFileName("");
    setPreview(null);
    onOpenChange(false);
  };

  const clearFile = () => {
    setSourceContent("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Component Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Component Type Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Component Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setComponentType("table")}
                className={`flex-1 p-4 border rounded flex items-center justify-center gap-3 transition-all ${
                  componentType === "table"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Table className="w-5 h-5" />
                <span className="font-mono">Table</span>
              </button>
              <button
                onClick={() => setComponentType("card")}
                className={`flex-1 p-4 border rounded flex items-center justify-center gap-3 transition-all ${
                  componentType === "card"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <LayoutList className="w-5 h-5" />
                <span className="font-mono">Cards</span>
              </button>
            </div>
          </div>

          {/* Source Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Source (Optional)
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* File Upload */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 border border-dashed border-border rounded hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm text-muted-foreground"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF / Text
                </button>
                {fileName && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 p-2 rounded">
                    <FileText className="w-3 h-3" />
                    <span className="flex-1 truncate">{fileName}</span>
                    <button onClick={clearFile} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="Paste URL or repo link..."
                    className="w-full pl-10 pr-3 py-3 bg-input border border-border rounded text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Describe what you want
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={componentType === "table" 
                ? "e.g., Create a table of all weapon stats including name, range, strength, AP, and damage..."
                : "e.g., Create cards for each special ability showing the name, effect, and any point costs..."
              }
              className="min-h-[100px] bg-input border-border focus:border-primary"
            />
          </div>

          {/* Generate Button */}
          <TerminalButton
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Generate Component Data
              </>
            )}
          </TerminalButton>

          {/* Preview */}
          {preview && (
            <div className="space-y-3 border border-primary/30 rounded p-4 bg-primary/5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono text-primary uppercase">
                  Preview: {preview.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {"columns" in preview 
                    ? `${preview.rows.length} rows × ${preview.columns.length} columns`
                    : `${preview.cards.length} cards`
                  }
                </span>
              </div>

              <div className="max-h-[200px] overflow-auto bg-card rounded border border-border p-2">
                {"columns" in preview ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {preview.columns.map((col, i) => (
                          <th key={i} className="text-left p-2 text-primary font-mono">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {preview.columns.map((col, j) => (
                            <td key={j} className="p-2 text-muted-foreground">
                              {row[col] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {preview.rows.length > 5 && (
                        <tr>
                          <td colSpan={preview.columns.length} className="p-2 text-center text-muted-foreground">
                            ... and {preview.rows.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-2">
                    {preview.cards.slice(0, 3).map((card) => (
                      <div key={card.id} className="p-2 border border-border/50 rounded">
                        <p className="font-mono text-primary text-sm">{card.name}</p>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                      </div>
                    ))}
                    {preview.cards.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground">
                        ... and {preview.cards.length - 3} more cards
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <TerminalButton variant="outline" onClick={handleClose}>
            Cancel
          </TerminalButton>
          {preview && (
            <TerminalButton onClick={handleCreate} disabled={createComponent.isPending}>
              {createComponent.isPending ? "Creating..." : "[ Create Component ]"}
            </TerminalButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
