import { useState, memo, lazy, Suspense } from "react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { Pencil } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { StickerPicker } from "../StickerPicker";
import { STICKER_SIZES, DEFAULT_STICKER_CONFIG } from "@/lib/stickerLibrary";
import { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { toast } from "sonner";

interface StickerWidgetConfig {
  icon?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

interface StickerWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

// Dynamic icon component with fallback
const fallback = <div className="w-12 h-12 bg-muted/30 rounded animate-pulse" />;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: string;
}

function DynamicIcon({ name, ...props }: IconProps) {
  // Convert PascalCase to kebab-case for icon lookup
  const iconKey = name.replace(/([A-Z])/g, (match, p1, offset) => 
    offset > 0 ? `-${p1.toLowerCase()}` : p1.toLowerCase()
  ) as keyof typeof dynamicIconImports;
  
  if (!dynamicIconImports[iconKey]) {
    return <div className="w-12 h-12 flex items-center justify-center text-xs text-muted-foreground">?</div>;
  }
  
  const LucideIcon = lazy(dynamicIconImports[iconKey]);
  
  return (
    <Suspense fallback={fallback}>
      <LucideIcon {...props} />
    </Suspense>
  );
}

export const StickerWidget = memo(function StickerWidget({ component, isGM }: StickerWidgetProps) {
  const config = (component.config as StickerWidgetConfig) || {};
  const [showPicker, setShowPicker] = useState(false);
  
  const updateComponent = useUpdateComponent();

  const icon = config.icon || DEFAULT_STICKER_CONFIG.icon;
  const size = config.size || DEFAULT_STICKER_CONFIG.size;
  const color = config.color || DEFAULT_STICKER_CONFIG.color;
  
  const pixelSize = STICKER_SIZES[size].pixels;

  const handleStickerSelect = (newConfig: { icon: string; size: "sm" | "md" | "lg"; color: string }) => {
    updateComponent.mutate({
      id: component.id,
      config: {
        ...config,
        ...newConfig,
      },
    }, {
      onSuccess: () => {
        toast.success("Sticker updated");
      },
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center relative">
      {/* Sticker Display */}
      <div
        className="flex items-center justify-center transition-transform hover:scale-105"
        style={{ 
          color: color,
          filter: `drop-shadow(0 0 12px ${color}50)`,
        }}
      >
        <DynamicIcon name={icon} size={pixelSize} />
      </div>

      {/* Edit button for GM */}
      {isGM && (
        <div className="absolute bottom-1 right-1">
          <TerminalButton 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPicker(true)}
            className="h-7 w-7 p-0"
          >
            <Pencil className="w-3 h-3" />
          </TerminalButton>
        </div>
      )}

      {/* Sticker Picker Modal */}
      {showPicker && (
        <StickerPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleStickerSelect}
          initialIcon={icon}
          initialSize={size}
          initialColor={color}
        />
      )}
    </div>
  );
});
