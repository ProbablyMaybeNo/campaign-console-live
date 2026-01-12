import { CampaignUnit } from "@/hooks/useCampaignUnits";
import { RosterUnit } from "@/hooks/useWarband";

export interface CompositionRule {
  id: string;
  name: string;
  description: string;
  type: "min" | "max" | "exactly" | "ratio";
  target: "total" | "keyword" | "unit_type";
  keyword?: string; // For keyword-based rules
  value: number;
  ratioOf?: string; // For ratio rules (e.g., "1 Elite per 3 Infantry")
  severity: "error" | "warning";
}

export interface RosterValidationResult {
  isValid: boolean;
  isLegal: boolean; // Can be fielded (no errors)
  errors: RosterValidationMessage[];
  warnings: RosterValidationMessage[];
  summary: {
    totalUnits: number;
    totalPoints: number;
    keywordCounts: Record<string, number>;
    unitTypeCounts: Record<string, number>;
  };
}

export interface RosterValidationMessage {
  ruleId?: string;
  message: string;
  details?: string;
}

// Default composition rules for wargames
export const DEFAULT_COMPOSITION_RULES: CompositionRule[] = [
  {
    id: "min_units",
    name: "Minimum Units",
    description: "Warband must have at least 3 units",
    type: "min",
    target: "total",
    value: 3,
    severity: "error",
  },
  {
    id: "max_units",
    name: "Maximum Units",
    description: "Warband cannot exceed 12 units",
    type: "max",
    target: "total",
    value: 12,
    severity: "error",
  },
  {
    id: "require_leader",
    name: "Leader Required",
    description: "Warband must include at least 1 Leader",
    type: "min",
    target: "keyword",
    keyword: "Leader",
    value: 1,
    severity: "error",
  },
  {
    id: "max_leaders",
    name: "Maximum Leaders",
    description: "Warband may have at most 1 Leader",
    type: "max",
    target: "keyword",
    keyword: "Leader",
    value: 1,
    severity: "warning",
  },
  {
    id: "max_elite",
    name: "Maximum Elites",
    description: "Warband may have at most 3 Elite units",
    type: "max",
    target: "keyword",
    keyword: "Elite",
    value: 3,
    severity: "warning",
  },
  {
    id: "max_cavalry",
    name: "Maximum Cavalry",
    description: "Warband may have at most 4 Cavalry units",
    type: "max",
    target: "keyword",
    keyword: "Cavalry",
    value: 4,
    severity: "warning",
  },
];

/**
 * Count units with a specific keyword
 */
function countUnitsWithKeyword(
  roster: RosterUnit[],
  units: CampaignUnit[],
  keyword: string
): number {
  return roster.filter(rosterUnit => {
    const unitData = units.find(u => u.id === rosterUnit.unit_id);
    return unitData?.keywords.some(k => 
      k.toLowerCase() === keyword.toLowerCase()
    );
  }).length;
}

/**
 * Get keyword counts for all units in roster
 */
function getKeywordCounts(
  roster: RosterUnit[],
  units: CampaignUnit[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  roster.forEach(rosterUnit => {
    const unitData = units.find(u => u.id === rosterUnit.unit_id);
    unitData?.keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      counts[normalizedKeyword] = (counts[normalizedKeyword] || 0) + 1;
    });
  });

  return counts;
}

/**
 * Get unit type counts (by unit name)
 */
function getUnitTypeCounts(roster: RosterUnit[]): Record<string, number> {
  const counts: Record<string, number> = {};

  roster.forEach(rosterUnit => {
    counts[rosterUnit.unit_name] = (counts[rosterUnit.unit_name] || 0) + 1;
  });

  return counts;
}

/**
 * Validate a single composition rule
 */
function validateRule(
  rule: CompositionRule,
  roster: RosterUnit[],
  units: CampaignUnit[],
  keywordCounts: Record<string, number>
): RosterValidationMessage | null {
  let currentValue: number;
  let targetName: string;

  switch (rule.target) {
    case "total":
      currentValue = roster.length;
      targetName = "units";
      break;
    case "keyword":
      if (!rule.keyword) return null;
      currentValue = countUnitsWithKeyword(roster, units, rule.keyword);
      targetName = rule.keyword;
      break;
    default:
      return null;
  }

  let isViolated = false;
  let message = "";
  let details = "";

  switch (rule.type) {
    case "min":
      isViolated = currentValue < rule.value;
      if (isViolated) {
        message = `Need at least ${rule.value} ${targetName}`;
        details = `Currently have ${currentValue}`;
      }
      break;
    case "max":
      isViolated = currentValue > rule.value;
      if (isViolated) {
        message = `Maximum ${rule.value} ${targetName} allowed`;
        details = `Currently have ${currentValue}`;
      }
      break;
    case "exactly":
      isViolated = currentValue !== rule.value;
      if (isViolated) {
        message = `Must have exactly ${rule.value} ${targetName}`;
        details = `Currently have ${currentValue}`;
      }
      break;
  }

  if (isViolated) {
    return {
      ruleId: rule.id,
      message,
      details,
    };
  }

  return null;
}

/**
 * Validate the entire roster against composition rules
 */
export function validateRoster(
  roster: RosterUnit[],
  units: CampaignUnit[],
  pointsLimit: number,
  rules: CompositionRule[] = DEFAULT_COMPOSITION_RULES
): RosterValidationResult {
  const errors: RosterValidationMessage[] = [];
  const warnings: RosterValidationMessage[] = [];

  // Calculate summary data
  const totalPoints = roster.reduce((sum, u) => sum + u.total_cost, 0);
  const keywordCounts = getKeywordCounts(roster, units);
  const unitTypeCounts = getUnitTypeCounts(roster);

  // Check points limit
  if (totalPoints > pointsLimit) {
    errors.push({
      message: `Over points limit`,
      details: `${totalPoints} / ${pointsLimit} pts (${totalPoints - pointsLimit} over)`,
    });
  }

  // Check each composition rule
  rules.forEach(rule => {
    const violation = validateRule(rule, roster, units, keywordCounts);
    if (violation) {
      if (rule.severity === "error") {
        errors.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  });

  // Check for faction consistency
  const uniqueFactions = new Set<string>();
  roster.forEach(rosterUnit => {
    const unitData = units.find(u => u.id === rosterUnit.unit_id);
    if (unitData?.faction) {
      uniqueFactions.add(unitData.faction.toLowerCase());
    }
  });

  if (uniqueFactions.size > 1) {
    warnings.push({
      message: "Mixed factions in roster",
      details: `Contains units from: ${Array.from(uniqueFactions).join(", ")}`,
    });
  }

  return {
    isValid: errors.length === 0 && warnings.length === 0,
    isLegal: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalUnits: roster.length,
      totalPoints,
      keywordCounts,
      unitTypeCounts,
    },
  };
}

/**
 * Get a summary of composition for display
 */
export function getRosterCompositionSummary(
  roster: RosterUnit[],
  units: CampaignUnit[]
): { label: string; count: number; keyword: string }[] {
  const importantKeywords = ["Leader", "Elite", "Infantry", "Cavalry", "Ranged", "Monster", "Hero", "Character"];
  const keywordCounts = getKeywordCounts(roster, units);

  return importantKeywords
    .filter(kw => keywordCounts[kw.toLowerCase()] > 0)
    .map(kw => ({
      label: kw,
      count: keywordCounts[kw.toLowerCase()] || 0,
      keyword: kw,
    }));
}

/**
 * Check if roster is ready to play
 */
export function isRosterBattleReady(
  roster: RosterUnit[],
  units: CampaignUnit[],
  pointsLimit: number,
  rules?: CompositionRule[]
): { ready: boolean; issues: string[] } {
  const validation = validateRoster(roster, units, pointsLimit, rules);
  
  return {
    ready: validation.isLegal,
    issues: validation.errors.map(e => e.message),
  };
}
