import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Users, Shield, Loader2 } from "lucide-react";
import { OverlayLoading, OverlayEmpty } from "@/components/ui/OverlayPanel";
import { Badge } from "@/components/ui/badge";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { useAuth } from "@/hooks/useAuth";

interface Warband {
  id: string;
  name: string;
  faction: string | null;
  sub_faction: string | null;
  points_total: number | null;
  roster: unknown[] | null;
  owner_id: string;
  created_at: string;
}

interface WarbandWithOwner extends Warband {
  owner_name?: string;
}

interface WarbandsWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export function WarbandsWidget({ campaignId, isGM }: WarbandsWidgetProps) {
  const { user } = useAuth();

  const { data: warbands, isLoading, error } = useQuery({
    queryKey: ["warbands", campaignId],
    queryFn: async (): Promise<WarbandWithOwner[]> => {
      // Fetch warbands for this campaign
      const { data: warbandsData, error: warbandsError } = await supabase
        .from("warbands")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (warbandsError) throw warbandsError;
      
      if (!warbandsData || warbandsData.length === 0) return [];

      // Fetch owner profiles
      const ownerIds = [...new Set(warbandsData.map(w => w.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      return warbandsData.map(w => ({
        ...w,
        roster: Array.isArray(w.roster) ? w.roster : [],
        owner_name: profileMap.get(w.owner_id) || "Unknown Player",
      }));
    },
    enabled: !!campaignId,
  });

  if (isLoading) {
    return <OverlayLoading text="Loading warbands" />;
  }

  if (error) {
    return (
      <OverlayEmpty
        icon={<Swords className="w-8 h-8" />}
        title="Error Loading Warbands"
        description={(error as Error).message}
      />
    );
  }

  if (!warbands || warbands.length === 0) {
    return (
      <OverlayEmpty
        icon={<Swords className="w-8 h-8" />}
        title="No Warbands Yet"
        description="Players can create warbands using the Warband Builder."
      />
    );
  }

  // For non-GMs, only show their own warband
  const visibleWarbands = isGM 
    ? warbands 
    : warbands.filter(w => w.owner_id === user?.id);

  if (visibleWarbands.length === 0) {
    return (
      <OverlayEmpty
        icon={<Swords className="w-8 h-8" />}
        title="No Warband Created"
        description="Use the Warband Builder to create your warband."
      />
    );
  }

  return (
    <div className="space-y-4">
      {isGM && (
        <div className="text-xs text-muted-foreground">
          Showing all {warbands.length} warbands in this campaign.
        </div>
      )}

      <div className="grid gap-3">
        {visibleWarbands.map((warband) => (
          <WarbandCard 
            key={warband.id} 
            warband={warband} 
            isOwner={warband.owner_id === user?.id}
          />
        ))}
      </div>
    </div>
  );
}

function WarbandCard({ warband, isOwner }: { warband: WarbandWithOwner; isOwner: boolean }) {
  const unitCount = Array.isArray(warband.roster) ? warband.roster.length : 0;

  return (
    <TerminalCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Warband name */}
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium truncate">{warband.name}</span>
            {isOwner && (
              <Badge variant="outline" className="text-xs shrink-0">You</Badge>
            )}
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{warband.owner_name}</span>
          </div>

          {/* Faction info */}
          {warband.faction && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>
                {warband.faction}
                {warband.sub_faction && ` • ${warband.sub_faction}`}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-primary">
            {warband.points_total || 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {unitCount} {unitCount === 1 ? "unit" : "units"}
          </div>
        </div>
      </div>
    </TerminalCard>
  );
}
