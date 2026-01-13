import { useState, useMemo } from "react";
import { useWargameRules, WargameRule } from "@/hooks/useWargameRules";
import { useCampaignUnits, CampaignUnit, useFactions } from "@/hooks/useCampaignUnits";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RulesImporter } from "@/components/campaigns/RulesImporter";
import { UnitEditor } from "@/components/dashboard/UnitEditor";
import { CreateUnitForm } from "@/components/dashboard/CreateUnitForm";
import { RuleEditor } from "@/components/dashboard/RuleEditor";
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm";
import { 
  Search, 
  Filter, 
  Scroll, 
  Swords, 
  ChevronDown, 
  ChevronRight,
  X,
  Tag,
  FileUp,
  Plus
} from "lucide-react";

interface RulesLibraryProps {
  campaignId: string;
}

export function RulesLibrary({ campaignId }: RulesLibraryProps) {
  const { data: rules = [], isLoading: rulesLoading } = useWargameRules(campaignId);
  const { data: units = [], isLoading: unitsLoading } = useCampaignUnits(campaignId);
  const factions = useFactions(campaignId);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"rules" | "units">("units");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showImporter, setShowImporter] = useState(false);
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);

  // Extract unique categories from rules
  const categories = useMemo(() => {
    const cats = new Set(rules.map(r => r.category));
    return Array.from(cats).sort();
  }, [rules]);

  // Extract unique keywords from units
  const allKeywords = useMemo(() => {
    const kw = new Set<string>();
    units.forEach(u => u.keywords.forEach(k => kw.add(k)));
    return Array.from(kw).sort();
  }, [units]);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = searchQuery === "" || 
        rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(rule.content).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || rule.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [rules, searchQuery, selectedCategory]);

  // Filter units
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const matchesSearch = searchQuery === "" ||
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.faction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.abilities.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFaction = !selectedFaction || unit.faction === selectedFaction;
      
      const matchesKeywords = selectedKeywords.length === 0 ||
        selectedKeywords.every(kw => unit.keywords.includes(kw));
      
      return matchesSearch && matchesFaction && matchesKeywords;
    });
  }, [units, searchQuery, selectedFaction, selectedKeywords]);

  // Group rules by category
  const rulesByCategory = useMemo(() => {
    const grouped: Record<string, WargameRule[]> = {};
    filteredRules.forEach(rule => {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push(rule);
    });
    return grouped;
  }, [filteredRules]);

  // Group units by faction
  const unitsByFaction = useMemo(() => {
    const grouped: Record<string, CampaignUnit[]> = {};
    filteredUnits.forEach(unit => {
      if (!grouped[unit.faction]) {
        grouped[unit.faction] = [];
      }
      grouped[unit.faction].push(unit);
    });
    return grouped;
  }, [filteredUnits]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedFaction(null);
    setSelectedKeywords([]);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedFaction || selectedKeywords.length > 0;

  const isLoading = rulesLoading || unitsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-primary animate-pulse font-mono text-sm">Loading library...</div>
      </div>
    );
  }

  const isEmpty = rules.length === 0 && units.length === 0;

  return (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="flex gap-2">
        {/* PDF Import Section */}
        <Collapsible open={showImporter} onOpenChange={setShowImporter} className="flex-1">
          <CollapsibleTrigger asChild>
            <TerminalButton
              variant={showImporter ? "default" : "outline"}
              className="w-full justify-start"
            >
              <FileUp className="w-4 h-4 mr-2" />
              {showImporter ? "Close PDF Importer" : "Import from PDF"}
              {showImporter ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </TerminalButton>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Create Unit Button */}
        <TerminalButton
          variant={showCreateUnit ? "default" : "outline"}
          onClick={() => setShowCreateUnit(!showCreateUnit)}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showCreateUnit ? "Cancel" : "Create Unit"}
        </TerminalButton>

        {/* Create Rule Button */}
        <TerminalButton
          variant={showCreateRule ? "default" : "outline"}
          onClick={() => setShowCreateRule(!showCreateRule)}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showCreateRule ? "Cancel" : "Create Rule"}
        </TerminalButton>
      </div>

      {/* PDF Importer Content */}
      {showImporter && (
        <div className="border border-border bg-card p-4 rounded animate-fade-in">
          <RulesImporter 
            campaignId={campaignId} 
            onComplete={() => setShowImporter(false)}
          />
        </div>
      )}

      {/* Create Unit Form */}
      {showCreateUnit && (
        <div className="animate-fade-in">
          <CreateUnitForm 
            campaignId={campaignId} 
            onComplete={() => setShowCreateUnit(false)}
            onCancel={() => setShowCreateUnit(false)}
          />
        </div>
      )}

      {/* Create Rule Form */}
      {showCreateRule && (
        <div className="animate-fade-in">
          <CreateRuleForm 
            campaignId={campaignId} 
            onComplete={() => setShowCreateRule(false)}
            onCancel={() => setShowCreateRule(false)}
          />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rules, units, abilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border pl-9 pr-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
          <TerminalButton
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded">
                {(selectedCategory ? 1 : 0) + (selectedFaction ? 1 : 0) + selectedKeywords.length}
              </span>
            )}
          </TerminalButton>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-muted/30 border border-border p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Active Filters
              </span>
              {hasActiveFilters && (
                <TerminalButton variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </TerminalButton>
              )}
            </div>

            {/* Category Filter (for rules) */}
            {activeTab === "rules" && categories.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-2 py-1 text-xs font-mono border transition-colors ${
                        selectedCategory === cat
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Faction Filter (for units) */}
            {activeTab === "units" && factions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Faction</label>
                <div className="flex flex-wrap gap-2">
                  {factions.map(({ faction }) => (
                    <button
                      key={faction}
                      onClick={() => setSelectedFaction(selectedFaction === faction ? null : faction)}
                      className={`px-2 py-1 text-xs font-mono border transition-colors ${
                        selectedFaction === faction
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {faction}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords Filter (for units) */}
            {activeTab === "units" && allKeywords.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Keywords
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                  {allKeywords.map(kw => (
                    <button
                      key={kw}
                      onClick={() => toggleKeyword(kw)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono border transition-colors ${
                        selectedKeywords.includes(kw)
                          ? "border-secondary bg-secondary/20 text-secondary"
                          : "border-border/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rules" | "units")}>
        <TabsList className="bg-muted/30 border border-border w-full justify-start">
          <TabsTrigger value="units" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <Swords className="w-4 h-4" />
            Units
            <Badge variant="outline" className="ml-1 text-[10px]">{units.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <Scroll className="w-4 h-4" />
            Rules
            <Badge variant="outline" className="ml-1 text-[10px]">{rules.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-4">
          {isEmpty || units.length === 0 ? (
            <div className="bg-card border border-border/50 p-8 text-center">
              <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No units in this campaign yet.</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Import units from a PDF or add them manually via Settings.
              </p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="bg-card border border-border/50 p-8 text-center">
              <p className="text-muted-foreground text-sm">No units match your filters.</p>
              <TerminalButton variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Clear Filters
              </TerminalButton>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {Object.entries(unitsByFaction).map(([faction, factionUnits]) => (
                  <div key={faction} className="border border-border/50 bg-card">
                    <button
                      onClick={() => toggleExpanded(`faction-${faction}`)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedItems.has(`faction-${faction}`) ? (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-mono uppercase tracking-wider text-primary">
                          {faction}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {factionUnits.length} units
                      </Badge>
                    </button>

                    {expandedItems.has(`faction-${faction}`) && (
                      <div className="border-t border-border/30 divide-y divide-border/30">
                        {factionUnits.map(unit => (
                          <UnitEditor
                            key={unit.id}
                            unit={unit}
                            isExpanded={expandedItems.has(`unit-${unit.id}`)}
                            onToggleExpand={() => toggleExpanded(`unit-${unit.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-4">
          {isEmpty || rules.length === 0 ? (
            <div className="bg-card border border-border/50 p-8 text-center">
              <Scroll className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No rules in this campaign yet.</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Import rules from GitHub or PDF via Settings.
              </p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="bg-card border border-border/50 p-8 text-center">
              <p className="text-muted-foreground text-sm">No rules match your filters.</p>
              <TerminalButton variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Clear Filters
              </TerminalButton>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
                  <div key={category} className="border border-border/50 bg-card">
                    <button
                      onClick={() => toggleExpanded(`category-${category}`)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedItems.has(`category-${category}`) ? (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-mono uppercase tracking-wider text-primary">
                          {category}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {categoryRules.length} rules
                      </Badge>
                    </button>

                    {expandedItems.has(`category-${category}`) && (
                      <div className="border-t border-border/30 divide-y divide-border/30">
                        {categoryRules.map(rule => (
                          <RuleEditor
                            key={rule.id}
                            rule={rule}
                            isExpanded={expandedItems.has(`rule-${rule.id}`)}
                            onToggleExpand={() => toggleExpanded(`rule-${rule.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
