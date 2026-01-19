import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, X, Check, RefreshCw } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { useRulesByCategory } from "@/hooks/useWargameRules";
import type { Json } from "@/integrations/supabase/types";

interface TableWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
  campaignId: string;
}

interface TableRow {
  id: string;
  [key: string]: string;
}

interface TableConfig {
  columns?: unknown[]; // Accept any format, we'll normalize on read/save
  rows?: TableRow[];
  rule_category?: string;
  rule_key?: string;
  manual_setup?: boolean;
}

// Helper to normalize column to string
function normalizeColumn(col: unknown): string {
  if (typeof col === 'string') return col.trim() || 'Column';
  if (col && typeof col === 'object') {
    const obj = col as Record<string, unknown>;
    return String(obj.header || obj.key || obj.name || 'Column').trim();
  }
  return String(col || 'Column');
}

// Helper to normalize columns array to string[]
function normalizeColumns(cols: unknown[]): string[] {
  return cols.map(normalizeColumn);
}

// Helper to ensure row values are strings
function normalizeRow(row: TableRow, columns: string[]): TableRow {
  const normalized: TableRow = { id: row.id };
  columns.forEach(col => {
    const val = row[col];
    normalized[col] = typeof val === 'string' ? val : 
      (val !== null && val !== undefined ? String(val) : '');
  });
  return normalized;
}

// Create a validated config object for saving
function createValidatedConfig(
  baseConfig: TableConfig, 
  columns: string[], 
  rows: TableRow[]
): TableConfig {
  const normalizedCols = normalizeColumns(columns);
  const normalizedRows = rows.map(row => normalizeRow(row, normalizedCols));
  return {
    ...baseConfig,
    columns: normalizedCols,
    rows: normalizedRows,
  };
}

export function TableWidget({ component, isGM, campaignId }: TableWidgetProps) {
  const updateComponent = useUpdateComponent();
  const config = (component.config as TableConfig) || {};
  
  // Normalize columns using helper function
  const rawColumns = (config.columns as unknown[]) || ["Name", "Value"];
  const columns: string[] = normalizeColumns(rawColumns);
  
  const rows = config.rows || [];
  const ruleCategory = config.rule_category;
  const ruleKey = config.rule_key;
  const isManual = config.manual_setup ?? true;

  // Fetch linked rule data if not manual setup
  const { data: categoryRules } = useRulesByCategory(campaignId, ruleCategory);
  const linkedRule = categoryRules?.find(r => r.rule_key === ruleKey);

  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerValue, setHeaderValue] = useState("");
  const [isPopulated, setIsPopulated] = useState(false);

  // Auto-populate from rule content when linked and not yet populated
  useEffect(() => {
    if (!isManual && linkedRule && !isPopulated && rows.length === 0) {
      const content = linkedRule.content as Record<string, unknown>;
      
      // Try to extract table-like data from rule content
      const tableData = extractTableData(content);
      
      if (tableData.columns.length > 0 && tableData.rows.length > 0) {
        const newConfig = createValidatedConfig(config, tableData.columns, tableData.rows);
        updateComponent.mutate({
          id: component.id,
          config: newConfig as unknown as Json,
        });
        setIsPopulated(true);
      }
    }
  }, [linkedRule, isManual, isPopulated, rows.length]);

  // Extract table data from various rule content structures
  function extractTableData(content: Record<string, unknown>): { columns: string[]; rows: TableRow[] } {
    // If content has arrays, try to use them as table rows
    for (const [key, value] of Object.entries(content)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Found an array of objects - use as table
        const firstItem = value[0] as Record<string, unknown>;
        const cols = Object.keys(firstItem).filter(k => 
          typeof firstItem[k] === 'string' || typeof firstItem[k] === 'number'
        );
        
        if (cols.length > 0) {
          const tableRows: TableRow[] = value.map((item, i) => {
            const row: TableRow = { id: crypto.randomUUID() };
            cols.forEach(col => {
              const val = (item as Record<string, unknown>)[col];
              row[col] = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
            });
            return row;
          });
          
          return { columns: cols.map(c => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())), rows: tableRows };
        }
      }
    }
    
    // Fallback: create key-value pairs from content
    const kvRows: TableRow[] = [];
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string' || typeof value === 'number') {
        kvRows.push({
          id: crypto.randomUUID(),
          'Property': key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          'Value': String(value)
        });
      }
    }
    
    if (kvRows.length > 0) {
      return { columns: ['Property', 'Value'], rows: kvRows };
    }
    
    return { columns: [], rows: [] };
  }

  const handleRefreshFromRules = () => {
    if (linkedRule) {
      const content = linkedRule.content as Record<string, unknown>;
      const tableData = extractTableData(content);
      
      if (tableData.columns.length > 0) {
        const newConfig = createValidatedConfig(config, tableData.columns, tableData.rows);
        updateComponent.mutate({
          id: component.id,
          config: newConfig as unknown as Json,
        });
      }
    }
  };

  const handleAddRow = () => {
    const newRow: TableRow = { id: crypto.randomUUID() };
    columns.forEach((col) => (newRow[col] = ""));
    
    const newConfig = createValidatedConfig(config, columns, [...rows, newRow]);
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleDeleteRow = (rowId: string) => {
    const newConfig = createValidatedConfig(config, columns, rows.filter((r) => r.id !== rowId));
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleCellChange = (rowId: string, col: string, value: string) => {
    const updatedRows = rows.map((row) =>
      row.id === rowId ? { ...row, [col]: value } : row
    );
    const newConfig = createValidatedConfig(config, columns, updatedRows);
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleAddColumn = () => {
    const newColName = `Column ${columns.length + 1}`;
    const updatedRows = rows.map((row) => ({ ...row, [newColName]: "" }));
    const newConfig = createValidatedConfig(config, [...columns, newColName], updatedRows);
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  const handleStartEditHeader = (index: number) => {
    setEditingHeader(index);
    setHeaderValue(columns[index]);
  };

  const handleSaveHeader = () => {
    if (editingHeader === null || !headerValue.trim()) {
      setEditingHeader(null);
      return;
    }

    const oldName = columns[editingHeader];
    const newName = headerValue.trim();

    if (oldName === newName) {
      setEditingHeader(null);
      return;
    }

    // Check for duplicate column names
    if (columns.some((col, i) => i !== editingHeader && col === newName)) {
      setEditingHeader(null);
      return;
    }

    const updatedColumns = columns.map((col, i) => (i === editingHeader ? newName : col));
    const updatedRows = rows.map((row) => {
      const newRow: TableRow = { id: row.id };
      columns.forEach((col, i) => {
        const key = i === editingHeader ? newName : col;
        newRow[key] = row[col] || "";
      });
      return newRow;
    });

    const newConfig = createValidatedConfig(config, updatedColumns, updatedRows);
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
    setEditingHeader(null);
  };

  const handleDeleteColumn = (index: number) => {
    if (columns.length <= 1) return; // Keep at least one column

    const colToDelete = columns[index];
    const updatedColumns = columns.filter((_, i) => i !== index);
    const updatedRows = rows.map((row) => {
      const newRow: TableRow = { id: row.id };
      updatedColumns.forEach((col) => {
        newRow[col] = row[col] || "";
      });
      return newRow;
    });

    const newConfig = createValidatedConfig(config, updatedColumns, updatedRows);
    updateComponent.mutate({
      id: component.id,
      config: newConfig as unknown as Json,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-primary/30">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="text-left p-2 text-primary font-mono uppercase tracking-wider"
                >
                  {isGM && editingHeader === i ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="bg-input border border-primary rounded px-1 py-0.5 text-xs w-20"
                        value={headerValue}
                        onChange={(e) => setHeaderValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveHeader();
                          if (e.key === "Escape") setEditingHeader(null);
                        }}
                      />
                      <button onClick={handleSaveHeader} className="text-green-500 hover:text-green-400">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingHeader(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span>{col}</span>
                      {isGM && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                          <button
                            onClick={() => handleStartEditHeader(i)}
                            className="text-muted-foreground hover:text-primary p-0.5"
                            title="Rename column"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          {columns.length > 1 && (
                            <button
                              onClick={() => handleDeleteColumn(i)}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                              title="Delete column"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </th>
              ))}
              {isGM && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isGM ? 1 : 0)} className="p-4 text-center text-muted-foreground">
                  No data. {isGM && "Click '+ Add Row' to get started."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-accent/30">
                  {columns.map((col, colIndex) => {
                    // Safely get cell value as string
                    const cellValue = row[col];
                    const displayValue = typeof cellValue === 'string' || typeof cellValue === 'number' 
                      ? String(cellValue) 
                      : cellValue && typeof cellValue === 'object'
                        ? JSON.stringify(cellValue)
                        : '';
                    
                    return (
                      <td key={`${row.id}-${colIndex}`} className="p-2">
                        {isGM && editingCell?.rowId === row.id && editingCell?.col === col ? (
                          <input
                            autoFocus
                            className="w-full bg-input border border-primary rounded px-1 py-0.5 text-xs"
                            value={displayValue}
                            onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
                          />
                        ) : (
                          <span
                            className={isGM ? "cursor-pointer hover:text-primary block min-h-[1.25rem]" : ""}
                            onClick={() => isGM && setEditingCell({ rowId: row.id, col })}
                            title={isGM ? "Click to edit" : undefined}
                          >
                            {displayValue || <span className="text-muted-foreground/50 italic">Click to edit</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {isGM && (
                    <td className="p-1">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-destructive/50 hover:text-destructive p-1"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isGM && (
        <div className="flex gap-2 pt-2 border-t border-border mt-auto">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> Add Row
          </button>
          <button
            onClick={handleAddColumn}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3 h-3" /> Add Column
          </button>
          {!isManual && linkedRule && (
            <button
              onClick={handleRefreshFromRules}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
              title="Refresh data from linked rules"
            >
              <RefreshCw className="w-3 h-3" /> Refresh from Rules
            </button>
          )}
        </div>
      )}
    </div>
  );
}
