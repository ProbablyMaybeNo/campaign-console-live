import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database, 
  FileText, 
  Github, 
  ClipboardPaste, 
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  Settings
} from "lucide-react";
import { useRulesSources, useDeleteSource, useIndexSource } from "@/hooks/useRulesSources";
import { AddSourceModal } from "./AddSourceModal";
import { SourceDiagnostics } from "./SourceDiagnostics";
import type { RulesSource } from "@/types/rules";

interface RulesLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  isGM: boolean;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  not_indexed: { icon: Clock, color: "text-muted-foreground", label: "Not Indexed" },
  indexing: { icon: Loader2, color: "text-warning", label: "Indexing..." },
  indexed: { icon: CheckCircle, color: "text-success", label: "Indexed" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "Failed" },
};

const typeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  pdf: { icon: FileText, label: "PDF" },
  paste: { icon: ClipboardPaste, label: "Text" },
  github_json: { icon: Github, label: "GitHub" },
};

export function RulesLibrary({ open, onOpenChange, campaignId, isGM }: RulesLibraryProps) {
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [diagnosticsSource, setDiagnosticsSource] = useState<RulesSource | null>(null);
  const debugEnabled = typeof window !== "undefined" && window.localStorage.getItem("rules_index_debug") === "true";
  
  const { data: sources = [], isLoading } = useRulesSources(campaignId);
  const deleteSource = useDeleteSource();
  const indexSource = useIndexSource();

  const handleIndex = (source: RulesSource) => {
    indexSource.mutate({ sourceId: source.id, campaignId });
  };

  const handleDelete = (source: RulesSource) => {
    if (confirm(`Delete "${source.title}" and all its indexed data?`)) {
      deleteSource.mutate({ id: source.id, campaignId });
    }
  };

  const indexedCount = sources.filter(s => s.index_status === "indexed").length;
  const totalChunks = sources.reduce((acc, s) => acc + (s.index_stats?.chunks || 0), 0);
  const totalTables = sources.reduce((acc, s) => acc + (s.index_stats?.tablesHigh || 0) + (s.index_stats?.tablesLow || 0), 0);
  const totalPages = sources.reduce((acc, s) => acc + (s.index_stats?.pagesExtracted || s.index_stats?.pages || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-primary/30 max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
              <Database className="w-5 h-5" />
              Rules Library
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats Bar */}
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                <span className="text-primary font-medium">{sources.length}</span> sources
              </span>
              <span className="text-muted-foreground">
                <span className="text-primary font-medium">{indexedCount}</span> indexed
              </span>
              <span className="text-muted-foreground">
                <span className="text-primary font-medium">{totalChunks}</span> chunks
              </span>
              <span className="text-muted-foreground">
                <span className="text-primary font-medium">{totalPages}</span> pages
              </span>
              <span className="text-muted-foreground">
                <span className="text-primary font-medium">{totalTables}</span> tables
              </span>
              <div className="flex-1" />
              {isGM && (
                <TerminalButton size="sm" onClick={() => setAddSourceOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Source
                </TerminalButton>
              )}
            </div>

            {/* Sources List */}
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-mono">No rules sources added yet</p>
                  {isGM && (
                    <p className="text-xs mt-2">
                      Add a PDF, paste text, or import from GitHub to get started.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2" data-testid="sources-list">
                  {sources.map((source) => {
                    const TypeIcon = typeConfig[source.type]?.icon || FileText;
                    const status = statusConfig[source.index_status] || statusConfig.not_indexed;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={source.id}
                        data-testid={`source-${source.id}`}
                        className="border border-border rounded p-3 bg-card/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Type Icon */}
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <TypeIcon className="w-4 h-4 text-primary" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm truncate">{source.title}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {typeConfig[source.type]?.label || source.type}
                              </Badge>
                            </div>

                            {/* Tags */}
                            {source.tags && source.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {source.tags.map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Status & Stats */}
                            <div className="flex items-center gap-3 text-xs">
                              <div className={`flex items-center gap-1 ${status.color}`}>
                                <StatusIcon className={`w-3 h-3 ${source.index_status === 'indexing' ? 'animate-spin' : ''}`} />
                                <span>{status.label}</span>
                              </div>
                              
                              {source.index_stats && source.index_status === "indexed" && (
                                <span className="text-muted-foreground">
                                  {(source.index_stats.pagesExtracted || source.index_stats.pages || 0)} pages, {source.index_stats.chunks} chunks, {source.index_stats.tablesHigh + source.index_stats.tablesLow} tables
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {isGM && (
                            <div className="flex items-center gap-1 shrink-0">
                              {(source.index_status === "failed" || debugEnabled) && (
                                <TerminalButton
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDiagnosticsSource(source)}
                                  className={source.index_status === "failed" ? "text-destructive" : undefined}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                </TerminalButton>
                              )}

                              <TerminalButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleIndex(source)}
                                disabled={source.index_status === "indexing" || indexSource.isPending}
                                title="Index this source"
                              >
                                <RefreshCw className={`w-3 h-3 ${source.index_status === 'indexing' ? 'animate-spin' : ''}`} />
                              </TerminalButton>

                              <TerminalButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(source)}
                                disabled={deleteSource.isPending}
                                className="text-destructive hover:bg-destructive/10"
                                title="Delete source"
                              >
                                <Trash2 className="w-3 h-3" />
                              </TerminalButton>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Source Modal */}
      <AddSourceModal
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
        campaignId={campaignId}
      />

      {/* Diagnostics Modal */}
      {diagnosticsSource && (
        <SourceDiagnostics
          open={!!diagnosticsSource}
          onOpenChange={(open) => !open && setDiagnosticsSource(null)}
          source={diagnosticsSource}
          onReindex={() => {
            handleIndex(diagnosticsSource);
            setDiagnosticsSource(null);
          }}
        />
      )}
    </>
  );
}
