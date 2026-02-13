import { memo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { TableWidget } from "./widgets/TableWidget";
import { CounterWidget } from "./widgets/CounterWidget";
import { DiceRollerWidget } from "./widgets/DiceRollerWidget";
import { CardWidget } from "./widgets/CardWidget";
import { ImageWidget } from "./widgets/ImageWidget";
import { MapWidget } from "./widgets/MapWidget";
import { PlayerListWidget } from "./widgets/PlayerListWidget";
import { NarrativeTableWidget } from "./widgets/NarrativeTableWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { ActivityFeedWidget } from "./widgets/ActivityFeedWidget";
import { RollRecorderWidget } from "./widgets/RollRecorderWidget";
import { AnnouncementsWidget } from "./widgets/AnnouncementsWidget";
import { TextWidget } from "./widgets/TextWidget";
import { StickerWidget } from "./widgets/StickerWidget";

interface MobileWidgetSheetProps {
  component: DashboardComponent | null;
  open: boolean;
  onClose: () => void;
  campaignId: string;
  isGM: boolean;
}

function renderWidgetContent(component: DashboardComponent, campaignId: string, isGM: boolean) {
  switch (component.component_type) {
    case "table":
    case "rules_table":
    case "custom_table":
      return <TableWidget component={component} isGM={isGM} campaignId={campaignId} />;
    case "counter":
      return <CounterWidget component={component} isGM={isGM} />;
    case "dice-roller":
    case "dice_roller":
      return <DiceRollerWidget component={component} campaignId={campaignId} isGM={isGM} />;
    case "card":
    case "rules_card":
    case "custom_card":
      return <CardWidget component={component} isGM={isGM} campaignId={campaignId} />;
    case "image":
      return <ImageWidget component={component} isGM={isGM} />;
    case "map":
      return <MapWidget component={component} isGM={isGM} />;
    case "player-list":
    case "player_list":
      return <PlayerListWidget component={component} isGM={isGM} />;
    case "narrative-table":
    case "narrative_table":
      return <NarrativeTableWidget campaignId={campaignId} isGM={isGM} />;
    case "calendar":
      return <CalendarWidget campaignId={campaignId} isGM={isGM} />;
    case "activity-feed":
    case "activity_feed":
      return <ActivityFeedWidget campaignId={campaignId} isGM={isGM} />;
    case "roll-recorder":
    case "roll_recorder":
      return <RollRecorderWidget component={component} campaignId={campaignId} isGM={isGM} />;
    case "announcements":
      return <AnnouncementsWidget campaignId={campaignId} isGM={isGM} />;
    case "text":
      return <TextWidget component={component} isGM={isGM} />;
    case "sticker":
      return <StickerWidget component={component} isGM={isGM} />;
    default:
      return (
        <div className="text-muted-foreground text-sm p-4">
          Widget preview not available
        </div>
      );
  }
}

export const MobileWidgetSheet = memo(function MobileWidgetSheet({
  component,
  open,
  onClose,
  campaignId,
  isGM,
}: MobileWidgetSheetProps) {
  if (!component) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] border-t-2 border-primary bg-background rounded-t-xl"
        style={{ boxShadow: "0 -4px 30px hsl(var(--primary) / 0.2)" }}
      >
        <SheetHeader className="border-b border-primary/30 pb-3 mb-4">
          <SheetTitle className="text-primary font-mono uppercase tracking-wider text-sm">
            {component.name}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(85vh-80px)]">
          <div className="pr-4 min-h-[300px]">
            {renderWidgetContent(component, campaignId, isGM)}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});
