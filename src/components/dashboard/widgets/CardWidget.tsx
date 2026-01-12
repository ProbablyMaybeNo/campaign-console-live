import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface CardWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface CardConfig {
  title?: string;
  content?: string;
}

export function CardWidget({ component, isGM }: CardWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [isEditing, setIsEditing] = useState(false);
  
  const config = (component.config as CardConfig) || {};
  const [title, setTitle] = useState(config.title || "Card Title");
  const [content, setContent] = useState(config.content || "Card content goes here...");

  const handleSave = () => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, title, content },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(config.title || "Card Title");
    setContent(config.content || "Card content goes here...");
    setIsEditing(false);
  };

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
        <h3 className="text-sm font-mono text-primary">{config.title || "Card Title"}</h3>
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
        {config.content || "Card content goes here..."}
      </p>
    </div>
  );
}
