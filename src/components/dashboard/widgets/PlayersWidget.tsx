import { useCampaignPlayers, useCampaignOwner, CampaignPlayer } from "@/hooks/useCampaignPlayers";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Users, Shield, Swords, Crown } from "lucide-react";

interface PlayersWidgetProps {
  campaignId: string;
}

function PlayerAvatar({ player }: { player: CampaignPlayer }) {
  const initials = player.profile?.display_name
    ? player.profile.display_name.slice(0, 2).toUpperCase()
    : player.user_id.slice(0, 2).toUpperCase();

  if (player.profile?.avatar_url) {
    return (
      <img
        src={player.profile.avatar_url}
        alt={player.profile.display_name || "Player"}
        className="w-8 h-8 rounded border border-primary/30 object-cover"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
      <span className="text-xs font-mono text-primary">{initials}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isGM = role === "gm";
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
        isGM
          ? "bg-accent/20 text-accent border border-accent/30"
          : "bg-primary/10 text-primary/70 border border-primary/20"
      }`}
    >
      {isGM ? <Crown className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
      {role}
    </span>
  );
}

function PlayerRow({ player }: { player: CampaignPlayer }) {
  const displayName = player.profile?.display_name || `User ${player.user_id.slice(0, 8)}`;

  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-primary/5 transition-colors group">
      <PlayerAvatar player={player} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-foreground truncate">
            {displayName}
          </span>
          <RoleBadge role={player.role} />
        </div>
        
        {player.warband_count > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Swords className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {player.warband_count} warband{player.warband_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayersWidget({ campaignId }: PlayersWidgetProps) {
  const { data: players, isLoading: playersLoading } = useCampaignPlayers(campaignId);
  const { data: owner, isLoading: ownerLoading } = useCampaignOwner(campaignId);

  const isLoading = playersLoading || ownerLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <TerminalLoader text="Loading roster..." />
      </div>
    );
  }

  // Combine owner with players, filtering out duplicates
  const allPlayers: CampaignPlayer[] = [];
  
  if (owner) {
    allPlayers.push(owner);
  }
  
  if (players) {
    players.forEach((player) => {
      // Don't add if already added as owner
      if (!owner || player.user_id !== owner.user_id) {
        allPlayers.push(player);
      }
    });
  }

  if (allPlayers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Users className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs font-mono">No players yet</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-primary/20">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono text-primary uppercase tracking-wider">
          Campaign Roster
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {allPlayers.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
        {allPlayers.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
