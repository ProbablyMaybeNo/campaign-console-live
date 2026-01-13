import { useState } from "react";
import { WargameRule, useUpdateWargameRule, useDeleteWargameRule } from "@/hooks/useWargameRules";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Pencil, 
  Save, 
  X, 
  Trash2, 
  ChevronDown,
  ChevronRight
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
import type { Json } from "@/integrations/supabase/types";

interface RuleEditorProps {
  rule: WargameRule;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function RuleEditor({ rule, isExpanded, onToggleExpand }: RuleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRule, setEditedRule] = useState<{
    title: string;
    category: string;
    content: string;
  }>({ title: "", category: "", content: "" });
  
  const updateMutation = useUpdateWargameRule();
  const deleteMutation = useDeleteWargameRule();

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
  };

  return (
    <div className="px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={onToggleExpand}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-primary shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              {isEditing ? (
                <input
                  type="text"
                  value={editedRule.title}
                  onChange={(e) => setEditedRule(prev => ({ ...prev, title: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-sm text-foreground bg-input border border-border px-2 py-0.5 w-48"
                />
              ) : (
                <h4 className="font-mono text-sm text-foreground">{rule.title}</h4>
              )}
            </button>
          </div>

          {isEditing && (
            <div className="mt-2 ml-4">
              <label className="text-[10px] text-muted-foreground uppercase">Category</label>
              <input
                type="text"
                value={editedRule.category}
                onChange={(e) => setEditedRule(prev => ({ ...prev, category: e.target.value }))}
                className="w-full text-xs font-mono bg-input border border-border px-2 py-1 mt-1"
              />
            </div>
          )}

          {/* Expandable Content */}
          {isExpanded && (
            <div className="mt-3 ml-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Content</label>
              {isEditing ? (
                <Textarea
                  value={editedRule.content}
                  onChange={(e) => setEditedRule(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Rule content..."
                  className="w-full min-h-[120px] text-xs font-mono bg-input border border-border"
                />
              ) : (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 border border-border/30">
                  {getContentAsString(rule.content)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              <TerminalButton
                variant="default"
                size="sm"
                onClick={saveChanges}
                disabled={updateMutation.isPending}
                className="h-7 px-2"
              >
                <Save className="w-3 h-3" />
              </TerminalButton>
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                className="h-7 px-2"
              >
                <X className="w-3 h-3" />
              </TerminalButton>
            </>
          ) : (
            <>
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={startEditing}
                className="h-7 px-2"
              >
                <Pencil className="w-3 h-3" />
              </TerminalButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
