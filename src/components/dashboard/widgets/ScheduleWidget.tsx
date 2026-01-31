import { useState } from "react";
import { Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  useScheduleEntries,
  useCreateScheduleEntry,
  useUpdateScheduleEntry,
  useDeleteScheduleEntry,
  ScheduleEntry,
} from "@/hooks/useScheduleEntries";

interface ScheduleWidgetProps {
  campaignId: string;
  isGM: boolean;
}

const COLOR_PALETTE = [
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#eab308", name: "Yellow" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#ec4899", name: "Pink" },
];

const STATUSES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function ScheduleWidget({ campaignId, isGM }: ScheduleWidgetProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    roundNumber: 1,
    entryType: "round" as "round" | "event",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    color: "#3b82f6",
    status: "upcoming",
  });

  const { data: entries = [], isLoading } = useScheduleEntries(campaignId);
  const createEntry = useCreateScheduleEntry();
  const updateEntry = useUpdateScheduleEntry();
  const deleteEntry = useDeleteScheduleEntry();

  const resetForm = () => {
    setFormData({
      title: "",
      roundNumber: (entries.length || 0) + 1,
      entryType: "round",
      startDate: undefined,
      endDate: undefined,
      color: "#3b82f6",
      status: "upcoming",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return;

    await createEntry.mutateAsync({
      campaign_id: campaignId,
      title: formData.title.trim(),
      round_number: formData.roundNumber,
      start_date: formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      end_date: formData.entryType === "round" && formData.endDate 
        ? format(formData.endDate, "yyyy-MM-dd") 
        : formData.startDate 
          ? format(formData.startDate, "yyyy-MM-dd") 
          : null,
      color: formData.color,
      entry_type: formData.entryType,
      status: formData.status,
    });

    resetForm();
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setFormData({
      title: entry.title,
      roundNumber: entry.round_number,
      entryType: (entry.entry_type as "round" | "event") || "round",
      startDate: entry.start_date ? parseISO(entry.start_date) : undefined,
      endDate: entry.end_date ? parseISO(entry.end_date) : undefined,
      color: entry.color || "#3b82f6",
      status: entry.status || "upcoming",
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.title.trim()) return;

    await updateEntry.mutateAsync({
      id: editingId,
      title: formData.title.trim(),
      round_number: formData.roundNumber,
      start_date: formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      end_date: formData.entryType === "round" && formData.endDate 
        ? format(formData.endDate, "yyyy-MM-dd") 
        : formData.startDate 
          ? format(formData.startDate, "yyyy-MM-dd") 
          : null,
      color: formData.color,
      entry_type: formData.entryType,
      status: formData.status,
    });

    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry.mutateAsync({ id, campaignId });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed": return "text-accent";
      case "in_progress": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" data-scrollable="true">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No rounds or events scheduled. {isGM && "Add one to get started."}
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 p-2 border border-border/50 rounded bg-muted/20"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color || "#3b82f6" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="capitalize">{entry.entry_type || "round"}</span>
                    {entry.start_date && (
                      <>
                        <span>•</span>
                        <span>
                          {format(parseISO(entry.start_date), "MMM d")}
                          {entry.end_date && entry.end_date !== entry.start_date && (
                            <> - {format(parseISO(entry.end_date), "MMM d")}</>
                          )}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className={getStatusColor(entry.status)}>
                      {entry.status || "upcoming"}
                    </span>
                  </div>
                </div>
                {isGM && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1 hover:bg-primary/20 rounded text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form for GM */}
      {isGM && (showForm || editingId) && (
        <div className="pt-2 border-t border-border mt-2 space-y-2">
          {/* Entry Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setFormData(prev => ({ ...prev, entryType: "round" }))}
              className={`flex-1 text-xs py-1 px-2 rounded border ${
                formData.entryType === "round"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              Round
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, entryType: "event" }))}
              className={`flex-1 text-xs py-1 px-2 rounded border ${
                formData.entryType === "event"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              Event
            </button>
          </div>

          {/* Title & Round Number */}
          <div className="flex gap-2">
            {formData.entryType === "round" && (
              <input
                type="number"
                value={formData.roundNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, roundNumber: parseInt(e.target.value) || 1 }))}
                min={1}
                className="w-14 bg-input border border-border rounded px-2 py-1 text-xs"
                placeholder="#"
              />
            )}
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={formData.entryType === "round" ? "Round title..." : "Event name..."}
              className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date Pickers */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex-1 text-xs py-1 px-2 border border-border rounded text-left hover:border-primary/50">
                  {formData.startDate ? format(formData.startDate, "MMM d, yyyy") : "Start date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            {formData.entryType === "round" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 text-xs py-1 px-2 border border-border rounded text-left hover:border-primary/50">
                    {formData.endDate ? format(formData.endDate, "MMM d, yyyy") : "End date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                    disabled={(date) => formData.startDate ? date < formData.startDate : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Color & Status */}
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setFormData(prev => ({ ...prev, color: color.hex }))}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    formData.color === color.hex ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!formData.title.trim() || createEntry.isPending || updateEntry.isPending}
              className="flex-1 flex items-center justify-center gap-1 bg-primary/20 border border-primary text-primary text-xs py-1 rounded hover:bg-primary/30 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              {editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={resetForm}
              className="px-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Button for GM */}
      {isGM && !showForm && !editingId && (
        <div className="pt-2 border-t border-border mt-auto">
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, roundNumber: (entries.length || 0) + 1 }));
              setShowForm(true);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> Add Round / Event
          </button>
        </div>
      )}
    </div>
  );
}
