import { useState } from "react";
import { Swords, ChevronDown, ChevronRight, Clock, CheckCircle2, AlertTriangle, FileText, Trophy, Minus, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBattleRounds, useBattleMatches, useBattleReports, useUpdateMatch, useBattleMatchesRealtime, type BattleMatch, type BattleRound, type MatchParticipant } from "@/hooks/useBattleTracker";
import { useOverlayState } from "@/hooks/useOverlayState";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BattleReportOverlay } from "./BattleReportOverlay";
import { ViewReportOverlay } from "./ViewReportOverlay";

interface BattleTrackerWidgetProps {
  campaignId: string;
  isGM?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  unplayed: { label: "Unplayed", color: "bg-muted text-muted-foreground", icon: Clock },
  played: { label: "Played", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-500/20 text-blue-400", icon: FileText },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  disputed: { label: "Disputed", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
};

export function BattleTrackerWidget({ campaignId, isGM = false }: BattleTrackerWidgetProps) {
  const { user } = useAuth();
  const { openOverlay } = useOverlayState();
  const { data: rounds = [], isLoading: roundsLoading } = useBattleRounds(campaignId);
  
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [reportMatchId, setReportMatchId] = useState<string | null>(null);
  const [viewReportMatchId, setViewReportMatchId] = useState<string | null>(null);
  
  // Get current round (latest open or last if none open)
  const currentRound = rounds.find(r => r.status === 'open') || rounds[rounds.length - 1];
  const activeRoundId = selectedRoundId || currentRound?.id;
  const activeRound = rounds.find(r => r.id === activeRoundId);
  
  const { data: matches = [], isLoading: matchesLoading } = useBattleMatches(activeRoundId);
  useBattleMatchesRealtime(activeRoundId);
  
  const updateMatch = useUpdateMatch();
  
  // Group matches by round for history
  const historyRounds = rounds.filter(r => r.id !== activeRoundId && r.status === 'closed');
  
  const isParticipant = (match: BattleMatch) => {
    return match.participants.some(p => p.playerId === user?.id);
  };
  
  const getPlayerSide = (match: BattleMatch): 'a' | 'b' | null => {
    const participant = match.participants.find(p => p.playerId === user?.id);
    return participant?.side as 'a' | 'b' | null;
  };
  
  const canEdit = (match: BattleMatch) => {
    if (isGM) return true;
    if (activeRound?.status !== 'open') return false;
    return isParticipant(match);
  };
  
  const handleTogglePlayed = (match: BattleMatch) => {
    const newStatus = match.status === 'unplayed' ? 'played' : 'unplayed';
    updateMatch.mutate({
      matchId: match.id,
      updates: { 
        status: newStatus,
        provisional_results: newStatus === 'unplayed' ? {} : match.provisional_results,
      },
    });
  };
  
  const handleOutcomeChange = (match: BattleMatch, playerId: string, outcome: 'win' | 'loss' | 'draw') => {
    const newResults = { ...match.provisional_results };
    newResults[playerId] = { outcome, points: 0 };
    
    // Auto-set opponent's outcome for 1v1
    if (match.participants.length === 2) {
      const opponent = match.participants.find(p => p.playerId !== playerId);
      if (opponent) {
        const oppositeOutcome = outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw';
        newResults[opponent.playerId] = { outcome: oppositeOutcome, points: 0 };
      }
    }
    
    updateMatch.mutate({
      matchId: match.id,
      updates: { provisional_results: newResults },
    });
  };
  
  const toggleHistoryRound = (roundId: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(roundId)) {
      newExpanded.delete(roundId);
    } else {
      newExpanded.add(roundId);
    }
    setExpandedHistory(newExpanded);
  };

  if (roundsLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
        <Swords className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">No battle rounds yet</p>
        {isGM && (
          <TerminalButton size="sm" onClick={() => openOverlay("battles" as any)}>
            <Settings className="w-3 h-3 mr-1" />
            Setup Battles
          </TerminalButton>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-2 border-b border-primary/30 shrink-0">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wider text-primary">Battle Tracker</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Round Selector */}
          <Select value={activeRoundId} onValueChange={setSelectedRoundId}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue placeholder="Select round" />
            </SelectTrigger>
            <SelectContent>
              {rounds.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Round Status */}
          {activeRound && (
            <Badge variant={activeRound.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
              {activeRound.status.toUpperCase()}
            </Badge>
          )}
          
          {/* GM Control */}
          {isGM && (
            <TerminalButton size="sm" variant="ghost" onClick={() => openOverlay("battles" as any)}>
              <Settings className="w-3 h-3" />
            </TerminalButton>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Current Round Pairings */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Current Pairings
            </div>
            
            {matchesLoading ? (
              <div className="text-xs text-muted-foreground">Loading matches...</div>
            ) : matches.length === 0 ? (
              <div className="text-xs text-muted-foreground">No matches in this round</div>
            ) : (
              <div className="space-y-2">
                {matches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    round={activeRound}
                    isGM={isGM}
                    userId={user?.id}
                    canEdit={canEdit(match)}
                    onTogglePlayed={() => handleTogglePlayed(match)}
                    onOutcomeChange={(playerId, outcome) => handleOutcomeChange(match, playerId, outcome)}
                    onReportBattle={() => setReportMatchId(match.id)}
                    onViewReport={() => setViewReportMatchId(match.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* History */}
          {historyRounds.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                History
              </div>
              
              <div className="space-y-1">
                {historyRounds.map(round => (
                  <HistoryRoundSection
                    key={round.id}
                    round={round}
                    isExpanded={expandedHistory.has(round.id)}
                    onToggle={() => toggleHistoryRound(round.id)}
                    onViewReport={setViewReportMatchId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Report Battle Overlay */}
      {reportMatchId && (
        <BattleReportOverlay
          matchId={reportMatchId}
          campaignId={campaignId}
          roundId={activeRoundId!}
          userId={user?.id || ''}
          onClose={() => setReportMatchId(null)}
        />
      )}
      
      {/* View Report Overlay */}
      {viewReportMatchId && (
        <ViewReportOverlay
          matchId={viewReportMatchId}
          onClose={() => setViewReportMatchId(null)}
        />
      )}
    </div>
  );
}

// Match Card Component
interface MatchCardProps {
  match: BattleMatch;
  round?: BattleRound;
  isGM: boolean;
  userId?: string;
  canEdit: boolean;
  onTogglePlayed: () => void;
  onOutcomeChange: (playerId: string, outcome: 'win' | 'loss' | 'draw') => void;
  onReportBattle: () => void;
  onViewReport: () => void;
}

function MatchCard({ match, round, isGM, userId, canEdit, onTogglePlayed, onOutcomeChange, onReportBattle, onViewReport }: MatchCardProps) {
  const status = statusConfig[match.status];
  const StatusIcon = status.icon;
  
  const isParticipant = match.participants.some(p => p.playerId === userId);
  const playerSide = match.participants.find(p => p.playerId === userId)?.side;
  
  const canReport = (isParticipant || isGM) && match.status === 'played' && round?.status === 'open';
  const hasReport = match.status === 'submitted' || match.status === 'approved';
  
  return (
    <div className={cn(
      "border rounded p-2 space-y-2",
      isParticipant ? "border-primary/50 bg-primary/5" : "border-border/50",
      match.is_bye && "opacity-60"
    )}>
      {/* Participants */}
      <div className="flex items-center gap-2 text-sm">
        {match.participants.map((p, i) => (
          <div key={p.playerId} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-xs">vs</span>}
            <span className={cn(
              "font-medium",
              p.playerId === userId && "text-primary"
            )}>
              {p.playerName}
            </span>
            {p.warbandName && (
              <span className="text-[10px] text-muted-foreground">({p.warbandName})</span>
            )}
          </div>
        ))}
        {match.is_bye && <Badge variant="outline" className="text-[10px]">BYE</Badge>}
      </div>
      
      {/* Status & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", status.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
          
          {/* Outcome display */}
          {match.status !== 'unplayed' && match.participants.length === 2 && (
            <div className="flex items-center gap-1 text-[10px]">
              {match.participants.map((p, i) => {
                const result = match.final_results[p.playerId] || match.provisional_results[p.playerId];
                if (!result) return null;
                return (
                  <span key={p.playerId} className={cn(
                    "px-1 rounded",
                    result.outcome === 'win' && "bg-green-500/20 text-green-400",
                    result.outcome === 'loss' && "bg-red-500/20 text-red-400",
                    result.outcome === 'draw' && "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {i === 0 ? 'A' : 'B'}: {result.outcome.charAt(0).toUpperCase()}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {canEdit && !match.is_bye && match.status === 'unplayed' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Played</span>
              <Switch
                checked={match.status !== 'unplayed'}
                onCheckedChange={onTogglePlayed}
                className="scale-75"
              />
            </div>
          )}
          
          {canEdit && match.status === 'played' && !match.is_bye && (
            <div className="flex items-center gap-1">
              {match.participants.filter(p => isGM || p.playerId === userId).map(p => (
                <Select
                  key={p.playerId}
                  value={match.provisional_results[p.playerId]?.outcome || ''}
                  onValueChange={(v) => onOutcomeChange(p.playerId, v as 'win' | 'loss' | 'draw')}
                >
                  <SelectTrigger className="h-6 text-[10px] w-[70px]">
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win"><Trophy className="w-3 h-3 inline mr-1" />Win</SelectItem>
                    <SelectItem value="loss"><Minus className="w-3 h-3 inline mr-1" />Loss</SelectItem>
                    <SelectItem value="draw"><Minus className="w-3 h-3 inline mr-1" />Draw</SelectItem>
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
          
          {canReport && (
            <TerminalButton size="sm" variant="outline" onClick={onReportBattle} className="text-[10px] h-6">
              <FileText className="w-3 h-3 mr-1" />
              Report
            </TerminalButton>
          )}
          
          {hasReport && (
            <TerminalButton size="sm" variant="ghost" onClick={onViewReport} className="text-[10px] h-6">
              View
            </TerminalButton>
          )}
        </div>
      </div>
    </div>
  );
}

// History Round Section
interface HistoryRoundSectionProps {
  round: BattleRound;
  isExpanded: boolean;
  onToggle: () => void;
  onViewReport: (matchId: string) => void;
}

function HistoryRoundSection({ round, isExpanded, onToggle, onViewReport }: HistoryRoundSectionProps) {
  const { data: matches = [] } = useBattleMatches(isExpanded ? round.id : undefined);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/30 rounded text-left">
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="text-xs font-medium">{round.name}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">Closed</Badge>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="pl-5 space-y-1 py-1">
          {matches.map(match => (
            <div key={match.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-1">
                {match.participants.map((p, i) => (
                  <span key={p.playerId}>
                    {i > 0 && " vs "}
                    {p.playerName}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px]">
                  {match.status}
                </Badge>
                {(match.status === 'submitted' || match.status === 'approved') && (
                  <button onClick={() => onViewReport(match.id)} className="text-primary hover:underline text-[10px]">
                    View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
