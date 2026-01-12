import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { useWarband, useUpdateWarband, RosterUnit } from "@/hooks/useWarband";
import { useCampaignUnits, CampaignUnit } from "@/hooks/useCampaignUnits";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { CreateWarbandModal } from "@/components/warband/CreateWarbandModal";
import { WarbandRoster } from "@/components/warband/WarbandRoster";
import { AddUnitOverlay } from "@/components/warband/AddUnitOverlay";
import { UnitDatasheet } from "@/components/warband/UnitDatasheet";
import { EquipmentEditor } from "@/components/warband/EquipmentEditor";
import { 
  ArrowLeft, 
  Swords, 
  Plus, 
  Settings,
  Users,
  AlertTriangle
} from "lucide-react";

export default function WarbandBuilder() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: warband, isLoading: warbandLoading, refetch: refetchWarband } = useWarband(campaignId, user?.id);
  const { data: units } = useCampaignUnits(campaignId);
  const updateWarband = useUpdateWarband();
  const isGM = useIsGM(campaignId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUnitOverlay, setShowAddUnitOverlay] = useState(false);
  const [viewingUnit, setViewingUnit] = useState<CampaignUnit | null>(null);
  const [editingRosterIndex, setEditingRosterIndex] = useState<number | null>(null);

  const isLoading = campaignLoading || warbandLoading;

  // Auto-open create modal if no warband exists
  useEffect(() => {
    if (!isLoading && !warband && units && units.length > 0) {
      setShowCreateModal(true);
    }
  }, [isLoading, warband, units]);

  const handleWarbandCreated = async (warbandId: string) => {
    await refetchWarband();
  };

  const handleAddUnit = async (rosterUnit: RosterUnit) => {
    if (!warband) return;

    const newRoster = [...warband.roster, rosterUnit];
    
    await updateWarband.mutateAsync({
      id: warband.id,
      campaign_id: warband.campaign_id,
      roster: newRoster,
    });

    await refetchWarband();
    setShowAddUnitOverlay(false);
  };

  const handleViewUnit = (unitId: string) => {
    const unit = units?.find(u => u.id === unitId);
    if (unit) {
      setViewingUnit(unit);
    }
  };

  const handleEditUnit = (rosterIndex: number) => {
    setEditingRosterIndex(rosterIndex);
  };

  const handleSaveEquipment = async (updatedUnit: RosterUnit) => {
    if (!warband || editingRosterIndex === null) return;

    const newRoster = [...warband.roster];
    newRoster[editingRosterIndex] = updatedUnit;

    await updateWarband.mutateAsync({
      id: warband.id,
      campaign_id: warband.campaign_id,
      roster: newRoster,
    });

    await refetchWarband();
    setEditingRosterIndex(null);
  };

  const getEditingUnit = (): CampaignUnit | null => {
    if (editingRosterIndex === null || !warband) return null;
    const rosterUnit = warband.roster[editingRosterIndex];
    if (!rosterUnit) return null;
    return units?.find(u => u.id === rosterUnit.unit_id) || null;
  };

  if (isLoading) {
    return <FullScreenLoader text="Loading warband" />;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-primary/30 rounded p-8 text-center">
          <p className="text-destructive mb-4">[ERROR] Campaign not found</p>
          <Link to="/campaigns">
            <TerminalButton variant="outline" size="sm">
              {"<"} Back to Campaigns
            </TerminalButton>
          </Link>
        </div>
      </div>
    );
  }

  const hasNoUnits = !units || units.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to={`/campaign/${campaignId}`}>
              <TerminalButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </TerminalButton>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-lg font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Warband Builder
              </h1>
              <p className="text-xs text-muted-foreground">
                {campaign.name} • {campaign.points_limit} pts limit
              </p>
            </div>
          </div>

          {isGM && (
            <Link to={`/campaign/${campaignId}/unit-library`}>
              <TerminalButton variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Unit Library
              </TerminalButton>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {/* No Units Warning (GM needs to add units) */}
        {hasNoUnits ? (
          <div className="py-16 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-mono text-foreground">No Units Available</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {isGM 
                  ? "You need to add units to the campaign library before players can build warbands."
                  : "The GM needs to add units to the campaign library before you can build a warband."
                }
              </p>
            </div>
            {isGM && (
              <Link to={`/campaign/${campaignId}/unit-library`}>
                <TerminalButton>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Units to Library
                </TerminalButton>
              </Link>
            )}
            <div>
              <Link to={`/campaign/${campaignId}`}>
                <TerminalButton variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </TerminalButton>
              </Link>
            </div>
          </div>
        ) : !warband ? (
          /* No warband yet - prompt to create */
          <div className="py-16 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30">
              <Swords className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-mono text-foreground">Create Your Warband</h2>
              <p className="text-muted-foreground mt-2">
                Start building your army for this campaign.
              </p>
            </div>
            <TerminalButton onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Warband
            </TerminalButton>
          </div>
        ) : (
          /* Warband exists - show roster */
          <div className="space-y-6">
            {/* Warband Header */}
            <div className="bg-card border border-primary/30 rounded p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-mono font-bold text-foreground">
                      {warband.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {warband.faction}{warband.sub_faction ? ` • ${warband.sub_faction}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">
                    {warband.roster.length} units
                  </span>
                </div>
              </div>
            </div>

            {/* Roster */}
            <WarbandRoster
              warband={warband}
              campaignId={campaignId!}
              campaignName={campaign.name}
              roster={warband.roster}
              pointsLimit={campaign.points_limit || 1000}
              faction={warband.faction || ""}
              subFaction={warband.sub_faction}
              onAddUnit={() => setShowAddUnitOverlay(true)}
              onViewUnit={handleViewUnit}
              onEditUnit={handleEditUnit}
            />
          </div>
        )}
      </main>

      {/* Create Warband Modal */}
      <CreateWarbandModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        campaignId={campaignId!}
        onSuccess={handleWarbandCreated}
      />

      {/* Add Unit Overlay */}
      {warband && (
        <AddUnitOverlay
          open={showAddUnitOverlay}
          onOpenChange={setShowAddUnitOverlay}
          campaignId={campaignId!}
          faction={warband.faction || ""}
          subFaction={warband.sub_faction}
          onAddUnit={handleAddUnit}
          onViewUnit={(unit) => {
            setViewingUnit(unit);
          }}
        />
      )}

      {/* Unit Datasheet */}
      <UnitDatasheet
        unit={viewingUnit}
        open={!!viewingUnit}
        onOpenChange={(open) => !open && setViewingUnit(null)}
      />

      {/* Equipment Editor */}
      {editingRosterIndex !== null && warband && getEditingUnit() && (
        <EquipmentEditor
          open={true}
          onOpenChange={(open) => !open && setEditingRosterIndex(null)}
          unit={getEditingUnit()!}
          rosterUnit={warband.roster[editingRosterIndex]}
          onSave={handleSaveEquipment}
        />
      )}
    </div>
  );
}
