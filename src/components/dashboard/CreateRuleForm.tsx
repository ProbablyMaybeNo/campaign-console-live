import { useState } from "react";
import { useCreateWargameRule } from "@/hooks/useWargameRules";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Plus, Trash2 } from "lucide-react";

interface CreateRuleFormProps {
  campaignId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function CreateRuleForm({ campaignId, onComplete, onCancel }: CreateRuleFormProps) {
  const createMutation = useCreateWargameRule();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [ruleKey, setRuleKey] = useState("");
  const [contentType, setContentType] = useState<"text" | "list" | "table">("text");
  
  // For text content
  const [textContent, setTextContent] = useState("");
  
  // For list content
  const [listItems, setListItems] = useState<string[]>([""]);
  
  // For table content
  const [tableHeaders, setTableHeaders] = useState<string[]>(["Column 1", "Column 2"]);
  const [tableRows, setTableRows] = useState<string[][]>([["", ""]]);

  const generateRuleKey = (inputTitle: string) => {
    return inputTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!ruleKey || ruleKey === generateRuleKey(title)) {
      setRuleKey(generateRuleKey(value));
    }
  };

  const addListItem = () => {
    setListItems([...listItems, ""]);
  };

  const updateListItem = (index: number, value: string) => {
    const updated = [...listItems];
    updated[index] = value;
    setListItems(updated);
  };

  const removeListItem = (index: number) => {
    if (listItems.length > 1) {
      setListItems(listItems.filter((_, i) => i !== index));
    }
  };

  const addTableColumn = () => {
    setTableHeaders([...tableHeaders, `Column ${tableHeaders.length + 1}`]);
    setTableRows(tableRows.map(row => [...row, ""]));
  };

  const removeTableColumn = (colIndex: number) => {
    if (tableHeaders.length > 1) {
      setTableHeaders(tableHeaders.filter((_, i) => i !== colIndex));
      setTableRows(tableRows.map(row => row.filter((_, i) => i !== colIndex)));
    }
  };

  const updateTableHeader = (index: number, value: string) => {
    const updated = [...tableHeaders];
    updated[index] = value;
    setTableHeaders(updated);
  };

  const addTableRow = () => {
    setTableRows([...tableRows, new Array(tableHeaders.length).fill("")]);
  };

  const removeTableRow = (rowIndex: number) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((_, i) => i !== rowIndex));
    }
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    const updated = [...tableRows];
    updated[rowIndex][colIndex] = value;
    setTableRows(updated);
  };

  const buildContent = () => {
    switch (contentType) {
      case "text":
        return { type: "text", text: textContent };
      case "list":
        return { type: "list", items: listItems.filter(item => item.trim() !== "") };
      case "table":
        return {
          type: "table",
          headers: tableHeaders,
          rows: tableRows.filter(row => row.some(cell => cell.trim() !== "")),
        };
      default:
        return { type: "text", text: textContent };
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !category.trim() || !ruleKey.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      campaign_id: campaignId,
      title: title.trim(),
      category: category.trim(),
      rule_key: ruleKey.trim(),
      content: buildContent(),
    });

    onComplete();
  };

  const isValid = title.trim() && category.trim() && ruleKey.trim();

  return (
    <TerminalCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-primary">Create New Rule</h3>
        <TerminalButton variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </TerminalButton>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Title</Label>
            <TerminalInput
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Rule title"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Category</Label>
            <TerminalInput
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., abilities, weapons, movement"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider">Rule Key (auto-generated)</Label>
          <TerminalInput
            value={ruleKey}
            onChange={(e) => setRuleKey(e.target.value)}
            placeholder="unique_rule_key"
            className="font-mono text-xs"
          />
        </div>

        {/* Content Type Selector */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider">Content Type</Label>
          <div className="flex gap-2">
            {(["text", "list", "table"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setContentType(type)}
                className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                  contentType === type
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Editor based on type */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider">Content</Label>

          {contentType === "text" && (
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter the rule description..."
              className="min-h-[120px] bg-input border-border font-mono text-sm"
            />
          )}

          {contentType === "list" && (
            <div className="space-y-2">
              {listItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <TerminalInput
                    value={item}
                    onChange={(e) => updateListItem(index, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                    className="flex-1"
                  />
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeListItem(index)}
                    disabled={listItems.length <= 1}
                    className="shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </TerminalButton>
                </div>
              ))}
              <TerminalButton variant="outline" size="sm" onClick={addListItem}>
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </TerminalButton>
            </div>
          )}

          {contentType === "table" && (
            <div className="space-y-3">
              {/* Table Headers */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Headers</span>
                <div className="flex gap-2 flex-wrap">
                  {tableHeaders.map((header, index) => (
                    <div key={index} className="flex gap-1 items-center">
                      <TerminalInput
                        value={header}
                        onChange={(e) => updateTableHeader(index, e.target.value)}
                        className="w-28"
                      />
                      <TerminalButton
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTableColumn(index)}
                        disabled={tableHeaders.length <= 1}
                      >
                        <Trash2 className="w-3 h-3" />
                      </TerminalButton>
                    </div>
                  ))}
                  <TerminalButton variant="outline" size="sm" onClick={addTableColumn}>
                    <Plus className="w-3 h-3" />
                  </TerminalButton>
                </div>
              </div>

              {/* Table Rows */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Rows</span>
                {tableRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2 items-center">
                    {row.map((cell, colIndex) => (
                      <TerminalInput
                        key={colIndex}
                        value={cell}
                        onChange={(e) => updateTableCell(rowIndex, colIndex, e.target.value)}
                        className="w-28"
                        placeholder={tableHeaders[colIndex]}
                      />
                    ))}
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTableRow(rowIndex)}
                      disabled={tableRows.length <= 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </TerminalButton>
                  </div>
                ))}
                <TerminalButton variant="outline" size="sm" onClick={addTableRow}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Row
                </TerminalButton>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <TerminalButton
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Saving..." : "Save Rule"}
          </TerminalButton>
          <TerminalButton variant="outline" onClick={onCancel}>
            Cancel
          </TerminalButton>
        </div>
      </div>
    </TerminalCard>
  );
}
