import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { RulesImporter } from "./RulesImporter";
import { RuleCard } from "./RuleCard";
import { useWargameRules } from "@/hooks/useWargameRules";
import { useSaveRules, ExtractedRule, useClearCampaignRules } from "@/hooks/useRulesManagement";
import { 
  Search, 
  Plus, 
  BookOpen, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Filter
} from "lucide-react";

interface RulesLibraryProps {
  campaignId: string;
  isGM: boolean;
}

export function RulesLibrary({ campaignId, isGM }: RulesLibraryProps) {
  const [showImporter, setShowImporter] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const { data: rules = [], isLoading } = useWargameRules(campaignId);
  const saveRules = useSaveRules();
  const clearRules = useClearCampaignRules();

  // Get unique categories
  const categories = [...new Set(rules.map((r) => r.category))].sort();

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch = !searchTerm || 
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.rule_key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered rules by category
  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, typeof rules>);

  const handleRulesExtracted = async (extractedRules: ExtractedRule[]) => {
    await saveRules.mutateAsync({
      campaignId,
      rules: extractedRules,
    });
    setShowImporter(false);
  };

  const toggleCategory = (category: string) => {
    const next = new Set(collapsedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setCollapsedCategories(next);
  };

  const handleClearRules = async () => {
    await clearRules.mutateAsync(campaignId);
    setShowClearConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <TerminalLoader text="Loading rules" />
      </div>
    );
  }

  // Empty state
  if (rules.length === 0 && !showImporter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <BookOpen className="w-16 h-16 text-muted-foreground/30" />
        <div className="text-center">
          <h3 className="text-lg font-mono text-primary mb-2">No Rules Imported</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Import your wargame rules from a PDF or paste them directly. 
            AI will parse and categorize them automatically.
          </p>
        </div>
        {isGM && (
          <TerminalButton onClick={() => setShowImporter(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Import Rules
          </TerminalButton>
        )}

        {/* Import Dialog */}
        <Dialog open={showImporter} onOpenChange={setShowImporter}>
          <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary uppercase tracking-widest text-sm">
                [Import Rules]
              </DialogTitle>
            </DialogHeader>
            <RulesImporter
              onRulesExtracted={handleRulesExtracted}
              onCancel={() => setShowImporter(false)}
              showCancelButton
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-mono text-primary uppercase tracking-wider">
            Rules Library
          </h3>
          <p className="text-xs text-muted-foreground">
            {rules.length} rules across {categories.length} categories
          </p>
        </div>
        {isGM && (
          <div className="flex gap-2">
            <TerminalButton 
              variant="ghost" 
              size="sm"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </TerminalButton>
            <TerminalButton size="sm" onClick={() => setShowImporter(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Import More
            </TerminalButton>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-input border border-border rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        {categories.length > 1 && (
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="bg-input border border-border rounded pl-9 pr-8 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary/50"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {Object.keys(groupedRules).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No rules match your search.</p>
          </div>
        ) : (
          Object.entries(groupedRules).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryRules]) => (
            <div key={category} className="border border-border rounded">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/30 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary text-sm">{category}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {categoryRules.length}
                  </span>
                </div>
                {collapsedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {!collapsedCategories.has(category) && (
                <div className="p-3 pt-0 space-y-2">
                  {categoryRules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      isGM={isGM}
                      isExpanded={expandedRuleId === rule.id}
                      onToggle={() => setExpandedRuleId(
                        expandedRuleId === rule.id ? null : rule.id
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={showImporter} onOpenChange={setShowImporter}>
        <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-sm">
              [Import More Rules]
            </DialogTitle>
          </DialogHeader>
          <RulesImporter
            onRulesExtracted={handleRulesExtracted}
            onCancel={() => setShowImporter(false)}
            showCancelButton
          />
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="bg-card border-destructive/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive uppercase tracking-widest text-sm">
              [Clear All Rules]
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all {rules.length} rules from this campaign. 
            This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <TerminalButton 
              variant="outline" 
              onClick={() => setShowClearConfirm(false)}
              className="flex-1"
            >
              Cancel
            </TerminalButton>
            <TerminalButton 
              variant="destructive"
              onClick={handleClearRules}
              disabled={clearRules.isPending}
              className="flex-1"
            >
              {clearRules.isPending ? "Clearing..." : "Clear All Rules"}
            </TerminalButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
