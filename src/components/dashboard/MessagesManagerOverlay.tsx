import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignPlayers, useCampaignOwner, CampaignPlayer } from "@/hooks/useCampaignPlayers";
import { 
  MessageSquare, 
  Send,
  User,
  Inbox,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  id: string;
  campaign_id: string;
  author_id: string;
  content: string;
  priority: string | null;
  created_at: string;
}

interface MessagesManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function MessagesManagerOverlay({
  open,
  onOpenChange,
  campaignId,
}: MessagesManagerOverlayProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: players } = useCampaignPlayers(campaignId);
  const { data: owner } = useCampaignOwner(campaignId);
  
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Combine all players for author lookup
  const allPlayers: CampaignPlayer[] = [];
  if (owner) allPlayers.push(owner);
  if (players) {
    players.forEach((p) => {
      if (!owner || p.user_id !== owner.user_id) allPlayers.push(p);
    });
  }

  const getAuthorName = (authorId: string) => {
    const player = allPlayers.find(p => p.user_id === authorId);
    if (player?.profile?.display_name) return player.profile.display_name;
    return `User ${authorId.slice(0, 6)}`;
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", campaignId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && open,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`messages-overlay-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient, open]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        campaign_id: campaignId,
        author_id: user.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", campaignId] });
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Campaign Messages
            <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages List */}
          <div className="w-1/2 border-r border-primary/20 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <TerminalLoader text="Loading" size="sm" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Be the first to send a message!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {messages.map((message) => {
                    const isOwn = message.author_id === user?.id;
                    const isSelected = selectedMessage?.id === message.id;
                    
                    return (
                      <button
                        key={message.id}
                        onClick={() => setSelectedMessage(isSelected ? null : message)}
                        className={cn(
                          "w-full text-left p-3 transition-colors",
                          isSelected 
                            ? "bg-primary/10 border-l-2 border-primary" 
                            : "hover:bg-accent/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center shrink-0",
                            isOwn 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-muted/30 border-border"
                          )}>
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                "text-xs font-mono truncate",
                                isOwn ? "text-primary" : "text-foreground"
                              )}>
                                {isOwn ? "You" : getAuthorName(message.author_id)}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {format(new Date(message.created_at), "MMM d, HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compose Area */}
            <div className="p-3 border-t border-primary/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <TerminalButton
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMessage.isPending}
                >
                  <Send className="w-4 h-4" />
                </TerminalButton>
              </div>
            </div>
          </div>

          {/* Message Detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedMessage ? (
              <>
                <div className="p-4 border-b border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded border flex items-center justify-center",
                      selectedMessage.author_id === user?.id 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-muted/30 border-border"
                    )}>
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-mono">
                        {selectedMessage.author_id === user?.id 
                          ? "You" 
                          : getAuthorName(selectedMessage.author_id)}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedMessage.created_at), "MMMM d, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-xs font-mono">Select a message to view</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
