import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignPlayers } from "@/hooks/useCampaignPlayers";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Megaphone, Send, Users, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  campaign_id: string;
  author_id: string;
  content: string;
  priority: string | null;
  created_at: string;
}

interface AnnouncementsWidgetProps {
  campaignId: string;
  isGM?: boolean;
}

export function AnnouncementsWidget({ campaignId, isGM = false }: AnnouncementsWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: players = [] } = useCampaignPlayers(campaignId);
  
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendAsMessage, setSendAsMessage] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<Array<{ id: string; name: string }>>([]);
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");

  // Fetch public announcements (messages without recipient_id)
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", campaignId],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .is("recipient_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!content.trim()) throw new Error("Content is required");

      const announcementContent = title.trim() 
        ? `**${title.trim()}**\n\n${content.trim()}`
        : content.trim();

      // Create the public announcement
      const { error: announcementError } = await supabase
        .from("messages")
        .insert({
          campaign_id: campaignId,
          author_id: user.id,
          content: announcementContent,
          priority,
          recipient_id: null, // Public announcement
        });

      if (announcementError) throw announcementError;

      // If sending as private message to players
      if (sendAsMessage) {
        const recipients = sendToAll 
          ? players.filter(p => p.user_id !== user.id).map(p => ({ id: p.user_id, name: p.profile?.display_name || "Player" }))
          : selectedRecipients;

        // Send private message to each recipient
        const messagePromises = recipients.map(recipient =>
          supabase.from("messages").insert({
            campaign_id: campaignId,
            author_id: user.id,
            content: `📢 **Announcement:** ${announcementContent}`,
            priority,
            recipient_id: recipient.id,
            is_read: false,
          })
        );

        await Promise.all(messagePromises);
      }
    },
    onSuccess: () => {
      toast.success("Announcement posted");
      queryClient.invalidateQueries({ queryKey: ["announcements", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["player-messages", campaignId] });
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to post: ${error.message}`);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements", campaignId] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSendAsMessage(false);
    setSendToAll(true);
    setSelectedRecipients([]);
    setPriority("normal");
    setShowComposer(false);
  };

  const handleMentionSelect = (player: { id: string; name: string }) => {
    if (!selectedRecipients.find(r => r.id === player.id)) {
      setSelectedRecipients([...selectedRecipients, player]);
    }
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPriorityColor = (p: string | null) => {
    switch (p) {
      case "urgent": return "text-red-500 border-red-500/50";
      case "important": return "text-yellow-500 border-yellow-500/50";
      default: return "text-primary border-primary/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with add button for GM */}
      {isGM && (
        <div className="mb-2">
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs border border-primary/30 rounded hover:bg-primary/10 transition-colors"
          >
            <span className="flex items-center gap-2 text-primary">
              <Megaphone className="w-3 h-3" />
              New Announcement
            </span>
            {showComposer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Composer Panel */}
      {isGM && showComposer && (
        <div className="mb-3 p-2 border border-primary/30 rounded bg-muted/20 space-y-2 animate-fade-in">
          <TerminalInput
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs"
          />
          
          <textarea
            placeholder="Announcement content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary resize-none min-h-[60px]"
          />

          {/* Priority selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase">Priority:</span>
            {(["normal", "important", "urgent"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-2 py-0.5 text-[10px] uppercase rounded border transition-colors ${
                  priority === p 
                    ? getPriorityColor(p) + " bg-current/10" 
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Send as message toggle */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendAsMessage}
                onChange={(e) => setSendAsMessage(e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">Also send as private message</span>
            </label>
          </div>

          {/* Recipient selection when sending as message */}
          {sendAsMessage && (
            <div className="space-y-2 pl-4 animate-fade-in">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="w-3 h-3 accent-primary"
                />
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> All players
                </span>
              </label>

              {!sendToAll && (
                <div className="space-y-1">
                  {/* Player selection dropdown */}
                  <select
                    onChange={(e) => {
                      const player = players.find(p => p.user_id === e.target.value);
                      if (player && !selectedRecipients.find(r => r.id === player.user_id)) {
                        setSelectedRecipients([...selectedRecipients, { 
                          id: player.user_id, 
                          name: player.profile?.display_name || "Player" 
                        }]);
                      }
                      e.target.value = "";
                    }}
                    className="w-full bg-input border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
                    defaultValue=""
                  >
                    <option value="" disabled>Select a player...</option>
                    {players
                      .filter(p => p.user_id !== user?.id && !selectedRecipients.find(r => r.id === p.user_id))
                      .map(p => (
                        <option key={p.user_id} value={p.user_id}>
                          {p.profile?.display_name || "Player"}
                        </option>
                      ))
                    }
                  </select>
                  
                  {/* Selected recipients */}
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedRecipients.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded"
                        >
                          @{r.name}
                          <button onClick={() => removeRecipient(r.id)} className="hover:text-destructive transition-colors">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <TerminalButton variant="outline" onClick={resetForm} className="text-xs py-1 px-2">
              Cancel
            </TerminalButton>
            <TerminalButton
              onClick={() => createAnnouncement.mutate()}
              disabled={!content.trim() || createAnnouncement.isPending}
              className="text-xs py-1 px-2"
            >
              <Send className="w-3 h-3 mr-1" />
              {createAnnouncement.isPending ? "Posting..." : "Post"}
            </TerminalButton>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="flex-1 overflow-y-auto space-y-2" data-scrollable="true">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Megaphone className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No announcements yet</p>
            {isGM && <p className="text-[10px] text-muted-foreground/70 mt-1">Click above to post one</p>}
          </div>
        ) : (
          announcements.map((announcement) => {
            // Parse title from content if it starts with **
            let displayTitle = "";
            let displayContent = announcement.content;
            
            if (announcement.content.startsWith("**")) {
              const match = announcement.content.match(/^\*\*(.+?)\*\*\n\n([\s\S]*)/);
              if (match) {
                displayTitle = match[1];
                displayContent = match[2];
              }
            }

            return (
              <div
                key={announcement.id}
                className={`p-2 rounded border ${getPriorityColor(announcement.priority)} bg-card/50`}
              >
                {displayTitle && (
                  <h4 className="text-xs font-bold mb-1 text-foreground">{displayTitle}</h4>
                )}
                <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                  {displayContent}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(announcement.created_at)}
                  </p>
                  {isGM && announcement.author_id === user?.id && (
                    <button
                      onClick={() => deleteAnnouncement.mutate(announcement.id)}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
