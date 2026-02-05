import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, parseISO, addDays } from "date-fns";
import { useScheduleEntries, ScheduleEntry } from "@/hooks/useScheduleEntries";

interface CalendarWidgetProps {
  campaignId: string;
  isGM: boolean;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarWidget({ campaignId }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);

  const { data: entries = [], isLoading } = useScheduleEntries(campaignId);

  // Generate array of days for the calendar grid (6 weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days: Date[] = [];
    let day = calendarStart;
    
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    // Ensure we have exactly 42 days (6 weeks) for consistent height
    while (days.length < 42) {
      days.push(addDays(days[days.length - 1], 1));
    }
    
    return days;
  }, [currentMonth]);

  // Get entries that overlap with a specific day
  const getEntriesForDay = (day: Date): ScheduleEntry[] => {
    return entries.filter((entry) => {
      if (!entry.start_date) return false;
      
      const startDate = parseISO(entry.start_date);
      const endDate = entry.end_date ? parseISO(entry.end_date) : startDate;
      
      return isWithinInterval(day, { start: startDate, end: endDate }) ||
             isSameDay(day, startDate) ||
             isSameDay(day, endDate);
    });
  };

  // Check if entry starts on this day
  const isEntryStart = (entry: ScheduleEntry, day: Date): boolean => {
    if (!entry.start_date) return false;
    return isSameDay(parseISO(entry.start_date), day);
  };

  // Check if entry ends on this day
  const isEntryEnd = (entry: ScheduleEntry, day: Date): boolean => {
    if (!entry.start_date) return false;
    const endDate = entry.end_date ? parseISO(entry.end_date) : parseISO(entry.start_date);
    return isSameDay(endDate, day);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

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
          const dayEntries = getEntriesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={`relative min-h-[40px] p-1 bg-card ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-1 ring-inset ring-primary/50" : ""}`}
            >
              {/* Date Number */}
              <span
                className={`text-[10px] font-mono ${
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Entry Bars */}
              <div className="absolute bottom-1 left-0 right-0 space-y-0.5 px-0.5">
                {dayEntries.slice(0, 2).map((entry) => {
                  const isStart = isEntryStart(entry, day);
                  const isEnd = isEntryEnd(entry, day);
                  const isSingleDay = isStart && isEnd;

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`w-full h-2 text-[6px] truncate transition-opacity hover:opacity-80 ${
                        isSingleDay ? "rounded" : isStart ? "rounded-l" : isEnd ? "rounded-r" : ""
                      }`}
                      style={{ backgroundColor: entry.color || "#3b82f6" }}
                      title={entry.title}
                    />
                  );
                })}
                {dayEntries.length > 2 && (
                  <span className="text-[8px] text-muted-foreground">+{dayEntries.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Entry Detail Overlay */}
      {selectedEntry && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col p-3 z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedEntry.color || "#3b82f6" }}
              />
              <h3 className="text-sm font-mono text-primary uppercase">{selectedEntry.title}</h3>
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close event details"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground capitalize">{selectedEntry.entry_type || "Round"}</span>
            </div>
            
            {selectedEntry.start_date && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Date:</span>
                <span className="text-foreground">
                  {format(parseISO(selectedEntry.start_date), "MMM d, yyyy")}
                  {selectedEntry.end_date && selectedEntry.end_date !== selectedEntry.start_date && (
                    <> - {format(parseISO(selectedEntry.end_date), "MMM d, yyyy")}</>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`capitalize ${
                selectedEntry.status === "completed" ? "text-accent" :
                selectedEntry.status === "in_progress" ? "text-primary" :
                "text-muted-foreground"
              }`}>
                {selectedEntry.status || "Upcoming"}
              </span>
            </div>

            {selectedEntry.round_number && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Round:</span>
                <span className="text-foreground">{selectedEntry.round_number}</span>
              </div>
            )}

            {selectedEntry.scenario && (
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-muted-foreground">Scenario:</span>
                <p className="text-foreground bg-muted/30 p-2 rounded">{selectedEntry.scenario}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
