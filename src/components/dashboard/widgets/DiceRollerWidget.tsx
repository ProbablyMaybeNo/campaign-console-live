import { useState, useEffect } from "react";
import { Dices, Settings, Check, X } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRecordRoll } from "@/hooks/useRollHistory";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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

export function DiceRollerWidget({ component, campaignId, isGM }: DiceRollerWidgetProps) {
  const updateComponent = useUpdateComponent();
  const { recordRoll } = useRecordRoll(campaignId);
  const [isRolling, setIsRolling] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSides, setTempSides] = useState(6);
  const [tempCount, setTempCount] = useState(1);
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

  const openSettings = () => {
    setTempSides(sides);
    setTempCount(count);
    setShowSettings(true);
  };

  const saveSettings = () => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, sides: tempSides, count: tempCount, lastRolls: [], lastTotal: 0 },
    });
    setShowSettings(false);
  };

  if (showSettings && isGM) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Configure Dice</p>
        
        <div className="space-y-3 w-full max-w-[150px]">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Number of Dice</label>
            <input
              type="number"
              min={1}
              max={20}
              value={tempCount}
              onChange={(e) => setTempCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-full bg-input border border-border rounded px-2 py-1 text-xs text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Sides per Die</label>
            <select
              value={tempSides}
              onChange={(e) => setTempSides(parseInt(e.target.value))}
              className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
            >
              <option value={4}>d4</option>
              <option value={6}>d6</option>
              <option value={8}>d8</option>
              <option value={10}>d10</option>
              <option value={12}>d12</option>
              <option value={20}>d20</option>
              <option value={100}>d100</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveSettings}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Dice Roller Section */}
      <div className="flex flex-col items-center gap-3 py-3 relative">
        {isGM && (
          <button
            onClick={openSettings}
            className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-primary"
            title="Configure dice"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}

        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {count}d{sides}
        </p>

        <button
          onClick={rollDice}
          disabled={isRolling}
          className={`w-16 h-16 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-transform ${
            isRolling ? "animate-bounce" : ""
          }`}
          style={{
            boxShadow: "0 0 15px hsl(142, 76%, 55%, 0.3)",
          }}
        >
          <Dices 
            className={`w-8 h-8 text-primary ${isRolling ? "animate-spin" : ""}`}
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