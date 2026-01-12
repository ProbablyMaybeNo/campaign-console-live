import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignUnits, useCreateCampaignUnit, useDeleteCampaignUnit, CampaignUnit, EquipmentOption } from "@/hooks/useCampaignUnits";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnitDatasheet } from "@/components/warband/UnitDatasheet";
import { 
  ArrowLeft, 
  Database, 
  Plus, 
  Trash2,
  Eye,
  Search,
  Shield,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UnitLibrary() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: units, isLoading: unitsLoading } = useCampaignUnits(campaignId);
  const createUnit = useCreateCampaignUnit();
  const deleteUnit = useDeleteCampaignUnit();
  const isGM = useIsGM(campaignId);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingUnit, setViewingUnit] = useState<CampaignUnit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLoading = campaignLoading || unitsLoading;

  const filteredUnits = units?.filter(unit =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.faction.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group units by faction
  const unitsByFaction = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.faction]) {
      acc[unit.faction] = [];
    }
    acc[unit.faction].push(unit);
    return acc;
  }, {} as Record<string, CampaignUnit[]>);

  const handleDeleteUnit = async (id: string) => {
    if (!campaignId) return;
    setDeletingId(id);
    try {
      await deleteUnit.mutateAsync({ id, campaignId });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <FullScreenLoader text="Loading unit library" />;
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

  if (!isGM) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-destructive/30 rounded p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">[ACCESS DENIED]</p>
          <p className="text-muted-foreground text-sm mb-4">
            Only GMs can manage the unit library.
          </p>
          <Link to={`/campaign/${campaignId}`}>
            <TerminalButton variant="outline" size="sm">
              {"<"} Back to Dashboard
            </TerminalButton>
          </Link>
        </div>
      </div>
    );
  }

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
                <Database className="w-5 h-5" />
                Unit Library
              </h1>
              <p className="text-xs text-muted-foreground">
                {campaign.name} • {units?.length || 0} units
              </p>
            </div>
          </div>

          <TerminalButton onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </TerminalButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <TerminalInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search units or factions..."
            className="pl-10"
          />
        </div>

        {/* Units List */}
        {Object.keys(unitsByFaction).length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="text-muted-foreground font-mono">
                {searchQuery ? "No matching units found" : "No units in library"}
              </p>
              <p className="text-muted-foreground/60 text-sm mt-2">
                Add units manually or use the AI Component Builder to extract from PDFs.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(unitsByFaction).map(([faction, factionUnits]) => (
              <div key={faction} className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-mono px-2">
                  {faction} ({factionUnits.length})
                </h3>
                <div className="bg-card border border-primary/30 rounded overflow-hidden divide-y divide-primary/10">
                  {factionUnits.map((unit) => (
                    <div 
                      key={unit.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3",
                        "hover:bg-primary/5 transition-colors",
                        deletingId === unit.id && "opacity-50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-foreground">{unit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {unit.base_cost} pts • {unit.source}
                          {unit.sub_faction && ` • ${unit.sub_faction}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TerminalButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingUnit(unit)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </TerminalButton>
                        <TerminalButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.id)}
                          disabled={deletingId === unit.id}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </TerminalButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Unit Modal */}
      <AddUnitModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        campaignId={campaignId!}
      />

      {/* Unit Datasheet */}
      <UnitDatasheet
        unit={viewingUnit}
        open={!!viewingUnit}
        onOpenChange={(open) => !open && setViewingUnit(null)}
      />
    </div>
  );
}

interface AddUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

function AddUnitModal({ open, onOpenChange, campaignId }: AddUnitModalProps) {
  const createUnit = useCreateCampaignUnit();
  
  const [name, setName] = useState("");
  const [faction, setFaction] = useState("");
  const [subFaction, setSubFaction] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [statsJson, setStatsJson] = useState('{"move": "6\\"", "fight": 4}');
  const [keywordsInput, setKeywordsInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !faction.trim()) return;

    let stats = {};
    try {
      stats = JSON.parse(statsJson);
    } catch {
      stats = {};
    }

    const keywords = keywordsInput.split(",").map(k => k.trim()).filter(Boolean);

    try {
      await createUnit.mutateAsync({
        campaign_id: campaignId,
        name: name.trim(),
        faction: faction.trim(),
        sub_faction: subFaction.trim() || null,
        base_cost: parseInt(baseCost) || 0,
        stats,
        abilities: [],
        equipment_options: [],
        keywords,
        source: "manual",
        source_ref: null,
      });

      // Reset form
      setName("");
      setFaction("");
      setSubFaction("");
      setBaseCost("");
      setStatsJson('{"move": "6\\"", "fight": 4}');
      setKeywordsInput("");
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/50 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Unit
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Unit Name *</Label>
              <TerminalInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Knights"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Faction *</Label>
                <TerminalInput
                  value={faction}
                  onChange={(e) => setFaction(e.target.value)}
                  placeholder="e.g., English"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Sub-faction</Label>
                <TerminalInput
                  value={subFaction}
                  onChange={(e) => setSubFaction(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Base Cost (pts)</Label>
              <TerminalInput
                type="number"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Keywords (comma-separated)</Label>
              <TerminalInput
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Infantry, Melee, Elite"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Stats (JSON)</Label>
              <Textarea
                value={statsJson}
                onChange={(e) => setStatsJson(e.target.value)}
                placeholder='{"move": "6\"", "fight": 4}'
                className="font-mono text-sm bg-background border-primary/30"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <TerminalButton
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                [ Cancel ]
              </TerminalButton>
              <TerminalButton
                type="submit"
                disabled={!name.trim() || !faction.trim() || createUnit.isPending}
                className="flex-1"
              >
                {createUnit.isPending ? "Adding..." : "[ Add Unit ]"}
              </TerminalButton>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
