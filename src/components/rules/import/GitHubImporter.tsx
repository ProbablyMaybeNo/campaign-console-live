import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Input } from "@/components/ui/input";
import { useCreateSource } from "@/hooks/useRulesSources";
import { useRulesIndexer } from "@/hooks/useRulesIndexer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Github, 
  Loader2,
  Download,
  CheckCircle,
  AlertCircle,
  FileJson
} from "lucide-react";

interface GitHubImporterProps {
  campaignId: string;
  onComplete: (sourceId: string) => void;
  onCancel: () => void;
}

export function GitHubImporter({ campaignId, onComplete, onCancel }: GitHubImporterProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [jsonPath, setJsonPath] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    preview?: unknown;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const createSource = useCreateSource();
  const { indexSource, isIndexing, progress } = useRulesIndexer(campaignId);

  const parseGitHubUrl = (url: string): { owner: string; repo: string; path?: string } | null => {
    // Handle various GitHub URL formats
    const patterns = [
      // https://github.com/owner/repo
      /github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/(.+))?/,
      // https://raw.githubusercontent.com/owner/repo/branch/path
      /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/(.+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""),
          path: match[3],
        };
      }
    }

    return null;
  };

  const handleValidate = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const parsed = parseGitHubUrl(repoUrl);
      
      if (!parsed) {
        setValidationResult({
          valid: false,
          message: "Invalid GitHub URL format. Use https://github.com/owner/repo",
        });
        return;
      }

      // Auto-detect JSON path if not provided
      const pathToUse = jsonPath.trim() || parsed.path || "rules.json";

      // Use edge function to fetch and validate
      const { data, error } = await supabase.functions.invoke("fetch-rules-repo", {
        body: {
          repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
          jsonPath: pathToUse,
          action: "validate",
        },
      });

      if (error) throw error;

      if (data.valid) {
        setValidationResult({
          valid: true,
          message: `Found valid JSON with ${data.entryCount || 0} entries`,
          preview: data.preview,
        });
        
        // Auto-fill title if not set
        if (!title) {
          setTitle(`${parsed.repo} - ${pathToUse}`);
        }
        
        // Update jsonPath if auto-detected
        if (!jsonPath.trim() && pathToUse) {
          setJsonPath(pathToUse);
        }
      } else {
        setValidationResult({
          valid: false,
          message: data.error || "Invalid or empty JSON file",
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({
        valid: false,
        message: error instanceof Error ? error.message : "Failed to validate repository",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreate = async () => {
    if (!validationResult?.valid || !title.trim()) {
      toast.error("Please validate the repository and provide a title");
      return;
    }

    setIsCreating(true);

    try {
      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) throw new Error("Invalid URL");

      // Create the source record
      const source = await createSource.mutateAsync({
        campaignId,
        type: "github_json",
        title: title.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        githubRepoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
        githubJsonPath: jsonPath.trim() || parsed.path || "rules.json",
      });

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

  const isProcessing = isValidating || isCreating || isIndexing;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Github className="w-4 h-4 text-primary" />
        Import from GitHub
      </div>

      <p className="text-xs text-muted-foreground">
        Import structured rules data from a public GitHub repository (JSON/YAML).
      </p>

      {/* URL Input */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Repository URL
        </label>
        <div className="flex gap-2">
          <Input
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              setValidationResult(null);
            }}
            placeholder="https://github.com/owner/repo"
            disabled={isProcessing}
            className="flex-1"
          />
          <TerminalButton
            onClick={handleValidate}
            disabled={isProcessing || !repoUrl.trim()}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </TerminalButton>
        </div>
      </div>

      {/* JSON Path */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          JSON/YAML Path (optional)
        </label>
        <Input
          value={jsonPath}
          onChange={(e) => setJsonPath(e.target.value)}
          placeholder="data/rules.json (auto-detected if blank)"
          disabled={isProcessing}
        />
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`flex items-start gap-2 p-3 rounded border ${
          validationResult.valid 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-destructive/10 border-destructive/30"
        }`}>
          {validationResult.valid ? (
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs">
            <p className={validationResult.valid ? "text-green-500" : "text-destructive"}>
              {validationResult.message}
            </p>
            {validationResult.preview && (
              <pre className="mt-2 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto max-h-24 overflow-y-auto">
                {JSON.stringify(validationResult.preview, null, 2).slice(0, 500)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Source Details */}
      {validationResult?.valid && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Title *
            </label>
            <TerminalInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Community Rules Data"
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
              placeholder="e.g., community, v1.0"
              disabled={isProcessing}
            />
          </div>
        </div>
      )}

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
          disabled={!validationResult?.valid || isProcessing || !title.trim()}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isIndexing ? "Indexing..." : "Processing..."}
            </>
          ) : (
            <>
              <FileJson className="w-4 h-4 mr-2" />
              Create & Index
            </>
          )}
        </TerminalButton>
      </div>
    </div>
  );
}