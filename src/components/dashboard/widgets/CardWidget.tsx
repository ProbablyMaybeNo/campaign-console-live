import { useState } from "react";
import { Edit2, Check, X, ChevronDown, ChevronUp, Plus, Trash2, FileText } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import type { Json } from "@/integrations/supabase/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CardWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
  campaignId: string;
}

interface CardSection {
  id: string;
  header: string;
  content: string;
}

interface CardConfig {
  title?: string;
  content?: string;
  sections?: CardSection[];
  rawText?: string;
  sourceLabel?: string;
}

export function CardWidget({ component, isGM }: CardWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const config = (component.config as CardConfig) || {};
  const sections = config.sections || [];
  const rawText = config.rawText;
  const sourceLabel = config.sourceLabel;

  const [title, setTitle] = useState(config.title || "Card");
  const [content, setContent] = useState(config.content || "");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionHeader, setSectionHeader] = useState("");
  const [sectionContent, setSectionContent] = useState("");

  const handleSave = () => {
    const newConfig = { ...config, title, content };
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(config.title || "Card");
    setContent(config.content || "");
    setIsEditing(false);
  };

  const handleAddSection = () => {
    const newSection: CardSection = {
      id: crypto.randomUUID(),
      header: "New Section",
      content: "",
    };
    const newConfig = { ...config, sections: [...sections, newSection] };
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const newConfig = { ...config, sections: sections.filter(s => s.id !== sectionId) };
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleStartEditSection = (section: CardSection) => {
    setEditingSectionId(section.id);
    setSectionHeader(section.header);
    setSectionContent(section.content);
  };

  const handleSaveSection = () => {
    if (!editingSectionId) return;
    
    const updatedSections = sections.map(s => 
      s.id === editingSectionId 
        ? { ...s, header: sectionHeader, content: sectionContent }
        : s
    );
    const newConfig = { ...config, sections: updatedSections };
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
    setEditingSectionId(null);
  };

  const handleCancelEditSection = () => {
    setEditingSectionId(null);
    setSectionHeader("");
    setSectionContent("");
  };

  // If we have sections, show section list view
  if (sections.length > 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Source label */}
        {sourceLabel && (
          <div className="text-[10px] text-muted-foreground mb-1 truncate">
            Source: {sourceLabel}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-mono text-primary truncate">{config.title || "Card"}</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="border border-border rounded">
              {editingSectionId === section.id ? (
                <div className="p-2 space-y-2">
                  <input
                    autoFocus
                    value={sectionHeader}
                    onChange={(e) => setSectionHeader(e.target.value)}
                    className="w-full bg-input border border-primary rounded px-2 py-1 text-xs font-mono"
                    placeholder="Section header..."
                  />
                  <textarea
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    className="w-full bg-input border border-border rounded px-2 py-1 text-xs resize-none min-h-[60px]"
                    placeholder="Section content..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSection}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={handleCancelEditSection}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/30"
                  >
                    <span className="text-xs font-mono text-primary truncate">{section.header}</span>
                    <div className="flex items-center gap-1">
                      {isGM && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditSection(section);
                            }}
                            className="text-muted-foreground hover:text-primary p-0.5"
                            title="Edit section"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id);
                            }}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            title="Delete section"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {expandedSection === section.id ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-2 pb-2 text-xs text-muted-foreground border-t border-border/50">
                      <p className="mt-2 whitespace-pre-wrap">{section.content || "No content"}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {isGM && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <button
              onClick={handleAddSection}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Section
            </button>
            
            {/* Raw text collapsible */}
            {rawText && (
              <Collapsible open={showRawText} onOpenChange={setShowRawText}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <FileText className="w-3 h-3" />
                  {showRawText ? "Hide" : "View"} Raw
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute left-0 right-0 bottom-full mb-2 bg-card border border-border rounded p-2 max-h-32 overflow-auto text-[10px] whitespace-pre-wrap text-muted-foreground z-10">
                  {rawText}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {!isGM && (
          <div className="pt-2 border-t border-border text-[10px] text-muted-foreground">
            {sections.length} sections
          </div>
        )}
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
