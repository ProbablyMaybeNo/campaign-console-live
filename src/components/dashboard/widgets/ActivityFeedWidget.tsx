import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import { 
  UserPlus, 
  MessageSquare, 
  Swords, 
  Calendar, 
  BookOpen, 
  RefreshCw,
  Activity,
  Settings,
} from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * ACTIVITY FEED WIDGET
 * 
 * This widget tracks and displays the following campaign events:
 * 
 * 1. PLAYER_JOIN - When a new player joins the campaign
 * 2. MESSAGE - When a new message is sent in the campaign
 * 3. WARBAND - When a warband is created or updated
 * 4. SCHEDULE - When a schedule entry is added
 * 5. NARRATIVE - When a narrative event is posted
 * 6. BATTLE - When a battle report is approved
 * 
 * GMs can toggle which event types appear in the feed via the settings panel.
 */

type EventType = "player_join" | "message" | "warband" | "schedule" | "narrative" | "battle";

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

interface ActivityFeedConfig {
  enabledEvents: Record<EventType, boolean>;
  maxItems: number;
  compactMode: boolean;
}

const defaultConfig: ActivityFeedConfig = {
  enabledEvents: {
    player_join: true,
    message: true,
    warband: true,
    schedule: true,
    narrative: true,
    battle: true,
  },
  maxItems: 25,
  compactMode: false,
};

interface ActivityFeedWidgetProps {
  campaignId: string;
  isGM: boolean;
  config?: Partial<ActivityFeedConfig>;
  onConfigChange?: (config: ActivityFeedConfig) => void;
}

const eventIcons: Record<EventType, React.ElementType> = {
  player_join: UserPlus,
  message: MessageSquare,
  warband: Swords,
  schedule: Calendar,
  narrative: BookOpen,
  battle: Swords,
};

const eventColors: Record<EventType, string> = {
  player_join: "text-[hsl(142,76%,50%)]",
  message: "text-[hsl(200,100%,65%)]",
  warband: "text-[hsl(45,100%,60%)]",
  schedule: "text-[hsl(280,100%,70%)]",
  narrative: "text-[hsl(340,80%,60%)]",
  battle: "text-[hsl(25,100%,60%)]",
};

const eventLabels: Record<EventType, string> = {
  player_join: "Player Joins",
  message: "Messages",
  warband: "Warband Updates",
  schedule: "Schedule Events",
  narrative: "Narrative Entries",
  battle: "Battle Reports",
};

export function ActivityFeedWidget({ 
  campaignId, 
  isGM, 
  config: propsConfig,
  onConfigChange 
}: ActivityFeedWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Merge props config with defaults
  const [localConfig, setLocalConfig] = useState<ActivityFeedConfig>(() => ({
    ...defaultConfig,
    ...propsConfig,
    enabledEvents: {
      ...defaultConfig.enabledEvents,
      ...(propsConfig?.enabledEvents || {}),
    },
  }));

  // Update local config when props change
  useEffect(() => {
    if (propsConfig) {
      setLocalConfig(prev => ({
        ...prev,
        ...propsConfig,
        enabledEvents: {
          ...prev.enabledEvents,
          ...(propsConfig.enabledEvents || {}),
        },
      }));
    }
  }, [propsConfig]);

  const updateConfig = (updates: Partial<ActivityFeedConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const toggleEventType = (type: EventType) => {
    const newEnabledEvents = {
      ...localConfig.enabledEvents,
      [type]: !localConfig.enabledEvents[type],
    };
    updateConfig({ enabledEvents: newEnabledEvents });
  };

  const { data: activities = [], refetch, isLoading } = useQuery({
    queryKey: ["campaign-activity", campaignId, localConfig.enabledEvents],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const events: ActivityEvent[] = [];

      // Fetch recent player joins
      if (localConfig.enabledEvents.player_join) {
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
      }

      // Fetch recent messages
      if (localConfig.enabledEvents.message) {
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
      }

      // Fetch recent warband updates
      if (localConfig.enabledEvents.warband) {
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
      }

      // Fetch recent schedule entries
      if (localConfig.enabledEvents.schedule) {
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
      }

      // Fetch recent narrative events
      if (localConfig.enabledEvents.narrative) {
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
      }

      // Fetch approved battle reports
      if (localConfig.enabledEvents.battle) {
        const { data: battleReports } = await supabase
          .from("battle_reports")
          .select(`
            id, 
            outcome, 
            player_side,
            approved_at,
            match_id,
            battle_matches!inner(
              campaign_id,
              participants
            )
          `)
          .not("approved_at", "is", null)
          .order("approved_at", { ascending: false })
          .limit(10);

        if (battleReports) {
          battleReports.forEach((report) => {
            const match = report.battle_matches as unknown as { campaign_id: string; participants: Array<{ playerName?: string }> };
            if (match?.campaign_id === campaignId) {
              const participants = match.participants || [];
              const playerNames = participants.map((p) => p.playerName || "Unknown").join(" vs ");
              events.push({
                id: `battle-${report.id}`,
                type: "battle",
                title: "Battle Completed",
                description: `${playerNames} - ${report.outcome}`,
                timestamp: report.approved_at!,
              });
            }
          });
        }
      }

      // Sort all events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events.slice(0, localConfig.maxItems);
    },
    staleTime: 30000,
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

  const enabledCount = Object.values(localConfig.enabledEvents).filter(Boolean).length;

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
          <span className="text-[10px] text-muted-foreground/60">
            ({enabledCount}/6 types)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isGM && (
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <TerminalButton
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Activity Feed Settings"
                >
                  <Settings className="w-3 h-3" />
                </TerminalButton>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background border-primary/30">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-primary font-mono">
                    <Activity className="w-4 h-4" />
                    Activity Feed Settings
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Event Type Toggles */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Event Types
                    </h4>
                    <div className="space-y-3">
                      {(Object.keys(eventLabels) as EventType[]).map((type) => {
                        const Icon = eventIcons[type];
                        const colorClass = eventColors[type];
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${colorClass}`} />
                              <Label htmlFor={`toggle-${type}`} className="text-sm">
                                {eventLabels[type]}
                              </Label>
                            </div>
                            <Switch
                              id={`toggle-${type}`}
                              checked={localConfig.enabledEvents[type]}
                              onCheckedChange={() => toggleEventType(type)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Max Items Slider */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Display Options
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Max Items</Label>
                        <span className="text-xs text-muted-foreground">{localConfig.maxItems}</span>
                      </div>
                      <Slider
                        value={[localConfig.maxItems]}
                        onValueChange={([value]) => updateConfig({ maxItems: value })}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor="compact-mode" className="text-sm">
                        Compact Mode
                      </Label>
                      <Switch
                        id="compact-mode"
                        checked={localConfig.compactMode}
                        onCheckedChange={(checked) => updateConfig({ compactMode: checked })}
                      />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Quick Actions
                    </h4>
                    <div className="flex gap-2">
                      <TerminalButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allEnabled = Object.fromEntries(
                            (Object.keys(eventLabels) as EventType[]).map((t) => [t, true])
                          ) as Record<EventType, boolean>;
                          updateConfig({ enabledEvents: allEnabled });
                        }}
                        className="flex-1 text-xs"
                      >
                        Enable All
                      </TerminalButton>
                      <TerminalButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allDisabled = Object.fromEntries(
                            (Object.keys(eventLabels) as EventType[]).map((t) => [t, false])
                          ) as Record<EventType, boolean>;
                          updateConfig({ enabledEvents: allDisabled });
                        }}
                        className="flex-1 text-xs"
                      >
                        Disable All
                      </TerminalButton>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
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
      </div>

      {/* Virtualized activity list for DOM weight reduction */}
      <VirtualizedActivityList 
        activities={activities}
        compactMode={localConfig.compactMode}
        enabledCount={enabledCount}
      />
    </div>
  );
}

/**
 * Virtualized activity list component
 * Reduces DOM weight by only rendering visible items
 */
function VirtualizedActivityList({ 
  activities, 
  compactMode,
  enabledCount 
}: { 
  activities: ActivityEvent[];
  compactMode: boolean;
  enabledCount: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => compactMode ? 32 : 48, [compactMode]),
    overscan: 5,
  });

  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center py-8">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">
            {enabledCount === 0 ? "All event types disabled" : "No activity yet"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto mt-2 pr-1"
      data-scrollable="true"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const event = activities[virtualItem.index];
          const Icon = eventIcons[event.type] || Activity;
          const colorClass = eventColors[event.type] || "text-muted-foreground";

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                className={`flex items-start gap-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors ${
                  compactMode ? "p-1.5" : "p-2"
                }`}
              >
                <div className={`mt-0.5 ${colorClass}`}>
                  <Icon className={compactMode ? "w-3 h-3" : "w-4 h-4"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium truncate ${compactMode ? "text-[10px]" : "text-xs"}`}>
                      {event.title}
                    </span>
                    <span className={`text-muted-foreground whitespace-nowrap ${compactMode ? "text-[9px]" : "text-[10px]"}`}>
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  {!compactMode && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}