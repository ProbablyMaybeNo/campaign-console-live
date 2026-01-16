import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useUpdateRule, useDeleteRule } from "@/hooks/useRulesManagement";
import { 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  Table,
  List,
  Dices,
  FileText
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface RuleCardProps {
  rule: {
    id: string;
    title: string;
    category: string;
    rule_key: string;
    content: Json;
    metadata: Json | null;
  };
  isGM: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function RuleCard({ rule, isGM, isExpanded = false, onToggle }: RuleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(rule.title);
  const [editCategory, setEditCategory] = useState(rule.category);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const handleSave = async () => {
    await updateRule.mutateAsync({
      ruleId: rule.id,
      updates: {
        title: editTitle,
        category: editCategory,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteRule.mutateAsync(rule.id);
    setShowDeleteConfirm(false);
  };

  const getContentType = (): string => {
    if (typeof rule.content !== "object" || rule.content === null) return "text";
    const content = rule.content as Record<string, unknown>;
    return (content.type as string) || "text";
  };

  const getContentIcon = () => {
    const type = getContentType();
    switch (type) {
      case "roll_table":
        return <Dices className="w-3 h-3" />;
      case "stats_table":
      case "equipment":
        return <Table className="w-3 h-3" />;
      case "list":
        return <List className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const renderContent = () => {
    if (typeof rule.content === "string") {
      return <p className="text-xs text-muted-foreground whitespace-pre-wrap">{rule.content}</p>;
    }

    if (typeof rule.content !== "object" || rule.content === null) {
      return <p className="text-xs text-muted-foreground">{String(rule.content)}</p>;
    }

    const content = rule.content as Record<string, unknown>;
    const type = content.type as string;

    switch (type) {
      case "text":
        return (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {content.text as string}
          </p>
        );

      case "list":
        return (
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            {(content.items as string[])?.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );

      case "roll_table":
        return (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-primary">
              {content.dice as string} Table
            </div>
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-primary">Roll</th>
                    <th className="px-3 py-2 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(content.entries as Array<{ roll: string; result: string }>)?.map((entry, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-primary">{entry.roll}</td>
                      <td className="px-3 py-2 text-muted-foreground">{entry.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "stats_table":
        const columns = content.columns as string[];
        const rows = content.rows as Array<Record<string, string>>;
        return (
          <div className="border border-border rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {columns?.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-mono text-primary">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows?.map((row, idx) => (
                  <tr key={idx} className="border-t border-border">
                    {columns?.map((col) => (
                      <td key={col} className="px-3 py-2 text-muted-foreground">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "equipment":
        return (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-primary">Item</th>
                  <th className="px-3 py-2 text-left">Cost</th>
                  <th className="px-3 py-2 text-left">Stats</th>
                  <th className="px-3 py-2 text-left">Effect</th>
                </tr>
              </thead>
              <tbody>
                {(content.items as Array<{ name: string; cost?: string; stats?: string; effect?: string }>)?.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.cost || "-"}</td>
                    <td className="px-3 py-2 font-mono text-primary">{item.stats || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.effect || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <pre className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded overflow-auto max-h-48">
            {JSON.stringify(content, null, 2)}
          </pre>
        );
    }
  };

  if (showDeleteConfirm) {
    return (
      <div className="border border-destructive/50 rounded p-4 bg-destructive/5">
        <p className="text-sm text-destructive mb-3">
          Delete "{rule.title}"? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <TerminalButton 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
          >
            Cancel
          </TerminalButton>
          <TerminalButton 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={deleteRule.isPending}
            className="flex-1"
          >
            {deleteRule.isPending ? "Deleting..." : "Delete"}
          </TerminalButton>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="border border-primary/50 rounded p-4 space-y-3 bg-primary/5">
        <TerminalInput
          label="Title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
        />
        <TerminalInput
          label="Category"
          value={editCategory}
          onChange={(e) => setEditCategory(e.target.value)}
        />
        <div className="flex gap-2">
          <TerminalButton 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </TerminalButton>
          <TerminalButton 
            size="sm" 
            onClick={handleSave}
            disabled={updateRule.isPending}
            className="flex-1"
          >
            <Save className="w-3 h-3 mr-1" />
            {updateRule.isPending ? "Saving..." : "Save"}
          </TerminalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-muted-foreground">{getContentIcon()}</span>
          <div className="min-w-0">
            <span className="text-sm font-mono text-primary truncate block">{rule.title}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {rule.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGM && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:text-primary transition-colors"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-1 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="mt-3">
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
