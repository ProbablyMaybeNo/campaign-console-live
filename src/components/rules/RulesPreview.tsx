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
  X
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

interface RulesPreviewProps {
  rules: PreviewRule[];
  onUpdateRule: (index: number, rule: PreviewRule) => void;
  onDeleteRule: (index: number) => void;
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
  onUpdateRule, 
  onDeleteRule, 
  onSaveAll,
  onCancel,
  isSaving 
}: RulesPreviewProps) {
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set([0]));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const incompleteCount = rules.filter(r => r.validation_status !== "complete").length;
  const categories = rules.reduce((acc, rule) => {
    acc[rule.category] = (acc[rule.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
      </div>

      {/* Rules list */}
      <div className="border border-border rounded max-h-80 overflow-y-auto">
        {rules.map((rule, index) => (
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
        ))}
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
  switch (content.type) {
    case "text":
      return <p>{content.text}</p>;
    
    case "list":
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    
    case "roll_table":
      return (
        <div>
          <p className="font-medium mb-1">{content.dice} Table ({content.entries.length} entries)</p>
          <table className="w-full text-left">
            <tbody>
              {content.entries.slice(0, 6).map((entry, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className="py-0.5 pr-2 font-mono w-12">{entry.roll}</td>
                  <td className="py-0.5">{entry.result}</td>
                </tr>
              ))}
              {content.entries.length > 6 && (
                <tr>
                  <td colSpan={2} className="py-0.5 text-muted-foreground/60">
                    ... and {content.entries.length - 6} more entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    
    case "equipment":
      return (
        <div>
          <p className="font-medium mb-1">{content.items.length} items</p>
          {content.items.slice(0, 4).map((item, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span>{item.name}</span>
              {item.cost && <span className="text-muted-foreground">{item.cost}</span>}
            </div>
          ))}
          {content.items.length > 4 && (
            <p className="text-muted-foreground/60">... and {content.items.length - 4} more items</p>
          )}
        </div>
      );
    
    case "stats_table":
      return (
        <div>
          <p className="font-medium mb-1">{content.rows.length} rows</p>
          <p className="text-muted-foreground/60">Columns: {content.columns.join(", ")}</p>
        </div>
      );
    
    default:
      return <p className="text-muted-foreground">Unknown content type</p>;
  }
}
