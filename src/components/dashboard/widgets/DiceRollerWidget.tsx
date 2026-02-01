import { useState, useEffect } from "react";
import { Dices } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRecordRoll } from "@/hooks/useRollHistory";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function DiceRollerWidget({ component, campaignId }: DiceRollerWidgetProps) {
  const updateComponent = useUpdateComponent();
  const { recordRoll } = useRecordRoll(campaignId);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);

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
        .limit(10);

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
          setRollHistory((prev) => [newRoll, ...prev].slice(0, 10));
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

  return (
    <div className="flex flex-col h-full">
      {/* Dice Roller Section */}
      <div className="flex flex-col items-center gap-2 py-2 px-2">
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
      </div>

      {/* Divider */}
      <div 
        className="h-px mx-2"
        style={{ backgroundColor: "hsl(142, 76%, 35%)" }}
      />

      {/* Roll History Log */}
      <ScrollArea className="flex-1 min-h-0" data-scrollable="true">
        <div className="p-2 space-y-1">
          {rollHistory.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">No rolls yet</p>
          ) : (
            rollHistory.map((roll) => (
              <div
                key={roll.id}
                className="flex items-center justify-between text-[11px] font-mono px-1 py-0.5 rounded hover:bg-primary/5"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span 
                    className="font-medium truncate"
                    style={{ color: "hsl(195, 100%, 65%)" }}
                  >
                    {roll.player_name}
                  </span>
                  <span className="text-muted-foreground">
                    ({roll.dice_config})
                  </span>
                </div>
                <span 
                  className="font-bold ml-2 shrink-0"
                  style={{ 
                    color: "hsl(45, 100%, 60%)",
                    textShadow: "0 0 6px hsl(45, 100%, 50%, 0.4)",
                  }}
                >
                  {roll.total}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
