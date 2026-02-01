import { memo } from "react";
import { Trash2, Lock, Unlock, Eye, EyeOff, X, Copy } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MultiSelectToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onLockAll: () => void;
  onUnlockAll: () => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onDuplicateAll: () => void;
  onClearSelection: () => void;
}

export const MultiSelectToolbar = memo(function MultiSelectToolbar({
  selectedCount,
  onDelete,
  onLockAll,
  onUnlockAll,
  onShowAll,
  onHideAll,
  onDuplicateAll,
  onClearSelection,
}: MultiSelectToolbarProps) {
  if (selectedCount < 2) return null;

  return (
    <TooltipProvider>
      <div 
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm border-2 border-[hsl(200,100%,65%)] rounded-lg px-4 py-2"
        style={{ boxShadow: '0 0 20px hsl(200 100% 50% / 0.4), 0 4px 20px hsl(0 0% 0% / 0.4)' }}
      >
        <span className="text-xs font-mono text-[hsl(200,100%,70%)] uppercase tracking-wider mr-2">
          {selectedCount} selected
        </span>

        <div className="w-px h-6 bg-[hsl(200,100%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onDuplicateAll}>
              <Copy className="w-4 h-4 text-[hsl(142,76%,50%)]" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Duplicate all</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onLockAll}>
              <Lock className="w-4 h-4 text-[hsl(200,100%,65%)]" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Lock all</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onUnlockAll}>
              <Unlock className="w-4 h-4 text-white" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Unlock all</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[hsl(200,100%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onShowAll}>
              <Eye className="w-4 h-4 text-[hsl(142,76%,50%)]" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Show to players</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onHideAll}>
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>GM only</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[hsl(200,100%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Delete all</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-[hsl(200,100%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="w-4 h-4 text-muted-foreground" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Clear selection (Esc)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});
