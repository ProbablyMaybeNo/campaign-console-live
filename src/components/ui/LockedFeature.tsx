import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TerminalButton } from "@/components/ui/TerminalButton";

interface LockedFeatureProps {
  children: React.ReactNode;
  isLocked: boolean;
  featureName?: string;
  showUpgradeButton?: boolean;
  className?: string;
}

/**
 * Wrapper component that shows a locked overlay for gated features
 * When locked, shows the children in a disabled/greyed out state with a lock icon
 */
export function LockedFeature({ 
  children, 
  isLocked, 
  featureName = "this feature",
  showUpgradeButton = true,
  className = "",
}: LockedFeatureProps) {
  const navigate = useNavigate();

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`relative ${className}`}>
          {/* Greyed out content */}
          <div className="opacity-40 pointer-events-none select-none">
            {children}
          </div>
          
          {/* Lock overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              {showUpgradeButton && (
                <TerminalButton
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/settings");
                  }}
                  className="text-xs"
                >
                  Unlock
                </TerminalButton>
              )}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs">
          Unlock {featureName} with Supporter ($2.99/mo)
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface LockedButtonProps {
  isLocked: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  description?: string;
}

/**
 * A button that can be locked - shows lock icon and tooltip when locked
 * Used in component selection grids
 */
export function LockedButton({
  isLocked,
  onClick,
  children,
  className = "",
  icon,
  description,
}: LockedButtonProps) {
  const navigate = useNavigate();

  if (!isLocked) {
    return (
      <button onClick={onClick} className={className}>
        {icon}
        {children}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`${className} opacity-50 cursor-not-allowed relative`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {icon}
          {children}
          <Lock className="absolute top-1 right-1 w-3 h-3 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {description || "This feature requires a Supporter subscription."}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/settings");
            }}
            className="text-xs text-primary hover:underline"
          >
            Upgrade to Supporter ($2.99/mo) →
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
