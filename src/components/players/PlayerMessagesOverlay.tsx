import { useState, useEffect } from "react";
import { usePlayerMessages } from "@/hooks/usePlayerMessages";
import { useAuth } from "@/hooks/useAuth";
import { MentionInput } from "@/components/ui/MentionInput";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { 
  Send, 
  MessageSquare, 
  ChevronLeft, 
  Circle,
  CheckCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PlayerMessagesOverlayProps {
  campaignId: string;
}

export function PlayerMessagesOverlay({ campaignId }: PlayerMessagesOverlayProps) {
  const { user } = useAuth();
  const {
    messages,
    players,
    unreadCount,
    isLoading,
    sendMessage,
    markAsRead,
    getConversations,
  } = usePlayerMessages(campaignId);

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);

  const conversations = getConversations();

  // Auto-mark messages as read when viewing a conversation
  useEffect(() => {
    if (!selectedConversation || !user?.id) return;

    const conv = conversations.find(c => c.partnerId === selectedConversation);
    if (!conv) return;

    conv.messages.forEach((msg) => {
      if (msg.recipient_id === user.id && !msg.is_read) {
        markAsRead.mutate(msg.id);
      }
    });
  }, [selectedConversation, conversations, user?.id, markAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    await sendMessage.mutateAsync({
      recipientId: selectedRecipient,
      content: newMessage.trim(),
    });

    setNewMessage("");
    if (!selectedConversation) {
      setSelectedConversation(selectedRecipient);
    }
  };

  const handleMentionSelect = (userId: string) => {
    setSelectedRecipient(userId);
  };

  const mentionOptions = players
    .filter(p => p.user_id !== user?.id)
    .map(p => ({ id: p.user_id, name: p.player_name || "Unknown" }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <TerminalLoader text="Loading messages" />
      </div>
    );
  }

  // Conversation detail view
  if (selectedConversation) {
    const conv = conversations.find(c => c.partnerId === selectedConversation);
    const conversationMessages = conv?.messages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) || [];

    return (
      <div className="flex flex-col h-[500px]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
          <button
            onClick={() => {
              setSelectedConversation(null);
              setSelectedRecipient(null);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h3 
              className="font-mono text-sm uppercase tracking-wider"
              style={{ color: "hsl(142, 76%, 65%)" }}
            >
              {conv?.partnerName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {conversationMessages.length} messages
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-3 mb-3">
          <div className="space-y-3">
            {conversationMessages.map((msg) => {
              const isMine = msg.author_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isMine
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-muted/30 border border-border"
                    }`}
                  >
                    <p className="text-sm font-mono whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {isMine && msg.is_read && (
                        <CheckCheck className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Compose */}
        <div className="border-t border-border pt-3">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[60px] rounded-md border border-primary/30 bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setSelectedRecipient(selectedConversation);
                  handleSendMessage();
                }
              }}
            />
            <TerminalButton
              onClick={() => {
                setSelectedRecipient(selectedConversation);
                handleSendMessage();
              }}
              disabled={!newMessage.trim() || sendMessage.isPending}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </TerminalButton>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list view
  return (
    <div className="flex flex-col h-[500px]">
      {/* Unread badge */}
      {unreadCount > 0 && (
        <div 
          className="mb-3 px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: "hsl(0, 80%, 55%, 0.1)",
            borderColor: "hsl(0, 80%, 55%, 0.3)",
            color: "hsl(0, 80%, 65%)",
          }}
        >
          You have {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Conversations list */}
      <div className="flex-1 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-mono text-sm">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation by typing @ below
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-3">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  onClick={() => {
                    setSelectedConversation(conv.partnerId);
                    setSelectedRecipient(conv.partnerId);
                  }}
                  className="w-full p-3 rounded-lg border transition-all hover:border-primary/50 text-left group"
                  style={{
                    backgroundColor: conv.unreadCount > 0 ? "hsl(200, 100%, 70%, 0.05)" : "transparent",
                    borderColor: conv.unreadCount > 0 ? "hsl(200, 100%, 70%, 0.3)" : "hsl(var(--border))",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <Circle className="w-2 h-2 fill-primary text-primary" />
                        )}
                        <span 
                          className="font-mono text-sm uppercase tracking-wider truncate"
                          style={{ color: "hsl(142, 76%, 65%)" }}
                        >
                          {conv.partnerName}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span 
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                            style={{
                              backgroundColor: "hsl(0, 80%, 55%)",
                              color: "white",
                            }}
                          >
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.lastMessage.author_id === user?.id ? "You: " : ""}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* New message composer */}
      <div className="border-t border-border pt-3 mt-3">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
          New Message
        </p>
        <MentionInput
          value={newMessage}
          onChange={setNewMessage}
          onMentionSelect={handleMentionSelect}
          options={mentionOptions}
          selectedRecipient={selectedRecipient}
          placeholder="Type @ to select a recipient..."
        />
        <div className="flex justify-end mt-2">
          <TerminalButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !selectedRecipient || sendMessage.isPending}
            size="sm"
          >
            {sendMessage.isPending ? (
              <TerminalLoader text="" size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}
