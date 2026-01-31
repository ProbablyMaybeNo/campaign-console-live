import { useState } from "react";
import { useWargameRules, useDeleteRule, WargameRule, TableRuleContent, CardRuleContent } from "@/hooks/useWargameRules";
import { Plus, Search, Table, LayoutList, Trash2, Edit2, ChevronDown, ChevronUp, LayoutDashboard } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { PasteWizardOverlay } from "@/components/dashboard/PasteWizardOverlay";
import { RuleEditorModal } from "./RuleEditorModal";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { getSpawnPosition } from "@/lib/canvasPlacement";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface RulesManagerProps {
  campaignId: string;
  isGM: boolean;
}

type CreateMode = "rules_table" | "rules_card" | "custom_table" | "custom_card" | null;

export function RulesManager({ campaignId, isGM }: RulesManagerProps) {
  const { data: rules = [], isLoading } = useWargameRules(campaignId);
  const deleteRule = useDeleteRule();
  const createComponent = useCreateComponent();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [editingRule, setEditingRule] = useState<WargameRule | null>(null);

  // Get unique categories
  const categories = [...new Set(rules.map((r) => r.category))];

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      !searchTerm ||
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, WargameRule[]>);

  const handleDeleteRule = (rule: WargameRule) => {
    if (confirm(`Delete "${rule.title}"? This will also remove any linked dashboard components.`)) {
      deleteRule.mutate({ id: rule.id, campaignId });
    }
  };

  const handleAddToDashboard = async (rule: WargameRule) => {
    const content = rule.content as unknown as TableRuleContent | CardRuleContent;
    const componentType = content?.type || "card";

    // Build config from rule content
    let config: Record<string, unknown> = {
      rule_id: rule.id,
      sourceLabel: rule.title,
    };

    if (componentType === "table" && content.type === "table") {
      config = {
        ...config,
        columns: content.columns,
        rows: content.rows,
        rawText: content.rawText,
      };
    } else if (componentType === "card" && content.type === "card") {
      config = {
        ...config,
        title: content.title || rule.title,
        sections: content.sections,
        rawText: content.rawText,
      };
    }

    const width = componentType === "table" ? 400 : 350;
    const height = 300;
    const placement = getSpawnPosition(width, height);

    await createComponent.mutateAsync({
      campaign_id: campaignId,
      name: rule.title,
      component_type: componentType === "table" ? "rules_table" : "rules_card",
      config: config as unknown as Json,
      position_x: placement.position_x,
      position_y: placement.position_y,
      width,
      height,
    });

    toast.success(`Added "${rule.title}" to dashboard`);
  };

  const getRuleTypeIcon = (rule: WargameRule) => {
    const content = rule.content as unknown as TableRuleContent | CardRuleContent;
    if (content?.type === "table") {
      return <Table className="w-3 h-3 text-muted-foreground" />;
    }
    return <LayoutList className="w-3 h-3 text-muted-foreground" />;
  };

  const renderRulePreview = (rule: WargameRule) => {
    const content = rule.content as unknown as TableRuleContent | CardRuleContent;
    
    if (content?.type === "table") {
      const tableContent = content as TableRuleContent;
      return (
        <div className="text-[10px] text-muted-foreground">
          {tableContent.columns?.length || 0} columns, {tableContent.rows?.length || 0} rows
        </div>
      );
    } else if (content?.type === "card") {
      const cardContent = content as CardRuleContent;
      return (
        <div className="text-[10px] text-muted-foreground">
          {cardContent.sections?.length || 0} sections
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs text-muted-foreground animate-pulse">Loading rules...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Actions */}
      {isGM && (
        <div className="flex flex-wrap gap-2">
          <TerminalButton
            size="sm"
            onClick={() => setCreateMode("rules_table")}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <Table className="w-3 h-3" />
            Rules Table
          </TerminalButton>
          <TerminalButton
            size="sm"
            onClick={() => setCreateMode("rules_card")}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <LayoutList className="w-3 h-3" />
            Rules Card
          </TerminalButton>
          <div className="h-4 w-px bg-border" />
          <TerminalButton
            size="sm"
            variant="outline"
            onClick={() => setCreateMode("custom_table")}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Custom Table
          </TerminalButton>
          <TerminalButton
            size="sm"
            variant="outline"
            onClick={() => setCreateMode("custom_card")}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Custom Card
          </TerminalButton>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-input border border-border rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-primary"
          />
        </div>
        {categories.length > 1 && (
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="bg-input border border-border rounded px-2 py-1.5 text-xs"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {Object.keys(groupedRules).length === 0 ? (
          <div className="text-center py-8">
            <Table className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No rules yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isGM ? "Create a rules table or card to get started" : "The GM hasn't added any rules yet"}
            </p>
          </div>
        ) : (
          Object.entries(groupedRules).map(([category, categoryRules]) => (
            <div key={category}>
              <h3 className="text-xs font-mono uppercase tracking-wider text-primary mb-2 px-1">
                {category} ({categoryRules.length})
              </h3>
              <div className="space-y-1">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="border border-border rounded bg-card/50">
                    <button
                      onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                      className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getRuleTypeIcon(rule)}
                        <span className="text-xs font-mono truncate">{rule.title}</span>
                        {renderRulePreview(rule)}
                      </div>
                      <div className="flex items-center gap-1">
                        {expandedId === rule.id ? (
                          <ChevronUp className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expandedId === rule.id && (
                      <div className="px-3 pb-3 border-t border-border/50">
                        {/* Preview content */}
                        <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded max-h-32 overflow-auto">
                          {renderExpandedContent(rule)}
                        </div>

                        {/* Actions */}
                        {isGM && (
                          <div className="flex gap-2 mt-3">
                            <TerminalButton
                              size="sm"
                              onClick={() => handleAddToDashboard(rule)}
                              disabled={createComponent.isPending}
                              className="flex items-center gap-1"
                            >
                              <LayoutDashboard className="w-3 h-3" />
                              Add to Dashboard
                            </TerminalButton>
                            <TerminalButton
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRule(rule)}
                              className="flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </TerminalButton>
                            <TerminalButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRule(rule)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </TerminalButton>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="pt-2 border-t border-border text-[10px] text-muted-foreground">
        {filteredRules.length} of {rules.length} rules
      </div>

      {/* Paste Wizard for creating new rules */}
      {createMode && (
        <PasteWizardOverlay
          open={true}
          onOpenChange={(open) => !open && setCreateMode(null)}
          campaignId={campaignId}
          componentType={createMode.includes("table") ? "table" : "card"}
          saveToRules={true}
          isCustom={createMode.startsWith("custom")}
          onComplete={() => setCreateMode(null)}
        />
      )}

      {/* Rule Editor Modal */}
      {editingRule && (
        <RuleEditorModal
          open={true}
          onOpenChange={(open) => !open && setEditingRule(null)}
          rule={editingRule}
        />
      )}
    </div>
  );
}

function renderExpandedContent(rule: WargameRule) {
  const content = rule.content as unknown as TableRuleContent | CardRuleContent;

  if (content?.type === "table") {
    const tableContent = content as TableRuleContent;
    if (!tableContent.columns?.length) return "No table data";
    
    return (
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border/50">
            {tableContent.columns.slice(0, 4).map((col, i) => (
              <th key={i} className="text-left p-1 text-primary font-mono">
                {col}
              </th>
            ))}
            {tableContent.columns.length > 4 && (
              <th className="text-left p-1 text-muted-foreground">+{tableContent.columns.length - 4} more</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tableContent.rows.slice(0, 3).map((row) => (
            <tr key={row.id} className="border-b border-border/30">
              {tableContent.columns.slice(0, 4).map((col, i) => (
                <td key={i} className="p-1 truncate max-w-[100px]">
                  {row[col] || "-"}
                </td>
              ))}
            </tr>
          ))}
          {tableContent.rows.length > 3 && (
            <tr>
              <td colSpan={Math.min(tableContent.columns.length, 5)} className="p-1 text-muted-foreground">
                +{tableContent.rows.length - 3} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  } else if (content?.type === "card") {
    const cardContent = content as CardRuleContent;
    if (!cardContent.sections?.length) return "No sections";

    return (
      <div className="space-y-1">
        {cardContent.sections.slice(0, 3).map((section) => (
          <div key={section.id}>
            <span className="font-mono text-primary">{section.header}:</span>{" "}
            <span className="truncate">{section.content.substring(0, 50)}...</span>
          </div>
        ))}
        {cardContent.sections.length > 3 && (
          <div className="text-muted-foreground">+{cardContent.sections.length - 3} more sections</div>
        )}
      </div>
    );
  }

  return "Unknown content format";
}