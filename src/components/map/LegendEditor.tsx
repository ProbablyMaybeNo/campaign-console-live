import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical, Upload, Loader2, ImageIcon } from 'lucide-react';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { MarkerIcon } from './MarkerIcon';
import type { MapLegendItem, MarkerShape } from './types';
import { uploadCampaignImage, validateImageFile, ImageUploadError } from '@/lib/imageStorage';
import { toast } from 'sonner';

const SHAPES: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

interface LegendEditorProps {
  legendItems: MapLegendItem[];
  onAdd: (name: string, shape: MarkerShape, color: string, iconUrl?: string) => void;
  onUpdate: (itemId: string, updates: { name?: string; shape?: MarkerShape; color?: string; icon_url?: string | null }) => void;
  onDelete: (itemId: string) => void;
  isGM: boolean;
  campaignId: string;
}

export function LegendEditor({ legendItems, onAdd, onUpdate, onDelete, isGM, campaignId }: LegendEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShape, setNewShape] = useState<MarkerShape>('circle');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIconUrl, setNewIconUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const newIconInputRef = useRef<HTMLInputElement>(null);
  const updateIconInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const shape = newIconUrl ? 'custom' as MarkerShape : newShape;
    onAdd(newName.trim(), shape, newColor, newIconUrl || undefined);
    setNewName('');
    setNewShape('circle');
    setNewColor(COLORS[0]);
    setNewIconUrl(null);
    setShowAddForm(false);
  };

  const handleUploadNewIcon = async (file: File) => {
    try {
      validateImageFile(file);
      setIsUploading(true);
      const result = await uploadCampaignImage(campaignId, file, 'maps');
      setNewIconUrl(result.url);
      setNewShape('custom');
    } catch (error) {
      if (error instanceof ImageUploadError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to upload icon');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadUpdateIcon = async (file: File, itemId: string) => {
    try {
      validateImageFile(file);
      setUploadingItemId(itemId);
      const result = await uploadCampaignImage(campaignId, file, 'maps');
      onUpdate(itemId, { shape: 'custom' as MarkerShape, icon_url: result.url });
    } catch (error) {
      if (error instanceof ImageUploadError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to upload icon');
      }
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleClearCustomIcon = (itemId: string) => {
    onUpdate(itemId, { shape: 'circle', icon_url: null });
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
              <MarkerIcon shape={item.shape} color={item.color} size={24} iconUrl={item.icon_url} />
              <span className="flex-1 font-mono text-sm">{item.name}</span>
              
              {isGM && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center">
                  {/* Color picker (only for non-custom shapes) */}
                  {item.shape !== 'custom' && (
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
                  )}
                  
                  {/* Shape selector */}
                  {item.shape !== 'custom' && (
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
                  )}

                  {/* Upload custom icon button */}
                  {uploadingItemId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  ) : (
                    <button
                      onClick={() => {
                        setUploadingItemId(item.id);
                        updateIconInputRef.current?.click();
                      }}
                      className="p-1 hover:bg-muted rounded ml-1"
                      title="Upload custom icon"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}

                  {/* Clear custom icon */}
                  {item.shape === 'custom' && (
                    <button
                      onClick={() => handleClearCustomIcon(item.id)}
                      className="p-1 hover:bg-muted rounded text-xs text-muted-foreground"
                      title="Remove custom icon"
                    >
                      ✕
                    </button>
                  )}
                  
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

      {/* Hidden file input for updating existing items */}
      <input
        ref={updateIconInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingItemId) {
            handleUploadUpdateIcon(file, uploadingItemId);
          }
          if (updateIconInputRef.current) updateIconInputRef.current.value = '';
        }}
      />

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
              
              {/* Custom icon preview */}
              {newIconUrl && (
                <div className="flex items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded">
                  <img src={newIconUrl} alt="Custom icon" className="w-8 h-8 object-contain" />
                  <span className="text-xs text-muted-foreground flex-1">Custom icon uploaded</span>
                  <button
                    onClick={() => { setNewIconUrl(null); setNewShape('circle'); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {!newIconUrl && (
                  <>
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
                  </>
                )}

                {/* Upload custom icon */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {newIconUrl ? '' : 'Or use custom icon'}
                  </label>
                  <input
                    ref={newIconInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadNewIcon(file);
                      if (newIconInputRef.current) newIconInputRef.current.value = '';
                    }}
                  />
                  {!newIconUrl && (
                    <TerminalButton
                      variant="outline"
                      size="sm"
                      onClick={() => newIconInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Upload
                        </>
                      )}
                    </TerminalButton>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <TerminalButton variant="outline" size="sm" onClick={() => { setShowAddForm(false); setNewIconUrl(null); }}>
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
