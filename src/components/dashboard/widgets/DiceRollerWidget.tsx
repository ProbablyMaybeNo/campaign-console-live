import { useState } from "react";
import { Dices } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface DiceRollerWidgetProps {
  component: DashboardComponent;
}

interface DiceConfig {
  sides?: number;
  count?: number;
  lastRolls?: number[];
  lastTotal?: number;
}

export function DiceRollerWidget({ component }: DiceRollerWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [isRolling, setIsRolling] = useState(false);
  
  const config = (component.config as DiceConfig) || {};
  const sides = config.sides ?? 6;
  const count = config.count ?? 1;
  const lastRolls = config.lastRolls ?? [];
  const lastTotal = config.lastTotal ?? 0;

  const rollDice = () => {
    setIsRolling(true);
    
    // Animate for 500ms
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

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
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
            <p className="text-lg font-mono text-primary mt-2">
              Total: {lastTotal}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
