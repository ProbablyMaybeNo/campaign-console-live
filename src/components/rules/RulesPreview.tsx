import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  Save,
  AlertTriangle,
  Check,
  X,
  FileText,
  Plus,
  Eye,
  EyeOff
} from "lucide-react";

export interface PreviewRule {
  id?: string;
  category: string;
  rule_key: string;
  title: string;
  content: RuleContent;
  metadata?: Record<string, unknown>;
  validation_status?: string;
  isEditing?: boolean;
}

type RuleContent = 
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "roll_table"; dice: string; entries: Array<{ roll: string; result: string }> }
  | { type: "stats_table"; columns: string[]; rows: Array<Record<string, string>> }
  | { type: "equipment"; items: Array<{ name: string; cost?: string; stats?: string; effect?: string }> };

interface SourceText {
  section: string;
  text: string;
}

interface RulesPreviewProps {
  rules: PreviewRule[];
  sourceTexts?: SourceText[];
  onUpdateRule: (index: number, rule: PreviewRule) => void;
  onDeleteRule: (index: number) => void;
  onAddRule: (rule: PreviewRule) => void;
  onSaveAll: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const CATEGORIES = [
  "Campaign Rules",
  "Exploration Tables", 
  "Skill Tables",
  "Roll Tables",
  "Injury Tables",
  "Equipment",
  "Keywords",
  "Core Rules",
  "Unit Profiles",
  "Abilities",
  "Scenarios",
  "Advancement",
  "Warband Rules",
  "Custom",
];

export function RulesPreview({ 
  rules, 
  sourceTexts = [],
  onUpdateRule, 
  onDeleteRule,
  onAddRule,
  onSaveAll,
  onCancel,
  isSaving 
}: RulesPreviewProps) {
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set([0]));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showSourceText, setShowSourceText] = useState(false);
  const [selectedSourceSection, setSelectedSourceSection] = useState<string | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("Core Rules");
  const [newRuleContent, setNewRuleContent] = useState("");

  const toggleExpand = (index: number) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setExpandedRules(prev => new Set(prev).add(index));
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const saveEdit = (index: number, updatedRule: PreviewRule) => {
    onUpdateRule(index, updatedRule);
    setEditingIndex(null);
  };

  const handleAddManualRule = () => {
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return;
    
    const newRule: PreviewRule = {
      category: newRuleCategory,
      rule_key: `manual_${Date.now()}`,
      title: newRuleTitle.trim(),
      content: { type: "text", text: newRuleContent.trim() },
      metadata: { source_type: "manual", manual_entry: true },
      validation_status: "complete"
    };
    
    onAddRule(newRule);
    setNewRuleTitle("");
    setNewRuleContent("");
    setIsAddingManual(false);
  };

  const incompleteCount = rules.filter(r => r.validation_status !== "complete").length;
  const categories = rules.reduce((acc, rule) => {
    acc[rule.category] = (acc[rule.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentSourceText = selectedSourceSection 
    ? sourceTexts.find(s => s.section === selectedSourceSection)?.text 
    : sourceTexts[0]?.text;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Review Extracted Rules</p>
          <p className="text-xs text-muted-foreground">
            {rules.length} rules in {Object.keys(categories).length} categories
            {incompleteCount > 0 && (
              <span className="text-yellow-400 ml-2">
                • {incompleteCount} need review
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {sourceTexts.length > 0 && (
            <TerminalButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSourceText(!showSourceText)}
            >
              {showSourceText ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showSourceText ? "Hide" : "View"} Source
            </TerminalButton>
          )}
          <TerminalButton 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddingManual(!isAddingManual)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Rule
          </TerminalButton>
        </div>
      </div>

      {/* Manual Rule Creator */}
      {isAddingManual && (
        <div className="border border-primary/30 rounded p-3 bg-primary/5 space-y-3">
          <p className="text-xs font-medium text-primary">Add Rule Manually</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Title</label>
              <Input 
                value={newRuleTitle} 
                onChange={(e) => setNewRuleTitle(e.target.value)} 
                placeholder="Rule title..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Category</label>
              <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Content</label>
            <Textarea 
              value={newRuleContent} 
              onChange={(e) => setNewRuleContent(e.target.value)} 
              placeholder="Paste or type the rule content..."
              className="h-20 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <TerminalButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsAddingManual(false)}
            >
              Cancel
            </TerminalButton>
            <TerminalButton 
              size="sm" 
              onClick={handleAddManualRule}
              disabled={!newRuleTitle.trim() || !newRuleContent.trim()}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Rule
            </TerminalButton>
          </div>
        </div>
      )}

      {/* Source Text Viewer */}
      {showSourceText && sourceTexts.length > 0 && (
        <div className="border border-border rounded bg-muted/20">
          <div className="flex items-center justify-between p-2 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Source Text (Unparsed Content)</span>
            </div>
            {sourceTexts.length > 1 && (
              <Select 
                value={selectedSourceSection || sourceTexts[0]?.section} 
                onValueChange={setSelectedSourceSection}
              >
                <SelectTrigger className="h-6 text-xs w-40">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTexts.map(st => (
                    <SelectItem key={st.section} value={st.section} className="text-xs">
                      {st.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="p-3 max-h-40 overflow-y-auto">
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
              {currentSourceText?.slice(0, 5000) || "No source text available"}
              {currentSourceText && currentSourceText.length > 5000 && (
                <span className="text-primary">... ({(currentSourceText.length - 5000).toLocaleString()} more characters)</span>
              )}
            </pre>
          </div>
          <div className="p-2 border-t border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              💡 Tip: Select text you want to capture, then use "Add Rule" above to manually create a rule from it.
            </p>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="border border-border rounded max-h-80 overflow-y-auto">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm">No rules were auto-extracted.</p>
            <p className="text-xs mt-1">Use "View Source" to see the raw text and "Add Rule" to manually create rules.</p>
          </div>
        ) : (
          rules.map((rule, index) => (
            <RulePreviewItem
              key={`${rule.rule_key}-${index}`}
              rule={rule}
              index={index}
              isExpanded={expandedRules.has(index)}
              isEditing={editingIndex === index}
              onToggle={() => toggleExpand(index)}
              onEdit={() => startEditing(index)}
              onDelete={() => onDeleteRule(index)}
              onSave={(updated) => saveEdit(index, updated)}
              onCancelEdit={cancelEditing}
            />
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Back
        </TerminalButton>
        <TerminalButton 
          onClick={onSaveAll} 
          disabled={isSaving || rules.length === 0}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : `Save ${rules.length} Rules`}
        </TerminalButton>
      </div>
    </div>
  );
}

interface RulePreviewItemProps {
  rule: PreviewRule;
  index: number;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (rule: PreviewRule) => void;
  onCancelEdit: () => void;
}

function RulePreviewItem({ 
  rule, 
  index,
  isExpanded, 
  isEditing,
  onToggle, 
  onEdit,
  onDelete,
  onSave,
  onCancelEdit
}: RulePreviewItemProps) {
  const [editedRule, setEditedRule] = useState<PreviewRule>(rule);
  const isIncomplete = rule.validation_status !== "complete";

  const handleSave = () => {
    onSave(editedRule);
  };

  if (isEditing) {
    return (
      <div className="p-3 border-b border-border last:border-b-0 bg-muted/20">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Title</label>
              <Input
                value={editedRule.title}
                onChange={(e) => setEditedRule(prev => ({ ...prev, title: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Category</label>
              <Select 
                value={editedRule.category}
                onValueChange={(value) => setEditedRule(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Content Preview</label>
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded max-h-32 overflow-auto">
              <RuleContentDisplay content={rule.content} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <TerminalButton variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </TerminalButton>
            <TerminalButton size="sm" onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" />
              Apply
            </TerminalButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div 
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/20"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono truncate">{rule.title}</span>
            {isIncomplete && (
              <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{rule.category}</span>
            <span className="text-[10px] text-muted-foreground/50">•</span>
            <span className="text-[10px] text-muted-foreground">{rule.content.type}</span>
          </div>
        </div>

        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <TerminalButton variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
            <Edit2 className="w-3 h-3" />
          </TerminalButton>
          <TerminalButton variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
            <Trash2 className="w-3 h-3" />
          </TerminalButton>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pl-9">
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded max-h-48 overflow-auto">
            <RuleContentDisplay content={rule.content} />
          </div>
        </div>
      )}
    </div>
  );
}

function RuleContentDisplay({ content }: { content: RuleContent }) {
  // Guard against undefined or malformed content
  if (!content || typeof content !== 'object') {
    return <p className="text-muted-foreground">No content available</p>;
  }

  switch (content.type) {
    case "text":
      return <p>{content.text || "(empty)"}</p>;
    
    case "list": {
      const items = content.items || [];
      if (items.length === 0) return <p className="text-muted-foreground">Empty list</p>;
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    
    case "roll_table": {
      const entries = content.entries || [];
      return (
        <div>
          <p className="font-medium mb-1">{content.dice || "?"} Table ({entries.length} entries)</p>
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No entries found</p>
          ) : (
            <table className="w-full text-left">
              <tbody>
                {entries.slice(0, 6).map((entry, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-b-0">
                    <td className="py-0.5 pr-2 font-mono w-12">{entry?.roll || "?"}</td>
                    <td className="py-0.5">{entry?.result || "(no result)"}</td>
                  </tr>
                ))}
                {entries.length > 6 && (
                  <tr>
                    <td colSpan={2} className="py-0.5 text-muted-foreground/60">
                      ... and {entries.length - 6} more entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    
    case "equipment": {
      const items = content.items || [];
      return (
        <div>
          <p className="font-medium mb-1">{items.length} items</p>
          {items.length === 0 ? (
            <p className="text-muted-foreground">No items found</p>
          ) : (
            <>
              {items.slice(0, 4).map((item, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span>{item?.name || "(unnamed)"}</span>
                  {item?.cost && <span className="text-muted-foreground">{item.cost}</span>}
                </div>
              ))}
              {items.length > 4 && (
                <p className="text-muted-foreground/60">... and {items.length - 4} more items</p>
              )}
            </>
          )}
        </div>
      );
    }
    
    case "stats_table": {
      const rows = content.rows || [];
      const columns = content.columns || [];
      return (
        <div>
          <p className="font-medium mb-1">{rows.length} rows</p>
          <p className="text-muted-foreground/60">
            Columns: {columns.length > 0 ? columns.join(", ") : "(none)"}
          </p>
        </div>
      );
    }
    
    default:
      return <p className="text-muted-foreground">Unknown content type</p>;
  }
}
