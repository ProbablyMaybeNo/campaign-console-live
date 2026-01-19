import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { MarkerIcon } from './MarkerIcon';
import type { MapLegendItem, MarkerShape } from './types';

const SHAPES: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

interface LegendEditorProps {
  legendItems: MapLegendItem[];
  onAdd: (name: string, shape: MarkerShape, color: string) => void;
  onUpdate: (itemId: string, updates: { name?: string; shape?: MarkerShape; color?: string }) => void;
  onDelete: (itemId: string) => void;
  isGM: boolean;
}

export function LegendEditor({ legendItems, onAdd, onUpdate, onDelete, isGM }: LegendEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShape, setNewShape] = useState<MarkerShape>('circle');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newShape, newColor);
    setNewName('');
    setNewShape('circle');
    setNewColor(COLORS[0]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Legend Items List */}
      <div className="space-y-2">
        {legendItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No legend items yet.</p>
            {isGM && <p className="text-sm">Add items to create your map legend.</p>}
          </div>
        ) : (
          legendItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg group"
            >
              {isGM && <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />}
              <MarkerIcon shape={item.shape} color={item.color} size={24} />
              <span className="flex-1 font-mono text-sm">{item.name}</span>
              
              {isGM && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {/* Color picker */}
                  <div className="flex gap-1">
                    {COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        onClick={() => onUpdate(item.id, { color })}
                        className={`w-4 h-4 rounded-full border ${item.color === color ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  {/* Shape selector */}
                  <div className="flex gap-1 ml-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        onClick={() => onUpdate(item.id, { shape })}
                        className={`p-0.5 rounded ${item.shape === shape ? 'bg-primary/20' : 'hover:bg-muted'}`}
                      >
                        <MarkerIcon shape={shape} color={item.color} size={16} />
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Item Form */}
      {isGM && (
        <>
          {showAddForm ? (
            <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-4">
              <TerminalInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Legend item name (e.g., Contested Zone)"
                autoFocus
              />
              
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Shape</label>
                  <div className="flex gap-1">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        onClick={() => setNewShape(shape)}
                        className={`p-1.5 rounded border ${newShape === shape ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                      >
                        <MarkerIcon shape={shape} color={newColor} size={20} />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Color</label>
                  <div className="flex gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${newColor === color ? 'ring-2 ring-primary ring-offset-2' : 'border-border'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <TerminalButton variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </TerminalButton>
                <TerminalButton size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                  Add Item
                </TerminalButton>
              </div>
            </div>
          ) : (
            <TerminalButton variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Legend Item
            </TerminalButton>
          )}
        </>
      )}
    </div>
  );
}
