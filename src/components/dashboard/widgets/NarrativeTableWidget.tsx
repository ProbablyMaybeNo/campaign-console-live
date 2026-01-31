import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, X } from "lucide-react";
import { format } from "date-fns";

interface NarrativeEvent {
  id: string;
  title: string;
  content: string;
  event_type: string | null;
  created_at: string;
  event_date: string | null;
}

interface NarrativeTableWidgetProps {
  campaignId: string;
  isGM: boolean;
}

function truncateContent(content: string, wordCount: number = 6): string {
  const words = content.split(/\s+/).slice(0, wordCount);
  const truncated = words.join(" ");
  return content.split(/\s+/).length > wordCount ? `${truncated}...` : truncated;
}

export function NarrativeTableWidget({ campaignId }: NarrativeTableWidgetProps) {
  const [selectedEvent, setSelectedEvent] = useState<NarrativeEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["narrative_events", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("narrative_events")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <BookOpen className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No narrative entries yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto relative" data-scrollable="true">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-primary/30">
            <th className="text-left p-2 text-primary font-mono uppercase">Title</th>
            <th className="text-left p-2 text-primary font-mono uppercase">Preview</th>
            <th className="text-left p-2 text-primary font-mono uppercase">Date</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
            >
              <td className="p-2 truncate max-w-[120px] font-medium">{event.title}</td>
              <td className="p-2 text-muted-foreground truncate max-w-[180px]">
                {truncateContent(event.content)}
              </td>
              <td className="p-2 text-muted-foreground whitespace-nowrap">
                {format(new Date(event.created_at), "MMM d")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Full Entry Overlay */}
      {selectedEvent && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-20 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-3 border-b border-border">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-mono text-primary font-semibold truncate">
                {selectedEvent.title}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(selectedEvent.created_at), "MMMM d, yyyy")}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(null);
              }}
              className="p-1 hover:bg-accent rounded transition-colors ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedEvent.content}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border">
            <span className="inline-block bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-mono uppercase">
              Entry
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
