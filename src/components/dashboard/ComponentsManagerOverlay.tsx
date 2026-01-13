import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { 
  useDashboardComponents, 
  useUpdateComponent, 
  useDeleteComponent,
  DashboardComponent 
} from "@/hooks/useDashboardComponents";
import { 
  Database, 
  Table, 
  LayoutGrid, 
  Image, 
  Map, 
  Hash, 
  Dice5, 
  Eye,
  EyeOff,
  Trash2,
  Settings2,
  X,
  Plus,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComponentsManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onAddComponent: () => void;
}

interface ComponentConfig {
  title?: string;
  columns?: Array<{ key: string; label: string }>;
  rows?: Array<Record<string, string>>;
  playerVisible?: boolean;
  [key: string]: unknown;
}

const componentIcons: Record<string, React.ReactNode> = {
  table: <Table className="w-4 h-4" />,
  card: <LayoutGrid className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  map: <Map className="w-4 h-4" />,
  counter: <Hash className="w-4 h-4" />,
  dice_roller: <Dice5 className="w-4 h-4" />,
};

export function ComponentsManagerOverlay({
  open,
  onOpenChange,
  campaignId,
  onAddComponent,
}: ComponentsManagerOverlayProps) {
  const { data: components = [], isLoading } = useDashboardComponents(campaignId);
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();
  
  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectComponent = (component: DashboardComponent) => {
    setSelectedComponent(component);
    setNameValue(component.name);
    setEditingName(false);
  };

  const handleToggleVisibility = (component: DashboardComponent) => {
    const config = (component.config as ComponentConfig) || {};
    updateComponent.mutate({
      id: component.id,
      config: { ...config, playerVisible: !config.playerVisible },
    });
  };

  const handleSaveName = () => {
    if (!selectedComponent || !nameValue.trim()) return;
    updateComponent.mutate({
      id: selectedComponent.id,
      name: nameValue.trim(),
    });
    setEditingName(false);
  };

  const handleDelete = async (component: DashboardComponent) => {
    setDeletingId(component.id);
    await deleteComponent.mutateAsync({ id: component.id, campaignId });
    setDeletingId(null);
    if (selectedComponent?.id === component.id) {
      setSelectedComponent(null);
    }
  };

  const config = selectedComponent ? (selectedComponent.config as ComponentConfig) || {} : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Database className="w-4 h-4" />
            Components Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Components List */}
          <div className="w-1/3 border-r border-primary/20 flex flex-col">
            <div className="p-3 border-b border-primary/10">
              <TerminalButton
                onClick={() => {
                  onOpenChange(false);
                  onAddComponent();
                }}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </TerminalButton>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <TerminalLoader text="Loading" size="sm" />
                </div>
              ) : components.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No components yet</p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {components.map((component) => {
                    const compConfig = (component.config as ComponentConfig) || {};
                    const isVisible = compConfig.playerVisible !== false;
                    const isSelected = selectedComponent?.id === component.id;
                    
                    return (
                      <button
                        key={component.id}
                        onClick={() => handleSelectComponent(component)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 text-left transition-colors",
                          isSelected 
                            ? "bg-primary/10 border-l-2 border-primary" 
                            : "hover:bg-accent/30"
                        )}
                      >
                        <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-primary/70">
                          {componentIcons[component.component_type] || <LayoutGrid className="w-4 h-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate">{component.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {component.component_type.replace("_", " ")}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px]",
                          isVisible ? "text-primary/50" : "text-muted-foreground/30"
                        )}>
                          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Component Settings */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedComponent ? (
              <>
                {/* Settings Header */}
                <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-primary">
                      {componentIcons[selectedComponent.component_type]}
                    </span>
                    {editingName ? (
                      <input
                        autoFocus
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        className="bg-input border border-primary rounded px-2 py-1 text-sm font-mono w-48"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-sm font-mono hover:text-primary transition-colors"
                      >
                        {selectedComponent.name}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedComponent(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Settings Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Type & Dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Component Type
                      </label>
                      <div className="bg-muted/20 border border-border rounded px-3 py-2 text-xs font-mono capitalize">
                        {selectedComponent.component_type.replace("_", " ")}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Dimensions
                      </label>
                      <div className="bg-muted/20 border border-border rounded px-3 py-2 text-xs font-mono">
                        {selectedComponent.width} × {selectedComponent.height}
                      </div>
                    </div>
                  </div>

                  {/* Player Visibility */}
                  <div className="border border-border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono">Player Visibility</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Toggle whether players can see this component
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleVisibility(selectedComponent)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors",
                          config.playerVisible !== false
                            ? "bg-primary/10 border-primary/50 text-primary"
                            : "bg-muted/10 border-border text-muted-foreground"
                        )}
                      >
                        {config.playerVisible !== false ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Type-specific settings */}
                  {selectedComponent.component_type === "table" && (
                    <div className="border border-border rounded p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <p className="text-xs font-mono">Table Settings</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-muted/10 rounded p-2">
                          <span className="text-muted-foreground">Columns:</span>
                          <span className="ml-2 text-foreground font-mono">
                            {config.columns?.length || 0}
                          </span>
                        </div>
                        <div className="bg-muted/10 rounded p-2">
                          <span className="text-muted-foreground">Rows:</span>
                          <span className="ml-2 text-foreground font-mono">
                            {config.rows?.length || 0}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground">
                        Edit table data directly in the dashboard component
                      </p>
                    </div>
                  )}

                  {(selectedComponent.component_type === "counter" || 
                    selectedComponent.component_type === "dice_roller") && (
                    <div className="border border-border rounded p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <p className="text-xs font-mono capitalize">
                          {selectedComponent.component_type.replace("_", " ")} Settings
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Configure this component directly on the dashboard
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete Action */}
                <div className="p-4 border-t border-primary/20">
                  <TerminalButton
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(selectedComponent)}
                    disabled={deletingId === selectedComponent.id}
                  >
                    {deletingId === selectedComponent.id ? (
                      <TerminalLoader text="Deleting" size="sm" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Component
                      </>
                    )}
                  </TerminalButton>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Settings2 className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-xs font-mono">Select a component to edit</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
