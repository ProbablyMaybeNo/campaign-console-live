import { Minus, Plus } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface CounterWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface CounterConfig {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function CounterWidget({ component, isGM }: CounterWidgetProps) {
  const updateComponent = useUpdateComponent();
  const config = (component.config as CounterConfig) || {};
  const value = config.value ?? 0;
  const min = config.min ?? 0;
  const max = config.max ?? 999;
  const step = config.step ?? 1;
  const label = config.label ?? "Counter";

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    updateComponent.mutate({
      id: component.id,
      config: { ...config, value: newValue },
    });
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    updateComponent.mutate({
      id: component.id,
      config: { ...config, value: newValue },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      
      <div className="flex items-center gap-4">
        {isGM && (
          <button
            onClick={handleDecrement}
            disabled={value <= min}
            className="w-10 h-10 rounded border border-border bg-muted/30 hover:bg-accent flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>
        )}

        <div className="text-center">
          <p className="text-4xl font-mono text-primary font-bold">{value}</p>
          {max !== 999 && (
            <p className="text-xs text-muted-foreground mt-1">/ {max}</p>
          )}
        </div>

        {isGM && (
          <button
            onClick={handleIncrement}
            disabled={value >= max}
            className="w-10 h-10 rounded border border-border bg-muted/30 hover:bg-accent flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
