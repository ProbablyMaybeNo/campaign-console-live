import { RosterUnit } from "@/hooks/useWarband";
import { CampaignUnit } from "@/hooks/useCampaignUnits";

export interface ExportData {
  warbandName: string;
  faction: string;
  subFaction: string | null;
  campaignName: string;
  pointsLimit: number;
  totalPoints: number;
  roster: RosterUnit[];
  units: CampaignUnit[];
  exportDate: string;
}

interface UnitStats {
  [key: string]: string | number;
}

function getUnitData(unitId: string, units: CampaignUnit[]): CampaignUnit | undefined {
  return units.find(u => u.id === unitId);
}

function formatStats(stats: UnitStats): string {
  const entries = Object.entries(stats);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function formatKeywords(keywords: string[]): string {
  if (!keywords || keywords.length === 0) return "—";
  return keywords.join(", ");
}

function formatAbilities(abilities: Array<{ name: string; effect: string }>): string {
  if (!abilities || abilities.length === 0) return "";
  return abilities.map(a => `• ${a.name}: ${a.effect}`).join("\n");
}

/**
 * Generate plain text export of the warband roster
 */
export function generateTextExport(data: ExportData): string {
  const lines: string[] = [];
  const separator = "═".repeat(60);
  const thinSeparator = "─".repeat(60);

  // Header
  lines.push(separator);
  lines.push(`  ${data.warbandName.toUpperCase()}`);
  lines.push(`  ${data.faction}${data.subFaction ? ` • ${data.subFaction}` : ""}`);
  lines.push(separator);
  lines.push("");
  lines.push(`Campaign: ${data.campaignName}`);
  lines.push(`Points: ${data.totalPoints} / ${data.pointsLimit}`);
  lines.push(`Units: ${data.roster.length}`);
  lines.push(`Exported: ${data.exportDate}`);
  lines.push("");
  lines.push(thinSeparator);

  // Roster units
  data.roster.forEach((rosterUnit, index) => {
    const unitData = getUnitData(rosterUnit.unit_id, data.units);
    const displayName = rosterUnit.custom_name || rosterUnit.unit_name;
    
    lines.push("");
    lines.push(`[${index + 1}] ${displayName}${rosterUnit.custom_name ? ` (${rosterUnit.unit_name})` : ""}`);
    lines.push(`    Cost: ${rosterUnit.total_cost} pts (base: ${rosterUnit.base_cost})`);
    
    if (rosterUnit.equipment.length > 0) {
      lines.push(`    Equipment: ${rosterUnit.equipment.join(", ")}`);
    }
    
    if (unitData) {
      const stats = unitData.stats as UnitStats;
      if (stats && Object.keys(stats).length > 0) {
        lines.push(`    Stats: ${formatStats(stats)}`);
      }
      
      const keywords = unitData.keywords as string[];
      if (keywords && keywords.length > 0) {
        lines.push(`    Keywords: ${formatKeywords(keywords)}`);
      }
    }
    
    lines.push(thinSeparator);
  });

  // Summary
  lines.push("");
  lines.push(`TOTAL: ${data.totalPoints} / ${data.pointsLimit} pts`);
  lines.push(`${data.roster.length} unit${data.roster.length !== 1 ? "s" : ""}`);
  lines.push("");
  lines.push(separator);

  return lines.join("\n");
}

/**
 * Generate detailed text export with full unit abilities
 */
export function generateDetailedTextExport(data: ExportData): string {
  const lines: string[] = [];
  const separator = "═".repeat(60);
  const thinSeparator = "─".repeat(60);

  // Header
  lines.push(separator);
  lines.push(`  ${data.warbandName.toUpperCase()}`);
  lines.push(`  ${data.faction}${data.subFaction ? ` • ${data.subFaction}` : ""}`);
  lines.push(separator);
  lines.push("");
  lines.push(`Campaign: ${data.campaignName}`);
  lines.push(`Points: ${data.totalPoints} / ${data.pointsLimit}`);
  lines.push(`Units: ${data.roster.length}`);
  lines.push(`Exported: ${data.exportDate}`);
  lines.push("");

  // Roster units with full details
  data.roster.forEach((rosterUnit, index) => {
    const unitData = getUnitData(rosterUnit.unit_id, data.units);
    const displayName = rosterUnit.custom_name || rosterUnit.unit_name;
    
    lines.push(separator);
    lines.push(`[${index + 1}] ${displayName}`);
    if (rosterUnit.custom_name) {
      lines.push(`    Type: ${rosterUnit.unit_name}`);
    }
    lines.push(`    Cost: ${rosterUnit.total_cost} pts`);
    lines.push(thinSeparator);
    
    if (unitData) {
      // Stats
      const stats = unitData.stats as UnitStats;
      if (stats && Object.keys(stats).length > 0) {
        lines.push("STATS:");
        Object.entries(stats).forEach(([key, value]) => {
          lines.push(`  ${key}: ${value}`);
        });
        lines.push("");
      }
      
      // Equipment
      if (rosterUnit.equipment.length > 0) {
        lines.push("EQUIPMENT:");
        const eqOptions = unitData.equipment_options as Array<{ name: string; cost: number; description?: string }>;
        rosterUnit.equipment.forEach(eq => {
          const eqData = eqOptions?.find(e => e.name === eq);
          const costStr = eqData?.cost ? ` (+${eqData.cost} pts)` : "";
          lines.push(`  • ${eq}${costStr}`);
          if (eqData?.description) {
            lines.push(`    ${eqData.description}`);
          }
        });
        lines.push("");
      }
      
      // Abilities
      const abilities = unitData.abilities as Array<{ name: string; effect: string }>;
      if (abilities && abilities.length > 0) {
        lines.push("ABILITIES:");
        abilities.forEach(ability => {
          lines.push(`  • ${ability.name}`);
          lines.push(`    ${ability.effect}`);
        });
        lines.push("");
      }
      
      // Keywords
      const keywords = unitData.keywords as string[];
      if (keywords && keywords.length > 0) {
        lines.push(`KEYWORDS: ${formatKeywords(keywords)}`);
        lines.push("");
      }
    }
  });

  // Summary
  lines.push(separator);
  lines.push(`WARBAND TOTAL: ${data.totalPoints} / ${data.pointsLimit} pts`);
  lines.push(`${data.roster.length} unit${data.roster.length !== 1 ? "s" : ""}`);
  lines.push(separator);

  return lines.join("\n");
}

/**
 * Generate HTML for print-friendly PDF export
 */
export function generatePrintHtml(data: ExportData): string {
  const statsTable = (stats: UnitStats) => {
    const entries = Object.entries(stats);
    if (entries.length === 0) return "";
    return `
      <table class="stats-table">
        <tr>${entries.map(([key]) => `<th>${key}</th>`).join("")}</tr>
        <tr>${entries.map(([, value]) => `<td>${value}</td>`).join("")}</tr>
      </table>
    `;
  };

  const unitCards = data.roster.map((rosterUnit, index) => {
    const unitData = getUnitData(rosterUnit.unit_id, data.units);
    const displayName = rosterUnit.custom_name || rosterUnit.unit_name;
    const stats = (unitData?.stats as UnitStats) || {};
    const abilities = (unitData?.abilities as Array<{ name: string; effect: string }>) || [];
    const keywords = (unitData?.keywords as string[]) || [];
    const eqOptions = (unitData?.equipment_options as Array<{ name: string; cost: number }>) || [];

    return `
      <div class="unit-card">
        <div class="unit-header">
          <span class="unit-number">${index + 1}</span>
          <span class="unit-name">${displayName}</span>
          <span class="unit-cost">${rosterUnit.total_cost} pts</span>
        </div>
        ${rosterUnit.custom_name ? `<div class="unit-type">${rosterUnit.unit_name}</div>` : ""}
        ${statsTable(stats)}
        ${rosterUnit.equipment.length > 0 ? `
          <div class="equipment-section">
            <strong>Equipment:</strong>
            <ul>
              ${rosterUnit.equipment.map(eq => {
                const eqData = eqOptions.find(e => e.name === eq);
                return `<li>${eq}${eqData?.cost ? ` <span class="eq-cost">(+${eqData.cost})</span>` : ""}</li>`;
              }).join("")}
            </ul>
          </div>
        ` : ""}
        ${abilities.length > 0 ? `
          <div class="abilities-section">
            <strong>Abilities:</strong>
            <ul>
              ${abilities.map(a => `<li><em>${a.name}:</em> ${a.effect}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
        ${keywords.length > 0 ? `
          <div class="keywords-section">
            <strong>Keywords:</strong> ${keywords.join(", ")}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.warbandName} - Roster</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Courier New', monospace; 
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          color: #1a1a1a;
        }
        .header { 
          text-align: center; 
          border: 2px solid #333;
          padding: 20px;
          margin-bottom: 20px;
        }
        .warband-name { 
          font-size: 24px; 
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .faction { 
          font-size: 14px; 
          color: #666;
          margin-top: 5px;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f5f5f5;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .unit-card {
          border: 1px solid #333;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        .unit-header {
          background: #333;
          color: white;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .unit-number {
          background: white;
          color: #333;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
        }
        .unit-name {
          flex: 1;
          margin-left: 10px;
          font-weight: bold;
        }
        .unit-cost {
          font-weight: bold;
        }
        .unit-type {
          padding: 4px 12px;
          font-size: 11px;
          color: #666;
          border-bottom: 1px solid #ddd;
        }
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .stats-table th, .stats-table td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: center;
        }
        .stats-table th {
          background: #f5f5f5;
          font-weight: bold;
        }
        .equipment-section, .abilities-section, .keywords-section {
          padding: 8px 12px;
          font-size: 11px;
          border-top: 1px solid #ddd;
        }
        .equipment-section ul, .abilities-section ul {
          margin-left: 15px;
          margin-top: 4px;
        }
        .equipment-section li, .abilities-section li {
          margin-bottom: 2px;
        }
        .eq-cost { color: #666; }
        .summary {
          border: 2px solid #333;
          padding: 15px;
          text-align: center;
          margin-top: 20px;
        }
        .total-points {
          font-size: 20px;
          font-weight: bold;
        }
        @media print {
          body { padding: 0; }
          .unit-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="warband-name">${data.warbandName}</div>
        <div class="faction">${data.faction}${data.subFaction ? ` • ${data.subFaction}` : ""}</div>
      </div>
      <div class="meta-info">
        <span>Campaign: ${data.campaignName}</span>
        <span>Points: ${data.totalPoints} / ${data.pointsLimit}</span>
        <span>Units: ${data.roster.length}</span>
        <span>Date: ${data.exportDate}</span>
      </div>
      ${unitCards}
      <div class="summary">
        <div class="total-points">${data.totalPoints} / ${data.pointsLimit} pts</div>
        <div>${data.roster.length} unit${data.roster.length !== 1 ? "s" : ""}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * Open print dialog with generated HTML
 */
export function printRoster(html: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Download text as file
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
