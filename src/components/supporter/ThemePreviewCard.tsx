import type { ThemeMeta } from "@/lib/themes";
import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemePreviewCardProps {
  theme: ThemeMeta;
  onSelect?: (id: string) => void;
  isActive?: boolean;
  isLocked?: boolean;
}

export function ThemePreviewCard({
  theme,
  onSelect,
  isActive,
  isLocked,
}: ThemePreviewCardProps) {
  const ThemeIcon = theme.icon;

  return (
    <div
      data-theme={theme.id}
      className={cn(
        "relative rounded-md overflow-hidden border-2 transition-all duration-200 cursor-pointer group",
        isActive 
          ? "border-primary ring-2 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]" 
          : "border-border hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]",
        isLocked && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !isLocked && onSelect?.(theme.id)}
    >
      {/* Mini Preview Area - uses the theme's actual CSS variables */}
      <div 
        className="p-2 min-h-[80px]"
        style={{ backgroundColor: `hsl(${theme.preview.background})` }}
      >
        {/* Mini card preview */}
        <div 
          className="rounded-sm p-1.5 mb-1.5"
          style={{ 
            backgroundColor: `hsl(${theme.preview.card})`,
            border: `1px solid hsl(${theme.preview.border})`
          }}
        >
          <div 
            className="text-[8px] font-mono font-bold truncate"
            style={{ color: `hsl(${theme.preview.primary})` }}
          >
            {theme.name}
          </div>
        </div>

        {/* Color swatches */}
        <div className="flex gap-1">
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
            title="Primary"
          />
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `hsl(${theme.preview.secondary})` }}
            title="Secondary"
          />
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `hsl(${theme.preview.accent})` }}
            title="Accent"
          />
        </div>
      </div>

      {/* Theme Info Footer */}
      <div className="bg-card p-2 border-t border-border">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <ThemeIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-mono font-semibold uppercase text-foreground truncate">
              {theme.name}
            </span>
          </div>
          {isActive && (
            <Check className="w-3 h-3 text-primary" />
          )}
          {isLocked && !isActive && (
            <Lock className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
          {theme.tagline}
        </p>
      </div>
    </div>
  );
}
