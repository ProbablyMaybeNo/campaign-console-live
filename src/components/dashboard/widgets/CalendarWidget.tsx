import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, parseISO, addDays } from "date-fns";
import { useScheduleEntries, ScheduleEntry } from "@/hooks/useScheduleEntries";
import { useBattleRounds, type BattleRound } from "@/hooks/useBattleTracker";
import { useCampaignDisplaySettings } from "@/hooks/useCampaignDisplaySettings";

interface CalendarWidgetProps {
  campaignId: string;
  isGM: boolean;
}

interface CalendarItem {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  color: string;
  type: "event" | "round";
  status?: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarWidget({ campaignId }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const { data: entries = [], isLoading: entriesLoading } = useScheduleEntries(campaignId);
  const { data: rounds = [], isLoading: roundsLoading } = useBattleRounds(campaignId);
  const { displaySettings } = useCampaignDisplaySettings(campaignId);

  const visibleRoundIds: string[] = (displaySettings?.visible_round_ids as string[]) || [];
  const roundColors: Record<string, string> = (displaySettings?.round_colors as Record<string, string>) || {};

  // Merge events + visible rounds into CalendarItems
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add schedule events (only events, not old round entries)
    entries
      .filter(e => e.entry_type === "event")
      .forEach(e => {
        if (!e.start_date) return;
        items.push({
          id: e.id,
          title: e.title,
          start_date: e.start_date,
          end_date: e.end_date,
          color: e.color || "#3b82f6",
          type: "event",
          status: e.status || undefined,
        });
      });

    // Add visible battle rounds
    rounds
      .filter(r => visibleRoundIds.includes(r.id) && r.starts_at)
      .forEach(r => {
        items.push({
          id: r.id,
          title: r.name,
          start_date: r.starts_at!,
          end_date: r.ends_at,
          color: roundColors[r.id] || "#a855f7",
          type: "round",
          status: r.status,
        });
      });

    return items;
  }, [entries, rounds, visibleRoundIds, roundColors]);

  // Generate array of days for the calendar grid (6 weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days: Date[] = [];
    let day = calendarStart;
    
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    while (days.length < 42) {
      days.push(addDays(days[days.length - 1], 1));
    }
    
    return days;
  }, [currentMonth]);

  const getItemsForDay = (day: Date): CalendarItem[] => {
    return calendarItems.filter((item) => {
      const startDate = parseISO(item.start_date);
      const endDate = item.end_date ? parseISO(item.end_date) : startDate;
      
      return isWithinInterval(day, { start: startDate, end: endDate }) ||
             isSameDay(day, startDate) ||
             isSameDay(day, endDate);
    });
  };

  const isItemStart = (item: CalendarItem, day: Date): boolean => {
    return isSameDay(parseISO(item.start_date), day);
  };

  const isItemEnd = (item: CalendarItem, day: Date): boolean => {
    const endDate = item.end_date ? parseISO(item.end_date) : parseISO(item.start_date);
    return isSameDay(endDate, day);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
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
    <div className="flex flex-col h-full relative">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => navigateMonth("prev")}
          className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
        </button>
        <span className="text-sm font-mono text-primary uppercase tracking-wider">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => navigateMonth("next")}
          className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-mono text-muted-foreground uppercase py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px flex-1 bg-border/30">
        {calendarDays.map((day, index) => {
          const dayItems = getItemsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={`relative min-h-[40px] p-1 bg-card ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-1 ring-inset ring-primary/50" : ""}`}
            >
              <span
                className={`text-[10px] font-mono ${
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>

              <div className="absolute bottom-1 left-0 right-0 space-y-0.5 px-0.5">
                {dayItems.slice(0, 2).map((item) => {
                  const isStart = isItemStart(item, day);
                  const isEnd = isItemEnd(item, day);
                  const isSingleDay = isStart && isEnd;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full h-2 text-[6px] truncate transition-opacity hover:opacity-80 ${
                        isSingleDay ? "rounded" : isStart ? "rounded-l" : isEnd ? "rounded-r" : ""
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.title}
                    />
                  );
                })}
                {dayItems.length > 2 && (
                  <span className="text-[8px] text-muted-foreground">+{dayItems.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Detail Overlay */}
      {selectedItem && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col p-3 z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedItem.color }}
              />
              <h3 className="text-sm font-mono text-primary uppercase">{selectedItem.title}</h3>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close details"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground capitalize">{selectedItem.type}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Date:</span>
              <span className="text-foreground">
                {format(parseISO(selectedItem.start_date), "MMM d, yyyy")}
                {selectedItem.end_date && selectedItem.end_date !== selectedItem.start_date && (
                  <> - {format(parseISO(selectedItem.end_date), "MMM d, yyyy")}</>
                )}
              </span>
            </div>

            {selectedItem.status && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <span className={`capitalize ${
                  selectedItem.status === "completed" || selectedItem.status === "closed" ? "text-accent" :
                  selectedItem.status === "in_progress" || selectedItem.status === "open" ? "text-primary" :
                  "text-muted-foreground"
                }`}>
                  {selectedItem.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
