import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send } from "lucide-react";

interface Message {
  id: string;
  campaign_id: string;
  author_id: string;
  content: string;
  priority: string | null;
  created_at: string;
}

interface MessagesWidgetProps {
  campaignId: string;
}

export function MessagesWidget({ campaignId }: MessagesWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", campaignId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${campaignId}`)
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
  }, [campaignId, queryClient]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-2" data-scrollable="true">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded text-xs border ${
                msg.author_id === user?.id
                  ? "bg-primary/10 border-primary/30 ml-4"
                  : "bg-muted/30 border-border mr-4"
              }`}
            >
              <p className="break-words">{msg.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessage.isPending}
          className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
