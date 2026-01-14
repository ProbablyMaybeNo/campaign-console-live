import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useGameSystems,
  useDiscoverBattleScribe,
  useSyncBattleScribe,
  useCreateGameSystem,
  useMasterFactions,
} from "@/hooks/useGameSystems";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Database,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  Gamepad2,
} from "lucide-react";

interface DiscoveryResult {
  success: boolean;
  repoType: string;
  gameSystem: string;
  factions: string[];
  fileCount: { gst: number; cat: number };
}

export default function AdminGameLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);

  // Form state for adding new game system
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);

  const { data: gameSystems, isLoading } = useGameSystems();
  const discoverMutation = useDiscoverBattleScribe();
  const syncMutation = useSyncBattleScribe();
  const createMutation = useCreateGameSystem();

  const handleDiscover = async () => {
    if (!newRepoUrl.trim()) return;
    setDiscoveryResult(null);

    try {
      const result = await discoverMutation.mutateAsync(newRepoUrl);
      setDiscoveryResult(result);
      if (!newName && result.gameSystem) {
        setNewName(result.gameSystem);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleCreateAndSync = async () => {
    if (!newName.trim() || !discoveryResult) return;

    try {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const gameSystem = await createMutation.mutateAsync({
        name: newName,
        slug,
        description: newDescription || undefined,
        repo_url: newRepoUrl,
        repo_type: "battlescribe",
      });

      // Sync immediately after creation
      await syncMutation.mutateAsync({
        repoUrl: newRepoUrl,
        gameSystemId: gameSystem.id,
      });

      // Reset and close
      setNewRepoUrl("");
      setNewName("");
      setNewDescription("");
      setDiscoveryResult(null);
      setAddModalOpen(false);
    } catch {
      // Error handled by mutations
    }
  };

  const handleResync = async (gameSystemId: string, repoUrl: string) => {
    setSyncingId(gameSystemId);
    try {
      await syncMutation.mutateAsync({ repoUrl, gameSystemId });
    } finally {
      setSyncingId(null);
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
                isSyncing={syncingId === system.id}
                onToggleExpand={() =>
                  setExpandedSystem(expandedSystem === system.id ? null : system.id)
                }
                onResync={() => system.repo_url && handleResync(system.id, system.repo_url)}
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
              Add your first game system from a BattleScribe repository
            </p>
            <TerminalButton onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Game System
            </TerminalButton>
          </TerminalCard>
        )}
      </main>

      {/* Add Game System Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-card border-primary/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Add Game System
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter a BattleScribe repository URL to import units and rules
              </p>

              <div className="flex gap-2">
                <div className="flex-1">
                  <TerminalInput
                    placeholder="https://github.com/username/repo"
                    value={newRepoUrl}
                    onChange={(e) => {
                      setNewRepoUrl(e.target.value);
                      setDiscoveryResult(null);
                    }}
                  />
                </div>
                <TerminalButton
                  variant="outline"
                  onClick={handleDiscover}
                  disabled={!newRepoUrl.trim() || discoverMutation.isPending}
                >
                  {discoverMutation.isPending ? (
                    <TerminalLoader text="..." size="sm" />
                  ) : (
                    "Discover"
                  )}
                </TerminalButton>
              </div>
            </div>

            {/* Discovery Result */}
            {discoveryResult && (
              <div className="space-y-4 animate-fade-in border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-2 text-sm text-primary">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Repository validated!</p>
                    <p className="text-xs text-primary/70 mt-1">
                      Found {discoveryResult.fileCount.cat} factions in{" "}
                      {discoveryResult.gameSystem}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {discoveryResult.factions.map((faction) => (
                    <Badge key={faction} variant="outline" className="text-xs">
                      {faction}
                    </Badge>
                  ))}
                </div>

                <TerminalInput
                  label="Game System Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Trench Crusade"
                />

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Description (Optional)
                  </label>
                  <textarea
                    className="flex w-full bg-input border border-border p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 min-h-[60px] resize-none"
                    placeholder="Brief description of the game system..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
            )}

            {discoverMutation.isError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 border border-destructive/30">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Could not access repository. Ensure it's public and contains BattleScribe files.
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <TerminalButton
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleCreateAndSync}
                disabled={
                  !discoveryResult ||
                  !newName.trim() ||
                  createMutation.isPending ||
                  syncMutation.isPending
                }
                className="flex-1"
              >
                {createMutation.isPending || syncMutation.isPending ? (
                  <TerminalLoader text="Importing" size="sm" />
                ) : (
                  "Import Game System"
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
  isSyncing: boolean;
  onToggleExpand: () => void;
  onResync: () => void;
}

function GameSystemCard({
  system,
  isExpanded,
  isSyncing,
  onToggleExpand,
  onResync,
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
                <span>Synced {new Date(system.last_synced_at).toLocaleDateString()}</span>
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
          {system.repo_url && (
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResync();
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <TerminalLoader text="" size="sm" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </TerminalButton>
          )}
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
              <GitBranch className="w-3 h-3" />
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
