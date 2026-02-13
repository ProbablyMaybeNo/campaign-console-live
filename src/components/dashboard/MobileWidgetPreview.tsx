import { memo } from "react";
import { DashboardComponent } from "@/hooks/useDashboardComponents";

interface MobileWidgetPreviewProps {
  component: DashboardComponent;
}

export const MobileWidgetPreview = memo(function MobileWidgetPreview({
  component,
}: MobileWidgetPreviewProps) {
  const config = component.config as Record<string, unknown>;
  const type = component.component_type;

  switch (type) {
    case "counter":
      return (
        <div className="flex items-center justify-center py-2">
          <span
            className="text-4xl font-bold text-primary"
            style={{ textShadow: "0 0 16px hsl(var(--primary) / 0.5)" }}
          >
            {String(config?.value ?? 0)}
          </span>
        </div>
      );

    case "text": {
      const text = String(config?.content || "");
      if (!text) return <EmptyState>No content</EmptyState>;
      return (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {text}
        </p>
      );
    }

    case "image": {
      const imageUrl = String(config?.url || config?.image_url || "");
      if (!imageUrl) return <EmptyState>No image</EmptyState>;
      return (
        <div className="w-full aspect-video rounded overflow-hidden bg-muted/20">
          <img
            src={imageUrl}
            alt={component.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    case "table": {
      const headers = (config?.headers as string[]) || [];
      const rows = (config?.rows as unknown[][]) || [];
      if (rows.length === 0) return <EmptyState>Empty table</EmptyState>;
      const visibleRows = rows.slice(0, 3);
      const visibleHeaders = headers.slice(0, 3);
      return (
        <div className="w-full overflow-hidden">
          <table className="w-full text-[10px] font-mono">
            {visibleHeaders.length > 0 && (
              <thead>
                <tr className="border-b border-primary/20">
                  {visibleHeaders.map((h, i) => (
                    <th key={i} className="text-left py-0.5 px-1 text-primary truncate max-w-[80px]">
                      {String(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {visibleRows.map((row, ri) => (
                <tr key={ri} className="border-b border-primary/10">
                  {(Array.isArray(row) ? row : []).slice(0, 3).map((cell, ci) => (
                    <td key={ci} className="py-0.5 px-1 text-muted-foreground truncate max-w-[80px]">
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 3 && (
            <p className="text-[9px] text-muted-foreground/60 mt-1">+{rows.length - 3} more rows</p>
          )}
        </div>
      );
    }

    case "dice-roller": {
      const lastRoll = config?.lastRoll as number | undefined;
      return (
        <div className="flex flex-col items-center gap-1 py-1">
          {lastRoll !== undefined ? (
            <>
              <span className="text-2xl font-bold text-primary">{lastRoll}</span>
              <span className="text-[9px] text-muted-foreground/60">Last roll</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Tap to roll</span>
          )}
        </div>
      );
    }

    case "sticker": {
      const stickerUrl = String(config?.url || config?.sticker_url || config?.image || "");
      if (!stickerUrl) return <EmptyState>No sticker</EmptyState>;
      return (
        <div className="flex items-center justify-center py-1">
          <img
            src={stickerUrl}
            alt="Sticker"
            className="max-h-16 max-w-full object-contain"
            loading="lazy"
          />
        </div>
      );
    }

    case "announcements": {
      const announcements = (config?.items as Array<{ title?: string; content?: string }>) || [];
      const latest = announcements[0];
      if (!latest) return <EmptyState>No announcements</EmptyState>;
      return (
        <div className="space-y-0.5">
          {latest.title && (
            <p className="text-xs font-semibold text-foreground truncate">{latest.title}</p>
          )}
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {String(latest.content || "")}
          </p>
        </div>
      );
    }

    case "narrative":
    case "narrative-table": {
      const content = String(config?.content || config?.text || "");
      if (!content) return <EmptyState>No narrative</EmptyState>;
      return (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {content}
        </p>
      );
    }

    case "activity-feed":
      return <EmptyState>Recent activity</EmptyState>;

    case "calendar":
      return <EmptyState>View calendar</EmptyState>;

    case "roll-recorder": {
      const history = (config?.history as Array<{ total?: number; config?: string }>) || [];
      const last = history[0];
      if (!last) return <EmptyState>No rolls yet</EmptyState>;
      return (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <span className="text-xl font-bold text-primary">{last.total}</span>
          <span className="text-[9px] text-muted-foreground/60">{String(last.config || "")}</span>
        </div>
      );
    }

    case "card": {
      const title = String(config?.title || "");
      const body = String(config?.content || config?.body || "");
      return (
        <div className="space-y-0.5">
          {title && <p className="text-xs font-semibold text-foreground truncate">{title}</p>}
          <p className="text-[11px] text-muted-foreground line-clamp-2">{body || "Empty card"}</p>
        </div>
      );
    }

    case "players":
    case "players-manager":
    case "player-list":
    case "warbands":
      return <EmptyState>View players</EmptyState>;

    case "rules":
      return <EmptyState>View rules</EmptyState>;

    case "map":
      return <EmptyState>View map</EmptyState>;

    case "messages":
      return <EmptyState>View messages</EmptyState>;

    default:
      return <EmptyState>Tap to view</EmptyState>;
  }
});

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-muted-foreground/60 italic">{children}</span>
  );
}
