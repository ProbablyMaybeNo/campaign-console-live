import { useState, useEffect } from "react";
import { Dices, History, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRecordRoll } from "@/hooks/useRollHistory";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main Dice Roller Section */}
      <div className="flex flex-col items-center gap-2 py-2 px-2 shrink-0">
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
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Slide-out Roll History Panel - slides down below the roller */}
      <div 
        className={`border-t transition-all duration-300 overflow-hidden ${showHistory ? 'flex-1 min-h-0' : 'h-0'}`}
        style={{ borderColor: "hsl(142, 76%, 35%)" }}
      >
        {showHistory && (
          <div className="flex flex-col h-full">
            {/* Header with clear all */}
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

            {/* Roll History Table */}
            <ScrollArea className="flex-1" data-scrollable="true">
              {rollHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <Dices className="w-6 h-6 mb-1 opacity-50" />
                  <p className="text-[10px] font-mono">No rolls yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-primary/30 hover:bg-transparent">
                      <TableHead className="h-6 px-2 text-[9px] font-mono uppercase text-muted-foreground">Player</TableHead>
                      <TableHead className="h-6 px-2 text-[9px] font-mono uppercase text-muted-foreground">Dice</TableHead>
                      <TableHead className="h-6 px-2 text-[9px] font-mono uppercase text-muted-foreground text-right">Roll</TableHead>
                      {isGM && <TableHead className="h-6 w-6 px-1"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rollHistory.map((roll) => (
                      <TableRow 
                        key={roll.id} 
                        className="group border-b-primary/10 hover:bg-primary/5"
                      >
                        <TableCell 
                          className="py-1 px-2 text-[10px] font-medium truncate max-w-[80px]"
                          style={{
                            color: "hsl(195, 100%, 65%)",
                            textShadow: "0 0 4px hsl(195, 100%, 50%, 0.4)",
                          }}
                          title={roll.player_name}
                        >
                          {roll.player_name}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-[10px] text-muted-foreground font-mono">
                          {roll.dice_config}
                        </TableCell>
                        <TableCell 
                          className="py-1 px-2 text-[10px] font-mono font-bold text-right"
                          style={{ 
                            color: "hsl(45, 100%, 60%)",
                            textShadow: "0 0 4px hsl(45, 100%, 50%, 0.4)",
                          }}
                        >
                          {roll.total}
                        </TableCell>
                        {isGM && (
                          <TableCell className="py-1 px-1 w-6">
                            <button
                              onClick={() => handleDeleteRoll(roll.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
