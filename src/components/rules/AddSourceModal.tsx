import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  Github, 
  ClipboardPaste, 
  Upload,
  Loader2,
  Check,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  useCreatePdfSource, 
  useCreatePasteSource, 
  useCreateGitHubSource,
  useIndexSource
} from "@/hooks/useRulesSources";
import { usePdfIndexer, useGitHubIndexer, useLlamaParseIndexer } from "@/hooks/useRulesIndexer";

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function AddSourceModal({ open, onOpenChange, campaignId }: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState("pdf");
  
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [useAdvancedParsing, setUseAdvancedParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste state
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");

  // GitHub state
  const [githubUrl, setGithubUrl] = useState("");
  const [githubPath, setGithubPath] = useState("rules.json");
  const [githubTitle, setGithubTitle] = useState("");

  const createPdfSource = useCreatePdfSource();
  const createPasteSource = useCreatePasteSource();
  const createGitHubSource = useCreateGitHubSource();
  const indexSource = useIndexSource();
  
  // Client-side indexers
  const pdfIndexer = usePdfIndexer();
  const githubIndexer = useGitHubIndexer();
  const llamaParseIndexer = useLlamaParseIndexer();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      if (!pdfTitle) {
        setPdfTitle(file.name.replace(/\.pdf$/i, ""));
      }
    } else {
      toast.error("Please select a PDF file");
    }
  };

  const handlePdfSubmit = async () => {
    if (!pdfFile || !pdfTitle.trim()) return;

    setUploadingPdf(true);
    try {
      // Upload to storage
      const filePath = `${campaignId}/${Date.now()}-${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("campaign-documents")
        .upload(filePath, pdfFile);

      if (uploadError) throw uploadError;

      // Create source record
      const source = await createPdfSource.mutateAsync({
        campaignId,
        title: pdfTitle.trim(),
        storagePath: filePath,
        useAdvancedParsing,
      });

      // Show option to index now
      toast.success("PDF uploaded!", {
        description: useAdvancedParsing ? "Ready for advanced parsing." : "Ready to extract and index.",
        action: {
          label: "Index Now",
          onClick: async () => {
            let result;
            if (useAdvancedParsing) {
              result = await llamaParseIndexer.indexWithLlamaParse(source.id, campaignId, filePath);
            } else {
              result = await pdfIndexer.indexPdf(source.id, campaignId, filePath);
            }
            if (result.success) {
              toast.success(`Indexed ${result.stats?.pages} pages, ${result.stats?.chunks} chunks`);
            } else {
              toast.error(`Indexing failed: ${result.error}`);
            }
          },
        },
      });

      handleClose();
    } catch (error) {
      console.error("PDF upload error:", error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteTitle.trim() || !pasteText.trim()) return;

    try {
      const source = await createPasteSource.mutateAsync({
        campaignId,
        title: pasteTitle.trim(),
        text: pasteText,
      });

      toast.success("Text added!", {
        description: "Ready to index.",
        action: {
          label: "Index Now",
          onClick: () => indexSource.mutate({ sourceId: source.id, campaignId }),
        },
      });

      handleClose();
    } catch (error) {
      console.error("Paste error:", error);
    }
  };

  const handleGitHubSubmit = async () => {
    if (!githubUrl.trim() || !githubTitle.trim()) return;

    try {
      const source = await createGitHubSource.mutateAsync({
        campaignId,
        title: githubTitle.trim(),
        repoUrl: githubUrl.trim(),
        jsonPath: githubPath.trim() || "rules.json",
      });

      toast.success("GitHub source added!", {
        description: "Ready to fetch and index.",
        action: {
          label: "Index Now",
          onClick: async () => {
            const result = await githubIndexer.indexGitHub(
              source.id, 
              campaignId, 
              githubUrl.trim(), 
              githubPath.trim() || "rules.json"
            );
            if (result.success) {
              toast.success(`Indexed ${result.stats?.sections} sections, ${result.stats?.chunks} chunks`);
            } else {
              toast.error(`Indexing failed: ${result.error}`);
            }
          },
        },
      });

      handleClose();
    } catch (error) {
      console.error("GitHub error:", error);
    }
  };

  const handleClose = () => {
    setPdfFile(null);
    setPdfTitle("");
    setUseAdvancedParsing(false);
    setPasteTitle("");
    setPasteText("");
    setGithubUrl("");
    setGithubPath("rules.json");
    setGithubTitle("");
    pdfIndexer.reset();
    githubIndexer.reset();
    llamaParseIndexer.reset();
    onOpenChange(false);
  };

  const isSubmitting = uploadingPdf || createPdfSource.isPending || createPasteSource.isPending || createGitHubSource.isPending;
  const isIndexing = pdfIndexer.progress !== null || githubIndexer.progress !== null || llamaParseIndexer.progress !== null;
  const currentProgress = pdfIndexer.progress || githubIndexer.progress || llamaParseIndexer.progress;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-lg" data-testid="add-source-modal">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider">
            Add Rules Source
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator when indexing */}
        {isIndexing && currentProgress && (
          <div className="mb-4 p-3 border border-primary/30 rounded bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-mono text-primary">{currentProgress.message}</span>
            </div>
            <Progress value={currentProgress.progress} className="h-2" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="pdf" className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3 h-3" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-1.5 text-xs">
              <ClipboardPaste className="w-3 h-3" />
              Paste
            </TabsTrigger>
            <TabsTrigger value="github" className="flex items-center gap-1.5 text-xs">
              <Github className="w-3 h-3" />
              GitHub
            </TabsTrigger>
          </TabsList>

          {/* PDF Tab */}
          <TabsContent value="pdf" className="space-y-4" data-testid="pdf-tab">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Check className="w-5 h-5" />
                  <span className="font-mono">{pdfFile.name}</span>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to select PDF file</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-title" className="text-xs uppercase tracking-wider text-muted-foreground">
                Source Title
              </Label>
              <TerminalInput
                id="pdf-title"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="e.g., Core Rulebook v2.1"
                data-testid="pdf-title-input"
              />
            </div>

            {/* Advanced Parsing Toggle */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <Label htmlFor="advanced-parsing" className="text-sm font-medium cursor-pointer">
                    Advanced PDF Parsing
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Uses AI to better preserve tables and dice roll data
                  </p>
                </div>
              </div>
              <Switch
                id="advanced-parsing"
                checked={useAdvancedParsing}
                onCheckedChange={setUseAdvancedParsing}
                data-testid="advanced-parsing-toggle"
              />
            </div>

            <TerminalButton
              onClick={handlePdfSubmit}
              disabled={!pdfFile || !pdfTitle.trim() || isSubmitting}
              className="w-full"
              data-testid="pdf-submit"
            >
              {uploadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Add PDF Source"
              )}
            </TerminalButton>
          </TabsContent>

          {/* Paste Tab */}
          <TabsContent value="paste" className="space-y-4" data-testid="paste-tab">
            <div className="space-y-2">
              <Label htmlFor="paste-title" className="text-xs uppercase tracking-wider text-muted-foreground">
                Source Title
              </Label>
              <TerminalInput
                id="paste-title"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="e.g., Custom House Rules"
                data-testid="paste-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paste-text" className="text-xs uppercase tracking-wider text-muted-foreground">
                Rules Text
              </Label>
              <Textarea
                id="paste-text"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your rules text here..."
                className="min-h-[200px] bg-input border-border font-mono text-sm"
                data-testid="paste-text-input"
              />
              <p className="text-xs text-muted-foreground">
                {pasteText.length.toLocaleString()} characters
              </p>
            </div>

            <TerminalButton
              onClick={handlePasteSubmit}
              disabled={!pasteTitle.trim() || !pasteText.trim() || isSubmitting}
              className="w-full"
              data-testid="paste-submit"
            >
              {createPasteSource.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Text Source"
              )}
            </TerminalButton>
          </TabsContent>

          {/* GitHub Tab */}
          <TabsContent value="github" className="space-y-4" data-testid="github-tab">
            <div className="space-y-2">
              <Label htmlFor="github-title" className="text-xs uppercase tracking-wider text-muted-foreground">
                Source Title
              </Label>
              <TerminalInput
                id="github-title"
                value={githubTitle}
                onChange={(e) => setGithubTitle(e.target.value)}
                placeholder="e.g., Community Rules Pack"
                data-testid="github-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-url" className="text-xs uppercase tracking-wider text-muted-foreground">
                Repository URL
              </Label>
              <TerminalInput
                id="github-url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                data-testid="github-url-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-path" className="text-xs uppercase tracking-wider text-muted-foreground">
                JSON Path
              </Label>
              <TerminalInput
                id="github-path"
                value={githubPath}
                onChange={(e) => setGithubPath(e.target.value)}
                placeholder="rules.json or data/rules.json"
                data-testid="github-path-input"
              />
              <p className="text-xs text-muted-foreground">
                Path to the JSON file containing structured rules
              </p>
            </div>

            <TerminalButton
              onClick={handleGitHubSubmit}
              disabled={!githubUrl.trim() || !githubTitle.trim() || isSubmitting}
              className="w-full"
              data-testid="github-submit"
            >
              {createGitHubSource.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add GitHub Source"
              )}
            </TerminalButton>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
