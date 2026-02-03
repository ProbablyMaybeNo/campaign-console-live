import { useState, memo, useCallback } from "react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { Pencil, Check, X } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { toast } from "sonner";

interface TextWidgetConfig {
  content?: string;
  showTitle?: boolean;
}

interface TextWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

export const TextWidget = memo(function TextWidget({ component, isGM }: TextWidgetProps) {
  const config = (component.config as TextWidgetConfig) || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(config.content || "");
  
  const updateComponent = useUpdateComponent();

  const handleSave = useCallback(() => {
    updateComponent.mutate({
      id: component.id,
      config: {
        ...config,
        content: editContent,
      },
    }, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("Text saved");
      },
    });
  }, [component.id, config, editContent, updateComponent]);

  const handleCancel = useCallback(() => {
    setEditContent(config.content || "");
    setIsEditing(false);
  }, [config.content]);

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    if (!text) {
      return (
        <p className="text-muted-foreground italic">
          {isGM ? "Click edit to add text..." : "No content yet"}
        </p>
      );
    }

    // Process text line by line
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className="text-sm font-bold text-primary mt-2 mb-1">
            {line.slice(4)}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-base font-bold text-primary mt-3 mb-1">
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={i} className="text-lg font-bold text-primary mt-3 mb-2">
            {line.slice(2)}
          </h2>
        );
      }

      // Bullet points
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc text-foreground/90">
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
      }

      // Empty lines
      if (!line.trim()) {
        return <br key={i} />;
      }

      // Regular paragraph
      return (
        <p key={i} className="text-foreground/90 mb-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Handle inline markdown (bold, italic)
  const renderInlineMarkdown = (text: string) => {
    // Process **bold** and *italic*
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for bold **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(
          <strong key={key++} className="font-bold text-primary">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Check for italic *text*
      const italicMatch = remaining.match(/\*(.+?)\*/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(remaining.slice(0, italicMatch.index));
        }
        parts.push(
          <em key={key++} className="italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // No more markdown, add remaining text
      parts.push(remaining);
      break;
    }

    return parts.length > 0 ? parts : text;
  };

  if (isEditing && isGM) {
    return (
      <div className="h-full flex flex-col gap-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 w-full bg-input border border-border p-2 text-sm font-mono resize-none focus:border-primary focus:ring-1 focus:ring-primary rounded"
          placeholder="Enter text here...

Supports basic markdown:
# Heading 1
## Heading 2
### Heading 3
- Bullet points
**bold text**
*italic text*"
        />
        <div className="flex gap-2 justify-end">
          <TerminalButton variant="outline" size="sm" onClick={handleCancel}>
            <X className="w-3 h-3 mr-1" />
            Cancel
          </TerminalButton>
          <TerminalButton size="sm" onClick={handleSave}>
            <Check className="w-3 h-3 mr-1" />
            Save
          </TerminalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isGM && (
        <div className="flex justify-end mb-2">
          <TerminalButton variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </TerminalButton>
        </div>
      )}
      <div className="flex-1 overflow-auto prose prose-sm prose-invert max-w-none">
        {renderContent(config.content || "")}
      </div>
    </div>
  );
});
