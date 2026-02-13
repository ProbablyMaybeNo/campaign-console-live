import { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Plus, 
  Settings, 
  Users, 
  Map, 
  Scroll, 
  MessageSquare, 
  Calendar, 
  Database,
  BookOpen,
  Keyboard,
  Send,
  Copy,
  LayoutGrid,
  Download,
  Sparkles,
} from "lucide-react";
import { OverlayType } from "@/hooks/useOverlayState";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  onOpenOverlay: (overlay: OverlayType) => void;
  onAddComponent: () => void;
  onShowShortcuts: () => void;
  onCopyJoinCode: () => void;
  onSendAnnouncement: () => void;
  onExportCampaign?: () => void;
  onShowGettingStarted?: () => void;
}

type CommandAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  category: "navigation" | "actions" | "quick";
};

export function CommandPalette({ 
  open, 
  onClose, 
  onOpenOverlay, 
  onAddComponent,
  onShowShortcuts,
  onCopyJoinCode,
  onSendAnnouncement,
  onExportCampaign,
  onShowGettingStarted,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  const commands: CommandAction[] = [
    // Quick Actions
    { id: "add-widget", label: "Add new widget", icon: Plus, category: "quick", action: () => { onAddComponent(); onClose(); } },
    { id: "add-narrative", label: "Add narrative entry", icon: BookOpen, category: "quick", action: () => { onOpenOverlay("narrative"); onClose(); } },
    { id: "send-message", label: "Send message", icon: MessageSquare, category: "quick", action: () => { onOpenOverlay("messages"); onClose(); } },
    { id: "copy-join", label: "Copy join code", icon: Copy, category: "quick", action: () => { onCopyJoinCode(); onClose(); } },
    { id: "send-announcement", label: "Send announcement", icon: Send, category: "quick", action: () => { onSendAnnouncement(); onClose(); } },
    ...(onExportCampaign ? [{ id: "export-campaign", label: "Export campaign backup", icon: Download, category: "quick" as const, action: () => { onExportCampaign(); onClose(); } }] : []),
    
    // Navigation
    { id: "home", label: "Go to Dashboard", icon: LayoutGrid, category: "navigation", action: () => { onClose(); } },
    { id: "components", label: "Open Components manager", icon: Database, category: "navigation", action: () => { onOpenOverlay("components"); onClose(); } },
    { id: "players", label: "Open Players", icon: Users, category: "navigation", action: () => { onOpenOverlay("players"); onClose(); } },
    { id: "rules", label: "Open Rules", icon: Scroll, category: "navigation", action: () => { onOpenOverlay("rules"); onClose(); } },
    { id: "map", label: "Open Map", icon: Map, category: "navigation", action: () => { onOpenOverlay("map"); onClose(); } },
    { id: "narrative", label: "Open Narrative", icon: BookOpen, category: "navigation", action: () => { onOpenOverlay("narrative"); onClose(); } },
    { id: "messages", label: "Open Messages", icon: MessageSquare, category: "navigation", action: () => { onOpenOverlay("messages"); onClose(); } },
    { id: "schedule", label: "Open Schedule", icon: Calendar, category: "navigation", action: () => { onOpenOverlay("schedule"); onClose(); } },
    { id: "settings", label: "Open Settings", icon: Settings, category: "navigation", action: () => { onOpenOverlay("settings"); onClose(); } },
    
    // Help
    { id: "shortcuts", label: "Show keyboard shortcuts", icon: Keyboard, shortcut: "Shift+?", category: "actions", action: () => { onShowShortcuts(); onClose(); } },
    ...(onShowGettingStarted ? [{ id: "getting-started", label: "Getting started guide", icon: Sparkles, category: "actions" as const, action: () => { onShowGettingStarted(); onClose(); } }] : []),
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const quickActions = filteredCommands.filter(c => c.category === "quick");
  const navigationActions = filteredCommands.filter(c => c.category === "navigation");
  const otherActions = filteredCommands.filter(c => c.category === "actions");

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-md border-primary/30">
        <DialogTitle className="sr-only">Quick Actions</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput 
            placeholder="Type a command or search..." 
            value={search}
            onValueChange={setSearch}
            className="h-12"
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No results found.</CommandEmpty>
            
            {quickActions.length > 0 && (
              <CommandGroup heading="Quick Actions">
                {quickActions.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    onSelect={cmd.action}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <cmd.icon className="w-4 h-4 text-[hsl(142,76%,50%)]" />
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {quickActions.length > 0 && navigationActions.length > 0 && <CommandSeparator />}
            
            {navigationActions.length > 0 && (
              <CommandGroup heading="Navigation">
                {navigationActions.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    onSelect={cmd.action}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <cmd.icon className="w-4 h-4 text-[hsl(200,100%,65%)]" />
                    <span>{cmd.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {(quickActions.length > 0 || navigationActions.length > 0) && otherActions.length > 0 && <CommandSeparator />}
            
            {otherActions.length > 0 && (
              <CommandGroup heading="Help">
                {otherActions.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    onSelect={cmd.action}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <cmd.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
