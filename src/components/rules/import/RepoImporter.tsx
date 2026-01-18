import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Input } from "@/components/ui/input";
import { 
  Link, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileJson,
  Github
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExtractedRule, RuleContent } from "@/types/rules";

interface RepoImporterProps {
  campaignId: string;
  onImportComplete: (rules: ExtractedRule[]) => void;
  onCancel: () => void;
}

interface ParsedRule {
  category: string;
  rule_key: string;
  title: string;
  content: RuleContent;
}

export function RepoImporter({ campaignId, onImportComplete, onCancel }: RepoImporterProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRules, setParsedRules] = useState<ParsedRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const popularRepos = [
    {
      name: "Trench Crusade (Community)",
      url: "https://raw.githubusercontent.com/example/trench-crusade-data/main/rules.json",
      format: "json"
    },
    {
      name: "One Page Rules (OPR)",
      url: "https://raw.githubusercontent.com/example/opr-data/main/armies.yaml",
      format: "yaml"
    }
  ];

  const detectFormat = (url: string): "json" | "yaml" | "xml" | "unknown" => {
    const lower = url.toLowerCase();
    if (lower.endsWith(".json")) return "json";
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
    if (lower.endsWith(".xml")) return "xml";
    return "unknown";
  };

  const fetchAndParseRepo = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedRules([]);

    try {
      // Use edge function to discover rules from GitHub repo
      const { data, error: fnError } = await supabase.functions.invoke("fetch-rules-repo", {
        body: { repoUrl: repoUrl.trim(), action: "discover" }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || "Failed to parse repository");

      // Convert categories format to flat rules list
      const allRules: ParsedRule[] = [];
      for (const cat of data.categories || []) {
        for (const rule of cat.rules || []) {
          allRules.push({
            category: cat.category,
            rule_key: rule.key,
            title: rule.title,
            content: { type: "text", text: `Imported from ${cat.category}` }
          });
        }
      }
      
      setParsedRules(allRules);
      toast.success(`Found ${allRules.length} rules in repository`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch repository";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (parsedRules.length === 0) return;
    
    const extractedRules: ExtractedRule[] = parsedRules.map(rule => ({
      category: rule.category,
      rule_key: rule.rule_key,
      title: rule.title,
      content: rule.content,
      metadata: { source: "repo", url: repoUrl },
      validation_status: "complete"
    }));

    onImportComplete(extractedRules);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Github className="w-4 h-4 text-primary" />
        Import from Repository
      </div>

      <p className="text-xs text-muted-foreground">
        Import structured game data from community repositories (JSON, YAML, or XML).
      </p>

      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Repository URL
        </label>
        <div className="flex gap-2">
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo/blob/main/data.json"
            className="flex-1"
            disabled={isLoading}
          />
          <TerminalButton
            onClick={fetchAndParseRepo}
            disabled={isLoading || !repoUrl.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </TerminalButton>
        </div>
      </div>

      {/* Popular Repos (example - would be populated from config) */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Or choose a popular repository
        </p>
        <div className="grid gap-2">
          {popularRepos.map((repo) => (
            <button
              key={repo.name}
              onClick={() => setRepoUrl(repo.url)}
              className="flex items-center gap-2 p-2 text-left text-xs border border-border rounded hover:bg-muted/30 transition-colors"
              disabled={isLoading}
            >
              <FileJson className="w-4 h-4 text-muted-foreground" />
              <span>{repo.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground uppercase">{repo.format}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-xs text-destructive">{error}</div>
        </div>
      )}

      {/* Parsed Rules Preview */}
      {parsedRules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{parsedRules.length} rules parsed</span>
          </div>
          
          <div className="border border-border rounded max-h-40 overflow-y-auto">
            {parsedRules.slice(0, 10).map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border-b border-border last:border-b-0 text-xs">
                <span className="font-mono truncate">{rule.title}</span>
                <span className="text-muted-foreground">{rule.category}</span>
              </div>
            ))}
            {parsedRules.length > 10 && (
              <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
                +{parsedRules.length - 10} more rules
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </TerminalButton>
        <TerminalButton
          onClick={handleImport}
          disabled={parsedRules.length === 0}
          className="flex-1"
        >
          <Link className="w-4 h-4 mr-2" />
          Import {parsedRules.length} Rules
        </TerminalButton>
      </div>
    </div>
  );
}
