import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface TableWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface TableRow {
  id: string;
  [key: string]: string;
}

interface TableConfig {
  columns?: string[];
  rows?: TableRow[];
}

export function TableWidget({ component, isGM }: TableWidgetProps) {
  const updateComponent = useUpdateComponent();
  const config = (component.config as TableConfig) || {};
  const columns = config.columns || ["Name", "Value"];
  const rows = config.rows || [];

  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);

  const handleAddRow = () => {
    const newRow: TableRow = { id: crypto.randomUUID() };
    columns.forEach((col) => (newRow[col] = ""));
    
    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns, rows: [...rows, newRow] },
    });
  };

  const handleDeleteRow = (rowId: string) => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns, rows: rows.filter((r) => r.id !== rowId) },
    });
  };

  const handleCellChange = (rowId: string, col: string, value: string) => {
    const updatedRows = rows.map((row) =>
      row.id === rowId ? { ...row, [col]: value } : row
    );
    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns, rows: updatedRows },
    });
  };

  const handleAddColumn = () => {
    const newColName = `Col ${columns.length + 1}`;
    const updatedRows = rows.map((row) => ({ ...row, [newColName]: "" }));
    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns: [...columns, newColName], rows: updatedRows },
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
                  {col}
                </th>
              ))}
              {isGM && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isGM ? 1 : 0)} className="p-4 text-center text-muted-foreground">
                  No data. {isGM && "Click + to add a row."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-accent/30">
                  {columns.map((col) => (
                    <td key={col} className="p-2">
                      {isGM && editingCell?.rowId === row.id && editingCell?.col === col ? (
                        <input
                          autoFocus
                          className="w-full bg-input border border-primary rounded px-1 py-0.5 text-xs"
                          value={row[col] || ""}
                          onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
                        />
                      ) : (
                        <span
                          className={isGM ? "cursor-pointer hover:text-primary" : ""}
                          onClick={() => isGM && setEditingCell({ rowId: row.id, col })}
                        >
                          {row[col] || <span className="text-muted-foreground/50">—</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  {isGM && (
                    <td className="p-1">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-destructive/50 hover:text-destructive p-1"
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
        </div>
      )}
    </div>
  );
}
