import { useState, useMemo, useCallback } from "react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, RotateCcw, Save, Settings, Shuffle, Upload, X, Lock, Unlock, Copy } from "lucide-react";
import { toast } from "sonner";
import { uploadCampaignImage, ImageUploadError } from "@/lib/imageStorage";

// ── Types ────────────────────────────────────────────────────────────────────

interface CardEntry {
  id: string;
  type: "text" | "image";
  content: string; // text content or image URL
  label?: string;
}

interface Deck {
  id: string;
  name: string;
  cards: CardEntry[];
  drawnIds: string[]; // IDs of cards already drawn
  isCustom?: boolean;
  isLocked?: boolean; // saved/locked decks survive resets
}

interface CardDeckConfig {
  decks?: Deck[];
  lastDrawnCard?: CardEntry | null;
  selectedDeckId?: string;
}

interface CardDeckWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
  campaignId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function CardDeckWidget({ component, isGM, campaignId }: CardDeckWidgetProps) {
  const updateComponent = useUpdateComponent();
  const config = (component.config as unknown as CardDeckConfig) ?? {};

  const decks: Deck[] = config.decks ?? [];
  const lastDrawnCard = config.lastDrawnCard ?? null;
  const selectedDeckId = config.selectedDeckId ?? (decks[0]?.id ?? "");

  const [configOpen, setConfigOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const selectedDeck = useMemo(() => decks.find((d) => d.id === selectedDeckId), [decks, selectedDeckId]);

  const remainingCards = useMemo(() => {
    if (!selectedDeck) return 0;
    return selectedDeck.cards.length - selectedDeck.drawnIds.length;
  }, [selectedDeck]);

  // ── Persist helper ──────────────────────────────────────────────────────

  const persist = useCallback(
    (patch: Partial<CardDeckConfig>) => {
      updateComponent.mutate({
        id: component.id,
        config: { ...config, ...patch } as unknown as Record<string, unknown>,
      });
    },
    [updateComponent, component.id, config]
  );

  // ── Draw ────────────────────────────────────────────────────────────────

  const handleDraw = useCallback(() => {
    if (!selectedDeck) return;
    const available = selectedDeck.cards.filter((c) => !selectedDeck.drawnIds.includes(c.id));
    if (available.length === 0) {
      toast.info("No cards remaining in this deck");
      return;
    }

    setIsDrawing(true);
    // Small delay for dramatic effect
    setTimeout(() => {
      const drawn = available[Math.floor(Math.random() * available.length)];
      const updatedDecks = decks.map((d) =>
        d.id === selectedDeck.id ? { ...d, drawnIds: [...d.drawnIds, drawn.id] } : d
      );
      persist({ decks: updatedDecks, lastDrawnCard: drawn });
      setIsDrawing(false);
    }, 400);
  }, [selectedDeck, decks, persist]);

  // ── Reset selected deck ────────────────────────────────────────────────

  const handleResetDeck = useCallback(() => {
    if (!selectedDeck) return;
    const updatedDecks = decks.map((d) => (d.id === selectedDeck.id ? { ...d, drawnIds: [] } : d));
    persist({ decks: updatedDecks, lastDrawnCard: null });
    toast.success(`"${selectedDeck.name}" reset`);
  }, [selectedDeck, decks, persist]);

  // ── Reset all ──────────────────────────────────────────────────────────

  const handleResetAll = useCallback(() => {
    const reset = decks
      .filter((d) => !d.isCustom || d.isLocked)
      .map((d) => ({ ...d, drawnIds: [] }));
    persist({ decks: reset, lastDrawnCard: null });
    toast.success("All decks reset — unsaved custom decks removed");
  }, [decks, persist]);

  // ── Select deck ────────────────────────────────────────────────────────

  const handleSelectDeck = useCallback(
    (id: string) => {
      persist({ selectedDeckId: id, lastDrawnCard: null });
    },
    [persist]
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full font-mono text-xs" data-scrollable="true">
      {/* Drawn card display area */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-[120px] overflow-hidden">
        {isDrawing ? (
          <div className="animate-pulse text-primary text-2xl">🂠</div>
        ) : lastDrawnCard ? (
          lastDrawnCard.type === "image" ? (
            <img
              src={lastDrawnCard.content}
              alt={lastDrawnCard.label ?? "Drawn card"}
              className="max-h-full max-w-full object-contain rounded border border-border"
            />
          ) : (
            <div className="bg-muted/30 border border-border rounded p-4 max-w-full text-center">
              {lastDrawnCard.label && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {lastDrawnCard.label}
                </p>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                {lastDrawnCard.content}
              </p>
            </div>
          )
        ) : (
          <p className="text-muted-foreground italic text-center">
            {decks.length === 0 ? "No decks configured" : "Select a deck and draw a card"}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border p-2 space-y-2">
        {/* Deck selector */}
        {decks.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedDeckId || "_none"} onValueChange={handleSelectDeck}>
              <SelectTrigger className="h-7 text-xs flex-1 font-mono">
                <SelectValue placeholder="Select deck…" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs font-mono">
                    {d.name} ({d.cards.length - d.drawnIds.length}/{d.cards.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <TerminalButton
            size="sm"
            onClick={handleDraw}
            disabled={!selectedDeck || remainingCards === 0 || isDrawing}
            className="flex-1 min-w-[70px]"
          >
            <Shuffle className="w-3 h-3 mr-1" />
            Draw{remainingCards > 0 ? ` (${remainingCards})` : ""}
          </TerminalButton>

          <TerminalButton
            size="sm"
            variant="outline"
            onClick={handleResetDeck}
            disabled={!selectedDeck}
            className="flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </TerminalButton>

          {isGM && (
            <>
              <TerminalButton
                size="sm"
                variant="outline"
                onClick={handleResetAll}
                className="flex-shrink-0"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                All
              </TerminalButton>

              <TerminalButton
                size="sm"
                variant="outline"
                onClick={() => setConfigOpen(true)}
                className="flex-shrink-0"
              >
                <Settings className="w-3 h-3" />
              </TerminalButton>
            </>
          )}
        </div>
      </div>

      {/* GM Configuration Dialog */}
      {isGM && (
        <DeckConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          decks={decks}
          campaignId={campaignId}
          onSave={(updatedDecks) => persist({ decks: updatedDecks })}
        />
      )}
    </div>
  );
}

// ── Config Dialog ────────────────────────────────────────────────────────────

function DeckConfigDialog({
  open,
  onOpenChange,
  decks,
  campaignId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  decks: Deck[];
  campaignId: string;
  onSave: (decks: Deck[]) => void;
}) {
  const [localDecks, setLocalDecks] = useState<Deck[]>(decks);
  const [selectedDeckIdx, setSelectedDeckIdx] = useState(0);
  const [newDeckName, setNewDeckName] = useState("");
  const [newCardText, setNewCardText] = useState("");
  const [newCardLabel, setNewCardLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tab, setTab] = useState<string>("manage");

  // Sync when dialog opens
  const handleOpen = (v: boolean) => {
    if (v) {
      setLocalDecks(decks);
      setSelectedDeckIdx(decks.length > 0 ? 0 : -1);
    }
    onOpenChange(v);
  };

  const currentDeck = localDecks[selectedDeckIdx] ?? null;

  // ── Deck CRUD ──────────────────────────────────────────────────────────

  const addDeck = () => {
    const name = newDeckName.trim() || `Deck ${localDecks.length + 1}`;
    const deck: Deck = { id: generateId(), name, cards: [], drawnIds: [] };
    setLocalDecks((prev) => [...prev, deck]);
    setSelectedDeckIdx(localDecks.length);
    setNewDeckName("");
  };

  const deleteDeck = (idx: number) => {
    setLocalDecks((prev) => prev.filter((_, i) => i !== idx));
    setSelectedDeckIdx((prev) => Math.max(0, prev >= idx ? prev - 1 : prev));
  };

  const toggleLock = (idx: number) => {
    setLocalDecks((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, isLocked: !d.isLocked } : d))
    );
  };

  // ── Card CRUD ──────────────────────────────────────────────────────────

  const addTextCard = () => {
    if (!currentDeck || !newCardText.trim()) return;
    const card: CardEntry = {
      id: generateId(),
      type: "text",
      content: newCardText.trim(),
      label: newCardLabel.trim() || undefined,
    };
    updateDeckCards([...currentDeck.cards, card]);
    setNewCardText("");
    setNewCardLabel("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentDeck || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const result = await uploadCampaignImage(campaignId, file, "widgets");
      const card: CardEntry = {
        id: generateId(),
        type: "image",
        content: result.url,
        label: file.name,
      };
      updateDeckCards([...currentDeck.cards, card]);
      toast.success("Card image uploaded");
    } catch (err) {
      toast.error(err instanceof ImageUploadError ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeCard = (cardId: string) => {
    if (!currentDeck) return;
    updateDeckCards(currentDeck.cards.filter((c) => c.id !== cardId));
  };

  const updateDeckCards = (cards: CardEntry[]) => {
    setLocalDecks((prev) =>
      prev.map((d, i) => (i === selectedDeckIdx ? { ...d, cards } : d))
    );
  };

  // ── Custom deck builder ────────────────────────────────────────────────

  const buildCustomDeck = () => {
    // Creates a new custom deck — user picks cards from existing decks in the manage tab
    const name = newDeckName.trim() || `Custom ${localDecks.length + 1}`;
    const deck: Deck = { id: generateId(), name, cards: [], drawnIds: [], isCustom: true };
    setLocalDecks((prev) => [...prev, deck]);
    setSelectedDeckIdx(localDecks.length);
    setNewDeckName("");
    setTab("manage");
    toast.info("Custom deck created — add cards from existing decks using the copy button");
  };

  const copyCardToDeck = (card: CardEntry, targetDeckIdx: number) => {
    setLocalDecks((prev) =>
      prev.map((d, i) =>
        i === targetDeckIdx ? { ...d, cards: [...d.cards, { ...card, id: generateId() }] } : d
      )
    );
    toast.success("Card copied");
  };

  // ── Save & close ───────────────────────────────────────────────────────

  const handleSave = () => {
    onSave(localDecks);
    onOpenChange(false);
    toast.success("Decks saved");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-primary/30 max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">{">"}</span>
            Deck Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30">
            <TabsTrigger value="manage" className="font-mono text-xs uppercase">
              Manage Decks
            </TabsTrigger>
            <TabsTrigger value="custom" className="font-mono text-xs uppercase">
              Custom Deck
            </TabsTrigger>
          </TabsList>

          {/* ── Manage Tab ──────────────────────────────────────────────── */}
          <TabsContent value="manage" className="space-y-4 mt-4">
            {/* Add new deck */}
            <div className="flex gap-2">
              <TerminalInput
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="New deck name…"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addDeck()}
              />
              <TerminalButton size="sm" onClick={addDeck}>
                <Plus className="w-3 h-3 mr-1" /> Deck
              </TerminalButton>
            </div>

            {/* Deck list */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {localDecks.map((deck, idx) => (
                <div
                  key={deck.id}
                  onClick={() => setSelectedDeckIdx(idx)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors ${
                    idx === selectedDeckIdx
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {deck.isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                    {deck.isCustom && <span className="text-[9px] text-accent">★</span>}
                    {deck.name}
                    <span className="text-muted-foreground">({deck.cards.length})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleLock(idx); }} className="p-0.5 hover:text-primary">
                      {deck.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteDeck(idx); }} className="p-0.5 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {localDecks.length === 0 && (
                <p className="text-muted-foreground text-center py-4 italic">No decks yet</p>
              )}
            </div>

            {/* Card editor for selected deck */}
            {currentDeck && (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cards in "{currentDeck.name}"
                </p>

                {/* Add text card */}
                <div className="space-y-1.5">
                  <TerminalInput
                    value={newCardLabel}
                    onChange={(e) => setNewCardLabel(e.target.value)}
                    placeholder="Card label (optional)…"
                  />
                  <div className="flex gap-2">
                    <TerminalInput
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      placeholder="Card text content…"
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addTextCard()}
                    />
                    <TerminalButton size="sm" onClick={addTextCard} disabled={!newCardText.trim()}>
                      <Plus className="w-3 h-3" />
                    </TerminalButton>
                  </div>
                </div>

                {/* Add image card */}
                <div>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-mono text-primary hover:text-primary/80 transition-colors">
                    <Upload className="w-3 h-3" />
                    {isUploading ? "Uploading…" : "Upload Image Card"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {/* Card list */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentDeck.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center gap-2 px-2 py-1 bg-muted/20 rounded text-xs"
                    >
                      <span className="text-muted-foreground text-[10px] flex-shrink-0">
                        {card.type === "image" ? "🖼" : "📝"}
                      </span>
                      <span className="truncate flex-1">
                        {card.label ?? (card.type === "image" ? "Image" : card.content.slice(0, 40))}
                      </span>

                      {/* Copy to another deck */}
                      {localDecks.filter((d) => d.id !== currentDeck.id).length > 0 && (
                        <select
                          className="bg-transparent border-none text-[10px] text-muted-foreground cursor-pointer w-5 p-0"
                          title="Copy to deck"
                          value=""
                          onChange={(e) => {
                            const targetIdx = localDecks.findIndex((d) => d.id === e.target.value);
                            if (targetIdx >= 0) copyCardToDeck(card, targetIdx);
                          }}
                        >
                          <option value="" disabled>
                            ↗
                          </option>
                          {localDecks
                            .filter((d) => d.id !== currentDeck.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                → {d.name}
                              </option>
                            ))}
                        </select>
                      )}

                      <button onClick={() => removeCard(card.id)} className="p-0.5 hover:text-destructive flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {currentDeck.cards.length === 0 && (
                    <p className="text-muted-foreground text-center py-2 italic">No cards yet</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Custom Deck Tab ──────────────────────────────────────────── */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Create a custom deck that pulls cards from your existing decks. Custom decks that aren't saved/locked will be removed on a full reset.
            </p>
            <div className="flex gap-2">
              <TerminalInput
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Custom deck name…"
                className="flex-1"
              />
              <TerminalButton size="sm" onClick={buildCustomDeck}>
                <Copy className="w-3 h-3 mr-1" /> Create
              </TerminalButton>
            </div>
            <p className="text-[10px] text-muted-foreground">
              After creating, switch to the Manage tab and use the ↗ dropdown on individual cards to copy them into your custom deck.
            </p>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <TerminalButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </TerminalButton>
          <TerminalButton onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> Save Decks
          </TerminalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
