import { useState, useRef, memo, useCallback, useEffect } from "react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { Bold, Italic, Check, Palette } from "lucide-react";
import { toast } from "sonner";

interface TextWidgetConfig {
  content?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

interface TextWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80];
const COLOR_PRESETS = [
  "#ffffff",
  "#39ff14", // neon green (primary)
  "#00bfff", // neon blue
  "#ff6b6b", // red
  "#ffd93d", // yellow
  "#c084fc", // purple
  "#fb923c", // orange
  "#f472b6", // pink
  "#94a3b8", // slate
];

export const TextWidget = memo(function TextWidget({ component, isGM }: TextWidgetProps) {
  const config = (component.config as TextWidgetConfig) || {};
  const updateComponent = useUpdateComponent();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(config.content || "");
  const [fontSize, setFontSize] = useState(config.fontSize || 16);
  const [color, setColor] = useState(config.color || "#ffffff");
  const [bold, setBold] = useState(config.bold ?? false);
  const [italic, setItalic] = useState(config.italic ?? false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from config when it changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditContent(config.content || "");
      setFontSize(config.fontSize || 16);
      setColor(config.color || "#ffffff");
      setBold(config.bold ?? false);
      setItalic(config.italic ?? false);
    }
  }, [config.content, config.fontSize, config.color, config.bold, config.italic, isEditing]);

  const persistConfig = useCallback(
    (overrides: Partial<TextWidgetConfig>) => {
      const newConfig = {
        ...config,
        content: editContent,
        fontSize,
        color,
        bold,
        italic,
        ...overrides,
      };
      updateComponent.mutate({ id: component.id, config: newConfig });
    },
    [component.id, config, editContent, fontSize, color, bold, italic, updateComponent]
  );

  // Auto-save on content change with debounce
  const debouncedSave = useCallback(
    (newContent: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        persistConfig({ content: newContent });
      }, 800);
    },
    [persistConfig]
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditContent(val);
    debouncedSave(val);
  };

  const handleStartEdit = () => {
    if (!isGM) return;
    setIsEditing(true);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const handleFinishEdit = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    persistConfig({ content: editContent });
    setIsEditing(false);
  };

  const toggleBold = () => {
    const next = !bold;
    setBold(next);
    persistConfig({ bold: next });
  };

  const toggleItalic = () => {
    const next = !italic;
    setItalic(next);
    persistConfig({ italic: next });
  };

  const changeFontSize = (size: number) => {
    setFontSize(size);
    persistConfig({ fontSize: size });
  };

  const changeColor = (c: string) => {
    setColor(c);
    persistConfig({ color: c });
    setShowColorPicker(false);
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: 1.3,
    color,
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? "italic" : "normal",
    wordBreak: "break-word",
  };

  // Editing mode — inline textarea + floating toolbar
  if (isEditing && isGM) {
    return (
      <div className="h-full w-full relative flex flex-col">
        {/* Floating toolbar */}
        <div
          className="absolute -top-10 left-0 z-20 flex items-center gap-1 bg-card border border-border rounded px-2 py-1 shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Font size */}
          <select
            value={fontSize}
            onChange={(e) => changeFontSize(Number(e.target.value))}
            className="bg-input border border-border rounded text-xs px-1 py-0.5 text-foreground w-14"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Bold */}
          <button
            onClick={toggleBold}
            className={`p-1 rounded transition-colors ${
              bold ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            onClick={toggleItalic}
            className={`p-1 rounded transition-colors ${
              italic ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Color */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Text color"
            >
              <Palette className="w-4 h-4" />
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded p-2 shadow-lg grid grid-cols-3 gap-1 z-30 min-w-[100px]">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => changeColor(c)}
                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                      c === color ? "border-primary" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="col-span-3 mt-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => changeColor(e.target.value)}
                    className="w-full h-6 cursor-pointer rounded border-0"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Done */}
          <button
            onClick={handleFinishEdit}
            className="p-1 rounded text-primary hover:bg-primary/20 transition-colors"
            title="Done editing"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Inline text area */}
        <textarea
          ref={editRef}
          value={editContent}
          onChange={handleContentChange}
          className="flex-1 w-full bg-transparent border-none outline-none resize-none p-1"
          style={textStyle}
          placeholder="Type here..."
          onKeyDown={(e) => {
            if (e.key === "Escape") handleFinishEdit();
            // Prevent canvas keyboard shortcuts while editing
            e.stopPropagation();
          }}
        />
      </div>
    );
  }

  // Display mode — plain text, click to edit
  return (
    <div
      className={`h-full w-full p-1 overflow-auto ${isGM ? "cursor-text" : ""}`}
      onClick={handleStartEdit}
      onDoubleClick={handleStartEdit}
    >
      {editContent ? (
        <div style={textStyle} className="whitespace-pre-wrap">
          {editContent}
        </div>
      ) : (
        <p
          className="text-muted-foreground/40 italic"
          style={{ fontSize: `${fontSize}px` }}
        >
          {isGM ? "Click to type..." : ""}
        </p>
      )}
    </div>
  );
});
