import { useState, useMemo } from "react";
import { Search, Gamepad2, Check, Loader2, Library, X } from "lucide-react";
import { useGameSystems, useBSDataGallery, useImportFromGallery, GameSystem, BSDataGameSystem } from "@/hooks/useGameSystems";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { cn } from "@/lib/utils";

interface GameSystemPickerProps {
  value: string | null;
  onChange: (gameSystemId: string | null, gameSystemName?: string) => void;
  disabled?: boolean;
}

export function GameSystemPicker({ value, onChange, disabled }: GameSystemPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showGallery, setShowGallery] = useState(false);

  // Fetch already-imported game systems
  const { data: gameSystems = [], isLoading: loadingLocal } = useGameSystems({ status: "active" });
  
  // Fetch BSData gallery for browsing available imports
  const { data: galleryItems = [], isLoading: loadingGallery, refetch: refetchGallery } = useBSDataGallery();
  
  const importFromGallery = useImportFromGallery();

  // Selected game system details
  const selectedSystem = gameSystems.find((gs) => gs.id === value);

  // Filter local systems
  const filteredSystems = useMemo(() => {
    if (!search.trim()) return gameSystems;
    const q = search.toLowerCase();
    return gameSystems.filter((gs) => gs.name.toLowerCase().includes(q));
  }, [gameSystems, search]);

  // Filter gallery items (exclude already imported)
  const filteredGallery = useMemo(() => {
    const importedSlugs = new Set(gameSystems.map((gs) => gs.slug));
    let items = galleryItems.filter((gi) => {
      const slug = gi.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return !importedSlugs.has(slug);
    });
    
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((gi) => gi.name.toLowerCase().includes(q));
    }
    
    return items.slice(0, 50); // Limit for performance
  }, [galleryItems, gameSystems, search]);

  const handleSelect = (gs: GameSystem) => {
    onChange(gs.id, gs.name);
    setIsOpen(false);
    setSearch("");
    setShowGallery(false);
  };

  const handleImport = async (gi: BSDataGameSystem) => {
    await importFromGallery.mutateAsync(gi);
    // After import, the game system will be in the local list
    // We need to wait for the query to refresh and then select it
    setShowGallery(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
    setSearch("");
  };

  const handleOpenGallery = () => {
    setShowGallery(true);
    refetchGallery();
  };

  if (disabled) {
    return (
      <div className="border border-border rounded px-3 py-2 bg-muted/30 opacity-60">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono text-muted-foreground">
            {selectedSystem?.name || "No game system selected"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full border rounded px-3 py-2 text-left transition-colors flex items-center justify-between",
          isOpen
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-input"
        )}
      >
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-primary/60" />
          <span className={cn("text-sm font-mono", !selectedSystem && "text-muted-foreground")}>
            {selectedSystem?.name || "Select a game system (optional)"}
          </span>
        </div>
        {selectedSystem && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 border border-primary/30 rounded bg-card shadow-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search game systems..."
                className="w-full pl-8 pr-3 py-1.5 text-sm font-mono bg-input border border-border rounded focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setShowGallery(false)}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                !showGallery
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Imported ({gameSystems.length})
            </button>
            <button
              type="button"
              onClick={handleOpenGallery}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
                showGallery
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Library className="w-3 h-3" />
              Browse Gallery
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!showGallery ? (
              // Local imported systems
              loadingLocal ? (
                <div className="p-4 flex justify-center">
                  <TerminalLoader text="Loading" size="sm" />
                </div>
              ) : filteredSystems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {gameSystems.length === 0 ? (
                    <div className="space-y-2">
                      <p>No game systems imported yet.</p>
                      <TerminalButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenGallery}
                      >
                        <Library className="w-3 h-3 mr-1.5" />
                        Browse Gallery
                      </TerminalButton>
                    </div>
                  ) : (
                    "No matches found"
                  )}
                </div>
              ) : (
                <div className="p-1">
                  {filteredSystems.map((gs) => (
                    <button
                      key={gs.id}
                      type="button"
                      onClick={() => handleSelect(gs)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors",
                        gs.id === value
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <div>
                        <p className="text-sm font-mono">{gs.name}</p>
                        {gs.version && (
                          <p className="text-[10px] text-muted-foreground">v{gs.version}</p>
                        )}
                      </div>
                      {gs.id === value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )
            ) : (
              // BSData gallery
              loadingGallery ? (
                <div className="p-4 flex justify-center">
                  <TerminalLoader text="Loading gallery" size="sm" />
                </div>
              ) : filteredGallery.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {search.trim() ? "No matches found" : "All available systems already imported"}
                </div>
              ) : (
                <div className="p-1">
                  {filteredGallery.map((gi) => (
                    <div
                      key={gi.repositoryUrl}
                      className="px-3 py-2 rounded hover:bg-muted flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{gi.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          v{gi.version} • Updated {new Date(gi.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                      <TerminalButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImport(gi)}
                        disabled={importFromGallery.isPending}
                        className="ml-2 shrink-0"
                      >
                        {importFromGallery.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Import"
                        )}
                      </TerminalButton>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-3 py-2 bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              {showGallery
                ? "Import a game system to use it in campaigns"
                : "Select a game system or browse the gallery to import"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}