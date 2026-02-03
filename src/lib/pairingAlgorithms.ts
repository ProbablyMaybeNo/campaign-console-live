import type { MatchParticipant, BattleMatch, ConstraintsConfig } from "@/hooks/useBattleTracker";

export type PairingSystem = 'manual' | 'random' | 'swiss' | 'round-robin';

export interface Player {
  id: string;
  name: string;
  warbandId?: string;
  warbandName?: string;
  points?: number; // For Swiss pairing
}

export interface PairingResult {
  participants: MatchParticipant[];
  isBye: boolean;
}

export interface MatchHistory {
  roundIndex: number;
  playerAId: string;
  playerBId: string;
}

/**
 * Generate pairings based on the selected system
 */
export function generatePairings(
  system: PairingSystem,
  players: Player[],
  constraints: ConstraintsConfig,
  matchHistory: MatchHistory[] = [],
  roundIndex: number = 1
): PairingResult[] {
  switch (system) {
    case 'random':
      return generateRandomPairings(players, constraints, matchHistory);
    case 'swiss':
      return generateSwissPairings(players, constraints, matchHistory);
    case 'round-robin':
      return generateRoundRobinPairings(players, roundIndex);
    case 'manual':
    default:
      return [];
  }
}

/**
 * Random pairing with optional anti-repeat constraints
 */
function generateRandomPairings(
  players: Player[],
  constraints: ConstraintsConfig,
  matchHistory: MatchHistory[]
): PairingResult[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const pairings: PairingResult[] = [];
  const paired = new Set<string>();
  
  // Build opponent history lookup
  const opponentCounts = buildOpponentCounts(matchHistory);
  const recentOpponents = buildRecentOpponents(matchHistory, constraints.preferNotRepeatLastN || 3);
  
  for (let i = 0; i < shuffled.length; i++) {
    const playerA = shuffled[i];
    if (paired.has(playerA.id)) continue;
    
    // Find best opponent
    let bestOpponent: Player | null = null;
    let bestScore = Infinity;
    
    for (let j = i + 1; j < shuffled.length; j++) {
      const playerB = shuffled[j];
      if (paired.has(playerB.id)) continue;
      
      let score = 0;
      const pairKey = getPairKey(playerA.id, playerB.id);
      
      // Penalize back-to-back rematches
      if (constraints.noBackToBack && recentOpponents.get(playerA.id)?.has(playerB.id)) {
        score += 1000;
      }
      
      // Penalize exceeding max rematch count
      const timesPlayed = opponentCounts.get(pairKey) || 0;
      if (constraints.maxRematchCount && timesPlayed >= constraints.maxRematchCount) {
        score += 2000;
      }
      
      // Prefer players who haven't played recently
      if (recentOpponents.get(playerA.id)?.has(playerB.id)) {
        score += 100;
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestOpponent = playerB;
      }
    }
    
    if (bestOpponent) {
      paired.add(playerA.id);
      paired.add(bestOpponent.id);
      pairings.push({
        participants: [
          { playerId: playerA.id, playerName: playerA.name, warbandId: playerA.warbandId, warbandName: playerA.warbandName, side: 'a' },
          { playerId: bestOpponent.id, playerName: bestOpponent.name, warbandId: bestOpponent.warbandId, warbandName: bestOpponent.warbandName, side: 'b' },
        ],
        isBye: false,
      });
    }
  }
  
  // Handle odd player - assign BYE
  const unpairedPlayers = shuffled.filter(p => !paired.has(p.id));
  if (unpairedPlayers.length === 1) {
    pairings.push({
      participants: [
        { playerId: unpairedPlayers[0].id, playerName: unpairedPlayers[0].name, warbandId: unpairedPlayers[0].warbandId, warbandName: unpairedPlayers[0].warbandName, side: 'a' },
      ],
      isBye: true,
    });
  }
  
  return pairings;
}

/**
 * Swiss pairing - pair players with similar scores
 */
function generateSwissPairings(
  players: Player[],
  constraints: ConstraintsConfig,
  matchHistory: MatchHistory[]
): PairingResult[] {
  // Sort by points (highest first)
  const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  const pairings: PairingResult[] = [];
  const paired = new Set<string>();
  
  const opponentCounts = buildOpponentCounts(matchHistory);
  const recentOpponents = buildRecentOpponents(matchHistory, constraints.preferNotRepeatLastN || 3);
  
  for (let i = 0; i < sorted.length; i++) {
    const playerA = sorted[i];
    if (paired.has(playerA.id)) continue;
    
    // Find best opponent from remaining players
    let bestOpponent: Player | null = null;
    let bestScore = Infinity;
    
    for (let j = i + 1; j < sorted.length; j++) {
      const playerB = sorted[j];
      if (paired.has(playerB.id)) continue;
      
      let score = 0;
      const pairKey = getPairKey(playerA.id, playerB.id);
      
      // Prefer similar points
      score += Math.abs((playerA.points || 0) - (playerB.points || 0));
      
      // Penalize rematches
      const timesPlayed = opponentCounts.get(pairKey) || 0;
      if (constraints.maxRematchCount && timesPlayed >= constraints.maxRematchCount) {
        score += 2000;
      }
      
      // Penalize recent opponents
      if (constraints.noBackToBack && recentOpponents.get(playerA.id)?.has(playerB.id)) {
        score += 1000;
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestOpponent = playerB;
      }
    }
    
    if (bestOpponent) {
      paired.add(playerA.id);
      paired.add(bestOpponent.id);
      pairings.push({
        participants: [
          { playerId: playerA.id, playerName: playerA.name, warbandId: playerA.warbandId, warbandName: playerA.warbandName, side: 'a' },
          { playerId: bestOpponent.id, playerName: bestOpponent.name, warbandId: bestOpponent.warbandId, warbandName: bestOpponent.warbandName, side: 'b' },
        ],
        isBye: false,
      });
    }
  }
  
  // Handle odd player - assign BYE
  const unpairedPlayers = sorted.filter(p => !paired.has(p.id));
  if (unpairedPlayers.length === 1) {
    pairings.push({
      participants: [
        { playerId: unpairedPlayers[0].id, playerName: unpairedPlayers[0].name, warbandId: unpairedPlayers[0].warbandId, warbandName: unpairedPlayers[0].warbandName, side: 'a' },
      ],
      isBye: true,
    });
  }
  
  return pairings;
}

/**
 * Round Robin pairing for a specific round
 */
function generateRoundRobinPairings(
  players: Player[],
  roundIndex: number
): PairingResult[] {
  const n = players.length;
  const paddedPlayers = n % 2 === 0 ? [...players] : [...players, null]; // Add BYE placeholder if odd
  const numPlayers = paddedPlayers.length;
  
  // Use round-robin algorithm
  // Fix first player, rotate others
  const fixed = paddedPlayers[0];
  const rotating = paddedPlayers.slice(1);
  
  // Rotate for current round
  const rotationIndex = (roundIndex - 1) % (numPlayers - 1);
  const rotated = [
    ...rotating.slice(rotationIndex),
    ...rotating.slice(0, rotationIndex),
  ];
  
  const lineup = [fixed, ...rotated];
  const pairings: PairingResult[] = [];
  
  // Pair first with last, second with second-to-last, etc.
  for (let i = 0; i < numPlayers / 2; i++) {
    const playerA = lineup[i];
    const playerB = lineup[numPlayers - 1 - i];
    
    if (playerA === null || playerB === null) {
      // BYE match
      const realPlayer = playerA || playerB;
      if (realPlayer) {
        pairings.push({
          participants: [
            { playerId: realPlayer.id, playerName: realPlayer.name, warbandId: realPlayer.warbandId, warbandName: realPlayer.warbandName, side: 'a' },
          ],
          isBye: true,
        });
      }
    } else {
      pairings.push({
        participants: [
          { playerId: playerA.id, playerName: playerA.name, warbandId: playerA.warbandId, warbandName: playerA.warbandName, side: 'a' },
          { playerId: playerB.id, playerName: playerB.name, warbandId: playerB.warbandId, warbandName: playerB.warbandName, side: 'b' },
        ],
        isBye: false,
      });
    }
  }
  
  return pairings;
}

// Helper functions
function getPairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('-');
}

function buildOpponentCounts(history: MatchHistory[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of history) {
    const key = getPairKey(match.playerAId, match.playerBId);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function buildRecentOpponents(history: MatchHistory[], lookback: number): Map<string, Set<string>> {
  const recent = new Map<string, Set<string>>();
  
  // Sort by round descending and take only recent rounds
  const sortedHistory = [...history]
    .sort((a, b) => b.roundIndex - a.roundIndex)
    .filter((_, i) => i < lookback * 10); // Rough filter
  
  const maxRound = sortedHistory[0]?.roundIndex || 0;
  const recentHistory = sortedHistory.filter(h => h.roundIndex > maxRound - lookback);
  
  for (const match of recentHistory) {
    if (!recent.has(match.playerAId)) recent.set(match.playerAId, new Set());
    if (!recent.has(match.playerBId)) recent.set(match.playerBId, new Set());
    recent.get(match.playerAId)!.add(match.playerBId);
    recent.get(match.playerBId)!.add(match.playerAId);
  }
  
  return recent;
}

/**
 * Validate pairings against constraints
 */
export function validatePairings(
  pairings: PairingResult[],
  constraints: ConstraintsConfig,
  matchHistory: MatchHistory[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const opponentCounts = buildOpponentCounts(matchHistory);
  const recentOpponents = buildRecentOpponents(matchHistory, 1); // Last round only for back-to-back
  
  for (const pairing of pairings) {
    if (pairing.isBye || pairing.participants.length < 2) continue;
    
    const playerA = pairing.participants[0];
    const playerB = pairing.participants[1];
    const pairKey = getPairKey(playerA.playerId, playerB.playerId);
    
    // Check back-to-back
    if (constraints.noBackToBack && recentOpponents.get(playerA.playerId)?.has(playerB.playerId)) {
      warnings.push(`${playerA.playerName} and ${playerB.playerName} played last round (back-to-back)`);
    }
    
    // Check max rematch
    const timesPlayed = opponentCounts.get(pairKey) || 0;
    if (constraints.maxRematchCount && timesPlayed >= constraints.maxRematchCount) {
      warnings.push(`${playerA.playerName} and ${playerB.playerName} have played ${timesPlayed} times (max: ${constraints.maxRematchCount})`);
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Calculate total rounds needed for round-robin
 */
export function calculateRoundRobinRounds(playerCount: number): number {
  return playerCount % 2 === 0 ? playerCount - 1 : playerCount;
}
