import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Search, BookOpen } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface RulesWidgetProps {
  campaignId: string;
  isGM: boolean;
}

interface WargameRule {
  id: string;
  campaign_id: string;
  rule_key: string;
  title: string;
  category: string;
  content: Json;
  metadata: Json | null;
  created_at: string;
}

export function RulesWidget({ campaignId, isGM }: RulesWidgetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["wargame_rules", campaignId],
    queryFn: async (): Promise<WargameRule[]> => {
      const { data, error } = await supabase
        .from("wargame_rules")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  // Get unique categories
  const categories = [...new Set(rules.map((r) => r.category))];

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      !searchTerm ||
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.rule_key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderContent = (content: Json): string => {
    if (typeof content === "string") return content;
    if (typeof content === "object" && content !== null) {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading rules...</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground text-center">
          No rules synced yet.
        </p>
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Rules will appear here once synced from the campaign's rules repository.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-input border border-border rounded pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-primary"
          />
        </div>
        {categories.length > 1 && (
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="bg-input border border-border rounded px-2 py-1 text-xs"
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
      <div className="flex-1 overflow-y-auto space-y-1" data-scrollable="true">
        {filteredRules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No rules match your search.
          </p>
        ) : (
          filteredRules.map((rule) => (
            <div key={rule.id} className="border border-border rounded">
              <button
                onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/30"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-primary truncate block">
                    {rule.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {rule.category}
                  </span>
                </div>
                {expandedId === rule.id ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expandedId === rule.id && (
                <div className="px-2 pb-2 text-xs text-muted-foreground border-t border-border/50">
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] bg-muted/30 p-2 rounded overflow-auto max-h-48">
                    {renderContent(rule.content)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="pt-2 border-t border-border text-[10px] text-muted-foreground">
        {filteredRules.length} of {rules.length} rules
      </div>
    </div>
  );
}
