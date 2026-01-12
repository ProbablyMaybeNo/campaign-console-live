import { useState } from "react";
import { Dices, Settings, Check, X } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface DiceRollerWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface DiceConfig {
  sides?: number;
  count?: number;
  lastRolls?: number[];
  lastTotal?: number;
}

export function DiceRollerWidget({ component, isGM }: DiceRollerWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [isRolling, setIsRolling] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSides, setTempSides] = useState(6);
  const [tempCount, setTempCount] = useState(1);

  const config = (component.config as DiceConfig) || {};
  const sides = config.sides ?? 6;
  const count = config.count ?? 1;
  const lastRolls = config.lastRolls ?? [];
  const lastTotal = config.lastTotal ?? 0;

  const rollDice = () => {
    setIsRolling(true);

    setTimeout(() => {
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const total = rolls.reduce((a, b) => a + b, 0);

      updateComponent.mutate({
        id: component.id,
        config: { ...config, lastRolls: rolls, lastTotal: total },
      });
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
    <div className="flex flex-col items-center justify-center h-full gap-4 relative">
      {isGM && (
        <button
          onClick={openSettings}
          className="absolute top-0 right-0 p-1 text-muted-foreground hover:text-primary"
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
        className={`w-20 h-20 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-transform ${
          isRolling ? "animate-bounce" : ""
        }`}
      >
        <Dices className={`w-10 h-10 text-primary ${isRolling ? "animate-spin" : ""}`} />
      </button>

      {lastRolls.length > 0 && !isRolling && (
        <div className="text-center">
          <div className="flex gap-2 justify-center flex-wrap">
            {lastRolls.map((roll, i) => (
              <span
                key={i}
                className="w-8 h-8 rounded border border-primary/50 bg-primary/10 flex items-center justify-center text-sm font-mono"
              >
                {roll}
              </span>
            ))}
          </div>
          {count > 1 && (
            <p className="text-lg font-mono text-primary mt-2">Total: {lastTotal}</p>
          )}
        </div>
      )}
    </div>
  );
}
