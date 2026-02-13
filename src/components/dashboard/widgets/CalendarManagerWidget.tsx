import { useState } from "react";
import { Plus, Trash2, Edit2, X, Check, Eye, EyeOff, CalendarIcon, Palette } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useScheduleEntries,
  useCreateScheduleEntry,
  useUpdateScheduleEntry,
  useDeleteScheduleEntry,
  ScheduleEntry,
} from "@/hooks/useScheduleEntries";
import { useBattleRounds, useUpdateRound, type BattleRound } from "@/hooks/useBattleTracker";

interface CalendarManagerWidgetProps {
  campaignId: string;
  isGM: boolean;
  visibleRoundIds?: string[];
  onVisibleRoundsChange?: (roundIds: string[]) => void;
  roundColors?: Record<string, string>;
  onRoundColorsChange?: (colors: Record<string, string>) => void;
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

export function CalendarManagerWidget({
  campaignId,
  isGM,
  visibleRoundIds = [],
  onVisibleRoundsChange,
  roundColors = {},
  onRoundColorsChange,
}: CalendarManagerWidgetProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    color: "#3b82f6",
  });

  const { data: entries = [], isLoading: entriesLoading } = useScheduleEntries(campaignId);
  const { data: rounds = [], isLoading: roundsLoading } = useBattleRounds(campaignId);
  const createEntry = useCreateScheduleEntry();
  const updateEntry = useUpdateScheduleEntry();
  const deleteEntry = useDeleteScheduleEntry();
  const updateRound = useUpdateRound();

  const events = entries.filter(e => e.entry_type === "event");

  const resetForm = () => {
    setFormData({ title: "", startDate: undefined, endDate: undefined, color: "#3b82f6" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    await createEntry.mutateAsync({
      campaign_id: campaignId,
      title: formData.title.trim(),
      round_number: 0,
      start_date: formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      end_date: formData.endDate ? format(formData.endDate, "yyyy-MM-dd") : formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      color: formData.color,
      entry_type: "event",
      status: "upcoming",
    });
    resetForm();
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setFormData({
      title: entry.title,
      startDate: entry.start_date ? parseISO(entry.start_date) : undefined,
      endDate: entry.end_date ? parseISO(entry.end_date) : undefined,
      color: entry.color || "#3b82f6",
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.title.trim()) return;
    await updateEntry.mutateAsync({
      id: editingId,
      title: formData.title.trim(),
      start_date: formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      end_date: formData.endDate ? format(formData.endDate, "yyyy-MM-dd") : formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null,
      color: formData.color,
    });
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry.mutateAsync({ id, campaignId });
  };

  const handleRoundToggle = (roundId: string) => {
    if (!onVisibleRoundsChange) return;
    const newIds = visibleRoundIds.includes(roundId)
      ? visibleRoundIds.filter(id => id !== roundId)
      : [...visibleRoundIds, roundId];
    onVisibleRoundsChange(newIds);
  };

  const handleRoundDateChange = (roundId: string, field: "starts_at" | "ends_at", date: Date | undefined) => {
    updateRound.mutate({
      roundId,
      updates: { [field]: date ? date.toISOString() : null },
    });
  };

  const handleRoundColorChange = (roundId: string, color: string) => {
    if (!onRoundColorsChange) return;
    onRoundColorsChange({ ...roundColors, [roundId]: color });
  };

  const isLoading = entriesLoading || roundsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4" data-scrollable="true">
        {/* Battle Rounds Section */}
        {rounds.length > 0 && isGM && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Battle Rounds
            </p>
            <p className="text-[10px] text-muted-foreground mb-2">
              Assign dates & colors, then toggle to show on the calendar.
            </p>
            <div className="space-y-2">
              {rounds.map((round) => (
                <RoundConfigRow
                  key={round.id}
                  round={round}
                  isVisible={visibleRoundIds.includes(round.id)}
                  color={roundColors[round.id] || "#a855f7"}
                  onToggle={() => handleRoundToggle(round.id)}
                  onDateChange={(field, date) => handleRoundDateChange(round.id, field, date)}
                  onColorChange={(color) => handleRoundColorChange(round.id, color)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Events Section */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Events
          </p>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No events yet. {isGM && "Add one below."}
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((entry) => (
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
                      {entry.start_date && (
                        <span>
                          {format(parseISO(entry.start_date), "MMM d")}
                          {entry.end_date && entry.end_date !== entry.start_date && (
                            <> - {format(parseISO(entry.end_date), "MMM d")}</>
                          )}
                        </span>
                      )}
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
      </div>

      {/* Add/Edit Event Form for GM */}
      {isGM && (showForm || editingId) && (
        <div className="pt-2 border-t border-border mt-2 space-y-2">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Event name..."
            className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
          />

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
          </div>

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

      {isGM && !showForm && !editingId && (
        <div className="pt-2 border-t border-border mt-auto">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> Add Event
          </button>
        </div>
      )}
    </div>
  );
}

/** Expandable round row with date pickers & color selector */
function RoundConfigRow({
  round,
  isVisible,
  color,
  onToggle,
  onDateChange,
  onColorChange,
}: {
  round: BattleRound;
  isVisible: boolean;
  color: string;
  onToggle: () => void;
  onDateChange: (field: "starts_at" | "ends_at", date: Date | undefined) => void;
  onColorChange: (color: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    draft: "text-muted-foreground",
    open: "text-green-400",
    closed: "text-blue-400",
  };

  return (
    <div className="border border-border/50 rounded bg-muted/20 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer"
          style={{ backgroundColor: color }}
          onClick={() => setExpanded(!expanded)}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-xs font-medium truncate">{round.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className={statusColors[round.status] || "text-muted-foreground"}>
              {round.status}
            </span>
            {round.starts_at && (
              <>
                <span>•</span>
                <span>
                  {format(parseISO(round.starts_at), "MMM d")}
                  {round.ends_at && (
                    <> – {format(parseISO(round.ends_at), "MMM d")}</>
                  )}
                </span>
              </>
            )}
            {!round.starts_at && (
              <>
                <span>•</span>
                <span className="italic text-yellow-500/70">No dates</span>
              </>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-primary/20 rounded text-muted-foreground hover:text-primary"
            title="Edit dates & color"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {isVisible ? (
            <Eye className="w-3 h-3 text-primary" />
          ) : (
            <EyeOff className="w-3 h-3 text-muted-foreground" />
          )}
          <Switch
            checked={isVisible}
            onCheckedChange={onToggle}
            className="scale-75"
          />
        </div>
      </div>

      {/* Expanded config panel */}
      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-border/30 pt-2">
          {/* Date pickers */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center gap-1 text-[10px] py-1 px-2 border border-border rounded text-left hover:border-primary/50">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {round.starts_at ? format(parseISO(round.starts_at), "MMM d, yyyy") : "Start date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={round.starts_at ? parseISO(round.starts_at) : undefined}
                  onSelect={(date) => onDateChange("starts_at", date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center gap-1 text-[10px] py-1 px-2 border border-border rounded text-left hover:border-primary/50">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {round.ends_at ? format(parseISO(round.ends_at), "MMM d, yyyy") : "End date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={round.ends_at ? parseISO(round.ends_at) : undefined}
                  onSelect={(date) => onDateChange("ends_at", date)}
                  disabled={(date) => round.starts_at ? date < parseISO(round.starts_at) : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <Palette className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => onColorChange(c.hex)}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    color === c.hex ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
