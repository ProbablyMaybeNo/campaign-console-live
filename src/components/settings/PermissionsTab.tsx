import { useState } from "react";
import { useCampaignPlayers, useCampaignOwner } from "@/hooks/useCampaignPlayers";
import { useUpdatePlayerRole, ASSIGNABLE_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, CampaignRole } from "@/hooks/usePlayerRole";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Crown, Shield, ShieldCheck, User, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionsTabProps {
  campaignId: string;
}

const ROLE_ICONS: Record<CampaignRole, React.ElementType> = {
  owner: Crown,
  gm: Crown,
  co_gm: ShieldCheck,
  assistant: Shield,
  player: User,
};

export function PermissionsTab({ campaignId }: PermissionsTabProps) {
  const { user } = useAuth();
  const { data: players, isLoading: playersLoading } = useCampaignPlayers(campaignId);
  const { data: owner, isLoading: ownerLoading } = useCampaignOwner(campaignId);
  const updateRole = useUpdatePlayerRole();

  if (playersLoading || ownerLoading) {
    return (
      <div className="flex justify-center py-8">
        <TerminalLoader text="Loading players" />
      </div>
    );
  }

  // Combine owner and players, deduplicating if owner is also in players list
  const allMembers = [
    ...(owner ? [{ ...owner, isOwner: true }] : []),
    ...(players || []).filter(p => p.user_id !== owner?.user_id).map(p => ({ ...p, isOwner: false })),
  ];

  const handleRoleChange = (playerId: string, newRole: string) => {
    updateRole.mutate({
      playerId,
      campaignId,
      newRole: newRole as CampaignRole,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with explanation */}
      <div className="p-3 bg-muted/30 border border-border/50 rounded">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Co-GM:</strong> Full control – can create, edit, and delete widgets; manage players</p>
            <p><strong className="text-foreground">Assistant:</strong> Limited – can edit existing widgets but not create or delete; cannot remove players</p>
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {allMembers.map((member) => {
          const displayName = member.profile?.display_name || "Unknown";
          const initials = displayName.slice(0, 2).toUpperCase();
          const currentRole: CampaignRole = member.isOwner ? "owner" : (member.role as CampaignRole) || "player";
          const RoleIcon = ROLE_ICONS[currentRole];
          const isCurrentUser = member.user_id === user?.id;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 bg-card/50 border border-border/30 rounded"
            >
              {/* Avatar */}
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
              </Avatar>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {displayName}
                  {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                </p>
              </div>

              {/* Role selector or badge */}
              {member.isOwner ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-xs font-medium text-primary">
                        <Crown className="w-3 h-3" />
                        Owner
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{ROLE_DESCRIPTIONS.owner}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Select
                  value={currentRole}
                  onValueChange={(value) => handleRoleChange(member.id, value)}
                  disabled={updateRole.isPending}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-input border-border">
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className="w-3 h-3" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((role) => {
                      const Icon = ROLE_ICONS[role];
                      return (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3 h-3" />
                            <span>{ROLE_LABELS[role]}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>

      {allMembers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No players have joined this campaign yet.
        </div>
      )}
    </div>
  );
}
