import { memo } from "react";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { 
  Table2, 
  CreditCard, 
  Hash, 
  Image, 
  Dices, 
  Type, 
  Sparkles, 
  Map, 
  Calendar, 
  BookOpen,
  Activity,
  MessageSquare,
  Users,
  Scroll
} from "lucide-react";

interface MobileWidgetCardProps {
  component: DashboardComponent;
  onExpand: () => void;
}

const widgetIcons: Record<string, React.ElementType> = {
  "table": Table2,
  "card": CreditCard,
  "counter": Hash,
  "image": Image,
  "dice-roller": Dices,
  "text": Type,
  "sticker": Sparkles,
  "map": Map,
  "schedule": Calendar,
  "narrative": BookOpen,
  "narrative-table": BookOpen,
  "activity-feed": Activity,
  "messages": MessageSquare,
  "players": Users,
  "players-manager": Users,
  "player-list": Users,
  "rules": Scroll,
  "roll-recorder": Dices,
  "calendar": Calendar,
  "announcements": MessageSquare,
  "warbands": Users,
};

function getWidgetPreview(component: DashboardComponent): string {
  const config = component.config as Record<string, unknown>;
  
  switch (component.component_type) {
    case "counter":
      return String(config?.value ?? 0);
    case "text":
      const text = String(config?.content || "");
      return text.slice(0, 40) + (text.length > 40 ? "..." : "");
    case "table":
      const rows = (config?.rows as unknown[]) || [];
      return `${rows.length} rows`;
    case "dice-roller":
      return "Roll dice";
    case "image":
      return "View image";
    case "schedule":
      return "View schedule";
    case "narrative":
    case "narrative-table":
      return "View narrative";
    case "activity-feed":
      return "Recent activity";
    case "messages":
      return "Messages";
    case "roll-recorder":
      return "Roll history";
    default:
      return "Tap to view";
  }
}

export const MobileWidgetCard = memo(function MobileWidgetCard({
  component,
  onExpand,
}: MobileWidgetCardProps) {
  const Icon = widgetIcons[component.component_type] || CreditCard;
  const preview = getWidgetPreview(component);
  const isCounter = component.component_type === "counter";

  return (
    <button
      onClick={onExpand}
      className="flex-shrink-0 w-28 min-[400px]:w-32 h-32 min-[400px]:h-36 border border-primary/40 bg-card/80 rounded-lg p-2.5 flex flex-col items-center justify-between transition-all active:scale-95 hover:border-primary hover:bg-primary/5"
      style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.1)" }}
    >
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-[10px] min-[400px]:text-xs font-mono text-foreground truncate">
          {component.name}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-1">
        {isCounter ? (
          <span 
            className="text-2xl min-[400px]:text-3xl font-bold text-primary"
            style={{ textShadow: "0 0 15px hsl(var(--primary) / 0.5)" }}
          >
            {preview}
          </span>
        ) : (
          <span className="text-[10px] min-[400px]:text-xs text-muted-foreground text-center line-clamp-2">
            {preview}
          </span>
        )}
      </div>

      <span className="text-[9px] min-[400px]:text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        Tap to view
      </span>
    </button>
  );
});
