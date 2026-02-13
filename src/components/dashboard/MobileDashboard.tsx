import { memo, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { OverlayType } from "@/hooks/useOverlayState";
import { Campaign } from "@/hooks/useCampaigns";
import { CampaignConsoleWidget } from "./widgets/CampaignConsoleWidget";
import { MobileWidgetCard } from "./MobileWidgetCard";
import { MobileWidgetSheet } from "./MobileWidgetSheet";
import { MobileGMMenu } from "./MobileGMMenu";
import { MobileOnboardingModal } from "./MobileOnboardingModal";
import { HelpButton } from "@/components/help/HelpButton";
import { 
  ArrowLeft, 
  Scroll, 
  Map, 
  Calendar, 
  MessageSquare,
  BookOpen,
  Users
} from "lucide-react";

interface MobileDashboardProps {
  campaign: Campaign;
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onOpenOverlay: (overlay: OverlayType) => void;
  onSignOut: () => void;
  onAddWidget: () => void;
  onExport: () => void;
  onTheme: () => void;
}

export const MobileDashboard = memo(function MobileDashboard({
  campaign,
  components,
  isGM,
  campaignId,
  onOpenOverlay,
  onSignOut,
  onAddWidget,
  onExport,
  onTheme,
}: MobileDashboardProps) {
  const [expandedWidget, setExpandedWidget] = useState<DashboardComponent | null>(null);

  // Filter out campaign-console widget (it's shown as hero)
  const widgetComponents = useMemo(() => 
    components.filter(c => c.component_type !== "campaign-console"),
    [components]
  );

  const themeId = campaign?.theme_id || "dark";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" data-theme={themeId}>
      {/* Mobile Onboarding */}
      <MobileOnboardingModal isPhone={true} />

      {/* Header - compact and safe */}
      <header className="border-b-2 border-primary bg-card/95 px-3 py-2.5 flex-shrink-0 safe-area-top">
        <div className="flex items-center justify-between gap-2">
          <Link 
            to="/campaigns" 
            className="text-secondary hover:text-secondary-foreground transition-all flex-shrink-0"
          >
            <span className="flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden min-[360px]:inline">Camps</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div 
              className={`px-2 py-1 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                isGM 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {isGM ? "GM" : "Player"}
            </div>
            <HelpButton variant="icon" />
            <TerminalButton variant="ghost" size="sm" onClick={onSignOut} className="px-2">
              <span className="text-xs">Out</span>
            </TerminalButton>
          </div>
        </div>
      </header>

      {/* Main Content - Vertical scrolling with safe margins */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3 pb-24">
          {/* Campaign Console Hero */}
          <div 
            className="border-2 border-primary rounded-lg overflow-hidden bg-card"
            style={{ boxShadow: "0 0 15px hsl(var(--primary) / 0.15)" }}
          >
            <div className="h-32 min-[400px]:h-36">
              <CampaignConsoleWidget 
                campaignId={campaignId} 
                isGM={isGM} 
              />
            </div>
          </div>

          {/* Widgets Section - Vertical Grid */}
          {widgetComponents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-primary/30" />
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  Widgets
                </span>
                <div className="h-px flex-1 bg-primary/30" />
              </div>
              
              {/* Vertical 2-column grid - all widgets visible, scrolls naturally */}
              <div className="grid grid-cols-2 gap-2">
                {widgetComponents.map((component) => (
                  <MobileWidgetCard
                    key={component.id}
                    component={component}
                    onExpand={() => setExpandedWidget(component)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Bottom Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t-2 border-primary safe-area-bottom z-40">
        <div className="px-2 py-2">
          <div className="flex items-center justify-around gap-1">
            <QuickActionButton 
              icon={<Scroll className="w-4 h-4" />} 
              label="Rules" 
              onClick={() => onOpenOverlay("rules")} 
            />
            <QuickActionButton 
              icon={<Map className="w-4 h-4" />} 
              label="Map" 
              onClick={() => onOpenOverlay("map")} 
            />
            <QuickActionButton 
              icon={<Calendar className="w-4 h-4" />} 
              label="Calendar" 
              onClick={() => onOpenOverlay("calendar")} 
            />
            <QuickActionButton 
              icon={<MessageSquare className="w-4 h-4" />} 
              label="Messages" 
              onClick={() => onOpenOverlay("messages")} 
            />
            <QuickActionButton 
              icon={<BookOpen className="w-4 h-4" />} 
              label="Story" 
              onClick={() => onOpenOverlay("narrative")} 
            />
            <QuickActionButton 
              icon={<Users className="w-4 h-4" />} 
              label="Players" 
              onClick={() => onOpenOverlay("players")} 
            />
          </div>
        </div>
      </div>

      {/* GM FAB Menu - positioned above the bottom bar */}
      <MobileGMMenu
        isGM={isGM}
        joinCode={campaign.join_code}
        onOpenOverlay={onOpenOverlay}
        onAddWidget={onAddWidget}
        onExport={onExport}
        onTheme={onTheme}
      />

      {/* Widget Expanded Sheet */}
      <MobileWidgetSheet
        component={expandedWidget}
        open={!!expandedWidget}
        onClose={() => setExpandedWidget(null)}
        campaignId={campaignId}
        isGM={isGM}
      />
    </div>
  );
});

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-md transition-all active:scale-95 active:bg-primary/10 min-w-[48px]"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
}
