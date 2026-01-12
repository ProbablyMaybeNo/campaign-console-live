import { useState } from "react";
import { Minus, Plus, Settings, Check, X } from "lucide-react";
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
  const [showSettings, setShowSettings] = useState(false);
  const [tempLabel, setTempLabel] = useState("");
  const [tempMin, setTempMin] = useState(0);
  const [tempMax, setTempMax] = useState(999);
  const [tempStep, setTempStep] = useState(1);

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

  const openSettings = () => {
    setTempLabel(label);
    setTempMin(min);
    setTempMax(max);
    setTempStep(step);
    setShowSettings(true);
  };

  const saveSettings = () => {
    const newValue = Math.max(tempMin, Math.min(tempMax, value));
    updateComponent.mutate({
      id: component.id,
      config: {
        ...config,
        label: tempLabel,
        min: tempMin,
        max: tempMax,
        step: tempStep,
        value: newValue,
      },
    });
    setShowSettings(false);
  };

  if (showSettings && isGM) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Configure Counter</p>

        <div className="space-y-2 w-full max-w-[180px]">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Label</label>
            <input
              type="text"
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
              placeholder="Counter label..."
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Min</label>
              <input
                type="number"
                value={tempMin}
                onChange={(e) => setTempMin(parseInt(e.target.value) || 0)}
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Max</label>
              <input
                type="number"
                value={tempMax}
                onChange={(e) => setTempMax(parseInt(e.target.value) || 999)}
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Step</label>
            <input
              type="number"
              min={1}
              value={tempStep}
              onChange={(e) => setTempStep(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
            />
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
          title="Configure counter"
        >
          <Settings className="w-3 h-3" />
        </button>
      )}

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
