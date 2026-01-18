import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useRulesSources, useDeleteSource } from "@/hooks/useRulesSources";
import { useRulesIndexer } from "@/hooks/useRulesIndexer";
import type { IndexError } from "@/types/rulesV2";
import { 
  FileText, 
  Github, 
  ClipboardPaste, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Database,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { RulesSource } from "@/types/rulesV2";

interface SourcesManagerProps {
  campaignId: string;
  isGM: boolean;
  onAddSource: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4" />,
  paste: <ClipboardPaste className="w-4 h-4" />,
  github_json: <Github className="w-4 h-4" />,
};

const statusBadges: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  not_indexed: { 
    label: "Not Indexed", 
    className: "bg-muted text-muted-foreground",
    icon: <Clock className="w-3 h-3" />
  },
  indexing: { 
    label: "Indexing...", 
    className: "bg-primary/20 text-primary animate-pulse",
    icon: <Loader2 className="w-3 h-3 animate-spin" />
  },
  indexed: { 
    label: "Indexed", 
    className: "bg-green-500/20 text-green-500",
    icon: <CheckCircle className="w-3 h-3" />
  },
  failed: { 
    label: "Failed", 
    className: "bg-destructive/20 text-destructive",
    icon: <AlertCircle className="w-3 h-3" />
  },
};

export function SourcesManager({ campaignId, isGM, onAddSource }: SourcesManagerProps) {
  const { data: sources = [], isLoading } = useRulesSources(campaignId);
  const deleteSource = useDeleteSource();
  const { indexSource, isIndexing, currentSourceId, progress } = useRulesIndexer(campaignId);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <TerminalLoader text="Loading sources" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center py-8">
        <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4">No rule sources added yet</p>
        {isGM && (
          <TerminalButton onClick={onAddSource}>
            Add Rules Source
          </TerminalButton>
        )}
      </div>
    );
  }

  const handleIndex = async (source: RulesSource) => {
    await indexSource(source);
  };

  const handleDelete = async (sourceId: string) => {
    await deleteSource.mutateAsync(sourceId);
    setConfirmDeleteId(null);
  };

  const toggleExpand = (sourceId: string) => {
    setExpandedSourceId(expandedSourceId === sourceId ? null : sourceId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-mono text-primary uppercase tracking-wider">Rule Sources</h3>
          <p className="text-xs text-muted-foreground">{sources.length} source(s)</p>
        </div>
        {isGM && (
          <TerminalButton size="sm" onClick={onAddSource}>
            Add Source
          </TerminalButton>
        )}
      </div>

      <div className="space-y-2">
        {sources.map(source => {
          const status = statusBadges[source.index_status] || statusBadges.not_indexed;
          const isCurrentlyIndexing = isIndexing && currentSourceId === source.id;
          const isExpanded = expandedSourceId === source.id;
          const stats = source.index_stats as Record<string, number> | null;

          return (
            <div key={source.id} className="border border-border rounded overflow-hidden">
              {/* Source Header */}
              <div 
                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => toggleExpand(source.id)}
              >
                <div className="text-primary">
                  {typeIcons[source.type] || <FileText className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono truncate">{source.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  {source.tags && source.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {source.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isGM && source.index_status !== "indexing" && (
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIndex(source);
                      }}
                      disabled={isIndexing}
                      title="Index source"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCurrentlyIndexing ? "animate-spin" : ""}`} />
                    </TerminalButton>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border p-3 bg-muted/10 space-y-3">
                  {/* Indexing Progress */}
                  {isCurrentlyIndexing && progress && (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {progress.stage}: {progress.current}/{progress.total}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  {stats && source.index_status === "indexed" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-lg font-mono text-primary">{stats.pages || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Pages</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-lg font-mono text-primary">{stats.sections || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Sections</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-lg font-mono text-primary">{stats.chunks || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Chunks</p>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {source.index_status === "failed" && source.index_error && (
                    <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                      <p className="font-medium">Error: {(source.index_error as IndexError).stage}</p>
                      <p>{(source.index_error as IndexError).message}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {isGM && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      {confirmDeleteId === source.id ? (
                        <>
                          <TerminalButton 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </TerminalButton>
                          <TerminalButton 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(source.id)}
                            disabled={deleteSource.isPending}
                            className="flex-1"
                          >
                            Confirm Delete
                          </TerminalButton>
                        </>
                      ) : (
                        <TerminalButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setConfirmDeleteId(source.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </TerminalButton>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}