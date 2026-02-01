import { memo, useMemo } from "react";
import { useCampaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useCampaignPlayers } from "@/hooks/useCampaignPlayers";
import { format } from "date-fns";
import { Users, Swords, CalendarDays, Target, Hash } from "lucide-react";

interface CampaignConsoleWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export const CampaignConsoleWidget = memo(function CampaignConsoleWidget({
  campaignId,
}: CampaignConsoleWidgetProps) {
  const { data: campaign } = useCampaign(campaignId);
  const { data: players = [] } = useCampaignPlayers(campaignId);

  const displaySettings = useMemo((): DisplaySettings => {
    if (!campaign) return {
      showId: true,
      showPoints: true,
      showPlayers: true,
      showRound: true,
      showDates: true,
      showStatus: true,
      showGameSystem: true,
    };
    const ds = campaign.display_settings as DisplaySettings | null;
    return ds || {
      showId: true,
      showPoints: true,
      showPlayers: true,
      showRound: true,
      showDates: true,
      showStatus: true,
      showGameSystem: true,
    };
  }, [campaign]);

  const titleColor = campaign?.title_color || "hsl(142, 76%, 55%)";
  const borderColor = campaign?.border_color || "hsl(142, 76%, 55%)";

  if (!campaign) return null;

  const currentRound = campaign.current_round || 1;
  const totalRounds = campaign.total_rounds || 10;
  const maxPlayers = campaign.max_players || 8;
  const status = campaign.status || "active";
  const gameSystem = campaign.game_system;
  const startDate = campaign.start_date;
  const endDate = campaign.end_date;
  const joinCode = campaign.join_code;

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yy");

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-hidden select-none relative">
      {/* Decorative Frame with Corner Accents */}
      <div className="absolute inset-2 pointer-events-none">
        {/* Corner accents - Top Left */}
        <div 
          className="absolute top-0 left-0 w-5 h-5"
          style={{
            borderTop: `2px solid ${borderColor}`,
            borderLeft: `2px solid ${borderColor}`,
            boxShadow: `0 0 8px ${borderColor}40`,
          }}
        />
        {/* Corner accents - Top Right */}
        <div 
          className="absolute top-0 right-0 w-5 h-5"
          style={{
            borderTop: `2px solid ${borderColor}`,
            borderRight: `2px solid ${borderColor}`,
            boxShadow: `0 0 8px ${borderColor}40`,
          }}
        />
        {/* Corner accents - Bottom Left */}
        <div 
          className="absolute bottom-0 left-0 w-5 h-5"
          style={{
            borderBottom: `2px solid ${borderColor}`,
            borderLeft: `2px solid ${borderColor}`,
            boxShadow: `0 0 8px ${borderColor}40`,
          }}
        />
        {/* Corner accents - Bottom Right */}
        <div 
          className="absolute bottom-0 right-0 w-5 h-5"
          style={{
            borderBottom: `2px solid ${borderColor}`,
            borderRight: `2px solid ${borderColor}`,
            boxShadow: `0 0 8px ${borderColor}40`,
          }}
        />
        
        {/* Outer frame lines */}
        <div 
          className="absolute top-0 left-6 right-6 h-px"
          style={{ backgroundColor: borderColor, opacity: 0.4 }}
        />
        <div 
          className="absolute bottom-0 left-6 right-6 h-px"
          style={{ backgroundColor: borderColor, opacity: 0.4 }}
        />
        <div 
          className="absolute left-0 top-6 bottom-6 w-px"
          style={{ backgroundColor: borderColor, opacity: 0.4 }}
        />
        <div 
          className="absolute right-0 top-6 bottom-6 w-px"
          style={{ backgroundColor: borderColor, opacity: 0.4 }}
        />
      </div>

      {/* Campaign Title Box */}
      <div
        className="border-2 px-4 py-3 flex items-center justify-center relative z-10"
        style={{ 
          borderColor,
          boxShadow: `0 0 15px ${borderColor}30, inset 0 0 20px ${borderColor}10`,
        }}
      >
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-wide text-center"
          style={{
            color: titleColor,
            fontFamily: "'UnifrakturMaguntia', serif",
            textShadow: `0 0 15px ${titleColor}60, 0 0 30px ${titleColor}30, 0 0 45px ${titleColor}15`,
          }}
        >
          {campaign.name}
        </h1>
      </div>

      {/* Campaign Info Grid */}
      <div
        className="border border-dashed px-4 py-2 relative z-10"
        style={{ 
          borderColor: `${borderColor}60`,
          boxShadow: `0 0 10px ${borderColor}10`,
        }}
      >
        <div className="flex items-center justify-evenly gap-6 flex-wrap">
          {displaySettings.showId && (
            <IconField
              icon={<Hash className="w-4 h-4" />}
              value={joinCode || "—"}
              valueColor="hsl(0, 85%, 60%)"
              iconColor="hsl(0, 85%, 60%)"
            />
          )}

          {displaySettings.showRound && (
            <IconField
              icon={<CalendarDays className="w-4 h-4" />}
              value={`${currentRound}/${totalRounds}`}
              valueColor="hsl(142, 76%, 60%)"
              iconColor="hsl(142, 76%, 60%)"
            />
          )}

          {displaySettings.showDates && (startDate || endDate) && (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span 
                className="font-mono text-xs font-medium leading-none"
                style={{ 
                  color: "hsl(0, 0%, 95%)",
                  textShadow: "0 0 8px hsla(0, 0%, 100%, 0.3)",
                }}
              >
                {startDate ? formatDate(startDate) : "—"} → {endDate ? formatDate(endDate) : "—"}
              </span>
            </div>
          )}

          {displaySettings.showGameSystem && gameSystem && (
            <IconField
              icon={<Swords className="w-4 h-4" />}
              value={gameSystem}
              valueColor="hsl(0, 0%, 95%)"
              iconColor="hsl(0, 85%, 60%)"
            />
          )}

          {displaySettings.showPlayers && (
            <IconField
              icon={<Users className="w-4 h-4" />}
              value={`${players.length}/${maxPlayers}`}
              valueColor="hsl(195, 100%, 65%)"
              iconColor="hsl(195, 100%, 65%)"
            />
          )}

          {displaySettings.showPoints && (
            <IconField
              icon={<Target className="w-4 h-4" />}
              value={`${campaign.points_limit || 0} pts`}
              valueColor="hsl(195, 100%, 65%)"
              iconColor="hsl(195, 100%, 65%)"
            />
          )}

          {displaySettings.showStatus && <StatusToggle active={status === "active"} />}
        </div>
      </div>
    </div>
  );
});

interface IconFieldProps {
  icon: React.ReactNode;
  value: string;
  valueColor?: string;
  iconColor?: string;
}

function IconField({ icon, value, valueColor = "white", iconColor = "hsl(195,100%,65%)" }: IconFieldProps) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span style={{ color: iconColor, filter: `drop-shadow(0 0 4px ${iconColor}50)` }}>{icon}</span>
      <span
        className="font-mono text-xs font-medium leading-none"
        style={{ 
          color: valueColor,
          textShadow: `0 0 6px ${valueColor}40`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface StatusToggleProps {
  active: boolean;
}

function StatusToggle({ active }: StatusToggleProps) {
  const activeColor = "hsl(142, 76%, 55%)";
  const inactiveColor = "hsl(0, 85%, 55%)";
  
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-4 rounded-full relative transition-all"
        style={{
          backgroundColor: active ? "hsl(142, 76%, 30%)" : "hsl(0, 60%, 30%)",
          boxShadow: active
            ? `0 0 12px ${activeColor}, 0 0 4px ${activeColor}`
            : `0 0 12px ${inactiveColor}, 0 0 4px ${inactiveColor}`,
        }}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all`}
          style={{
            backgroundColor: active ? activeColor : inactiveColor,
            left: active ? "1rem" : "0.125rem",
            boxShadow: `0 0 6px ${active ? activeColor : inactiveColor}`,
          }}
        />
      </div>
      <span
        className="text-[10px] font-mono uppercase tracking-wider leading-none"
        style={{
          color: active ? activeColor : inactiveColor,
          textShadow: `0 0 8px ${active ? activeColor : inactiveColor}50`,
        }}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
