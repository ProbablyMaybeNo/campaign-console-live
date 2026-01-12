import { useMemo } from "react";
import { 
  RosterValidationResult, 
  RosterValidationMessage,
  getRosterCompositionSummary 
} from "@/lib/rosterValidation";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Info,
  Shield,
  Users,
  Crown,
  Sword,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RosterUnit } from "@/hooks/useWarband";
import { CampaignUnit } from "@/hooks/useCampaignUnits";

interface RosterValidationPanelProps {
  validation: RosterValidationResult;
  roster: RosterUnit[];
  units: CampaignUnit[];
  className?: string;
}

export function RosterValidationPanel({ 
  validation, 
  roster, 
  units,
  className 
}: RosterValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const composition = useMemo(() => 
    getRosterCompositionSummary(roster, units),
    [roster, units]
  );

  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;
  const totalIssues = validation.errors.length + validation.warnings.length;

  // Get status icon and color
  const getStatusIcon = () => {
    if (validation.errors.length > 0) {
      return <XCircle className="w-5 h-5 text-destructive" />;
    }
    if (validation.warnings.length > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle2 className="w-5 h-5 text-primary" />;
  };

  const getStatusText = () => {
    if (validation.errors.length > 0) {
      return "Invalid Roster";
    }
    if (validation.warnings.length > 0) {
      return "Legal with Warnings";
    }
    return "Battle Ready";
  };

  const getKeywordIcon = (keyword: string) => {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerKeyword.includes("leader") || lowerKeyword.includes("hero") || lowerKeyword.includes("character")) {
      return <Crown className="w-3 h-3" />;
    }
    if (lowerKeyword.includes("elite")) {
      return <Shield className="w-3 h-3" />;
    }
    if (lowerKeyword.includes("cavalry")) {
      return <Sword className="w-3 h-3" />;
    }
    return <Users className="w-3 h-3" />;
  };

  return (
    <div className={cn(
      "bg-card border rounded overflow-hidden transition-all",
      validation.errors.length > 0 && "border-destructive/50",
      validation.errors.length === 0 && validation.warnings.length > 0 && "border-yellow-500/50",
      validation.isLegal && validation.warnings.length === 0 && "border-primary/30",
      className
    )}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "hover:bg-primary/5 transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <p className={cn(
              "font-mono text-sm font-medium",
              validation.errors.length > 0 && "text-destructive",
              validation.errors.length === 0 && validation.warnings.length > 0 && "text-yellow-500",
              validation.isLegal && validation.warnings.length === 0 && "text-primary"
            )}>
              {getStatusText()}
            </p>
            {hasIssues && (
              <p className="text-xs text-muted-foreground">
                {validation.errors.length > 0 && `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`}
                {validation.errors.length > 0 && validation.warnings.length > 0 && ", "}
                {validation.warnings.length > 0 && `${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Composition badges (collapsed view) */}
          {!isExpanded && composition.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {composition.slice(0, 3).map((item) => (
                <span 
                  key={item.keyword}
                  className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono"
                >
                  {getKeywordIcon(item.keyword)}
                  {item.count}
                </span>
              ))}
              {composition.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{composition.length - 3}
                </span>
              )}
            </div>
          )}

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-4">
          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-destructive font-mono flex items-center gap-2">
                <XCircle className="w-3 h-3" />
                Errors
              </h4>
              <div className="space-y-1">
                {validation.errors.map((error, i) => (
                  <ValidationMessage key={i} message={error} type="error" />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-yellow-500 font-mono flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Warnings
              </h4>
              <div className="space-y-1">
                {validation.warnings.map((warning, i) => (
                  <ValidationMessage key={i} message={warning} type="warning" />
                ))}
              </div>
            </div>
          )}

          {/* Composition Summary */}
          {composition.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-2">
                <Users className="w-3 h-3" />
                Composition
              </h4>
              <div className="flex flex-wrap gap-2">
                {composition.map((item) => (
                  <div 
                    key={item.keyword}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded border",
                      "bg-background/50 border-primary/20"
                    )}
                  >
                    <span className="text-primary">
                      {getKeywordIcon(item.keyword)}
                    </span>
                    <span className="font-mono text-sm text-foreground">
                      {item.count}× {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All good message */}
          {!hasIssues && roster.length > 0 && (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-mono">Roster is battle ready!</span>
            </div>
          )}

          {/* Empty roster message */}
          {roster.length === 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <span className="text-sm font-mono">Add units to begin validation</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ValidationMessageProps {
  message: RosterValidationMessage;
  type: "error" | "warning";
}

function ValidationMessage({ message, type }: ValidationMessageProps) {
  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2 rounded text-sm",
      type === "error" && "bg-destructive/10 text-destructive",
      type === "warning" && "bg-yellow-500/10 text-yellow-600"
    )}>
      <span className="font-medium">{message.message}</span>
      {message.details && (
        <span className="text-xs opacity-75">({message.details})</span>
      )}
    </div>
  );
}
