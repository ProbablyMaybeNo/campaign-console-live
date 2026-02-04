import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCampaign } from "./useCampaigns";
import { toast } from "sonner";

// Role hierarchy from most to least permissions
export type CampaignRole = "owner" | "gm" | "co_gm" | "assistant" | "player";

export interface RolePermissions {
  // Full control
  canDeleteCampaign: boolean;
  canCreateComponents: boolean;
  canDeleteComponents: boolean;
  canRemovePlayers: boolean;
  canManageRoles: boolean;
  // Limited control
  canEditComponents: boolean;
  canViewGMContent: boolean;
  canEditPlayerSettings: boolean;
  canPostMessages: boolean;
  canEditSchedule: boolean;
  canEditNarrative: boolean;
  canManageMap: boolean;
  canManageBattles: boolean;
}

const ROLE_PERMISSIONS: Record<CampaignRole, RolePermissions> = {
  owner: {
    canDeleteCampaign: true,
    canCreateComponents: true,
    canDeleteComponents: true,
    canRemovePlayers: true,
    canManageRoles: true,
    canEditComponents: true,
    canViewGMContent: true,
    canEditPlayerSettings: true,
    canPostMessages: true,
    canEditSchedule: true,
    canEditNarrative: true,
    canManageMap: true,
    canManageBattles: true,
  },
  gm: {
    canDeleteCampaign: false,
    canCreateComponents: true,
    canDeleteComponents: true,
    canRemovePlayers: true,
    canManageRoles: false,
    canEditComponents: true,
    canViewGMContent: true,
    canEditPlayerSettings: true,
    canPostMessages: true,
    canEditSchedule: true,
    canEditNarrative: true,
    canManageMap: true,
    canManageBattles: true,
  },
  co_gm: {
    canDeleteCampaign: false,
    canCreateComponents: true,
    canDeleteComponents: true,
    canRemovePlayers: true,
    canManageRoles: false,
    canEditComponents: true,
    canViewGMContent: true,
    canEditPlayerSettings: true,
    canPostMessages: true,
    canEditSchedule: true,
    canEditNarrative: true,
    canManageMap: true,
    canManageBattles: true,
  },
  assistant: {
    canDeleteCampaign: false,
    canCreateComponents: false,
    canDeleteComponents: false,
    canRemovePlayers: false,
    canManageRoles: false,
    canEditComponents: true,
    canViewGMContent: true,
    canEditPlayerSettings: true,
    canPostMessages: true,
    canEditSchedule: true,
    canEditNarrative: true,
    canManageMap: true,
    canManageBattles: false,
  },
  player: {
    canDeleteCampaign: false,
    canCreateComponents: false,
    canDeleteComponents: false,
    canRemovePlayers: false,
    canManageRoles: false,
    canEditComponents: false,
    canViewGMContent: false,
    canEditPlayerSettings: false,
    canPostMessages: true,
    canEditSchedule: false,
    canEditNarrative: false,
    canManageMap: false,
    canManageBattles: false,
  },
};

export const ROLE_LABELS: Record<CampaignRole, string> = {
  owner: "Owner",
  gm: "Games Master",
  co_gm: "Co-GM",
  assistant: "Assistant",
  player: "Player",
};

export const ROLE_DESCRIPTIONS: Record<CampaignRole, string> = {
  owner: "Full control over the campaign including deletion",
  gm: "Full GM access, same as owner except can't delete campaign",
  co_gm: "Full GM access: create, edit, delete widgets and manage players",
  assistant: "Can edit existing widgets and content but not create or delete",
  player: "View-only access with personal settings",
};

// Roles that can be assigned by the owner (excludes 'owner' itself)
export const ASSIGNABLE_ROLES: CampaignRole[] = ["co_gm", "assistant", "player"];

export function usePlayerRole(campaignId: string | undefined) {
  const { user } = useAuth();
  const { data: campaign } = useCampaign(campaignId);

  const { data: playerRecord } = useQuery({
    queryKey: ["campaign-player-role", campaignId, user?.id],
    queryFn: async () => {
      if (!campaignId || !user) return null;
      const { data, error } = await supabase
        .from("campaign_players")
        .select("role")
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking player role:", error);
        return null;
      }
      return data;
    },
    enabled: !!campaignId && !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Determine effective role
  let role: CampaignRole = "player";
  
  if (user && campaign) {
    if (campaign.owner_id === user.id) {
      role = "owner";
    } else if (playerRecord?.role) {
      // Map database role to CampaignRole
      const dbRole = playerRecord.role as string;
      if (dbRole === "gm" || dbRole === "co_gm" || dbRole === "assistant" || dbRole === "player") {
        role = dbRole as CampaignRole;
      }
    }
  }

  const permissions = ROLE_PERMISSIONS[role];

  // Helper: Is user any kind of GM (has elevated permissions)?
  const isGM = role === "owner" || role === "gm" || role === "co_gm" || role === "assistant";
  
  // Helper: Has full GM control (can create/delete)?
  const hasFullControl = role === "owner" || role === "gm" || role === "co_gm";

  // Helper: Is campaign owner?
  const isOwner = role === "owner";

  return {
    role,
    permissions,
    isGM,
    hasFullControl,
    isOwner,
    isLoading: !campaign,
  };
}

// Hook for updating a player's role (owner only)
export function useUpdatePlayerRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      playerId, 
      campaignId, 
      newRole 
    }: { 
      playerId: string; 
      campaignId: string; 
      newRole: CampaignRole;
    }) => {
      if (newRole === "owner") {
        throw new Error("Cannot assign owner role");
      }

      const { error } = await supabase
        .from("campaign_players")
        .update({ role: newRole })
        .eq("id", playerId)
        .eq("campaign_id", campaignId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-players", variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-player-role", variables.campaignId] });
      toast.success("Player role updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}
