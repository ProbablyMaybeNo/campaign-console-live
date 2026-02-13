import { memo } from "react";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { MobileWidgetPreview } from "./MobileWidgetPreview";
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

export const MobileWidgetCard = memo(function MobileWidgetCard({
  component,
  onExpand,
}: MobileWidgetCardProps) {
  const Icon = widgetIcons[component.component_type] || CreditCard;

  return (
    <button
      onClick={onExpand}
      className="w-full text-left border border-primary/40 bg-card/80 rounded-lg p-3 flex flex-col gap-2 transition-all active:scale-[0.98] hover:border-primary hover:bg-primary/5 min-h-[80px]"
      style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.1)" }}
    >
      {/* Header: icon + name */}
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-[11px] font-mono text-foreground truncate font-medium">
          {component.name}
        </span>
      </div>

      {/* Inline preview content */}
      <div className="w-full min-w-0">
        <MobileWidgetPreview component={component} />
      </div>
    </button>
  );
});
