import { useState, useCallback, useRef } from "react";
import { DashboardComponent, useCreateComponent } from "@/hooks/useDashboardComponents";
import { toast } from "sonner";

const UNDO_TIMEOUT = 5000; // 5 seconds to undo

interface DeletedComponent {
  component: DashboardComponent;
  toastId: string | number;
  timeoutId: NodeJS.Timeout;
}

export function useUndoDelete(campaignId: string) {
  const deletedRef = useRef<Map<string, DeletedComponent>>(new Map());
  const createComponent = useCreateComponent();

  const handleDeleteWithUndo = useCallback((
    component: DashboardComponent,
    onDelete: () => void
  ) => {
    // Execute the delete
    onDelete();

    // Create toast with undo button
    const toastId = toast.info(
      `"${component.name}" deleted`,
      {
        duration: UNDO_TIMEOUT,
        action: {
          label: "Undo",
          onClick: () => {
            // Restore the component
            const deleted = deletedRef.current.get(component.id);
            if (deleted) {
              clearTimeout(deleted.timeoutId);
              deletedRef.current.delete(component.id);
              
              // Recreate the component with all its data
              createComponent.mutate({
                campaign_id: campaignId,
                name: component.name,
                component_type: component.component_type,
                data_source: component.data_source,
                config: component.config,
                position_x: component.position_x,
                position_y: component.position_y,
                width: component.width,
                height: component.height,
              });
              
              toast.success(`"${component.name}" restored`);
            }
          },
        },
        onDismiss: () => {
          // Clean up when toast is dismissed
          const deleted = deletedRef.current.get(component.id);
          if (deleted) {
            clearTimeout(deleted.timeoutId);
            deletedRef.current.delete(component.id);
          }
        },
      }
    );

    // Set timeout to clear from undo stack
    const timeoutId = setTimeout(() => {
      deletedRef.current.delete(component.id);
    }, UNDO_TIMEOUT);

    // Store for potential undo
    deletedRef.current.set(component.id, {
      component,
      toastId,
      timeoutId,
    });
  }, [campaignId, createComponent]);

  return { handleDeleteWithUndo };
}
