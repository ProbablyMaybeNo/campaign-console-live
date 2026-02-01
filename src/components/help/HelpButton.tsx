import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { HelpFAQModal } from "./HelpFAQModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpButtonProps {
  variant?: "icon" | "text" | "fab";
  className?: string;
}

export function HelpButton({ variant = "icon", className = "" }: HelpButtonProps) {
  const [showHelp, setShowHelp] = useState(false);

  if (variant === "fab") {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowHelp(true)}
                className={`h-10 w-10 rounded-full bg-[hsl(200,100%,50%)]/20 border border-[hsl(200,100%,65%)] text-[hsl(200,100%,65%)] flex items-center justify-center transition-all hover:bg-[hsl(200,100%,50%)]/30 hover:scale-105 ${className}`}
                style={{ boxShadow: '0 0 15px hsl(200 100% 50% / 0.3)' }}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Help & FAQ</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <HelpFAQModal open={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (variant === "text") {
    return (
      <>
        <button
          onClick={() => setShowHelp(true)}
          className={`flex items-center gap-2 text-xs text-[hsl(200,100%,65%)] hover:text-[hsl(200,100%,75%)] transition-colors ${className}`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help & FAQ</span>
        </button>
        <HelpFAQModal open={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  // Default icon variant
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowHelp(true)}
              className={`text-[hsl(200,100%,65%)] hover:text-[hsl(200,100%,75%)] transition-colors ${className}`}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help & FAQ</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <HelpFAQModal open={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
