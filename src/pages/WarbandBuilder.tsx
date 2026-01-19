import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useWarbandBuilder } from "@/hooks/useWarbandBuilder";
import { WarbandHeader } from "@/components/warband/WarbandHeader";
import { UnitLibrary } from "@/components/warband/UnitLibrary";
import { RosterPanel } from "@/components/warband/RosterPanel";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function WarbandBuilder() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const warbandId = searchParams.get("warband") || undefined;

  const {
    name,
    faction,
    subFaction,
    roster,
    hasUnsavedChanges,
    totalPoints,
    pointsLimit,
    pointsRemaining,
    isOverLimit,
    factions,
    subFactions,
    availableUnits,
    isLoading,
    isSaving,
    isDeleting,
    setName,
    setFaction,
    setSubFaction,
    addUnit,
    removeUnit,
    updateQuantity,
    save,
    delete: deleteWarband,
  } = useWarbandBuilder(campaignId!, warbandId);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this warband? This cannot be undone.")) {
      return;
    }
    deleteWarband();
    navigate(`/campaign/${campaignId}?overlay=warbands`);
  };

  if (!campaignId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Invalid campaign ID</p>
      </div>
    );
  }

  if (isLoading) {
    return <FullScreenLoader text="Loading warband builder" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <WarbandHeader
        campaignId={campaignId}
        name={name}
        faction={faction}
        subFaction={subFaction}
        factions={factions}
        subFactions={subFactions}
        totalPoints={totalPoints}
        pointsLimit={pointsLimit}
        pointsRemaining={pointsRemaining}
        isOverLimit={isOverLimit}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isEditing={!!warbandId}
        onNameChange={setName}
        onFactionChange={setFaction}
        onSubFactionChange={setSubFaction}
        onSave={save}
        onDelete={handleDelete}
      />

      {/* Main content: Unit Library | Roster */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Unit Library */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full border-r border-border bg-card flex flex-col">
              <div className="p-3 border-b border-border">
                <h2 className="font-medium">Unit Library</h2>
                <p className="text-xs text-muted-foreground">
                  {faction 
                    ? `Showing ${faction} units`
                    : "Select a faction to filter units"
                  }
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <UnitLibrary
                  units={availableUnits}
                  selectedFaction={faction}
                  onAddUnit={addUnit}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Roster */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full bg-background flex flex-col">
              <RosterPanel
                roster={roster}
                onRemoveUnit={removeUnit}
                onUpdateQuantity={updateQuantity}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
