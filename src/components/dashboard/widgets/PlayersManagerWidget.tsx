import { useState } from "react";
import { useAllPlayerSettings, PlayerSettings } from "@/hooks/usePlayerSettings";
import { useCampaignOwner } from "@/hooks/useCampaignPlayers";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Crown,
  Shield,
  ChevronDown,
  ChevronRight,
  User,
  Swords,
  Link2,
  Coins,
  FileText,
  ExternalLink,
  Save,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayersManagerWidgetProps {
  campaignId: string;
}

type PlayerWithProfile = PlayerSettings & { profile_display_name: string | null };

function PlayerCard({ 
  player, 
  isOwner,
  campaignId,
}: { 
  player: PlayerWithProfile; 
  isOwner: boolean;
  campaignId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Local form state
  const [playerName, setPlayerName] = useState(player.player_name || "");
  const [faction, setFaction] = useState(player.faction || "");
  const [subFaction, setSubFaction] = useState(player.sub_faction || "");
  const [currentPoints, setCurrentPoints] = useState(player.current_points?.toString() || "");
  const [warbandLink, setWarbandLink] = useState(player.warband_link || "");
  const [additionalInfo, setAdditionalInfo] = useState(player.additional_info || "");

  const displayName = player.player_name || player.profile_display_name || `Player ${player.user_id.slice(0, 8)}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("campaign_players")
        .update({
          player_name: playerName.trim() || null,
          faction: faction.trim() || null,
          sub_faction: subFaction.trim() || null,
          current_points: currentPoints ? parseInt(currentPoints, 10) : null,
          warband_link: warbandLink.trim() || null,
          additional_info: additionalInfo.trim() || null,
        })
        .eq("id", player.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["all-player-settings", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-players", campaignId] });
      toast.success(`Saved settings for ${displayName}`);
    } catch (err) {
      toast.error("Failed to save settings");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 p-3 rounded border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-mono text-primary">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-foreground truncate">
                {displayName}
              </span>
              {isOwner && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                  <Crown className="w-2.5 h-2.5" />
                  GM
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
              {player.faction && (
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3" />
                  {player.faction}
                </span>
              )}
              {player.current_points != null && (
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {player.current_points}
                </span>
              )}
            </div>
          </div>

          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 border border-primary/20 rounded bg-card/50 space-y-4">
          {/* Player Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <User className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Player Info</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TerminalInput
                label="Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name..."
              />
              <TerminalInput
                label="Current Points"
                value={currentPoints}
                onChange={(e) => setCurrentPoints(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Faction Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <Swords className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Faction</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TerminalInput
                label="Faction"
                value={faction}
                onChange={(e) => setFaction(e.target.value)}
                placeholder="e.g., Space Marines"
              />
              <TerminalInput
                label="Sub-Faction"
                value={subFaction}
                onChange={(e) => setSubFaction(e.target.value)}
                placeholder="e.g., Ultramarines"
              />
            </div>
          </div>

          {/* Warband Link Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <Link2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Warband Link</span>
            </div>
            <div className="flex gap-2">
              <TerminalInput
                value={warbandLink}
                onChange={(e) => setWarbandLink(e.target.value)}
                placeholder="https://newrecruit.eu/..."
                className="flex-1"
              />
              {warbandLink && (
                <a
                  href={warbandLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 text-xs text-primary hover:text-primary/80 border border-primary/30 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              )}
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary/80">
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Additional Info</span>
            </div>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Warband list or notes..."
              className="min-h-[100px] font-mono text-xs bg-input border-border"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2 border-t border-border">
            <TerminalButton
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save Changes
                </>
              )}
            </TerminalButton>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlayersManagerWidget({ campaignId }: PlayersManagerWidgetProps) {
  const { data: players, isLoading } = useAllPlayerSettings(campaignId);
  const { data: owner, isLoading: ownerLoading } = useCampaignOwner(campaignId);

  if (isLoading || ownerLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <TerminalLoader text="Loading players..." />
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Users className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm font-mono">No players in campaign</p>
        <p className="text-xs mt-1">Share your Campaign ID to invite players</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-2">
        <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-wider">
            Player Management
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Click on a player to expand and edit their campaign settings.
        </p>

        <div className="space-y-2">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isOwner={owner?.user_id === player.user_id}
              campaignId={campaignId}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
