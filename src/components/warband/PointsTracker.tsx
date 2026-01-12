import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

interface PointsTrackerProps {
  currentPoints: number;
  maxPoints: number;
  className?: string;
}

export function PointsTracker({ currentPoints, maxPoints, className }: PointsTrackerProps) {
  const percentage = maxPoints > 0 ? (currentPoints / maxPoints) * 100 : 0;
  const isOverLimit = currentPoints > maxPoints;
  const isAtLimit = currentPoints === maxPoints;
  const isNearLimit = percentage >= 90 && !isOverLimit && !isAtLimit;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Points
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOverLimit && (
            <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
          )}
          {isAtLimit && (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          )}
          <span className={cn(
            "font-mono font-bold text-lg",
            isOverLimit && "text-destructive",
            isAtLimit && "text-primary",
            isNearLimit && "text-yellow-500",
            !isOverLimit && !isAtLimit && !isNearLimit && "text-foreground"
          )}>
            {currentPoints}
          </span>
          <span className="text-muted-foreground font-mono">/</span>
          <span className="text-muted-foreground font-mono">{maxPoints}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-background border border-primary/20 rounded-sm overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300",
            isOverLimit && "bg-destructive",
            isAtLimit && "bg-primary",
            isNearLimit && "bg-yellow-500",
            !isOverLimit && !isAtLimit && !isNearLimit && "bg-primary/60"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Status message */}
      {isOverLimit && (
        <p className="text-xs text-destructive font-mono animate-pulse">
          [OVER LIMIT BY {currentPoints - maxPoints} POINTS]
        </p>
      )}
      {isAtLimit && (
        <p className="text-xs text-primary font-mono">
          [ROSTER COMPLETE]
        </p>
      )}
      {!isOverLimit && !isAtLimit && (
        <p className="text-xs text-muted-foreground font-mono">
          [{maxPoints - currentPoints} points remaining]
        </p>
      )}
    </div>
  );
}
