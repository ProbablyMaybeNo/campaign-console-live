import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGameSystems,
  useBSDataGallery,
  useImportFromGallery,
  useMasterFactions,
  BSDataGameSystem,
} from "@/hooks/useGameSystems";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Database,
  Search,
  CheckCircle,
  Users,
  Gamepad2,
  Download,
  Clock,
} from "lucide-react";

export default function AdminGameLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGallerySystem, setSelectedGallerySystem] = useState<BSDataGameSystem | null>(null);

  const { data: gameSystems, isLoading } = useGameSystems({ status: "all" });
  const { data: galleryData, isLoading: isLoadingGallery } = useBSDataGallery();
  const importMutation = useImportFromGallery();

  // Filter gallery systems based on search
  const filteredGallery = useMemo(() => {
    if (!galleryData) return [];
    if (!searchQuery.trim()) return galleryData.slice(0, 50); // Show first 50 by default
    
    const query = searchQuery.toLowerCase();
    return galleryData.filter(
      gs => gs.description.toLowerCase().includes(query) || 
            gs.name.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [galleryData, searchQuery]);

  // Check if a system is already imported
  const isAlreadyImported = (gallerySystem: BSDataGameSystem) => {
    const slug = gallerySystem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return gameSystems?.some(gs => gs.slug === slug);
  };

  const handleImport = async () => {
    if (!selectedGallerySystem) return;
    
    try {
      await importMutation.mutateAsync(selectedGallerySystem);
      setSelectedGallerySystem(null);
      setAddModalOpen(false);
      setSearchQuery("");
    } catch {
      // Error handled by mutation
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TerminalLoader text="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TerminalButton variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </TerminalButton>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-mono uppercase tracking-wider text-primary">
                  Game Systems Library
                </h1>
              </div>
            </div>
            <TerminalButton onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Game System
            </TerminalButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <TerminalLoader text="Loading game systems" />
          </div>
        ) : gameSystems && gameSystems.length > 0 ? (
          <div className="grid gap-4">
            {gameSystems.map((system) => (
              <GameSystemCard
                key={system.id}
                system={system}
                isExpanded={expandedSystem === system.id}
                onToggleExpand={() =>
                  setExpandedSystem(expandedSystem === system.id ? null : system.id)
                }
              />
            ))}
          </div>
        ) : (
          <TerminalCard className="text-center py-16">
            <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-mono uppercase text-muted-foreground mb-2">
              No Game Systems Yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Browse {galleryData?.length || 170}+ available wargames and import with one click
            </p>
            <TerminalButton onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Browse Game Systems
            </TerminalButton>
          </TerminalCard>
        )}
      </main>

      {/* Add Game System Modal - Gallery Browser */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Import Game System
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <TerminalInput
                placeholder="Search wargames (e.g., Warhammer, Kill Team, Age of Sigmar...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoadingGallery ? (
              <div className="flex justify-center py-8">
                <TerminalLoader text="Loading available games" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? `${filteredGallery.length} results` : `${galleryData?.length || 0} game systems available`}
                </p>

                {/* Game System List */}
                <ScrollArea className="flex-1 min-h-0 border border-border">
                  <div className="divide-y divide-border">
                    {filteredGallery.map((gs) => {
                      const alreadyImported = isAlreadyImported(gs);
                      const isSelected = selectedGallerySystem?.name === gs.name;
                      
                      return (
                        <button
                          key={gs.name}
                          onClick={() => !alreadyImported && setSelectedGallerySystem(isSelected ? null : gs)}
                          disabled={alreadyImported}
                          className={`w-full text-left p-3 transition-colors ${
                            alreadyImported 
                              ? "opacity-50 cursor-not-allowed bg-muted/30" 
                              : isSelected 
                                ? "bg-primary/20 border-l-2 border-l-primary" 
                                : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-foreground truncate">
                                  {gs.description}
                                </span>
                                {alreadyImported && (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Imported
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>{gs.name}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(gs.lastUpdated).toLocaleDateString()}
                                </span>
                                {gs.version && <span>v{gs.version}</span>}
                              </div>
                            </div>
                            {isSelected && !alreadyImported && (
                              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <TerminalButton
                variant="outline"
                onClick={() => {
                  setAddModalOpen(false);
                  setSelectedGallerySystem(null);
                  setSearchQuery("");
                }}
                className="flex-1"
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleImport}
                disabled={!selectedGallerySystem || importMutation.isPending}
                className="flex-1"
              >
                {importMutation.isPending ? (
                  <TerminalLoader text="Importing" size="sm" />
                ) : selectedGallerySystem ? (
                  `Import ${selectedGallerySystem.description}`
                ) : (
                  "Select a game system"
                )}
              </TerminalButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for game system cards
interface GameSystemCardProps {
  system: ReturnType<typeof useGameSystems>["data"] extends (infer T)[] ? T : never;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function GameSystemCard({
  system,
  isExpanded,
  onToggleExpand,
}: GameSystemCardProps) {
  const { data: factions } = useMasterFactions(isExpanded ? system.id : undefined);

  return (
    <TerminalCard className="overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-mono uppercase tracking-wide text-foreground">{system.name}</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {system.version && <span>v{system.version}</span>}
              {system.last_synced_at && (
                <span>Imported {new Date(system.last_synced_at).toLocaleDateString()}</span>
              )}
              <Badge
                variant={system.status === "active" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {system.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4 bg-muted/30 animate-fade-in">
          {system.description && (
            <p className="text-sm text-muted-foreground mb-4">{system.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {factions?.map((faction) => (
              <div
                key={faction.id}
                className="flex items-center gap-2 p-2 border border-border bg-card"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">{faction.name}</span>
              </div>
            ))}
          </div>

          {system.repo_url && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Download className="w-3 h-3" />
              <a
                href={system.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {system.repo_url}
              </a>
            </div>
          )}
        </div>
      )}
    </TerminalCard>
  );
}
