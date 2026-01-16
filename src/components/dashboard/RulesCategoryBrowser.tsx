import { useState } from "react";
import { useRuleCategories, type RuleCategory, type WargameRule } from "@/hooks/useWargameRules";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Book, FileText, Table, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface RulesCategoryBrowserProps {
  campaignId: string;
  onSelectCategory: (category: RuleCategory) => void;
  onSelectRule: (rule: WargameRule) => void;
  onCreateFromCategory: (category: RuleCategory, type: "table" | "card") => void;
}

export function RulesCategoryBrowser({
  campaignId,
  onSelectCategory,
  onSelectRule,
  onCreateFromCategory,
}: RulesCategoryBrowserProps) {
  const categories = useRuleCategories(campaignId);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Book className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No rules imported yet</p>
        <p className="text-xs mt-1">Import rules from the Settings overlay</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 px-1">
        Campaign Rules
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1">
          {categories.map((category) => (
            <div key={category.category}>
              <button
                onClick={() => {
                  setExpandedCategory(
                    expandedCategory === category.category ? null : category.category
                  );
                  onSelectCategory(category);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors",
                  expandedCategory === category.category && "bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 transition-transform",
                      expandedCategory === category.category && "rotate-90"
                    )}
                  />
                  <span className="truncate">{category.category}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {category.ruleCount}
                </Badge>
              </button>

              {expandedCategory === category.category && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                  {/* Quick actions for category */}
                  <div className="flex gap-1 mb-2">
                    <button
                      onClick={() => onCreateFromCategory(category, "table")}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <Table className="w-3 h-3" />
                      Create Table
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => onCreateFromCategory(category, "card")}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <LayoutList className="w-3 h-3" />
                      Create Cards
                    </button>
                  </div>

                  {category.rules.slice(0, 5).map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => onSelectRule(rule)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{rule.title}</span>
                    </button>
                  ))}
                  
                  {category.rules.length > 5 && (
                    <p className="text-[10px] text-muted-foreground px-2">
                      +{category.rules.length - 5} more rules
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
