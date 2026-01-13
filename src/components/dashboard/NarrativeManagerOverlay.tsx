import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Save,
  X,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface NarrativeManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  isGM: boolean;
}

export function NarrativeManagerOverlay({
  open,
  onOpenChange,
  campaignId,
  isGM,
}: NarrativeManagerOverlayProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedEvent, setSelectedEvent] = useState<NarrativeEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRound, setEditRound] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    enabled: !!campaignId && open,
  });

  const createEvent = useMutation({
    mutationFn: async ({ title, content, round }: { title: string; content: string; round?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("narrative_events").insert({
        campaign_id: campaignId,
        author_id: user.id,
        title,
        content,
        event_type: round ? `Round ${round}` : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["narrative_events", campaignId] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, title, content, round }: { id: string; title: string; content: string; round?: string }) => {
      const { error } = await supabase
        .from("narrative_events")
        .update({
          title,
          content,
          event_type: round ? `Round ${round}` : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative_events", campaignId] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("narrative_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedEvent(null);
      queryClient.invalidateQueries({ queryKey: ["narrative_events", campaignId] });
    },
  });

  const resetForm = () => {
    setEditTitle("");
    setEditContent("");
    setEditRound("");
    setIsCreating(false);
    setSelectedEvent(null);
  };

  const handleSelectEvent = (event: NarrativeEvent) => {
    setIsCreating(false);
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditContent(event.content);
    setEditRound(event.event_type?.replace("Round ", "") || "");
  };

  const handleStartCreate = () => {
    setSelectedEvent(null);
    setIsCreating(true);
    setEditTitle("");
    setEditContent("");
    setEditRound("");
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    if (isCreating) {
      createEvent.mutate({ title: editTitle, content: editContent, round: editRound });
    } else if (selectedEvent) {
      updateEvent.mutate({ id: selectedEvent.id, title: editTitle, content: editContent, round: editRound });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteEvent.mutateAsync(id);
    setDeletingId(null);
  };

  const getPreview = (content: string) => {
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence.length > 60 ? firstSentence.slice(0, 60) + "..." : firstSentence + ".";
  };

  const getRoundFromType = (eventType: string | null) => {
    if (!eventType) return null;
    const match = eventType.match(/Round\s+(\d+)/i);
    return match ? match[1] : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Narrative Tracker
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Events List */}
          <div className="w-2/5 border-r border-primary/20 flex flex-col">
            {isGM && (
              <div className="p-3 border-b border-primary/10">
                <TerminalButton onClick={handleStartCreate} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </TerminalButton>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <TerminalLoader text="Loading" size="sm" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No narrative entries yet</p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {events.map((event) => {
                    const round = getRoundFromType(event.event_type);
                    const isSelected = selectedEvent?.id === event.id;
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleSelectEvent(event)}
                        className={cn(
                          "w-full text-left p-3 transition-colors",
                          isSelected 
                            ? "bg-primary/10 border-l-2 border-primary" 
                            : "hover:bg-accent/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-foreground truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {getPreview(event.content)}
                            </p>
                          </div>
                          {round && (
                            <span className="shrink-0 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                              R{round}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Event Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEvent || isCreating ? (
              <>
                {/* Editor Header */}
                <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {isCreating ? "New Entry" : "Edit Entry"}
                  </span>
                  <button
                    onClick={resetForm}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Editor Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      placeholder="Entry title..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Round Number (optional)
                    </label>
                    <input
                      type="number"
                      value={editRound}
                      onChange={(e) => setEditRound(e.target.value)}
                      className="w-24 bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      placeholder="1"
                      min={1}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Content
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-[200px] bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                      placeholder="Write your narrative entry..."
                    />
                  </div>
                </div>

                {/* Editor Footer */}
                <div className="p-4 border-t border-primary/20 flex gap-2">
                  {isGM && selectedEvent && (
                    <TerminalButton
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(selectedEvent.id)}
                      disabled={deletingId === selectedEvent.id}
                    >
                      {deletingId === selectedEvent.id ? (
                        <TerminalLoader text="" size="sm" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </TerminalButton>
                  )}
                  <TerminalButton
                    className="flex-1"
                    onClick={handleSave}
                    disabled={!editTitle.trim() || !editContent.trim() || createEvent.isPending || updateEvent.isPending}
                  >
                    {createEvent.isPending || updateEvent.isPending ? (
                      <TerminalLoader text="Saving" size="sm" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isCreating ? "Create Entry" : "Save Changes"}
                      </>
                    )}
                  </TerminalButton>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-xs font-mono">Select an entry to view</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
