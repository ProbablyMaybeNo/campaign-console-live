import { EquipmentOption } from "@/hooks/useCampaignUnits";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EquipmentValidation {
  name: string;
  canSelect: boolean;
  reason?: string;
  isSelected: boolean;
}

/**
 * Validates a single equipment selection against the current loadout
 */
export function validateEquipmentSelection(
  equipmentName: string,
  currentEquipment: string[],
  allOptions: EquipmentOption[]
): { canSelect: boolean; reason?: string } {
  const option = allOptions.find(o => o.name === equipmentName);
  if (!option) {
    return { canSelect: false, reason: "Equipment not found" };
  }

  // Check "requires" constraint - must have required equipment
  if (option.requires && option.requires.length > 0) {
    const missingRequired = option.requires.filter(req => !currentEquipment.includes(req));
    if (missingRequired.length > 0) {
      return { 
        canSelect: false, 
        reason: `Requires: ${missingRequired.join(", ")}` 
      };
    }
  }

  // Check "excludes" constraint - cannot have excluded equipment
  if (option.excludes && option.excludes.length > 0) {
    const hasExcluded = option.excludes.filter(ex => currentEquipment.includes(ex));
    if (hasExcluded.length > 0) {
      return { 
        canSelect: false, 
        reason: `Conflicts with: ${hasExcluded.join(", ")}` 
      };
    }
  }

  // Check if any currently selected equipment excludes this option
  for (const eq of currentEquipment) {
    const selectedOption = allOptions.find(o => o.name === eq);
    if (selectedOption?.excludes?.includes(equipmentName)) {
      return { 
        canSelect: false, 
        reason: `Excluded by: ${eq}` 
      };
    }
  }

  return { canSelect: true };
}

/**
 * Validates an entire equipment loadout
 */
export function validateLoadout(
  equipment: string[],
  allOptions: EquipmentOption[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const eq of equipment) {
    const option = allOptions.find(o => o.name === eq);
    if (!option) {
      errors.push(`Unknown equipment: ${eq}`);
      continue;
    }

    // Check requires
    if (option.requires && option.requires.length > 0) {
      const missingRequired = option.requires.filter(req => !equipment.includes(req));
      if (missingRequired.length > 0) {
        errors.push(`${eq} requires: ${missingRequired.join(", ")}`);
      }
    }

    // Check excludes
    if (option.excludes && option.excludes.length > 0) {
      const hasExcluded = option.excludes.filter(ex => equipment.includes(ex));
      if (hasExcluded.length > 0) {
        errors.push(`${eq} conflicts with: ${hasExcluded.join(", ")}`);
      }
    }
  }

  // Check for duplicate "replaces" - only one item can replace the same thing
  const replacesMap = new Map<string, string[]>();
  for (const eq of equipment) {
    const option = allOptions.find(o => o.name === eq);
    if (option?.replaces) {
      if (!replacesMap.has(option.replaces)) {
        replacesMap.set(option.replaces, []);
      }
      replacesMap.get(option.replaces)!.push(eq);
    }
  }

  for (const [replaced, replacers] of replacesMap) {
    if (replacers.length > 1) {
      warnings.push(`Multiple items replace ${replaced}: ${replacers.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get all equipment options with their validation status
 */
export function getEquipmentWithValidation(
  currentEquipment: string[],
  allOptions: EquipmentOption[]
): EquipmentValidation[] {
  return allOptions.map(option => {
    const isSelected = currentEquipment.includes(option.name);
    
    // If already selected, it's valid (for display purposes)
    if (isSelected) {
      return {
        name: option.name,
        canSelect: true,
        isSelected: true,
      };
    }

    // Check if it can be added
    const validation = validateEquipmentSelection(option.name, currentEquipment, allOptions);
    
    return {
      name: option.name,
      canSelect: validation.canSelect,
      reason: validation.reason,
      isSelected: false,
    };
  });
}

/**
 * Calculate total equipment cost
 */
export function calculateEquipmentCost(
  equipment: string[],
  allOptions: EquipmentOption[]
): number {
  return equipment.reduce((sum, eq) => {
    const option = allOptions.find(o => o.name === eq);
    return sum + (option?.cost || 0);
  }, 0);
}

/**
 * Get equipment that would be "freed up" if we remove an item
 * (items that are currently excluded by this item)
 */
export function getUnlockedByRemoval(
  equipmentToRemove: string,
  currentEquipment: string[],
  allOptions: EquipmentOption[]
): string[] {
  const option = allOptions.find(o => o.name === equipmentToRemove);
  if (!option?.excludes) return [];

  // Get items that are excluded by this option and not in current loadout
  return option.excludes.filter(ex => !currentEquipment.includes(ex));
}

/**
 * Get equipment that would become invalid if we remove an item
 * (items that require this item)
 */
export function getDependentEquipment(
  equipmentToRemove: string,
  currentEquipment: string[],
  allOptions: EquipmentOption[]
): string[] {
  return currentEquipment.filter(eq => {
    const option = allOptions.find(o => o.name === eq);
    return option?.requires?.includes(equipmentToRemove);
  });
}
