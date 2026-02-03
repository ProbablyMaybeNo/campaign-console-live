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
  BookOpen
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

      {/* Header */}
      <header className="border-b-2 border-primary bg-card/95 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Link 
            to="/campaigns" 
            className="text-secondary hover:text-secondary-foreground transition-all"
          >
            <span className="flex items-center gap-1 font-mono text-sm font-medium uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" />
              Camps
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            <div 
              className={`px-3 py-1 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                isGM 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {isGM ? "GM" : "Player"}
            </div>
            <HelpButton variant="icon" />
            <TerminalButton variant="ghost" size="sm" onClick={onSignOut}>
              Out
            </TerminalButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 pb-24">
          {/* Campaign Console Hero */}
          <div 
            className="border-2 border-primary rounded-lg overflow-hidden bg-card"
            style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" }}
          >
            <div className="h-40">
              <CampaignConsoleWidget 
                campaignId={campaignId} 
                isGM={isGM} 
              />
            </div>
          </div>

          {/* Widgets Section */}
          {widgetComponents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-primary/30" />
                <span className="text-xs font-mono text-primary uppercase tracking-wider">
                  Widgets
                </span>
                <div className="h-px flex-1 bg-primary/30" />
              </div>
              
              {/* Horizontal scrolling carousel */}
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-3">
                  {widgetComponents.map((component) => (
                    <MobileWidgetCard
                      key={component.id}
                      component={component}
                      onExpand={() => setExpandedWidget(component)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Access Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-primary/30" />
              <span className="text-xs font-mono text-primary uppercase tracking-wider">
                Quick Access
              </span>
              <div className="h-px flex-1 bg-primary/30" />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <QuickAccessButton 
                icon={<Scroll className="w-5 h-5" />} 
                label="Rules" 
                onClick={() => onOpenOverlay("rules")} 
              />
              <QuickAccessButton 
                icon={<Map className="w-5 h-5" />} 
                label="Map" 
                onClick={() => onOpenOverlay("map")} 
              />
              <QuickAccessButton 
                icon={<Calendar className="w-5 h-5" />} 
                label="Schedule" 
                onClick={() => onOpenOverlay("schedule")} 
              />
              <QuickAccessButton 
                icon={<MessageSquare className="w-5 h-5" />} 
                label="Messages" 
                onClick={() => onOpenOverlay("messages")} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <QuickAccessButton 
                icon={<BookOpen className="w-5 h-5" />} 
                label="Narrative" 
                onClick={() => onOpenOverlay("narrative")} 
                wide
              />
              <QuickAccessButton 
                icon={<MessageSquare className="w-5 h-5" />} 
                label="Players" 
                onClick={() => onOpenOverlay("players")} 
                wide
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* GM FAB Menu */}
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

interface QuickAccessButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  wide?: boolean;
}

function QuickAccessButton({ icon, label, onClick, wide }: QuickAccessButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 p-3 border border-primary/30 rounded-lg bg-card/50 transition-all active:scale-95 hover:border-primary hover:bg-primary/5 ${
        wide ? "col-span-1" : ""
      }`}
    >
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}
