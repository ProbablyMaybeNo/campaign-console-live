import { useState } from "react";
import { 
  Table2, 
  LayoutGrid, 
  Hash, 
  Image, 
  Dices, 
  Eye, 
  EyeOff, 
  Trash2, 
  GripVertical,
  Loader2,
  Copy,
  Lock,
  Unlock,
} from "lucide-react";
import { useDashboardComponents, useUpdateComponent, useDeleteComponent, useCreateComponent, type DashboardComponent } from "@/hooks/useDashboardComponents";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { OverlayLoading, OverlayEmpty } from "@/components/ui/OverlayPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { toast } from "sonner";

const componentTypeIcons: Record<string, React.ReactNode> = {
  table: <Table2 className="w-4 h-4" />,
  card: <LayoutGrid className="w-4 h-4" />,
  counter: <Hash className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  dice: <Dices className="w-4 h-4" />,
};

const componentTypeLabels: Record<string, string> = {
  table: "Table",
  card: "Card",
  counter: "Counter",
  image: "Image",
  dice: "Dice Roller",
};

interface ComponentsManagerProps {
  campaignId: string;
}

export function ComponentsManager({ campaignId }: ComponentsManagerProps) {
  const { data: components, isLoading, error } = useDashboardComponents(campaignId);
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();
  const createComponent = useCreateComponent();
  const { handleDeleteWithUndo } = useUndoDelete(campaignId);
  const [deleteTarget, setDeleteTarget] = useState<DashboardComponent | null>(null);

  if (isLoading) {
    return <OverlayLoading text="Loading components" />;
  }

  if (error) {
    return (
      <OverlayEmpty
        icon={<Table2 className="w-8 h-8" />}
        title="Error Loading Components"
        description={error.message}
      />
    );
  }

  if (!components || components.length === 0) {
    return (
      <OverlayEmpty
        icon={<Table2 className="w-8 h-8" />}
        title="No Components Yet"
        description="Add components to your dashboard using the + button on the canvas."
      />
    );
  }

  const handleVisibilityToggle = (component: DashboardComponent) => {
    const currentVisibility = (component.config as { visibility?: string })?.visibility ?? "all";
    const newVisibility = currentVisibility === "gm" ? "all" : "gm";
    
    updateComponent.mutate({
      id: component.id,
      config: {
        ...(component.config as object),
        visibility: newVisibility,
      },
    });
  };

  const handleLockToggle = (component: DashboardComponent) => {
    const isLocked = (component.config as { locked?: boolean })?.locked ?? false;
    
    updateComponent.mutate({
      id: component.id,
      config: {
        ...(component.config as object),
        locked: !isLocked,
      },
    });
    
    toast.info(isLocked ? `"${component.name}" unlocked` : `"${component.name}" locked`);
  };

  const handleDuplicate = (component: DashboardComponent) => {
    createComponent.mutate({
      campaign_id: campaignId,
      name: `${component.name} (Copy)`,
      component_type: component.component_type,
      data_source: component.data_source,
      config: component.config,
      position_x: component.position_x + 50,
      position_y: component.position_y + 50,
      width: component.width,
      height: component.height,
    });
    toast.success(`Duplicated "${component.name}"`);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      handleDeleteWithUndo(deleteTarget, () => {
        deleteComponent.mutate({ id: deleteTarget.id, campaignId });
      });
      setDeleteTarget(null);
    }
  };

  const isGMOnly = (component: DashboardComponent) => {
    return (component.config as { visibility?: string })?.visibility === "gm";
  };

  const isLocked = (component: DashboardComponent) => {
    return (component.config as { locked?: boolean })?.locked ?? false;
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-4">
        Toggle visibility to control which components players can see. Lock widgets to prevent accidental movement.
      </div>
      
      <div className="divide-y divide-border border border-border rounded-md bg-card">
        {components.map((component) => (
          <div
            key={component.id}
            className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
          >
            {/* Drag handle (future) */}
            <div className="text-muted-foreground cursor-grab">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Type icon */}
            <div className="text-primary">
              {componentTypeIcons[component.component_type] || <LayoutGrid className="w-4 h-4" />}
            </div>

            {/* Name and type */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate flex items-center gap-2">
                {component.name}
                {isLocked(component) && (
                  <Lock className="w-3 h-3 text-[hsl(200,100%,65%)]" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {componentTypeLabels[component.component_type] || component.component_type}
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isGMOnly(component) ? (
                  <span className="flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> GM Only
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> All Players
                  </span>
                )}
              </span>
              <Switch
                checked={!isGMOnly(component)}
                onCheckedChange={() => handleVisibilityToggle(component)}
                disabled={updateComponent.isPending}
              />
            </div>

            {/* Lock button */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isLocked(component) ? "text-[hsl(200,100%,65%)]" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => handleLockToggle(component)}
              title={isLocked(component) ? "Unlock widget" : "Lock widget"}
            >
              {isLocked(component) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>

            {/* Duplicate button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-[hsl(142,76%,50%)]"
              onClick={() => handleDuplicate(component)}
              title="Duplicate widget"
            >
              <Copy className="w-4 h-4" />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteTarget(component)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? You can undo this action for 5 seconds after deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteComponent.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
