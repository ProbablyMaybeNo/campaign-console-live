import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard, Mouse, Command } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: "Canvas Navigation",
    icon: Mouse,
    items: [
      { keys: ["Click", "Drag"], description: "Pan the canvas" },
      { keys: ["Ctrl", "+"], description: "Zoom in" },
      { keys: ["Ctrl", "-"], description: "Zoom out" },
      { keys: ["Ctrl", "0"], description: "Reset zoom to 100%" },
      { keys: ["Home"], description: "Recenter on Campaign Console" },
    ],
  },
  {
    category: "Quick Actions",
    icon: Command,
    items: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["Shift", "?"], description: "Show this help" },
    ],
  },
  {
    category: "Widget Management",
    icon: Keyboard,
    items: [
      { keys: ["Drag title"], description: "Move widget" },
      { keys: ["Corner handle"], description: "Resize widget" },
      { keys: ["Del / Backspace"], description: "Delete selected widget" },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="w-4 h-4 text-[hsl(200,100%,65%)]" />
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {section.category}
                </h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30"
                  >
                    <span className="text-sm text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-background border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < item.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">Esc</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
