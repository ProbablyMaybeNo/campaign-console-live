import { useState } from "react";
import { X, FileText, Trophy, Minus, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBattleMatches, useBattleReports, useSubmitBattleReport, type BattleReport } from "@/hooks/useBattleTracker";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BattleReportOverlayProps {
  matchId: string;
  campaignId: string;
  roundId: string;
  userId: string;
  onClose: () => void;
}

export function BattleReportOverlay({ matchId, campaignId, roundId, userId, onClose }: BattleReportOverlayProps) {
  const { data: matches = [] } = useBattleMatches(roundId);
  const match = matches.find(m => m.id === matchId);
  const submitReport = useSubmitBattleReport();
  
  const playerParticipant = match?.participants.find(p => p.playerId === userId);
  const playerSide = playerParticipant?.side || 'a';
  
  const [outcome, setOutcome] = useState<'win' | 'loss' | 'draw'>('win');
  const [pointsEarned, setPointsEarned] = useState(0);
  const [narrative, setNarrative] = useState("");
  const [injuries, setInjuries] = useState<{ unitName: string; injury: string; notes?: string }[]>([]);
  const [notableEvents, setNotableEvents] = useState<{ tag: string; description: string }[]>([]);
  const [lootFound, setLootFound] = useState<{ item: string; quantity?: number; notes?: string }[]>([]);
  const [resources, setResources] = useState<{ gained?: number; spent?: number }>({});
  
  const handleSubmit = () => {
    submitReport.mutate({
      matchId,
      campaignId,
      roundId,
      report: {
        player_side: playerSide,
        outcome,
        points_earned: pointsEarned,
        narrative: narrative || null,
        injuries,
        notable_events: notableEvents,
        loot_found: lootFound,
        resources,
        attachments: [],
      },
    }, {
      onSuccess: () => onClose(),
    });
  };
  
  const addInjury = () => setInjuries([...injuries, { unitName: "", injury: "", notes: "" }]);
  const removeInjury = (i: number) => setInjuries(injuries.filter((_, idx) => idx !== i));
  const updateInjury = (i: number, field: string, value: string) => {
    const updated = [...injuries];
    (updated[i] as any)[field] = value;
    setInjuries(updated);
  };
  
  const addEvent = () => setNotableEvents([...notableEvents, { tag: "", description: "" }]);
  const removeEvent = (i: number) => setNotableEvents(notableEvents.filter((_, idx) => idx !== i));
  const updateEvent = (i: number, field: string, value: string) => {
    const updated = [...notableEvents];
    (updated[i] as any)[field] = value;
    setNotableEvents(updated);
  };
  
  const addLoot = () => setLootFound([...lootFound, { item: "", quantity: 1, notes: "" }]);
  const removeLoot = (i: number) => setLootFound(lootFound.filter((_, idx) => idx !== i));
  const updateLoot = (i: number, field: string, value: string | number) => {
    const updated = [...lootFound];
    (updated[i] as any)[field] = value;
    setLootFound(updated);
  };

  if (!match) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="relative w-full max-w-xl bg-card border border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)] flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-primary/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono uppercase tracking-widest text-primary">Battle Report</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-accent rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Match Info */}
              <div className="text-xs text-muted-foreground">
                {match.participants.map((p, i) => (
                  <span key={p.playerId}>
                    {i > 0 && " vs "}
                    <span className={cn(p.playerId === userId && "text-primary font-medium")}>{p.playerName}</span>
                  </span>
                ))}
              </div>
              
              {/* Outcome */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Your Result</Label>
                <div className="flex gap-2">
                  {(['win', 'loss', 'draw'] as const).map(o => (
                    <button
                      key={o}
                      onClick={() => setOutcome(o)}
                      className={cn(
                        "flex-1 py-2 px-3 border rounded text-sm font-medium transition-all",
                        outcome === o
                          ? o === 'win' ? "border-green-500 bg-green-500/20 text-green-400"
                            : o === 'loss' ? "border-red-500 bg-red-500/20 text-red-400"
                            : "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {o === 'win' && <Trophy className="w-4 h-4 inline mr-1" />}
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Points */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Points Earned</Label>
                <TerminalInput
                  type="number"
                  value={pointsEarned}
                  onChange={(e) => setPointsEarned(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              
              {/* Narrative */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Battle Report / Narrative</Label>
                <Textarea
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder="Describe the battle..."
                  className="min-h-[100px] bg-background border-primary/30"
                />
              </div>
              
              {/* Injuries */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Unit Injuries</Label>
                  <button onClick={addInjury} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {injuries.map((injury, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <TerminalInput
                      placeholder="Unit name"
                      value={injury.unitName}
                      onChange={(e) => updateInjury(i, 'unitName', e.target.value)}
                      className="flex-1"
                    />
                    <TerminalInput
                      placeholder="Injury"
                      value={injury.injury}
                      onChange={(e) => updateInjury(i, 'injury', e.target.value)}
                      className="flex-1"
                    />
                    <button onClick={() => removeInjury(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Notable Events */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Notable Events</Label>
                  <button onClick={addEvent} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {notableEvents.map((event, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <TerminalInput
                      placeholder="Tag"
                      value={event.tag}
                      onChange={(e) => updateEvent(i, 'tag', e.target.value)}
                      className="w-24"
                    />
                    <TerminalInput
                      placeholder="Description"
                      value={event.description}
                      onChange={(e) => updateEvent(i, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <button onClick={() => removeEvent(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Loot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Items / Loot Found</Label>
                  <button onClick={addLoot} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {lootFound.map((loot, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <TerminalInput
                      placeholder="Item"
                      value={loot.item}
                      onChange={(e) => updateLoot(i, 'item', e.target.value)}
                      className="flex-1"
                    />
                    <TerminalInput
                      type="number"
                      placeholder="Qty"
                      value={loot.quantity || ''}
                      onChange={(e) => updateLoot(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-16"
                    />
                    <button onClick={() => removeLoot(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Resources */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Resources</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Gained:</span>
                    <TerminalInput
                      type="number"
                      value={resources.gained || ''}
                      onChange={(e) => setResources({ ...resources, gained: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Spent:</span>
                    <TerminalInput
                      type="number"
                      value={resources.spent || ''}
                      onChange={(e) => setResources({ ...resources, spent: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          {/* Footer */}
          <div className="p-4 border-t border-primary/30 shrink-0 flex justify-end gap-2">
            <TerminalButton variant="ghost" onClick={onClose}>Cancel</TerminalButton>
            <TerminalButton onClick={handleSubmit} disabled={submitReport.isPending}>
              {submitReport.isPending ? "Submitting..." : "Submit Report"}
            </TerminalButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
