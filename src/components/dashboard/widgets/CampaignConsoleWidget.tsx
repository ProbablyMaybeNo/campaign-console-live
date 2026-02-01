import { memo, useMemo } from "react";
import { useCampaign, Campaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useCampaignPlayers } from "@/hooks/useCampaignPlayers";
import { format } from "date-fns";
import { Users, Swords, CalendarDays, Target, Hash } from "lucide-react";

interface CampaignConsoleWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export const CampaignConsoleWidget = memo(function CampaignConsoleWidget({
  campaignId,
  isGM,
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

  const titleColor = campaign?.title_color || "#22c55e";
  const borderColor = campaign?.border_color || "#22c55e";

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
    <div className="w-full h-full flex flex-col p-4 gap-3 overflow-hidden select-none">
      {/* Campaign Title Box */}
      <div
        className="border-2 px-6 py-4 flex items-center justify-center"
        style={{ borderColor }}
      >
        <h1
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide text-center"
          style={{
            color: titleColor,
            fontFamily: "'Uncial Antiqua', serif",
            textShadow: `0 0 10px ${titleColor}40, 0 0 20px ${titleColor}20`,
          }}
        >
          {campaign.name}
        </h1>
      </div>

      {/* Campaign Info Grid */}
      <div
        className="flex-1 border border-dashed p-4"
        style={{ borderColor: `${borderColor}60` }}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {/* Row 1: ID, Players */}
          {displaySettings.showId && (
            <IconField icon={<Hash className="w-4 h-4" />} value={joinCode || "—"} valueColor="hsl(0, 85%, 60%)" />
          )}
          {displaySettings.showPlayers && (
            <IconField icon={<Users className="w-4 h-4" />} value={`${players.length}/${maxPlayers}`} valueColor="hsl(195, 100%, 60%)" />
          )}

          {/* Row 2: Round, Date Range */}
          {displaySettings.showRound && (
            <IconField icon={<CalendarDays className="w-4 h-4" />} value={`${currentRound}/${totalRounds}`} valueColor="hsl(142, 76%, 60%)" />
          )}
          {displaySettings.showDates && (startDate || endDate) && (
            <div className="flex items-center gap-2">
              <span className="text-white font-mono text-sm font-medium">
                {startDate ? formatDate(startDate) : "—"} → {endDate ? formatDate(endDate) : "—"}
              </span>
            </div>
          )}

          {/* Row 3: Game System, Points */}
          {displaySettings.showGameSystem && gameSystem && (
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[hsl(0,85%,60%)]" />
              <span className="text-white font-mono text-sm font-medium">{gameSystem}</span>
            </div>
          )}
          {displaySettings.showPoints && (
            <IconField icon={<Target className="w-4 h-4" />} value={`${campaign.points_limit || 0} pts`} valueColor="hsl(195, 100%, 60%)" />
          )}
        </div>

        {/* Status Toggle - Centered */}
        {displaySettings.showStatus && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/30">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
            <StatusToggle active={status === "active"} />
          </div>
        )}
      </div>
    </div>
  );
});

interface IconFieldProps {
  icon: React.ReactNode;
  value: string;
  valueColor?: string;
}

function IconField({ icon, value, valueColor = "white" }: IconFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[hsl(195,100%,60%)]">{icon}</span>
      <span
        className="font-mono text-sm font-medium"
        style={{ color: valueColor }}
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
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-10 h-5 rounded-full relative transition-all ${
          active ? "bg-[hsl(142,76%,40%)]" : "bg-[hsl(0,60%,35%)]"
        }`}
        style={{
          boxShadow: active
            ? "0 0 8px hsl(142, 76%, 50%)"
            : "0 0 8px hsl(0, 85%, 50%)",
        }}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            active ? "left-5" : "left-0.5"
          }`}
        />
      </div>
      <span
        className={`text-xs font-mono uppercase tracking-wider ${
          active ? "text-[hsl(142,76%,60%)]" : "text-[hsl(0,85%,60%)]"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
