import { useState, useMemo, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { STICKER_CATEGORIES, STICKER_COLORS, STICKER_SIZES, ALL_STICKER_ICONS } from "@/lib/stickerLibrary";
import { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (config: { icon: string; size: "sm" | "md" | "lg"; color: string }) => void;
  initialIcon?: string;
  initialSize?: "sm" | "md" | "lg";
  initialColor?: string;
}

// Dynamic icon component with fallback
const fallback = <div className="w-6 h-6 bg-muted/30 rounded animate-pulse" />;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: keyof typeof dynamicIconImports;
}

function DynamicIcon({ name, ...props }: IconProps) {
  // Check if icon exists in dynamicIconImports
  const iconKey = name.replace(/([A-Z])/g, (match, p1, offset) => 
    offset > 0 ? `-${p1.toLowerCase()}` : p1.toLowerCase()
  ) as keyof typeof dynamicIconImports;
  
  if (!dynamicIconImports[iconKey]) {
    return <div className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">?</div>;
  }
  
  const LucideIcon = lazy(dynamicIconImports[iconKey]);
  
  return (
    <Suspense fallback={fallback}>
      <LucideIcon {...props} />
    </Suspense>
  );
}

export function StickerPicker({ 
  open, 
  onClose, 
  onSelect,
  initialIcon = "Star",
  initialSize = "md",
  initialColor = "hsl(142, 76%, 55%)",
}: StickerPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [selectedSize, setSelectedSize] = useState<"sm" | "md" | "lg">(initialSize);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter icons based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return STICKER_CATEGORIES;
    }
    
    const query = searchQuery.toLowerCase();
    return STICKER_CATEGORIES.map(cat => ({
      ...cat,
      icons: cat.icons.filter(icon => icon.toLowerCase().includes(query)),
    })).filter(cat => cat.icons.length > 0);
  }, [searchQuery]);

  const handleConfirm = () => {
    onSelect({
      icon: selectedIcon,
      size: selectedSize,
      color: selectedColor,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider">
            Choose Sticker
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search */}
          <TerminalInput
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Preview */}
          <div className="flex items-center justify-center p-4 bg-muted/20 border border-border rounded">
            <div
              style={{ 
                color: selectedColor,
                filter: `drop-shadow(0 0 8px ${selectedColor}50)`,
              }}
            >
              <DynamicIcon 
                name={selectedIcon as keyof typeof dynamicIconImports} 
                size={STICKER_SIZES[selectedSize].pixels} 
              />
            </div>
          </div>

          {/* Size & Color Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Size */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Size
              </label>
              <div className="flex gap-2">
                {(Object.keys(STICKER_SIZES) as Array<"sm" | "md" | "lg">).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 px-3 py-2 rounded border text-xs font-mono uppercase ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {STICKER_SIZES[size].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Color
              </label>
              <div className="flex gap-1 flex-wrap">
                {STICKER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Icon Grid */}
          <div className="flex-1 overflow-y-auto border border-border rounded">
            {filteredCategories.map((category) => (
              <div key={category.id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setActiveCategory(
                    activeCategory === category.id ? null : category.id
                  )}
                  className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/20"
                >
                  <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    {category.name} ({category.icons.length})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeCategory === category.id ? "−" : "+"}
                  </span>
                </button>
                
                {(activeCategory === category.id || searchQuery.trim()) && (
                  <div className="grid grid-cols-8 gap-1 p-2 bg-muted/10">
                    {category.icons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setSelectedIcon(icon)}
                        className={`p-2 rounded flex items-center justify-center transition-all ${
                          selectedIcon === icon
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "hover:bg-muted/30"
                        }`}
                        title={icon}
                      >
                        <DynamicIcon 
                          name={icon as keyof typeof dynamicIconImports} 
                          size={20}
                          className={selectedIcon === icon ? "text-primary" : "text-muted-foreground"}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <TerminalButton variant="outline" onClick={onClose}>
            Cancel
          </TerminalButton>
          <TerminalButton onClick={handleConfirm}>
            Select Sticker
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
