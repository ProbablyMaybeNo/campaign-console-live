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
  Plus, 
  Trash2, 
  FileText,
  List,
  Table,
  Dices,
  Sword,
  CheckCircle
} from "lucide-react";
import { RULE_CATEGORIES, type RuleContent, type ExtractedRule } from "@/types/rules";

interface ManualRuleCreatorProps {
  onAddRule: (rule: ExtractedRule) => void;
  onComplete: () => void;
  onCancel: () => void;
  existingRules: ExtractedRule[];
}

type ContentType = "text" | "list" | "roll_table" | "stats_table" | "equipment";

interface RollTableEntry {
  roll: string;
  result: string;
}

interface EquipmentItem {
  name: string;
  cost?: string;
  stats?: string;
  effect?: string;
}

export function ManualRuleCreator({ 
  onAddRule, 
  onComplete,
  onCancel, 
  existingRules 
}: ManualRuleCreatorProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Core Rules");
  const [contentType, setContentType] = useState<ContentType>("text");
  
  // Content state by type
  const [textContent, setTextContent] = useState("");
  const [listItems, setListItems] = useState<string[]>([""]);
  const [diceType, setDiceType] = useState("D6");
  const [tableEntries, setTableEntries] = useState<RollTableEntry[]>([
    { roll: "1", result: "" },
    { roll: "2", result: "" },
    { roll: "3", result: "" },
    { roll: "4", result: "" },
    { roll: "5", result: "" },
    { roll: "6", result: "" },
  ]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([{ name: "" }]);

  const contentTypeOptions = [
    { value: "text", label: "Text", icon: FileText, description: "Plain text rule or description" },
    { value: "list", label: "List", icon: List, description: "Bulleted list of items" },
    { value: "roll_table", label: "Roll Table", icon: Dices, description: "D6, D66, or custom die table" },
    { value: "equipment", label: "Equipment", icon: Sword, description: "Weapons, gear, or items list" },
  ];

  const generateRuleKey = (ruleTitle: string) => {
    return ruleTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50);
  };

  const buildContent = (): RuleContent => {
    switch (contentType) {
      case "text":
        return { type: "text", text: textContent };
      case "list":
        return { type: "list", items: listItems.filter(item => item.trim()) };
      case "roll_table":
        return { 
          type: "roll_table", 
          dice: diceType, 
          entries: tableEntries.filter(e => e.result.trim()) 
        };
      case "equipment":
        return { 
          type: "equipment", 
          items: equipmentItems.filter(e => e.name.trim()) 
        };
      default:
        return { type: "text", text: textContent };
    }
  };

  const isValid = () => {
    if (!title.trim()) return false;
    
    switch (contentType) {
      case "text":
        return textContent.trim().length > 0;
      case "list":
        return listItems.some(item => item.trim());
      case "roll_table":
        return tableEntries.some(e => e.result.trim());
      case "equipment":
        return equipmentItems.some(e => e.name.trim());
      default:
        return false;
    }
  };

  const handleAddRule = () => {
    if (!isValid()) return;

    const rule: ExtractedRule = {
      category,
      rule_key: generateRuleKey(title),
      title: title.trim(),
      content: buildContent(),
      metadata: { source: "manual", created_at: new Date().toISOString() },
      validation_status: "complete"
    };

    onAddRule(rule);
    
    // Reset form
    setTitle("");
    setTextContent("");
    setListItems([""]);
    setTableEntries([
      { roll: "1", result: "" },
      { roll: "2", result: "" },
      { roll: "3", result: "" },
      { roll: "4", result: "" },
      { roll: "5", result: "" },
      { roll: "6", result: "" },
    ]);
    setEquipmentItems([{ name: "" }]);
  };

  const updateListItem = (index: number, value: string) => {
    setListItems(prev => prev.map((item, i) => i === index ? value : item));
  };

  const addListItem = () => setListItems(prev => [...prev, ""]);
  const removeListItem = (index: number) => setListItems(prev => prev.filter((_, i) => i !== index));

  const updateTableEntry = (index: number, field: keyof RollTableEntry, value: string) => {
    setTableEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const updateEquipmentItem = (index: number, field: keyof EquipmentItem, value: string) => {
    setEquipmentItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addEquipmentItem = () => setEquipmentItems(prev => [...prev, { name: "" }]);
  const removeEquipmentItem = (index: number) => setEquipmentItems(prev => prev.filter((_, i) => i !== index));

  const handleDiceTypeChange = (newDice: string) => {
    setDiceType(newDice);
    
    // Adjust entries based on dice type
    let entryCount = 6;
    if (newDice === "D66") entryCount = 36;
    else if (newDice === "D10") entryCount = 10;
    else if (newDice === "D12") entryCount = 12;
    else if (newDice === "D20") entryCount = 20;
    else if (newDice === "2D6") entryCount = 11; // 2-12
    
    const newEntries: RollTableEntry[] = [];
    for (let i = 0; i < entryCount; i++) {
      let roll: string;
      if (newDice === "D66") {
        const tens = Math.floor(i / 6) + 1;
        const ones = (i % 6) + 1;
        roll = `${tens}${ones}`;
      } else if (newDice === "2D6") {
        roll = String(i + 2);
      } else {
        roll = String(i + 1);
      }
      
      // Preserve existing results if available
      const existing = tableEntries[i];
      newEntries.push({ roll, result: existing?.result || "" });
    }
    
    setTableEntries(newEntries);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Plus className="w-4 h-4 text-primary" />
        Manual Rule Creator
      </div>

      <p className="text-xs text-muted-foreground">
        Create structured rules with proper formatting for tables, lists, and equipment.
      </p>

      {/* Added rules counter */}
      {existingRules.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-xs">{existingRules.length} rule{existingRules.length !== 1 ? "s" : ""} added</span>
        </div>
      )}

      {/* Title & Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rule title..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RULE_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Type Selector */}
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Content Type</label>
        <div className="grid grid-cols-2 gap-2">
          {contentTypeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setContentType(option.value as ContentType)}
                className={`flex items-center gap-2 p-2 text-left text-xs border rounded transition-colors ${
                  contentType === option.value 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-[10px] text-muted-foreground">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Editor by Type */}
      <div className="space-y-2 border border-border rounded p-3 bg-muted/10">
        {contentType === "text" && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Content</label>
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter rule text..."
              className="min-h-[100px] resize-none"
            />
          </div>
        )}

        {contentType === "list" && (
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">List Items</label>
            {listItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateListItem(idx, e.target.value)}
                  placeholder={`Item ${idx + 1}...`}
                />
                {listItems.length > 1 && (
                  <TerminalButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeListItem(idx)}
                    className="px-2"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </TerminalButton>
                )}
              </div>
            ))}
            <TerminalButton variant="ghost" size="sm" onClick={addListItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </TerminalButton>
          </div>
        )}

        {contentType === "roll_table" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Dice Type</label>
              <Select value={diceType} onValueChange={handleDiceTypeChange}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D6">D6</SelectItem>
                  <SelectItem value="D66">D66</SelectItem>
                  <SelectItem value="D10">D10</SelectItem>
                  <SelectItem value="D12">D12</SelectItem>
                  <SelectItem value="D20">D20</SelectItem>
                  <SelectItem value="2D6">2D6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-1">
              {tableEntries.map((entry, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-10 text-xs font-mono text-primary text-center">
                    {entry.roll}
                  </span>
                  <Input
                    value={entry.result}
                    onChange={(e) => updateTableEntry(idx, "result", e.target.value)}
                    placeholder={`Result for ${entry.roll}...`}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {contentType === "equipment" && (
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Equipment Items</label>
            {equipmentItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateEquipmentItem(idx, "name", e.target.value)}
                  placeholder="Name"
                  className="col-span-2"
                />
                <Input
                  value={item.cost || ""}
                  onChange={(e) => updateEquipmentItem(idx, "cost", e.target.value)}
                  placeholder="Cost"
                />
                <div className="flex gap-1">
                  <Input
                    value={item.stats || ""}
                    onChange={(e) => updateEquipmentItem(idx, "stats", e.target.value)}
                    placeholder="Stats"
                  />
                  {equipmentItems.length > 1 && (
                    <TerminalButton 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeEquipmentItem(idx)}
                      className="px-1"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </TerminalButton>
                  )}
                </div>
              </div>
            ))}
            <TerminalButton variant="ghost" size="sm" onClick={addEquipmentItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </TerminalButton>
          </div>
        )}
      </div>

      {/* Add Rule Button */}
      <TerminalButton 
        onClick={handleAddRule}
        disabled={!isValid()}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Rule
      </TerminalButton>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <TerminalButton variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </TerminalButton>
        <TerminalButton
          onClick={onComplete}
          disabled={existingRules.length === 0}
          className="flex-1"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Save {existingRules.length} Rules
        </TerminalButton>
      </div>
    </div>
  );
}
