import { Users, Swords, Scroll, Map, BookOpen, MessageSquare, Calendar, Settings, Database } from "lucide-react";
import { OverlayPanel, OverlayLoading, OverlayEmpty } from "@/components/ui/OverlayPanel";
import { PlayersWidget } from "./widgets/PlayersWidget";
import { MessagesWidget } from "./widgets/MessagesWidget";
import { NarrativeWidget } from "./widgets/NarrativeWidget";
import { ScheduleWidget } from "./widgets/ScheduleWidget";
import { RulesLibrary } from "@/components/rules/RulesLibrary";
import { CampaignSettingsModal } from "@/components/campaigns/CampaignSettingsModal";
import { MapManager } from "@/components/map/MapManager";
import type { OverlayType } from "@/hooks/useOverlayState";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Link } from "react-router-dom";
interface OverlayConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  gmOnly?: boolean;
}

const overlayConfigs: Record<Exclude<OverlayType, null>, OverlayConfig> = {
  components: {
    title: "Components",
    subtitle: "Manage dashboard widgets and their visibility",
    icon: <Database className="w-4 h-4" />,
    size: "lg",
    gmOnly: true,
  },
  warbands: {
    title: "Warbands",
    subtitle: "Manage player warbands, rosters, and points",
    icon: <Swords className="w-4 h-4" />,
    size: "xl",
  },
  players: {
    title: "Players",
    subtitle: "View campaign roster and manage participants",
    icon: <Users className="w-4 h-4" />,
    size: "md",
  },
  rules: {
    title: "Rules Library",
    subtitle: "Upload and manage campaign rules sources",
    icon: <Scroll className="w-4 h-4" />,
    size: "xl",
  },
  map: {
    title: "Campaign Map",
    subtitle: "View and edit the campaign territory map",
    icon: <Map className="w-4 h-4" />,
    size: "xl",
  },
  narrative: {
    title: "Narrative",
    subtitle: "Campaign story entries and lore",
    icon: <BookOpen className="w-4 h-4" />,
    size: "lg",
  },
  messages: {
    title: "Messages",
    subtitle: "Campaign chat and announcements",
    icon: <MessageSquare className="w-4 h-4" />,
    size: "md",
  },
  schedule: {
    title: "Schedule",
    subtitle: "Campaign rounds and match schedule",
    icon: <Calendar className="w-4 h-4" />,
    size: "lg",
  },
  settings: {
    title: "Settings",
    subtitle: "Campaign configuration and preferences",
    icon: <Settings className="w-4 h-4" />,
    size: "md",
    gmOnly: true,
  },
};

interface CampaignOverlaysProps {
  activeOverlay: OverlayType;
  onClose: () => void;
  campaignId: string;
  isGM: boolean;
}

/**
 * Renders the appropriate overlay based on activeOverlay state
 * All overlays follow the standardized OverlayPanel pattern
 */
export function CampaignOverlays({ activeOverlay, onClose, campaignId, isGM }: CampaignOverlaysProps) {
  if (!activeOverlay) return null;

  const config = overlayConfigs[activeOverlay];
  
  // Check GM-only access
  if (config.gmOnly && !isGM) {
    return (
      <OverlayPanel
        open={true}
        onClose={onClose}
        title={config.title}
        subtitle="Access Restricted"
        icon={config.icon}
        size="sm"
      >
        <OverlayEmpty
          icon={config.icon}
          title="GM Only"
          description="This feature is only available to Game Masters."
        />
      </OverlayPanel>
    );
  }

  // Render specific overlay content
  switch (activeOverlay) {
    case "players":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <PlayersWidget campaignId={campaignId} />
        </OverlayPanel>
      );

    case "messages":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <div className="h-[400px]">
            <MessagesWidget campaignId={campaignId} />
          </div>
        </OverlayPanel>
      );

    case "narrative":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <div className="min-h-[300px]">
            <NarrativeWidget campaignId={campaignId} isGM={isGM} />
          </div>
        </OverlayPanel>
      );

    case "schedule":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <div className="min-h-[300px]">
            <ScheduleWidget campaignId={campaignId} isGM={isGM} />
          </div>
        </OverlayPanel>
      );

    case "rules":
      // Rules Library uses its own Dialog - pass through props
      return (
        <RulesLibrary
          open={true}
          onOpenChange={(open) => !open && onClose()}
          campaignId={campaignId}
          isGM={isGM}
        />
      );

    case "settings":
      // Settings uses its own Dialog - pass through props
      return (
        <CampaignSettingsModal
          open={true}
          onClose={onClose}
          campaignId={campaignId}
        />
      );

    case "warbands":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
          footer={
            <div className="flex justify-end">
              <Link to={`/campaign/${campaignId}/warband-builder`}>
                <TerminalButton size="sm">
                  Open Warband Builder
                </TerminalButton>
              </Link>
            </div>
          }
        >
          <OverlayEmpty
            icon={<Swords className="w-8 h-8" />}
            title="Warband Builder Coming Soon"
            description="Manage your army rosters, units, and points here."
            action={
              <Link to={`/campaign/${campaignId}/warband-builder`}>
                <TerminalButton size="sm" variant="outline">
                  Open Warband Builder
                </TerminalButton>
              </Link>
            }
          />
        </OverlayPanel>
      );

    case "map":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <MapManager campaignId={campaignId} isGM={isGM} />
        </OverlayPanel>
      );

    case "components":
      return (
        <OverlayPanel
          open={true}
          onClose={onClose}
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          size={config.size}
        >
          <OverlayEmpty
            icon={<Database className="w-8 h-8" />}
            title="Component Manager Coming Soon"
            description="Manage dashboard widgets, visibility, and layout here."
          />
        </OverlayPanel>
      );

    default:
      return null;
  }
}
