import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface NarrativeTableWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export function NarrativeTableWidget({ campaignId }: NarrativeTableWidgetProps) {
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
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-primary/30">
            <th className="text-left p-2 text-primary font-mono uppercase">Title</th>
            <th className="text-left p-2 text-primary font-mono uppercase">Date</th>
            <th className="text-left p-2 text-primary font-mono uppercase">Type</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border/50 hover:bg-accent/30">
              <td className="p-2 truncate max-w-[150px]">{event.title}</td>
              <td className="p-2 text-muted-foreground">
                {format(new Date(event.created_at), "MMM d")}
              </td>
              <td className="p-2">
                <span className="bg-accent px-1.5 py-0.5 rounded text-[10px]">
                  {event.event_type || "story"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}