/**
 * PasteWizardOverlay - Two-step paste and review UI for creating table/card components
 * 
 * Supports two modes:
 * - Dashboard component creation (default)
 * - Rules creation (saveToRules=true) - saves to wargame_rules table
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useCreateRule, TableRuleContent, CardRuleContent } from "@/hooks/useWargameRules";
import { useAITextConvert } from "@/hooks/useAITextConvert";
import { analyzeText, toTableConfig, toCardConfig, type DetectedContent } from "@/lib/textPatternDetector";
import { 
  Table, 
  LayoutList,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  Wand2,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PasteWizardOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  componentType: 'table' | 'card';
  onComplete?: () => void;
  /** If true, saves to wargame_rules table instead of dashboard_components */
  saveToRules?: boolean;
  /** If true, starts with empty table/card for manual entry (no paste required) */
  isCustom?: boolean;
}

type WizardStep = 'paste' | 'review';

interface TableRow {
  id: string;
  [key: string]: string;
}

export function PasteWizardOverlay({ 
  open, 
  onOpenChange, 
  campaignId, 
  componentType,
  onComplete,
  saveToRules = false,
  isCustom = false,
}: PasteWizardOverlayProps) {
  // For custom mode, start directly on review step with empty data
  const [step, setStep] = useState<WizardStep>(isCustom ? 'review' : 'paste');
  const [rawText, setRawText] = useState('');
  const [name, setName] = useState(isCustom ? `New ${componentType === 'table' ? 'Table' : 'Card'}` : '');
  const [category, setCategory] = useState('General');
  const [detection, setDetection] = useState<DetectedContent | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  
  // Editable state for review step
  const [columns, setColumns] = useState<string[]>(isCustom ? ['Column 1', 'Column 2'] : []);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [headerValue, setHeaderValue] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  
  // Card-specific state
  const [sections, setSections] = useState<Array<{ id: string; header: string; content: string }>>(
    isCustom && componentType === 'card' ? [{ id: crypto.randomUUID(), header: 'Section 1', content: '' }] : []
  );
  
  const createComponent = useCreateComponent();
  const createRule = useCreateRule();
  const { convertText, isConverting } = useAITextConvert();

  const handleAIConvert = async () => {
    if (!rawText.trim()) {
      toast.error('No text to convert');
      return;
    }

    const result = await convertText(rawText, componentType);
    
    if (!result.success) {
      return; // Toast already shown by hook
    }

    if (result.type === 'table') {
      setColumns(result.data.columns);
      setRows(result.data.rows.map(row => ({
        ...row,
        id: row.id || crypto.randomUUID(),
      })));
      if (result.data.title && !name) {
        setName(result.data.title);
      }
      // Update detection to show AI-converted
      setDetection(prev => prev ? {
        ...prev,
        confidence: 'high',
        type: 'whitespace-table',
        warnings: [],
      } : null);
    } else if (result.type === 'card') {
      // For card type, convert sections to table-like structure for display
      setColumns(['Header', 'Content']);
      setRows(result.data.sections.map(s => ({
        id: crypto.randomUUID(),
        Header: s.header,
        Content: s.content,
      })));
      if (result.data.title && !name) {
        setName(result.data.title);
      }
      setDetection(prev => prev ? {
        ...prev,
        confidence: 'high',
        type: 'key-value',
        warnings: [],
      } : null);
    }

    toast.success('AI conversion applied - review the results');
  };

  const handleGenerate = () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    const result = analyzeText(rawText);
    
    if (!result.bestMatch) {
      toast.error('Could not detect any table structure in the pasted text');
      return;
    }

    setDetection(result.bestMatch);
    setColumns(result.bestMatch.columns);
    setRows(result.bestMatch.rows.map(rowData => {
      const row: TableRow = { id: crypto.randomUUID() };
      result.bestMatch!.columns.forEach((col, i) => {
        row[col] = rowData[i] || '';
      });
      return row;
    }));

    // Auto-generate name from detection title
    if (!name) {
      setName(result.bestMatch.title || `New ${componentType === 'table' ? 'Table' : 'Card'}`);
    }

    // Show warnings
    if (result.bestMatch.warnings.length > 0) {
      result.bestMatch.warnings.forEach(w => toast.warning(w));
    }

    setStep('review');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Build content based on type
    if (saveToRules) {
      // Save to wargame_rules table
      const ruleContent: TableRuleContent | CardRuleContent = componentType === 'table'
        ? {
            type: 'table',
            columns,
            rows,
            rawText: detection?.rawText || rawText,
          }
        : {
            type: 'card',
            title: name.trim(),
            sections: componentType === 'card' 
              ? (rows.length > 0 
                  ? rows.map(r => ({ id: r.id, header: r.Header || '', content: r.Content || '' }))
                  : sections)
              : [],
            rawText: detection?.rawText || rawText,
          };

      await createRule.mutateAsync({
        campaignId,
        title: name.trim(),
        category,
        content: ruleContent,
      });

      toast.success(`${componentType === 'table' ? 'Rules Table' : 'Rules Card'} created!`);
    } else {
      // Save to dashboard_components
      const config = componentType === 'table' 
        ? {
            columns,
            rows,
            rawText: detection?.rawText || rawText,
            parsingMode: 'auto',
            manual_setup: true,
          }
        : toCardConfig(detection!);

      await createComponent.mutateAsync({
        campaign_id: campaignId,
        name: name.trim(),
        component_type: componentType,
        config: config as unknown as Json,
        position_x: Math.round(100 + Math.random() * 200),
        position_y: Math.round(100 + Math.random() * 200),
        width: 350,
        height: 300,
      });

      toast.success(`${componentType === 'table' ? 'Table' : 'Card'} created!`);
    }

    handleClose();
    onComplete?.();
  };

  const handleClose = () => {
    setStep(isCustom ? 'review' : 'paste');
    setRawText('');
    setName(isCustom ? `New ${componentType === 'table' ? 'Table' : 'Card'}` : '');
    setCategory('General');
    setDetection(null);
    setColumns(isCustom ? ['Column 1', 'Column 2'] : []);
    setRows([]);
    setSections(isCustom && componentType === 'card' ? [{ id: crypto.randomUUID(), header: 'Section 1', content: '' }] : []);
    setShowRawText(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (isCustom) {
      handleClose();
    } else {
      setStep('paste');
    }
  };

  // Table editing functions
  const handleAddRow = () => {
    const newRow: TableRow = { id: crypto.randomUUID() };
    columns.forEach((col) => (newRow[col] = ''));
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
  };

  const handleCellChange = (rowId: string, col: string, value: string) => {
    setRows(rows.map((row) =>
      row.id === rowId ? { ...row, [col]: value } : row
    ));
  };

  const handleAddColumn = () => {
    const newColName = `Column ${columns.length + 1}`;
    setColumns([...columns, newColName]);
    setRows(rows.map((row) => ({ ...row, [newColName]: '' })));
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
      toast.error('Column name already exists');
      setEditingHeader(null);
      return;
    }

    const updatedColumns = columns.map((col, i) => (i === editingHeader ? newName : col));
    const updatedRows = rows.map((row) => {
      const newRow: TableRow = { id: row.id };
      columns.forEach((col, i) => {
        const key = i === editingHeader ? newName : col;
        newRow[key] = row[col] || '';
      });
      return newRow;
    });

    setColumns(updatedColumns);
    setRows(updatedRows);
    setEditingHeader(null);
  };

  const handleDeleteColumn = (index: number) => {
    if (columns.length <= 1) return;

    const updatedColumns = columns.filter((_, i) => i !== index);
    const updatedRows = rows.map((row) => {
      const newRow: TableRow = { id: row.id };
      updatedColumns.forEach((col) => {
        newRow[col] = row[col] || '';
      });
      return newRow;
    });

    setColumns(updatedColumns);
    setRows(updatedRows);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">{">"}</span>
            {componentType === 'table' ? <Table className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
            {isCustom 
              ? `Create Custom ${componentType === 'table' ? 'Table' : 'Card'}`
              : saveToRules 
                ? `Create Rules ${componentType === 'table' ? 'Table' : 'Card'}`
                : `Create ${componentType === 'table' ? 'Table' : 'Card'} from Pasted Rules`
            }
          </DialogTitle>
        </DialogHeader>

        {step === 'paste' && (
          <div className="space-y-4 py-4 flex-1">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Paste rules text below
              </label>
              <textarea
                className="w-full h-64 bg-input border border-border rounded p-3 text-sm font-mono resize-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Paste rules text here...

Example:
1-2  Minor Wound - No effect
3-4  Flesh Wound - -1 to all rolls
5    Serious Injury - Out for next game
6    Dead - Remove from roster"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Supports dice tables (D6, D66, 2D6), whitespace-aligned tables, TSV, and key-value patterns.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <TerminalButton variant="outline" onClick={handleClose}>
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleGenerate}
                disabled={!rawText.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </TerminalButton>
            </div>
          </div>
        )}

        {step === 'review' && (detection || isCustom) && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {/* Detection info - only show if not custom mode */}
            {detection && !isCustom && (
              <div className="flex items-center gap-4 text-xs">
                <span className="bg-primary/20 text-primary px-2 py-1 rounded font-mono uppercase">
                  {detection.type.replace('-', ' ')}
                </span>
                <span className="text-muted-foreground">
                  {rows.length} rows × {columns.length} columns
                </span>
                <span className={`px-2 py-1 rounded font-mono uppercase ${
                  detection.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                  detection.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {detection.confidence} confidence
                </span>
                {detection.diceType && (
                  <span className="bg-accent text-accent-foreground px-2 py-1 rounded font-mono">
                    {detection.diceType.toUpperCase()}
                  </span>
                )}
              </div>
            )}

            {/* Custom mode info */}
            {isCustom && (
              <div className="flex items-center gap-4 text-xs">
                <span className="bg-accent text-accent-foreground px-2 py-1 rounded font-mono uppercase">
                  Manual Entry
                </span>
                <span className="text-muted-foreground">
                  {rows.length} rows × {columns.length} columns
                </span>
              </div>
            )}

            {/* AI Convert button - show when confidence is not high and not custom */}
            {detection && !isCustom && detection.confidence !== 'high' && (
              <div className="bg-accent/30 border border-accent rounded p-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Detection confidence is {detection.confidence}</p>
                    {detection.warnings.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-amber-400">
                        {detection.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <TerminalButton
                  variant="outline"
                  onClick={handleAIConvert}
                  disabled={isConverting}
                  className="flex-shrink-0"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {isConverting ? 'Converting...' : 'Try AI Convert'}
                </TerminalButton>
              </div>
            )}

            {/* Warnings for high confidence */}
            {detection && !isCustom && detection.confidence === 'high' && detection.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-400 space-y-1">
                  {detection.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Name and Category inputs */}
            <div className="flex gap-4">
              <div className="flex-1">
                <TerminalInput
                  label={saveToRules ? "Rule Name" : "Component Name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>
              {saveToRules && (
                <div className="w-48">
                  <TerminalInput
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Combat, Movement..."
                  />
                </div>
              )}
            </div>

            {/* Editable table */}
            <div className="flex-1 overflow-hidden border border-border rounded">
              <ScrollArea className="h-[300px]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-primary/30">
                      {columns.map((col, i) => (
                        <th
                          key={i}
                          className="text-left p-2 text-primary font-mono uppercase tracking-wider bg-card"
                        >
                          {editingHeader === i ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                className="bg-input border border-primary rounded px-1 py-0.5 text-xs w-20"
                                value={headerValue}
                                onChange={(e) => setHeaderValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveHeader();
                                  if (e.key === 'Escape') setEditingHeader(null);
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
                            </div>
                          )}
                        </th>
                      ))}
                      <th className="w-8 bg-card" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-accent/30">
                        {columns.map((col) => (
                          <td key={col} className="p-2">
                            {editingCell?.rowId === row.id && editingCell?.col === col ? (
                              <input
                                autoFocus
                                className="w-full bg-input border border-primary rounded px-1 py-0.5 text-xs"
                                value={row[col] || ''}
                                onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:text-primary block min-h-[1.25rem]"
                                onClick={() => setEditingCell({ rowId: row.id, col })}
                                title="Click to edit"
                              >
                                {row[col] || <span className="text-muted-foreground/50 italic">Click to edit</span>}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="p-1">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-destructive/50 hover:text-destructive p-1"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Table controls */}
            <div className="flex gap-2">
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
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                View Raw Text
              </button>
            </div>

            {/* Raw text collapsible */}
            {showRawText && (
              <div className="bg-muted/30 border border-border rounded p-3 max-h-32 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {detection.rawText}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <TerminalButton variant="outline" onClick={handleBack}>
                {isCustom ? 'Cancel' : 'Back'}
              </TerminalButton>
              <TerminalButton
                onClick={handleCreate}
                disabled={!name.trim() || createComponent.isPending || createRule.isPending}
              >
                {(createComponent.isPending || createRule.isPending) 
                  ? 'Creating...' 
                  : saveToRules 
                    ? '[ Create Rule ]' 
                    : '[ Create Component ]'
                }
              </TerminalButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
