import { memo, useEffect, useState } from "react";
import { History, Trash2, Dices } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardComponent } from "@/hooks/useDashboardComponents";

interface RollRecorderWidgetProps {
  component: DashboardComponent;
  campaignId: string;
  isGM: boolean;
}

interface DiceRoll {
  id: string;
  player_id: string;
  player_name: string;
  dice_config: string;
  rolls: number[];
  total: number;
  rolled_at: string;
}

export const RollRecorderWidget = memo(function RollRecorderWidget({
  campaignId,
  isGM,
}: RollRecorderWidgetProps) {
  const { user } = useAuth();
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial roll history
  useEffect(() => {
    const fetchRolls = async () => {
      const { data, error } = await supabase
        .from("dice_roll_history")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("rolled_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setRolls(data as DiceRoll[]);
      }
      setIsLoading(false);
    };

    fetchRolls();
  }, [campaignId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`roll-history-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dice_roll_history",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newRoll = payload.new as DiceRoll;
          setRolls((prev) => [newRoll, ...prev].slice(0, 50));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "dice_roll_history",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setRolls((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const handleClearAll = async () => {
    if (!isGM) return;
    
    const { error } = await supabase
      .from("dice_roll_history")
      .delete()
      .eq("campaign_id", campaignId);

    if (!error) {
      setRolls([]);
    }
  };

  const handleDeleteRoll = async (rollId: string) => {
    if (!isGM) return;
    
    await supabase
      .from("dice_roll_history")
      .delete()
      .eq("id", rollId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground text-sm font-mono">Loading rolls...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "hsl(142, 76%, 35%)" }}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(142, 76%, 55%))" }} />
          <span className="text-xs font-mono uppercase tracking-wider text-primary text-glow-primary">
            Roll History
          </span>
        </div>
        {isGM && rolls.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            title="Clear all rolls"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Roll List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {rolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Dices className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-mono">No rolls recorded yet</p>
              <p className="text-[10px] opacity-70">Use a Dice Roller widget to start</p>
            </div>
          ) : (
            rolls.map((roll) => (
              <RollEntry
                key={roll.id}
                roll={roll}
                isGM={isGM}
                isCurrentUser={roll.player_id === user?.id}
                onDelete={() => handleDeleteRoll(roll.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

interface RollEntryProps {
  roll: DiceRoll;
  isGM: boolean;
  isCurrentUser: boolean;
  onDelete: () => void;
}

function RollEntry({ roll, isGM, isCurrentUser, onDelete }: RollEntryProps) {
  const formattedDate = format(new Date(roll.rolled_at), "MMM d, HH:mm");
  
  return (
    <div
      className="group relative px-2 py-1.5 rounded border transition-all hover:bg-primary/5"
      style={{
        borderColor: isCurrentUser ? "hsl(195, 100%, 50%, 0.3)" : "hsl(142, 76%, 35%, 0.3)",
        backgroundColor: isCurrentUser ? "hsla(195, 100%, 50%, 0.05)" : "transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Player name and dice config */}
          <div className="flex items-center gap-2 mb-0.5">
            <span 
              className="text-xs font-medium truncate"
              style={{
                color: isCurrentUser ? "hsl(195, 100%, 65%)" : "hsl(142, 76%, 60%)",
                textShadow: `0 0 6px ${isCurrentUser ? "hsl(195, 100%, 50%, 0.4)" : "hsl(142, 76%, 50%, 0.4)"}`,
              }}
            >
              {roll.player_name}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {roll.dice_config}
            </span>
          </div>
          
          {/* Rolls and total */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {roll.rolls.map((r, i) => (
                <span
                  key={i}
                  className="w-5 h-5 rounded text-[10px] font-mono flex items-center justify-center"
                  style={{
                    backgroundColor: "hsl(142, 76%, 55%, 0.15)",
                    border: "1px solid hsl(142, 76%, 55%, 0.3)",
                    color: "hsl(142, 76%, 65%)",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
            {roll.rolls.length > 1 && (
              <span 
                className="text-xs font-mono font-bold"
                style={{ 
                  color: "hsl(45, 100%, 60%)",
                  textShadow: "0 0 6px hsl(45, 100%, 50%, 0.4)",
                }}
              >
                = {roll.total}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp and delete */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-muted-foreground font-mono">
            {formattedDate}
          </span>
          {isGM && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
