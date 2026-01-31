import { memo, useMemo } from "react";
import { useCampaign, Campaign, DisplaySettings } from "@/hooks/useCampaigns";
import { useCampaignPlayers } from "@/hooks/useCampaignPlayers";
import { format } from "date-fns";

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
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {/* Row 1 */}
          {displaySettings.showId && (
            <InfoField label="ID" value={joinCode || "—"} />
          )}
          {displaySettings.showPoints && (
            <InfoField
              label="Points"
              value={String(campaign.points_limit || 0)}
              valueColor="hsl(195, 100%, 50%)"
            />
          )}
          {displaySettings.showPlayers && (
            <InfoField
              label="Players"
              value={`${players.length} / ${maxPlayers}`}
            />
          )}

          {/* Row 2 */}
          {displaySettings.showRound && (
            <InfoField
              label="Round"
              value={`${currentRound} / ${totalRounds}`}
              valueColor="hsl(142, 76%, 50%)"
            />
          )}
          {displaySettings.showDates && startDate && (
            <InfoField
              label="Start"
              value={format(new Date(startDate), "MMM d, yyyy")}
            />
          )}
          {displaySettings.showDates && endDate && (
            <InfoField
              label="End"
              value={format(new Date(endDate), "MMM d, yyyy")}
            />
          )}

          {/* Row 3 */}
          {displaySettings.showGameSystem && gameSystem && (
            <div className="col-span-3">
              <InfoField label="System" value={gameSystem} />
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {displaySettings.showStatus && (
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border/30">
            <StatusBadge
              label="ACTIVE"
              active={status === "active"}
              color="hsl(142, 76%, 50%)"
            />
            <StatusBadge
              label="INACTIVE"
              active={status !== "active"}
              color="hsl(0, 85%, 55%)"
            />
          </div>
        )}
      </div>
    </div>
  );
});

interface InfoFieldProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoField({ label, value, valueColor }: InfoFieldProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wider">
        {label}:
      </span>
      <span
        className="border border-border/50 px-2 py-0.5 font-mono"
        style={{ color: valueColor || "inherit" }}
      >
        {value}
      </span>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
  color: string;
}

function StatusBadge({ label, active, color }: StatusBadgeProps) {
  return (
    <div
      className={`px-4 py-1.5 border font-mono text-xs uppercase tracking-wider transition-all ${
        active ? "opacity-100" : "opacity-30"
      }`}
      style={{
        borderColor: active ? color : "hsl(0, 0%, 30%)",
        color: active ? color : "hsl(0, 0%, 50%)",
      }}
    >
      [ {label} ]
    </div>
  );
}
