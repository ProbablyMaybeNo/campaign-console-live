import { useState } from "react";
import { 
  Swords, Plus, Trash2, Play, Pause, Check, RefreshCw, 
  ChevronDown, ChevronRight, Users, Settings, AlertTriangle,
  Shuffle, Trophy, Calendar
} from "lucide-react";
import { 
  useBattleRounds, useBattleMatches, useCreateRound, useUpdateRound, 
  useDeleteRound, useCreateMatch, useDeleteMatch, useBulkCreateMatches,
  useApproveReport, useBattleReports,
  type BattleRound, type BattleMatch, type MatchParticipant, type ScoringConfig
} from "@/hooks/useBattleTracker";
import { useCampaignPlayers } from "@/hooks/useCampaignPlayers";
import { generatePairings, validatePairings, type PairingSystem, type Player, type PairingResult } from "@/lib/pairingAlgorithms";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BattlesManagerProps {
  campaignId: string;
}

const pairingSystems: { value: PairingSystem; label: string; description: string }[] = [
  { value: 'manual', label: 'Manual', description: 'Create pairings by hand' },
  { value: 'random', label: 'Random', description: 'Randomized pairings with anti-repeat' },
  { value: 'swiss', label: 'Swiss', description: 'Pair players with similar scores' },
  { value: 'round-robin', label: 'Round Robin', description: 'Everyone plays everyone' },
];

export function BattlesManager({ campaignId }: BattlesManagerProps) {
  const { data: rounds = [], isLoading: roundsLoading } = useBattleRounds(campaignId);
  const { data: players = [] } = useCampaignPlayers(campaignId);
  
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>();
  const [showPairingPreview, setShowPairingPreview] = useState(false);
  const [previewPairings, setPreviewPairings] = useState<PairingResult[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  
  const createRound = useCreateRound();
  const updateRound = useUpdateRound();
  const deleteRound = useDeleteRound();
  const bulkCreateMatches = useBulkCreateMatches();
  const deleteMatch = useDeleteMatch();
  
  const activeRound = rounds.find(r => r.id === selectedRoundId) || rounds[rounds.length - 1];
  const { data: matches = [] } = useBattleMatches(activeRound?.id);
  
  // Get disputed matches across all rounds
  const { data: allMatches = [] } = useBattleMatches(undefined); // Will need campaign-wide query
  const disputedMatches = matches.filter(m => m.status === 'disputed');
  
  const handleCreateRound = () => {
    const nextIndex = rounds.length + 1;
    createRound.mutate({
      campaignId,
      name: `Round ${nextIndex}`,
      roundIndex: nextIndex,
    });
  };
  
  const handleUpdateRoundStatus = (status: 'draft' | 'open' | 'closed') => {
    if (!activeRound) return;
    updateRound.mutate({
      roundId: activeRound.id,
      updates: { status },
    });
  };
  
  const handleGeneratePairings = () => {
    if (!activeRound) return;
    
    // Convert campaign players to pairing format
    const pairingPlayers: Player[] = players.map(p => ({
      id: p.user_id,
      name: p.profile?.display_name || 'Unknown',
      warbandId: undefined,
      warbandName: undefined,
      points: 0,
    }));
    
    // Build match history from previous rounds
    const matchHistory = matches.flatMap(m => {
      if (m.participants.length < 2) return [];
      return [{
        roundIndex: activeRound.round_index,
        playerAId: m.participants[0].playerId,
        playerBId: m.participants[1].playerId,
      }];
    });
    
    const pairings = generatePairings(
      activeRound.pairing_system as PairingSystem,
      pairingPlayers,
      activeRound.constraints_config,
      matchHistory,
      activeRound.round_index
    );
    
    const validation = validatePairings(pairings, activeRound.constraints_config, matchHistory);
    
    setPreviewPairings(pairings);
    setPreviewWarnings(validation.warnings);
    setShowPairingPreview(true);
  };
  
  const handleConfirmPairings = () => {
    if (!activeRound) return;
    
    bulkCreateMatches.mutate({
      campaignId,
      roundId: activeRound.id,
      matches: previewPairings.map((p, i) => ({
        participants: p.participants,
        matchIndex: i,
        isBye: p.isBye,
      })),
    }, {
      onSuccess: () => {
        setShowPairingPreview(false);
        setPreviewPairings([]);
        toast.success("Pairings created");
      },
    });
  };
  
  const handleDeleteAllMatches = () => {
    if (!activeRound) return;
    matches.forEach(m => {
      deleteMatch.mutate({
        matchId: m.id,
        roundId: activeRound.id,
        campaignId,
      });
    });
  };

  if (roundsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="rounds" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
          <TabsTrigger value="pairings">Pairings</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="disputes">
            Disputes
            {disputedMatches.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px]">{disputedMatches.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Rounds Tab */}
        <TabsContent value="rounds" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-primary">Round Management</h3>
            <TerminalButton size="sm" onClick={handleCreateRound} disabled={createRound.isPending}>
              <Plus className="w-3 h-3 mr-1" />
              Create Round
            </TerminalButton>
          </div>
          
          {rounds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No rounds created yet</p>
              <p className="text-xs">Create your first round to start tracking battles</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rounds.map(round => (
                <RoundCard
                  key={round.id}
                  round={round}
                  isSelected={round.id === activeRound?.id}
                  onSelect={() => setSelectedRoundId(round.id)}
                  onUpdateStatus={(status) => updateRound.mutate({ roundId: round.id, updates: { status } })}
                  onDelete={() => deleteRound.mutate({ roundId: round.id, campaignId })}
                  matchCount={round.id === activeRound?.id ? matches.length : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Pairings Tab */}
        <TabsContent value="pairings" className="space-y-4">
          {!activeRound ? (
            <div className="text-center py-8 text-muted-foreground">
              Create a round first to manage pairings
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-wider text-primary">{activeRound.name} Pairings</h3>
                  <p className="text-xs text-muted-foreground">{players.length} players available</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={activeRound.pairing_system}
                    onValueChange={(v) => updateRound.mutate({ roundId: activeRound.id, updates: { pairing_system: v } })}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pairingSystems.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {activeRound.pairing_system !== 'manual' && (
                    <TerminalButton size="sm" onClick={handleGeneratePairings}>
                      <Shuffle className="w-3 h-3 mr-1" />
                      Generate
                    </TerminalButton>
                  )}
                </div>
              </div>
              
              {/* Pairing Preview */}
              {showPairingPreview && (
                <div className="border border-primary/50 rounded p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider">Preview</span>
                    <div className="flex gap-2">
                      <TerminalButton size="sm" variant="ghost" onClick={() => setShowPairingPreview(false)}>
                        Cancel
                      </TerminalButton>
                      <TerminalButton size="sm" onClick={handleConfirmPairings} disabled={bulkCreateMatches.isPending}>
                        <Check className="w-3 h-3 mr-1" />
                        Confirm
                      </TerminalButton>
                    </div>
                  </div>
                  
                  {previewWarnings.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                      <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        Constraint Warnings
                      </div>
                      <ul className="text-[10px] text-yellow-400/80 space-y-0.5">
                        {previewWarnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {previewPairings.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                        <span className="w-6 text-muted-foreground">{i + 1}.</span>
                        {p.isBye ? (
                          <span>{p.participants[0]?.playerName} <Badge variant="outline" className="text-[9px]">BYE</Badge></span>
                        ) : (
                          <span>
                            {p.participants[0]?.playerName} <span className="text-muted-foreground">vs</span> {p.participants[1]?.playerName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Existing Matches */}
              {matches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{matches.length} matches</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <TerminalButton size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Clear All
                        </TerminalButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete all matches?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove all {matches.length} matches from this round. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAllMatches}>Delete All</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="space-y-1">
                    {matches.map((match, i) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        index={i}
                        onDelete={() => deleteMatch.mutate({ matchId: match.id, roundId: activeRound.id, campaignId })}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Manual Match Addition */}
              {activeRound.pairing_system === 'manual' && (
                <ManualMatchCreator
                  campaignId={campaignId}
                  roundId={activeRound.id}
                  players={players}
                  existingMatchCount={matches.length}
                />
              )}
            </>
          )}
        </TabsContent>
        
        {/* Scoring Tab */}
        <TabsContent value="scoring" className="space-y-4">
          {!activeRound ? (
            <div className="text-center py-8 text-muted-foreground">
              Create a round first to configure scoring
            </div>
          ) : (
            <ScoringConfig
              round={activeRound}
              onUpdate={(updates) => updateRound.mutate({ roundId: activeRound.id, updates })}
            />
          )}
        </TabsContent>
        
        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          <DisputesQueue
            matches={disputedMatches}
            campaignId={campaignId}
            roundId={activeRound?.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Round Card Component
interface RoundCardProps {
  round: BattleRound;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (status: 'draft' | 'open' | 'closed') => void;
  onDelete: () => void;
  matchCount?: number;
}

function RoundCard({ round, isSelected, onSelect, onUpdateStatus, onDelete, matchCount }: RoundCardProps) {
  const statusColors = {
    draft: "bg-muted text-muted-foreground",
    open: "bg-green-500/20 text-green-400",
    closed: "bg-blue-500/20 text-blue-400",
  };
  
  return (
    <div
      className={cn(
        "border rounded p-3 cursor-pointer transition-all",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{round.name}</span>
          <Badge className={cn("text-[10px]", statusColors[round.status])}>
            {round.status.toUpperCase()}
          </Badge>
          {matchCount !== undefined && (
            <span className="text-[10px] text-muted-foreground">{matchCount} matches</span>
          )}
        </div>
        
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {round.status === 'draft' && (
            <TerminalButton size="sm" variant="ghost" onClick={() => onUpdateStatus('open')}>
              <Play className="w-3 h-3" />
            </TerminalButton>
          )}
          {round.status === 'open' && (
            <TerminalButton size="sm" variant="ghost" onClick={() => onUpdateStatus('closed')}>
              <Check className="w-3 h-3" />
            </TerminalButton>
          )}
          {round.status === 'closed' && (
            <TerminalButton size="sm" variant="ghost" onClick={() => onUpdateStatus('open')}>
              <RefreshCw className="w-3 h-3" />
            </TerminalButton>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TerminalButton size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="w-3 h-3" />
              </TerminalButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {round.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the round and all its matches. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// Match Row Component
function MatchRow({ match, index, onDelete }: { match: BattleMatch; index: number; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 border border-border/30 rounded text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-5">{index + 1}.</span>
        {match.participants.map((p, i) => (
          <span key={p.playerId}>
            {i > 0 && <span className="text-muted-foreground mx-1">vs</span>}
            {p.playerName}
          </span>
        ))
        }
        {match.is_bye && <Badge variant="outline" className="text-[9px]">BYE</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[9px]">{match.status}</Badge>
        <button onClick={onDelete} className="p-1 text-destructive hover:bg-destructive/10 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Manual Match Creator
interface ManualMatchCreatorProps {
  campaignId: string;
  roundId: string;
  players: { user_id: string; profile?: { display_name: string | null } | null }[];
  existingMatchCount: number;
}

function ManualMatchCreator({ campaignId, roundId, players, existingMatchCount }: ManualMatchCreatorProps) {
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const createMatch = useCreateMatch();
  
  const handleCreate = () => {
    if (!playerA) return;
    
    const pA = players.find(p => p.user_id === playerA);
    const pB = playerB ? players.find(p => p.user_id === playerB) : null;
    
    if (!pA) return;
    
    const participants: MatchParticipant[] = [
      { playerId: pA.user_id, playerName: pA.profile?.display_name || 'Unknown', side: 'a' },
    ];
    
    if (pB) {
      participants.push({ playerId: pB.user_id, playerName: pB.profile?.display_name || 'Unknown', side: 'b' });
    }
    
    createMatch.mutate({
      campaignId,
      roundId,
      participants,
      matchIndex: existingMatchCount,
      isBye: !pB,
    }, {
      onSuccess: () => {
        setPlayerA("");
        setPlayerB("");
      },
    });
  };
  
  return (
    <div className="border border-dashed border-primary/30 rounded p-3 space-y-3">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Add Match</div>
      <div className="flex gap-2">
        <Select value={playerA} onValueChange={setPlayerA}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Player A" />
          </SelectTrigger>
          <SelectContent>
            {players.map(p => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.profile?.display_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-xs text-muted-foreground self-center">vs</span>
        
        <Select value={playerB} onValueChange={setPlayerB}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Player B (or BYE)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">BYE</SelectItem>
            {players.filter(p => p.user_id !== playerA).map(p => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.profile?.display_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <TerminalButton size="sm" onClick={handleCreate} disabled={!playerA || createMatch.isPending}>
          <Plus className="w-3 h-3" />
        </TerminalButton>
      </div>
    </div>
  );
}

// Scoring Config Component
function ScoringConfig({ round, onUpdate }: { round: BattleRound; onUpdate: (updates: Partial<BattleRound>) => void }) {
  const [scoring, setScoring] = useState<ScoringConfig>(round.scoring_config);
  
  const handleSave = () => {
    onUpdate({ scoring_config: scoring });
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-mono uppercase tracking-wider text-primary">Scoring & Approval</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Win Points</Label>
          <TerminalInput
            type="number"
            value={scoring.win}
            onChange={(e) => setScoring({ ...scoring, win: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Draw Points</Label>
          <TerminalInput
            type="number"
            value={scoring.draw}
            onChange={(e) => setScoring({ ...scoring, draw: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Loss Points</Label>
          <TerminalInput
            type="number"
            value={scoring.loss}
            onChange={(e) => setScoring({ ...scoring, loss: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Require Narrative</Label>
            <p className="text-[10px] text-muted-foreground">Players must write a battle report</p>
          </div>
          <Switch
            checked={scoring.requireNarrative}
            onCheckedChange={(v) => setScoring({ ...scoring, requireNarrative: v })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Auto-Approve Reports</Label>
            <p className="text-[10px] text-muted-foreground">Skip GM approval step</p>
          </div>
          <Switch
            checked={scoring.autoApprove}
            onCheckedChange={(v) => setScoring({ ...scoring, autoApprove: v })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Allow Quick Results</Label>
            <p className="text-[10px] text-muted-foreground">Submit outcome without full report</p>
          </div>
          <Switch
            checked={scoring.quickResultAllowed}
            onCheckedChange={(v) => setScoring({ ...scoring, quickResultAllowed: v })}
          />
        </div>
      </div>
      
      <TerminalButton onClick={handleSave} className="w-full">
        Save Scoring Settings
      </TerminalButton>
    </div>
  );
}

// Disputes Queue Component
function DisputesQueue({ matches, campaignId, roundId }: { matches: BattleMatch[]; campaignId: string; roundId?: string }) {
  const approveReport = useApproveReport();
  
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No disputed matches</p>
        <p className="text-xs">Conflicts will appear here for resolution</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-mono uppercase tracking-wider text-primary">Disputed Matches</h3>
      
      <div className="space-y-3">
        {matches.map(match => (
          <DisputeCard
            key={match.id}
            match={match}
            campaignId={campaignId}
            roundId={roundId}
          />
        ))}
      </div>
    </div>
  );
}

function DisputeCard({ match, campaignId, roundId }: { match: BattleMatch; campaignId: string; roundId?: string }) {
  const { data: reports = [] } = useBattleReports(match.id);
  const approveReport = useApproveReport();
  const [selectedOutcome, setSelectedOutcome] = useState<Record<string, 'win' | 'loss' | 'draw'>>({});
  
  const handleResolve = () => {
    if (!roundId || reports.length === 0) return;
    
    const finalResults: Record<string, { outcome: 'win' | 'loss' | 'draw'; points: number }> = {};
    match.participants.forEach(p => {
      finalResults[p.playerId] = {
        outcome: selectedOutcome[p.playerId] || 'draw',
        points: 0,
      };
    });
    
    approveReport.mutate({
      reportId: reports[0].id,
      matchId: match.id,
      finalResults,
      campaignId,
      roundId,
    });
  };
  
  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded p-3 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="font-medium text-sm">
          {match.participants.map((p, i) => (
            <span key={p.playerId}>
              {i > 0 && " vs "}
              {p.playerName}
            </span>
          ))}
        </span>
      </div>
      
      {/* Show conflicting reports */}
      {reports.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Submitted Reports</div>
          {reports.map(report => (
            <div key={report.id} className="text-xs bg-muted/30 p-2 rounded">
              <span className="font-medium">Side {report.player_side.toUpperCase()}:</span>{' '}
              <span className={cn(
                report.outcome === 'win' && "text-green-400",
                report.outcome === 'loss' && "text-red-400",
                report.outcome === 'draw' && "text-yellow-400"
              )}>
                {report.outcome}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Resolution */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Set Final Outcome</div>
        <div className="flex gap-2">
          {match.participants.map(p => (
            <Select
              key={p.playerId}
              value={selectedOutcome[p.playerId] || ''}
              onValueChange={(v) => setSelectedOutcome({ ...selectedOutcome, [p.playerId]: v as 'win' | 'loss' | 'draw' })}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder={`${p.playerName} result`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="draw">Draw</SelectItem>
              </SelectContent>
            </Select>
          ))}
        </div>
        <TerminalButton size="sm" onClick={handleResolve} className="w-full" disabled={approveReport.isPending}>
          <Check className="w-3 h-3 mr-1" />
          Resolve Dispute
        </TerminalButton>
      </div>
    </div>
  );
}
