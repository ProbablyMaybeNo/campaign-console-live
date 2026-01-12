import { useState, useEffect } from "react";
import { Edit2, Check, X, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRulesByCategory } from "@/hooks/useWargameRules";
import type { Json } from "@/integrations/supabase/types";

interface CardWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
  campaignId: string;
}

interface CardItem {
  id: string;
  name: string;
  description: string;
  properties?: { [key: string]: string | number };
}

interface CardConfig {
  title?: string;
  content?: string;
  cards?: CardItem[];
  rule_category?: string;
  rule_key?: string;
  manual_setup?: boolean;
}

export function CardWidget({ component, isGM, campaignId }: CardWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const config = (component.config as CardConfig) || {};
  const cards = config.cards || [];
  const ruleCategory = config.rule_category;
  const ruleKey = config.rule_key;
  const isManual = config.manual_setup ?? true;

  const [title, setTitle] = useState(config.title || "Card List");
  const [content, setContent] = useState(config.content || "");

  // Fetch linked rule data
  const { data: categoryRules } = useRulesByCategory(campaignId, ruleCategory);
  const linkedRule = categoryRules?.find(r => r.rule_key === ruleKey);

  const [isPopulated, setIsPopulated] = useState(false);

  function extractCardsFromContent(ruleContent: Record<string, unknown>): CardItem[] {
    const cardItems: CardItem[] = [];

    for (const [, value] of Object.entries(ruleContent)) {
      if (Array.isArray(value) && value.length > 0) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const itemObj = item as Record<string, unknown>;
            const name = String(itemObj.name || itemObj.title || itemObj.id || 'Item');
            const description = String(
              itemObj.description || 
              itemObj.effect || 
              itemObj.text || 
              itemObj.content || 
              ''
            );

            const properties: { [key: string]: string | number } = {};
            for (const [propKey, propVal] of Object.entries(itemObj)) {
              if (
                !['name', 'title', 'id', 'description', 'effect', 'text', 'content'].includes(propKey) &&
                (typeof propVal === 'string' || typeof propVal === 'number')
              ) {
                properties[propKey] = propVal;
              }
            }

            cardItems.push({
              id: crypto.randomUUID(),
              name,
              description,
              properties: Object.keys(properties).length > 0 ? properties : undefined,
            });
          }
        }
        break;
      }
    }

    return cardItems;
  }

  // Auto-populate from rule content
  useEffect(() => {
    if (!isManual && linkedRule && !isPopulated && cards.length === 0) {
      const ruleContent = linkedRule.content as Record<string, unknown>;
      const extractedCards = extractCardsFromContent(ruleContent);

      if (extractedCards.length > 0) {
        const newConfig = {
          ...config,
          cards: extractedCards,
          title: linkedRule.title,
        };
        updateComponent.mutate({
          id: component.id,
          config: newConfig as unknown as Json,
        });
        setTitle(linkedRule.title);
        setIsPopulated(true);
      }
    }
  }, [linkedRule, isManual, isPopulated, cards.length]);

  const handleRefreshFromRules = () => {
    if (linkedRule) {
      const ruleContent = linkedRule.content as Record<string, unknown>;
      const extractedCards = extractCardsFromContent(ruleContent);

      const newConfig = {
        ...config,
        cards: extractedCards,
        title: linkedRule.title,
      };
      updateComponent.mutate({
        id: component.id,
        config: newConfig as unknown as Json,
      });
      setTitle(linkedRule.title);
    }
  };

  const handleSave = () => {
    const newConfig = { ...config, title, content };
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(config.title || "Card List");
    setContent(config.content || "");
    setIsEditing(false);
  };

  // If we have cards from rules, show card list view
  if (cards.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-mono text-primary truncate">{title}</h3>
          {isGM && !isManual && linkedRule && (
            <button
              onClick={handleRefreshFromRules}
              className="text-muted-foreground hover:text-primary p-1"
              title="Refresh from rules"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="border border-border rounded">
              <button
                onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/30"
              >
                <span className="text-xs font-mono text-primary truncate">{card.name}</span>
                {expandedCard === card.id ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expandedCard === card.id && (
                <div className="px-2 pb-2 text-xs text-muted-foreground border-t border-border/50 space-y-2">
                  {card.description && (
                    <p className="mt-2 whitespace-pre-wrap">{card.description}</p>
                  )}
                  {card.properties && Object.keys(card.properties).length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                      {Object.entries(card.properties).map(([key, val]) => (
                        <div key={key} className="flex justify-between bg-muted/30 px-1.5 py-0.5 rounded">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-foreground font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border text-[10px] text-muted-foreground">
          {cards.length} cards
        </div>
      </div>
    );
  }

  // Fallback to simple editable card view
  if (isEditing && isGM) {
    return (
      <div className="flex flex-col h-full gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-input border border-primary rounded px-2 py-1 text-sm font-mono text-primary"
          placeholder="Card title..."
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs resize-none"
          placeholder="Card content..."
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono text-primary">{config.title || "Card"}</h3>
        {isGM && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-primary p-1"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex-1 overflow-auto whitespace-pre-wrap">
        {config.content || (isGM ? "Click edit to add content..." : "No content")}
      </p>
    </div>
  );
}
