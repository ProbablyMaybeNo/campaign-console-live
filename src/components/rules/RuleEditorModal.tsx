/**
 * RuleEditorModal - Inline editor for existing rules (tables and cards)
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateRule, WargameRule, TableRuleContent, CardRuleContent } from "@/hooks/useWargameRules";
import { Table, LayoutList, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

interface RuleEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: WargameRule;
}

interface TableRow {
  id: string;
  [key: string]: string;
}

interface CardSection {
  id: string;
  header: string;
  content: string;
}

export function RuleEditorModal({ open, onOpenChange, rule }: RuleEditorModalProps) {
  const content = rule.content as unknown as TableRuleContent | CardRuleContent;
  const isTable = content?.type === "table";

  const [title, setTitle] = useState(rule.title);
  const [category, setCategory] = useState(rule.category);

  // Table state
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerValue, setHeaderValue] = useState("");

  // Card state
  const [sections, setSections] = useState<CardSection[]>([]);

  const updateRule = useUpdateRule();

  // Initialize state from rule
  useEffect(() => {
    setTitle(rule.title);
    setCategory(rule.category);

    if (content?.type === "table") {
      const tableContent = content as TableRuleContent;
      setColumns(tableContent.columns || []);
      setRows(tableContent.rows || []);
    } else if (content?.type === "card") {
      const cardContent = content as CardRuleContent;
      setSections(cardContent.sections || []);
    }
  }, [rule, content]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const updatedContent: TableRuleContent | CardRuleContent = isTable
      ? { type: "table", columns, rows, rawText: (content as TableRuleContent).rawText }
      : { type: "card", title, sections, rawText: (content as CardRuleContent).rawText };

    await updateRule.mutateAsync({
      id: rule.id,
      title: title.trim(),
      category: category.trim(),
      content: updatedContent,
    });

    toast.success("Rule updated");
    onOpenChange(false);
  };

  // Table editing functions
  const handleAddColumn = () => {
    const newCol = `Column ${columns.length + 1}`;
    setColumns([...columns, newCol]);
    setRows(rows.map((row) => ({ ...row, [newCol]: "" })));
  };

  const handleRemoveColumn = (index: number) => {
    const colToRemove = columns[index];
    setColumns(columns.filter((_, i) => i !== index));
    setRows(rows.map((row) => {
      const { [colToRemove]: _, ...rest } = row;
      return rest as TableRow;
    }));
  };

  const handleRenameColumn = (index: number, newName: string) => {
    const oldName = columns[index];
    if (oldName === newName || !newName.trim()) return;
    
    const newColumns = [...columns];
    newColumns[index] = newName;
    setColumns(newColumns);

    setRows(rows.map((row) => {
      const newRow = { ...row };
      newRow[newName] = row[oldName] || "";
      delete newRow[oldName];
      return newRow;
    }));
    setEditingHeader(null);
  };

  const handleAddRow = () => {
    const newRow: TableRow = { id: crypto.randomUUID() };
    columns.forEach((col) => (newRow[col] = ""));
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
  };

  const handleCellChange = (rowId: string, col: string, value: string) => {
    setRows(rows.map((r) => (r.id === rowId ? { ...r, [col]: value } : r)));
  };

  // Card editing functions
  const handleAddSection = () => {
    setSections([...sections, { id: crypto.randomUUID(), header: "New Section", content: "" }]);
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const handleSectionChange = (sectionId: string, field: "header" | "content", value: string) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">{">"}</span>
            {isTable ? <Table className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
            Edit {isTable ? "Table" : "Card"}: {rule.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Title & Category */}
          <div className="flex gap-4">
            <div className="flex-1">
              <TerminalInput
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="w-48">
              <TerminalInput
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          {/* Content Editor */}
          <ScrollArea className="flex-1 border border-border rounded p-2">
            {isTable ? (
              <div className="space-y-3">
                {/* Column Headers */}
                <div className="flex gap-1 items-center">
                  <div className="w-6" /> {/* Grip placeholder */}
                  {columns.map((col, i) => (
                    <div key={i} className="flex-1 min-w-[80px]">
                      {editingHeader === i ? (
                        <input
                          type="text"
                          value={headerValue}
                          onChange={(e) => setHeaderValue(e.target.value)}
                          onBlur={() => {
                            handleRenameColumn(i, headerValue);
                            setEditingHeader(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameColumn(i, headerValue);
                            if (e.key === "Escape") setEditingHeader(null);
                          }}
                          autoFocus
                          className="w-full bg-input border border-primary rounded px-2 py-1 text-xs font-mono"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingHeader(i);
                              setHeaderValue(col);
                            }}
                            className="flex-1 text-left text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 truncate"
                          >
                            {col}
                          </button>
                          {columns.length > 1 && (
                            <button
                              onClick={() => handleRemoveColumn(i)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddColumn}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                    title="Add column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Rows */}
                {rows.map((row) => (
                  <div key={row.id} className="flex gap-1 items-center group">
                    <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                    {columns.map((col, i) => (
                      <input
                        key={i}
                        type="text"
                        value={row[col] || ""}
                        onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                        className="flex-1 min-w-[80px] bg-input border border-border rounded px-2 py-1 text-xs focus:border-primary focus:outline-none"
                        placeholder="-"
                      />
                    ))}
                    <button
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-opacity"
                      title="Remove row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Row Button */}
                <button
                  onClick={handleAddRow}
                  className="w-full border border-dashed border-border hover:border-primary rounded py-2 text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Row
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <div key={section.id} className="border border-border rounded p-2 group">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={section.header}
                        onChange={(e) => handleSectionChange(section.id, "header", e.target.value)}
                        className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs font-mono text-primary focus:border-primary focus:outline-none"
                        placeholder="Section header"
                      />
                      <button
                        onClick={() => handleRemoveSection(section.id)}
                        className="p-1 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <textarea
                      value={section.content}
                      onChange={(e) => handleSectionChange(section.id, "content", e.target.value)}
                      className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:border-primary focus:outline-none resize-none"
                      rows={3}
                      placeholder="Section content..."
                    />
                  </div>
                ))}

                <button
                  onClick={handleAddSection}
                  className="w-full border border-dashed border-border hover:border-primary rounded py-2 text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Section
                </button>
              </div>
            )}
          </ScrollArea>

          {/* Stats */}
          <div className="text-[10px] text-muted-foreground">
            {isTable
              ? `${columns.length} columns × ${rows.length} rows`
              : `${sections.length} sections`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <TerminalButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </TerminalButton>
          <TerminalButton onClick={handleSave} disabled={updateRule.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateRule.isPending ? "Saving..." : "[ Save Changes ]"}
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
