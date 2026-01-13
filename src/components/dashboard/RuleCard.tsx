import { useState } from "react";
import { WargameRule, useUpdateWargameRule, useDeleteWargameRule } from "@/hooks/useWargameRules";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  Save, 
  X, 
  Trash2, 
  FileText,
  List,
  Table,
  Terminal
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";

interface RuleCardProps {
  rule: WargameRule;
  isGM?: boolean;
  compact?: boolean;
}

interface RuleContent {
  type?: "text" | "list" | "table";
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export function RuleCard({ rule, isGM = false, compact = false }: RuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRule, setEditedRule] = useState<{
    title: string;
    category: string;
    content: string;
  }>({ title: "", category: "", content: "" });
  
  const updateMutation = useUpdateWargameRule();
  const deleteMutation = useDeleteWargameRule();

  const parseRuleContent = (content: Json): RuleContent => {
    if (typeof content === "string") {
      return { type: "text", text: content };
    }
    if (content && typeof content === "object" && !Array.isArray(content)) {
      return content as RuleContent;
    }
    return { type: "text", text: JSON.stringify(content, null, 2) };
  };

  const getContentAsString = (content: Json): string => {
    if (typeof content === "string") return content;
    if (content === null || content === undefined) return "";
    return JSON.stringify(content, null, 2);
  };

  const parseContent = (contentStr: string): Json => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return contentStr;
    }
  };

  const parsedContent = parseRuleContent(rule.content);

  const getContentIcon = () => {
    switch (parsedContent.type) {
      case "list": return <List className="w-3 h-3" />;
      case "table": return <Table className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getPreviewText = (): string => {
    switch (parsedContent.type) {
      case "list":
        return parsedContent.items?.slice(0, 2).join(", ") + (parsedContent.items && parsedContent.items.length > 2 ? "..." : "") || "";
      case "table":
        return `${parsedContent.headers?.length || 0} columns, ${parsedContent.rows?.length || 0} rows`;
      default:
        const text = parsedContent.text || "";
        return text.length > 60 ? text.substring(0, 60) + "..." : text;
    }
  };

  const startEditing = () => {
    setEditedRule({
      title: rule.title,
      category: rule.category,
      content: getContentAsString(rule.content),
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedRule({ title: "", category: "", content: "" });
    setIsEditing(false);
  };

  const saveChanges = async () => {
    await updateMutation.mutateAsync({
      id: rule.id,
      campaign_id: rule.campaign_id,
      title: editedRule.title,
      category: editedRule.category,
      content: parseContent(editedRule.content),
    });
    setIsEditing(false);
    setEditedRule({ title: "", category: "", content: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: rule.id, campaignId: rule.campaign_id });
    setIsOpen(false);
  };

  const renderContent = () => {
    switch (parsedContent.type) {
      case "list":
        return (
          <ul className="space-y-1">
            {parsedContent.items?.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary shrink-0">›</span>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        );
      
      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-primary/30">
                  {parsedContent.headers?.map((header, index) => (
                    <th 
                      key={index} 
                      className="text-left py-2 px-3 text-primary font-mono text-xs uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedContent.rows?.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className="border-b border-border/30 hover:bg-accent/30 transition-colors"
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-2 px-3 text-foreground/90">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {parsedContent.text}
          </div>
        );
    }
  };

  return (
    <>
      {/* Card Tile - Grid or Compact List */}
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative w-full text-left transition-all duration-200 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] ${
          compact 
            ? "px-3 py-2 bg-card border-b border-border/30 hover:bg-accent/30 hover:border-primary/30"
            : "p-3 bg-card border border-border/50 hover:border-primary/50"
        }`}
      >
        {/* Terminal-style top bar (grid only) */}
        {!compact && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        
        <div className={`flex items-center gap-3 ${compact ? "" : "items-start"}`}>
          {/* Icon */}
          <div className={`shrink-0 flex items-center justify-center text-primary ${
            compact 
              ? "w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" 
              : "w-8 h-8 bg-primary/10 border border-primary/30"
          }`}>
            {getContentIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {compact ? (
              <div className="flex items-center gap-3">
                <h4 className="font-mono text-sm text-foreground truncate group-hover:text-primary transition-colors flex-1">
                  {rule.title}
                </h4>
                <Badge variant="outline" className="text-[9px] shrink-0 opacity-50">
                  {parsedContent.type || "text"}
                </Badge>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-mono text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {rule.title}
                  </h4>
                  <Badge variant="outline" className="text-[9px] shrink-0 opacity-60">
                    {parsedContent.type || "text"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {getPreviewText()}
                </p>
              </>
            )}
          </div>

          {/* Hover indicator */}
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom accent line (grid only) */}
        {!compact && (
          <div className="absolute bottom-0 left-3 right-3 h-px bg-border/30 group-hover:bg-primary/30 transition-colors" />
        )}
      </button>

      {/* Full Rule Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-border/30 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                {getContentIcon()}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <TerminalInput
                    value={editedRule.title}
                    onChange={(e) => setEditedRule(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-bold"
                  />
                ) : (
                  <DialogTitle className="text-lg font-mono text-primary uppercase tracking-wider">
                    {rule.title}
                  </DialogTitle>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <TerminalInput
                      value={editedRule.category}
                      onChange={(e) => setEditedRule(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Category"
                      className="text-xs w-32"
                    />
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {rule.category}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {rule.rule_key}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Rule Content */}
          <div className="flex-1 overflow-auto py-4">
            {isEditing ? (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Content (JSON or plain text)
                </label>
                <Textarea
                  value={editedRule.content}
                  onChange={(e) => setEditedRule(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Rule content..."
                  className="w-full min-h-[200px] text-xs font-mono bg-input border border-border"
                />
              </div>
            ) : (
              <div className="bg-muted/20 border border-border/30 p-4 rounded">
                {renderContent()}
              </div>
            )}
          </div>

          {/* Footer Actions (GM only) */}
          {isGM && (
            <div className="border-t border-border/30 pt-3 flex justify-between shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </TerminalButton>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{rule.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <TerminalButton variant="ghost" size="sm" onClick={cancelEditing}>
                      Cancel
                    </TerminalButton>
                    <TerminalButton 
                      size="sm" 
                      onClick={saveChanges}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </TerminalButton>
                  </>
                ) : (
                  <TerminalButton variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </TerminalButton>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
