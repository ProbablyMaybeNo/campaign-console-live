import { useState } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
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
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerValue, setHeaderValue] = useState("");

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
    const newColName = `Column ${columns.length + 1}`;
    const updatedRows = rows.map((row) => ({ ...row, [newColName]: "" }));
    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns: [...columns, newColName], rows: updatedRows },
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

    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns: updatedColumns, rows: updatedRows },
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

    updateComponent.mutate({
      id: component.id,
      config: { ...config, columns: updatedColumns, rows: updatedRows },
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
                          className={isGM ? "cursor-pointer hover:text-primary block min-h-[1.25rem]" : ""}
                          onClick={() => isGM && setEditingCell({ rowId: row.id, col })}
                          title={isGM ? "Click to edit" : undefined}
                        >
                          {row[col] || <span className="text-muted-foreground/50 italic">Click to edit</span>}
                        </span>
                      )}
                    </td>
                  ))}
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
        </div>
      )}
    </div>
  );
}
