import { memo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { OverlayType } from "@/hooks/useOverlayState";
import { toast } from "sonner";
import { 
  Zap, 
  Plus, 
  Users, 
  Settings, 
  Download, 
  Palette, 
  Scroll, 
  MessageSquare, 
  BookOpen,
  Copy,
  LayoutGrid
} from "lucide-react";

interface MobileGMMenuProps {
  isGM: boolean;
  joinCode?: string | null;
  onOpenOverlay: (overlay: OverlayType) => void;
  onAddWidget: () => void;
  onExport: () => void;
  onTheme: () => void;
}

export const MobileGMMenu = memo(function MobileGMMenu({
  isGM,
  joinCode,
  onOpenOverlay,
  onAddWidget,
  onExport,
  onTheme,
}: MobileGMMenuProps) {
  const [open, setOpen] = useState(false);

  if (!isGM) return null;

  const handleCopyJoinCode = async () => {
    if (joinCode) {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Join code copied!");
      setOpen(false);
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <>
      {/* FAB Button - positioned above the bottom quick-action bar */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center transition-all active:scale-95"
        style={{ 
          boxShadow: "0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.25)",
          marginBottom: "env(safe-area-inset-bottom, 0)",
        }}
        aria-label="GM Menu"
      >
        <Zap className="w-5 h-5" />
      </button>

      {/* Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[70vh] border-t-2 border-primary bg-background rounded-t-xl"
          style={{ boxShadow: "0 -4px 30px hsl(var(--primary) / 0.2)" }}
        >
          <SheetHeader className="border-b border-primary/30 pb-3 mb-4">
            <SheetTitle className="text-primary font-mono uppercase tracking-wider text-sm text-center">
              Campaign Management
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 pb-6">
            {/* Dashboard Section */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Dashboard</p>
              <div className="grid grid-cols-3 gap-2">
                <MenuButton 
                  icon={<Plus className="w-5 h-5" />} 
                  label="Add Widget" 
                  onClick={() => handleAction(onAddWidget)} 
                />
                <MenuButton 
                  icon={<LayoutGrid className="w-5 h-5" />} 
                  label="Components" 
                  onClick={() => handleAction(() => onOpenOverlay("components"))} 
                />
                <MenuButton 
                  icon={<Users className="w-5 h-5" />} 
                  label="Players" 
                  onClick={() => handleAction(() => onOpenOverlay("players"))} 
                />
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Settings</p>
              <div className="grid grid-cols-3 gap-2">
                <MenuButton 
                  icon={<Settings className="w-5 h-5" />} 
                  label="Settings" 
                  onClick={() => handleAction(() => onOpenOverlay("settings"))} 
                />
                <MenuButton 
                  icon={<Download className="w-5 h-5" />} 
                  label="Export" 
                  onClick={() => handleAction(onExport)} 
                />
                <MenuButton 
                  icon={<Palette className="w-5 h-5" />} 
                  label="Theme" 
                  onClick={() => handleAction(onTheme)} 
                />
              </div>
            </div>

            {/* Content Section */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Content</p>
              <div className="grid grid-cols-3 gap-2">
                <MenuButton 
                  icon={<Scroll className="w-5 h-5" />} 
                  label="Rules" 
                  onClick={() => handleAction(() => onOpenOverlay("rules"))} 
                />
                <MenuButton 
                  icon={<MessageSquare className="w-5 h-5" />} 
                  label="Messages" 
                  onClick={() => handleAction(() => onOpenOverlay("messages"))} 
                />
                <MenuButton 
                  icon={<BookOpen className="w-5 h-5" />} 
                  label="Narrative" 
                  onClick={() => handleAction(() => onOpenOverlay("narrative"))} 
                />
              </div>
            </div>

            {/* Join Code */}
            {joinCode && (
              <div className="pt-2">
                <TerminalButton 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCopyJoinCode}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Join Code: {joinCode}
                </TerminalButton>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuButton({ icon, label, onClick }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-3 border border-primary/30 rounded-lg bg-card/50 transition-all active:scale-95 hover:border-primary hover:bg-primary/5"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}
