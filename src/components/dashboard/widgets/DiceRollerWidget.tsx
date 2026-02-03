import { useState, useEffect } from "react";
import { Dices, History, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRecordRoll } from "@/hooks/useRollHistory";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiceRollerWidgetProps {
  component: DashboardComponent;
  campaignId: string;
  isGM: boolean;
}

interface DiceConfig {
  sides?: number;
  count?: number;
  lastRolls?: number[];
  lastTotal?: number;
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

const DICE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DICE_TYPES = [
  { value: 4, label: "d4" },
  { value: 6, label: "d6" },
  { value: 8, label: "d8" },
  { value: 10, label: "d10" },
  { value: 12, label: "d12" },
  { value: 20, label: "d20" },
  { value: 100, label: "d100" },
];

export function DiceRollerWidget({ component, campaignId, isGM }: DiceRollerWidgetProps) {
  const updateComponent = useUpdateComponent();
  const { recordRoll } = useRecordRoll(campaignId);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const config = (component.config as DiceConfig) || {};
  const sides = config.sides ?? 6;
  const count = config.count ?? 1;

  // Fetch roll history
  useEffect(() => {
    const fetchRolls = async () => {
      const { data } = await supabase
        .from("dice_roll_history")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("rolled_at", { ascending: false })
        .limit(50);

      if (data) {
        setRollHistory(data as DiceRoll[]);
      }
    };

    fetchRolls();
  }, [campaignId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`dice-rolls-${campaignId}`)
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
          setRollHistory((prev) => [newRoll, ...prev].slice(0, 50));
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
          setRollHistory((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const handleCountChange = (value: string) => {
    const newCount = parseInt(value);
    updateComponent.mutate({
      id: component.id,
      config: { ...config, count: newCount },
    });
  };

  const handleSidesChange = (value: string) => {
    const newSides = parseInt(value);
    updateComponent.mutate({
      id: component.id,
      config: { ...config, sides: newSides },
    });
  };

  const rollDice = async () => {
    setIsRolling(true);

    setTimeout(async () => {
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const total = rolls.reduce((a, b) => a + b, 0);

      // Update widget state
      updateComponent.mutate({
        id: component.id,
        config: { ...config, lastRolls: rolls, lastTotal: total },
      });

      // Record roll to history
      await recordRoll(`${count}d${sides}`, rolls, total);

      setIsRolling(false);
    }, 500);
  };

  const handleClearAll = async () => {
    if (!isGM) return;
    
    const { error } = await supabase
      .from("dice_roll_history")
      .delete()
      .eq("campaign_id", campaignId);

    if (!error) {
      setRollHistory([]);
    }
  };

  const handleDeleteRoll = async (rollId: string) => {
    if (!isGM) return;
    
    await supabase
      .from("dice_roll_history")
      .delete()
      .eq("id", rollId);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Dice Roller Section */}
      <div className={`flex flex-col items-center gap-2 py-2 px-2 transition-all duration-300 ${showHistory ? 'w-1/2' : 'flex-1'}`}>
        {/* Inline dropdowns for dice configuration */}
        <div className="flex items-center gap-2">
          <Select value={count.toString()} onValueChange={handleCountChange}>
            <SelectTrigger 
              className="w-14 h-7 text-xs bg-background border-primary/50"
              style={{ boxShadow: "0 0 6px hsl(142, 76%, 55%, 0.2)" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-primary/50 z-50">
              {DICE_COUNTS.map((n) => (
                <SelectItem key={n} value={n.toString()} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sides.toString()} onValueChange={handleSidesChange}>
            <SelectTrigger 
              className="w-16 h-7 text-xs bg-background border-primary/50"
              style={{ boxShadow: "0 0 6px hsl(142, 76%, 55%, 0.2)" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-primary/50 z-50">
              {DICE_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value.toString()} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={rollDice}
          disabled={isRolling}
          className={`w-14 h-14 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-transform ${
            isRolling ? "animate-bounce" : ""
          }`}
          style={{
            boxShadow: "0 0 15px hsl(142, 76%, 55%, 0.3)",
          }}
        >
          <Dices 
            className={`w-7 h-7 text-primary ${isRolling ? "animate-spin" : ""}`}
            style={{ filter: "drop-shadow(0 0 6px hsl(142, 76%, 55%))" }}
          />
        </button>

        {/* Toggle History Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <History className="w-3 h-3" />
          <span>History</span>
          {showHistory ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Recent rolls preview (when history is closed) */}
        {!showHistory && rollHistory.length > 0 && (
          <div className="w-full mt-1">
            <div 
              className="h-px w-full mb-1"
              style={{ backgroundColor: "hsl(142, 76%, 35%)" }}
            />
            <ScrollArea className="h-20" data-scrollable="true">
              <div className="space-y-0.5 px-1">
                {rollHistory.slice(0, 5).map((roll) => (
                  <div
                    key={roll.id}
                    className="flex items-center justify-between text-[10px] font-mono px-1 py-0.5 rounded hover:bg-primary/5"
                  >
                    <span 
                      className="truncate"
                      style={{ color: "hsl(195, 100%, 65%)" }}
                    >
                      {roll.player_name}
                    </span>
                    <span 
                      className="font-bold ml-1 shrink-0"
                      style={{ 
                        color: "hsl(45, 100%, 60%)",
                        textShadow: "0 0 6px hsl(45, 100%, 50%, 0.4)",
                      }}
                    >
                      {roll.total}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Slide-out Roll History Panel */}
      <div 
        className={`border-l transition-all duration-300 overflow-hidden ${showHistory ? 'w-1/2' : 'w-0'}`}
        style={{ borderColor: "hsl(142, 76%, 35%)" }}
      >
        {showHistory && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div 
              className="flex items-center justify-between px-2 py-1.5 border-b shrink-0"
              style={{ borderColor: "hsl(142, 76%, 35%)" }}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary text-glow-primary">
                Roll Log
              </span>
              {isGM && rollHistory.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Roll List */}
            <ScrollArea className="flex-1" data-scrollable="true">
              <div className="p-1.5 space-y-1">
                {rollHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                    <Dices className="w-6 h-6 mb-1 opacity-50" />
                    <p className="text-[10px] font-mono">No rolls yet</p>
                  </div>
                ) : (
                  rollHistory.map((roll) => (
                    <div
                      key={roll.id}
                      className="group relative px-1.5 py-1 rounded border transition-all hover:bg-primary/5"
                      style={{
                        borderColor: "hsl(142, 76%, 35%, 0.3)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          {/* Player name and dice config */}
                          <div className="flex items-center gap-1 mb-0.5">
                            <span 
                              className="text-[10px] font-medium truncate"
                              style={{
                                color: "hsl(195, 100%, 65%)",
                                textShadow: "0 0 4px hsl(195, 100%, 50%, 0.4)",
                              }}
                            >
                              {roll.player_name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {roll.dice_config}
                            </span>
                          </div>
                          
                          {/* Rolls and total */}
                          <div className="flex items-center gap-1">
                            <div className="flex gap-0.5 flex-wrap">
                              {roll.rolls.slice(0, 5).map((r, i) => (
                                <span
                                  key={i}
                                  className="w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center"
                                  style={{
                                    backgroundColor: "hsl(142, 76%, 55%, 0.15)",
                                    border: "1px solid hsl(142, 76%, 55%, 0.3)",
                                    color: "hsl(142, 76%, 65%)",
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                              {roll.rolls.length > 5 && (
                                <span className="text-[9px] text-muted-foreground">+{roll.rolls.length - 5}</span>
                              )}
                            </div>
                            {roll.rolls.length > 1 && (
                              <span 
                                className="text-[10px] font-mono font-bold"
                                style={{ 
                                  color: "hsl(45, 100%, 60%)",
                                  textShadow: "0 0 4px hsl(45, 100%, 50%, 0.4)",
                                }}
                              >
                                = {roll.total}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Timestamp and delete */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-[8px] text-muted-foreground font-mono">
                            {format(new Date(roll.rolled_at), "HH:mm")}
                          </span>
                          {isGM && (
                            <button
                              onClick={() => handleDeleteRoll(roll.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
