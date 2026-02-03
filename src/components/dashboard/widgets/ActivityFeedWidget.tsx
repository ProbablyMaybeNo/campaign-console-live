import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  MessageSquare, 
  Swords, 
  Calendar, 
  BookOpen, 
  RefreshCw,
  Activity,
  Info
} from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ACTIVITY FEED WIDGET
 * 
 * This widget tracks and displays the following campaign events:
 * 
 * 1. PLAYER_JOIN - When a new player joins the campaign
 *    - Source: campaign_players table
 *    - Trigger: New row inserted
 * 
 * 2. MESSAGE - When a new message is sent in the campaign
 *    - Source: messages table  
 *    - Trigger: New row inserted
 * 
 * 3. WARBAND - When a warband is created or updated
 *    - Source: warbands table
 *    - Trigger: New row inserted or existing row updated
 * 
 * 4. SCHEDULE - When a schedule entry is added
 *    - Source: schedule_entries table
 *    - Trigger: New row inserted
 * 
 * 5. NARRATIVE - When a narrative event is posted
 *    - Source: narrative_events table
 *    - Trigger: New row inserted
 * 
 * Realtime subscriptions are set up for messages, campaign_players, and warbands
 * to provide instant updates when these events occur.
 */

interface ActivityEvent {
  id: string;
  type: "player_join" | "message" | "warband" | "schedule" | "narrative";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

interface ActivityFeedWidgetProps {
  campaignId: string;
  isGM: boolean;
}

const eventIcons: Record<string, React.ElementType> = {
  player_join: UserPlus,
  message: MessageSquare,
  warband: Swords,
  schedule: Calendar,
  narrative: BookOpen,
};

const eventColors: Record<string, string> = {
  player_join: "text-[hsl(142,76%,50%)]",
  message: "text-[hsl(200,100%,65%)]",
  warband: "text-[hsl(45,100%,60%)]",
  schedule: "text-[hsl(280,100%,70%)]",
  narrative: "text-[hsl(340,80%,60%)]",
};

export function ActivityFeedWidget({ campaignId, isGM }: ActivityFeedWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: activities = [], refetch, isLoading } = useQuery({
    queryKey: ["campaign-activity", campaignId],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const events: ActivityEvent[] = [];

      // Fetch recent player joins
      const { data: players } = await supabase
        .from("campaign_players")
        .select("id, player_name, joined_at, user_id")
        .eq("campaign_id", campaignId)
        .order("joined_at", { ascending: false })
        .limit(10);

      if (players) {
        players.forEach((p) => {
          events.push({
            id: `player-${p.id}`,
            type: "player_join",
            title: "Player Joined",
            description: p.player_name || "Anonymous Player",
            timestamp: p.joined_at,
          });
        });
      }

      // Fetch recent messages
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, created_at, author_id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages) {
        messages.forEach((m) => {
          events.push({
            id: `message-${m.id}`,
            type: "message",
            title: "New Message",
            description: m.content.slice(0, 50) + (m.content.length > 50 ? "..." : ""),
            timestamp: m.created_at,
          });
        });
      }

      // Fetch recent warband updates
      const { data: warbands } = await supabase
        .from("warbands")
        .select("id, name, updated_at, created_at")
        .eq("campaign_id", campaignId)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (warbands) {
        warbands.forEach((w) => {
          const isNew = new Date(w.created_at).getTime() === new Date(w.updated_at).getTime();
          events.push({
            id: `warband-${w.id}-${w.updated_at}`,
            type: "warband",
            title: isNew ? "Warband Created" : "Warband Updated",
            description: w.name,
            timestamp: w.updated_at,
          });
        });
      }

      // Fetch recent schedule entries
      const { data: schedules } = await supabase
        .from("schedule_entries")
        .select("id, title, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (schedules) {
        schedules.forEach((s) => {
          events.push({
            id: `schedule-${s.id}`,
            type: "schedule",
            title: "Schedule Event Added",
            description: s.title,
            timestamp: s.created_at,
          });
        });
      }

      // Fetch recent narrative events
      const { data: narratives } = await supabase
        .from("narrative_events")
        .select("id, title, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (narratives) {
        narratives.forEach((n) => {
          events.push({
            id: `narrative-${n.id}`,
            type: "narrative",
            title: "Narrative Entry",
            description: n.title,
            timestamp: n.created_at,
          });
        });
      }

      // Sort all events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events.slice(0, 25);
    },
    staleTime: 30000, // 30 seconds
  });

  // Set up realtime subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel(`activity-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `campaign_id=eq.${campaignId}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_players", filter: `campaign_id=eq.${campaignId}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "warbands", filter: `campaign_id=eq.${campaignId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Activity className="w-5 h-5 animate-pulse mr-2" />
        <span className="text-xs">Loading activity...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Recent Activity
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground">
                <Info className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-[10px]">
                Tracks: Player Joins, Messages, Warband Updates, Schedule Events, and Narrative Entries
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <TerminalButton 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
        </TerminalButton>
      </div>

      <ScrollArea className="flex-1 mt-2" data-scrollable="true">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-2 pr-2">
            {activities.map((event) => {
              const Icon = eventIcons[event.type] || Activity;
              const colorClass = eventColors[event.type] || "text-muted-foreground";
              
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">{event.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {event.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
