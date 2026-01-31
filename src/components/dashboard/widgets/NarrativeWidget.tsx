import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

interface NarrativeEvent {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  event_type: string | null;
  event_date: string | null;
  visibility: string | null;
  author_id: string;
  created_at: string;
}

interface NarrativeWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export function NarrativeWidget({ campaignId, isGM }: NarrativeWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["narrative_events", campaignId],
    queryFn: async (): Promise<NarrativeEvent[]> => {
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

  const createEvent = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("narrative_events").insert({
        campaign_id: campaignId,
        author_id: user.id,
        title,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["narrative_events", campaignId] });
    },
  });

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      createEvent.mutate({ title: title.trim(), content: content.trim() });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading narrative...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-2" data-scrollable="true">
        {events.length === 0 && !showForm ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No narrative entries yet. {isGM && "Add one to start the story!"}
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="border border-border rounded">
              <button
                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                className="w-full flex items-center justify-between p-2 text-left hover:bg-accent/30"
              >
                <span className="text-xs font-mono text-primary truncate">{event.title}</span>
                {expandedId === event.id ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
              {expandedId === event.id && (
                <div className="px-2 pb-2 text-xs text-muted-foreground border-t border-border/50">
                  <p className="mt-2 whitespace-pre-wrap">{event.content}</p>
                  <p className="text-[10px] mt-2 opacity-60">
                    {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Form (GM only) */}
      {isGM && (
        <div className="pt-2 border-t border-border mt-auto">
          {showForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title..."
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Narrative content..."
                rows={3}
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim() || createEvent.isPending}
                  className="flex-1 bg-primary/20 border border-primary text-primary text-xs py-1 rounded hover:bg-primary/30 disabled:opacity-50"
                >
                  Submit Entry
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
