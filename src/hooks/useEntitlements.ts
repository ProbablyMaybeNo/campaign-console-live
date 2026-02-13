import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Entitlements {
  plan: 'free' | 'supporter';
  max_active_campaigns: number;
  smart_paste_enabled: boolean;
  themes_enabled: boolean;
  banner_enabled: boolean;
  text_widget_enabled: boolean;
  stickers_enabled: boolean;
  active_campaign_count: number;
}

const DEFAULT_ENTITLEMENTS: Entitlements = {
  plan: 'free',
  max_active_campaigns: 1,
  smart_paste_enabled: false,
  themes_enabled: false,
  banner_enabled: false,
  text_widget_enabled: false,
  stickers_enabled: false,
  active_campaign_count: 0,
};

export function useEntitlements() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["entitlements", user?.id],
    queryFn: async (): Promise<Entitlements> => {
      if (!user) return DEFAULT_ENTITLEMENTS;

      const { data, error } = await supabase.rpc('get_user_entitlements', {
        _user_id: user.id,
      });

      if (error) {
        console.error("Failed to fetch entitlements:", error);
        return DEFAULT_ENTITLEMENTS;
      }

      // Type assertion since RPC returns Json
      const result = data as unknown as Entitlements | null;
      
      if (!result) return DEFAULT_ENTITLEMENTS;

      return {
        plan: result.plan || 'free',
        max_active_campaigns: result.max_active_campaigns || 1,
        smart_paste_enabled: result.smart_paste_enabled || false,
        themes_enabled: result.themes_enabled || false,
        banner_enabled: result.banner_enabled || false,
        text_widget_enabled: result.text_widget_enabled || false,
        stickers_enabled: result.stickers_enabled || false,
        active_campaign_count: result.active_campaign_count || 0,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    entitlements: query.data || DEFAULT_ENTITLEMENTS,
    isLoading: query.isLoading,
    isSupporter: query.data?.plan === 'supporter',
    canCreateCampaign: (query.data?.active_campaign_count || 0) < (query.data?.max_active_campaigns || 1),
    refetch: query.refetch,
  };
}

// Helper function to check if a feature is locked
export function isFeatureLocked(
  entitlements: Entitlements,
  feature: 'smart_paste' | 'themes' | 'banner' | 'text_widget' | 'stickers'
): boolean {
  switch (feature) {
    case 'smart_paste':
      return !entitlements.smart_paste_enabled;
    case 'themes':
      return !entitlements.themes_enabled;
    case 'banner':
      return !entitlements.banner_enabled;
    case 'text_widget':
      return !entitlements.text_widget_enabled;
    case 'stickers':
      return !entitlements.stickers_enabled;
    default:
      return true;
  }
}
