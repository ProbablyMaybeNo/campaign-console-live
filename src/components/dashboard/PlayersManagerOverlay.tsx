import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useCampaignPlayers, useCampaignOwner, CampaignPlayer } from "@/hooks/useCampaignPlayers";
import { useCampaignWarbands } from "@/hooks/useWarband";
import { Link } from "react-router-dom";
import { 
  Users, 
  Crown, 
  Shield, 
  Swords, 
  ExternalLink,
  BookOpen,
  UserMinus,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayersManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  isGM: boolean;
}

export function PlayersManagerOverlay({
  open,
  onOpenChange,
  campaignId,
  isGM,
}: PlayersManagerOverlayProps) {
  const { data: players, isLoading: playersLoading } = useCampaignPlayers(campaignId);
  const { data: owner, isLoading: ownerLoading } = useCampaignOwner(campaignId);
  const { data: warbands } = useCampaignWarbands(campaignId);
  
  const [selectedPlayer, setSelectedPlayer] = useState<CampaignPlayer | null>(null);

  const isLoading = playersLoading || ownerLoading;

  // Combine owner with players
  const allPlayers: CampaignPlayer[] = [];
  if (owner) {
    allPlayers.push(owner);
  }
  if (players) {
    players.forEach((player) => {
      if (!owner || player.user_id !== owner.user_id) {
        allPlayers.push(player);
      }
    });
  }

  // Get warband info for a player
  const getPlayerWarband = (userId: string) => {
    return warbands?.find(w => w.owner_id === userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players Management
            <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {allPlayers.length} player{allPlayers.length !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <TerminalLoader text="Loading players" />
            </div>
          ) : allPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-xs font-mono">No players in this campaign</p>
            </div>
          ) : (
            <div className="divide-y divide-primary/10">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-primary/5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                <div className="col-span-3">Player</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Faction</div>
                <div className="col-span-2">Warband</div>
                <div className="col-span-1 text-center">Points</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Body */}
              {allPlayers.map((player) => {
                const warband = getPlayerWarband(player.user_id);
                const displayName = player.profile?.display_name || `User ${player.user_id.slice(0, 8)}`;
                const initials = displayName.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={player.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-accent/20 transition-colors",
                      selectedPlayer?.id === player.id && "bg-primary/10"
                    )}
                  >
                    {/* Player */}
                    <div className="col-span-3 flex items-center gap-3">
                      {player.profile?.avatar_url ? (
                        <img
                          src={player.profile.avatar_url}
                          alt={displayName}
                          className="w-8 h-8 rounded border border-primary/30 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-mono text-primary">{initials}</span>
                        </div>
                      )}
                      <span className="text-sm font-mono truncate">{displayName}</span>
                    </div>

                    {/* Role */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider",
                          player.role === "gm"
                            ? "bg-accent/20 text-accent border border-accent/30"
                            : "bg-primary/10 text-primary/70 border border-primary/20"
                        )}
                      >
                        {player.role === "gm" ? (
                          <Crown className="w-2.5 h-2.5" />
                        ) : (
                          <Shield className="w-2.5 h-2.5" />
                        )}
                        {player.role}
                      </span>
                    </div>

                    {/* Faction */}
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {warband?.faction || "—"}
                      {warband?.sub_faction && (
                        <span className="block text-[10px] opacity-70">
                          {warband.sub_faction}
                        </span>
                      )}
                    </div>

                    {/* Warband */}
                    <div className="col-span-2 text-xs">
                      {warband ? (
                        <span className="text-foreground font-mono">{warband.name}</span>
                      ) : (
                        <span className="text-muted-foreground/50">No warband</span>
                      )}
                    </div>

                    {/* Points */}
                    <div className="col-span-1 text-center">
                      {warband ? (
                        <span className="text-xs font-mono text-primary">
                          {warband.points_total || 0}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end gap-1">
                      {warband && (
                        <Link
                          to={`/campaign/${campaignId}/warband-builder`}
                          onClick={() => onOpenChange(false)}
                        >
                          <TerminalButton
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View Warband"
                          >
                            <Swords className="w-3.5 h-3.5" />
                          </TerminalButton>
                        </Link>
                      )}
                      <TerminalButton
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View Narrative"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </TerminalButton>
                      {isGM && player.role !== "gm" && (
                        <TerminalButton
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Remove Player"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </TerminalButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {isGM && (
          <div className="px-6 py-4 border-t border-primary/20 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Share your campaign ID to invite players
            </p>
            <TerminalButton variant="outline" size="sm" disabled>
              <Settings2 className="w-3.5 h-3.5 mr-2" />
              Invite Players (Coming Soon)
            </TerminalButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
