import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";

export function useRecordRoll(campaignId: string) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setDisplayName(data.display_name);
      });
  }, [user]);

  const recordRoll = async (diceConfig: string, rolls: number[], total: number) => {
    if (!user) return;

    const playerName = displayName || user.email?.split("@")[0] || "Unknown";

    await supabase.from("dice_roll_history").insert({
      campaign_id: campaignId,
      player_id: user.id,
      player_name: playerName,
      dice_config: diceConfig,
      rolls,
      total,
    });
  };

  return { recordRoll };
}
