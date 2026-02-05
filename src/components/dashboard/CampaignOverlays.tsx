import { Users, Swords, Scroll, Map, BookOpen, MessageSquare, Calendar, Settings, Database, UserCog, Mail } from "lucide-react";
import { OverlayPanel, OverlayEmpty } from "@/components/ui/OverlayPanel";
import { PlayersWidget } from "./widgets/PlayersWidget";
import { PlayersManagerWidget } from "./widgets/PlayersManagerWidget";
import { MessagesWidget } from "./widgets/MessagesWidget";
import { NarrativeWidget } from "./widgets/NarrativeWidget";
import { ScheduleWidget } from "./widgets/ScheduleWidget";
import { CampaignSettingsModal } from "@/components/campaigns/CampaignSettingsModal";
import { MapManager } from "@/components/map/MapManager";
import { ComponentsManager } from "./ComponentsManager";
import { WarbandsWidget } from "./WarbandsWidget";
import { PlayerSettingsOverlay } from "@/components/players/PlayerSettingsOverlay";
import { PlayerMessagesOverlay } from "@/components/players/PlayerMessagesOverlay";
import { RulesManager } from "@/components/rules/RulesManager";
import { BattlesManager } from "@/components/battles/BattlesManager";
import type { OverlayType } from "@/hooks/useOverlayState";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Link } from "react-router-dom";

interface OverlayConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  gmOnly?: boolean;
  playerOnly?: boolean;
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
    subtitle: "View and manage campaign participants",
    icon: <Users className="w-4 h-4" />,
    size: "lg",
  },
  "player-settings": {
    title: "Player Settings",
    subtitle: "Configure your warband info for this campaign",
    icon: <UserCog className="w-4 h-4" />,
    size: "lg",
    playerOnly: true,
  },
  "player-messages": {
    title: "Private Messages",
    subtitle: "Direct messages with other players",
    icon: <Mail className="w-4 h-4" />,
    size: "md",
  },
  rules: {
    title: "Rules",
    subtitle: "Rules functionality moved to component creation",
    icon: <Scroll className="w-4 h-4" />,
    size: "md",
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
  battles: {
    title: "Battles",
    subtitle: "Manage rounds, pairings, and battle reports",
    icon: <Swords className="w-4 h-4" />,
    size: "xl",
    gmOnly: true,
  },
};

interface CampaignOverlaysProps {
  activeOverlay: OverlayType;
  onClose: () => void;
  campaignId: string;
  isGM: boolean;
}

export function CampaignOverlays({ activeOverlay, onClose, campaignId, isGM }: CampaignOverlaysProps) {
  if (!activeOverlay) return null;

  const config = overlayConfigs[activeOverlay];
  
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

  // Player-only overlays are hidden for GMs (they have their own settings)
  if (config.playerOnly && isGM) {
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
          title="Player Only"
          description="This feature is only available to players. GMs can view player info via the Players overlay."
        />
      </OverlayPanel>
    );
  }

  switch (activeOverlay) {
    case "players":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          {isGM ? (
            <PlayersManagerWidget campaignId={campaignId} />
          ) : (
            <PlayersWidget campaignId={campaignId} />
          )}
        </OverlayPanel>
      );

    case "messages":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <div className="h-[400px]">
            <MessagesWidget campaignId={campaignId} />
          </div>
        </OverlayPanel>
      );

    case "narrative":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <div className="min-h-[300px]">
            <NarrativeWidget campaignId={campaignId} isGM={isGM} />
          </div>
        </OverlayPanel>
      );

    case "schedule":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <div className="min-h-[300px]">
            <ScheduleWidget campaignId={campaignId} isGM={isGM} />
          </div>
        </OverlayPanel>
      );

    case "rules":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle="Manage smart tables and cards" icon={config.icon} size="lg">
          <RulesManager campaignId={campaignId} isGM={isGM} />
        </OverlayPanel>
      );

    case "settings":
      return (
        <CampaignSettingsModal open={true} onClose={onClose} campaignId={campaignId} />
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
                <TerminalButton size="sm">Open Warband Builder</TerminalButton>
              </Link>
            </div>
          }
        >
          <WarbandsWidget campaignId={campaignId} isGM={isGM} />
        </OverlayPanel>
      );

    case "map":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <MapManager campaignId={campaignId} isGM={isGM} />
        </OverlayPanel>
      );

    case "components":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <ComponentsManager campaignId={campaignId} />
        </OverlayPanel>
      );

    case "player-settings":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <PlayerSettingsOverlay campaignId={campaignId} />
        </OverlayPanel>
      );

    case "player-messages":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <PlayerMessagesOverlay campaignId={campaignId} />
        </OverlayPanel>
      );

    case "battles":
      return (
        <OverlayPanel open={true} onClose={onClose} title={config.title} subtitle={config.subtitle} icon={config.icon} size={config.size}>
          <BattlesManager campaignId={campaignId} />
        </OverlayPanel>
      );

    default:
      return null;
  }
}
