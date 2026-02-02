import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PlayerMessage {
  id: string;
  campaign_id: string;
  author_id: string;
  recipient_id: string | null;
  content: string;
  priority: string | null;
  is_read: boolean;
  created_at: string;
  author_name?: string;
}

interface CampaignPlayer {
  user_id: string;
  player_name: string | null;
}

export function usePlayerMessages(campaignId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch private messages for current user
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["player-messages", campaignId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .not("recipient_id", "is", null)
        .or(`author_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlayerMessage[];
    },
    enabled: !!campaignId && !!user?.id,
  });

  // Fetch campaign players for mentions
  const { data: players = [] } = useQuery({
    queryKey: ["campaign-players-for-mentions", campaignId],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from("campaign_players")
        .select("user_id, player_name")
        .eq("campaign_id", campaignId);

      if (playersError) throw playersError;
      
      // Also get the campaign owner
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("owner_id")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get profile names for all users
      const allUserIds = [...new Set([
        ...playersData.map(p => p.user_id),
        campaign.owner_id
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
      
      return allUserIds.map(userId => ({
        user_id: userId,
        player_name: playersData.find(p => p.user_id === userId)?.player_name || 
                     profileMap.get(userId) || 
                     "Unknown Player"
      })) as CampaignPlayer[];
    },
    enabled: !!campaignId,
  });

  // Calculate unread count
  useEffect(() => {
    if (!user?.id || !messages) return;
    
    const unread = messages.filter(
      m => m.recipient_id === user.id && !m.is_read
    ).length;
    setUnreadCount(unread);
  }, [messages, user?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!campaignId || !user?.id) return;

    const channel = supabase
      .channel(`private-messages-${campaignId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newMessage = payload.new as PlayerMessage;
          // Only refetch if this message involves the current user
          if (newMessage.recipient_id === user.id || newMessage.author_id === user.id) {
            refetch();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, user?.id, refetch]);

  // Send private message
  const sendMessage = useMutation({
    mutationFn: async ({ recipientId, content, priority = "normal" }: { 
      recipientId: string; 
      content: string; 
      priority?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          campaign_id: campaignId,
          author_id: user.id,
          recipient_id: recipientId,
          content,
          priority,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-messages", campaignId] });
      toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    },
  });

  // Mark message as read
  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-messages", campaignId] });
    },
  });

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const unreadMessages = messages.filter(
      m => m.recipient_id === user.id && !m.is_read
    );

    for (const msg of unreadMessages) {
      await markAsRead.mutateAsync(msg.id);
    }
  }, [messages, user?.id, markAsRead]);

  // Group messages by conversation partner
  const getConversations = useCallback(() => {
    if (!user?.id) return [];

    const conversationMap = new Map<string, {
      partnerId: string;
      partnerName: string;
      messages: PlayerMessage[];
      unreadCount: number;
      lastMessage: PlayerMessage | null;
    }>();

    messages.forEach((msg) => {
      const partnerId = msg.author_id === user.id ? msg.recipient_id : msg.author_id;
      if (!partnerId) return;

      if (!conversationMap.has(partnerId)) {
        const partner = players.find(p => p.user_id === partnerId);
        conversationMap.set(partnerId, {
          partnerId,
          partnerName: partner?.player_name || "Unknown",
          messages: [],
          unreadCount: 0,
          lastMessage: null,
        });
      }

      const conv = conversationMap.get(partnerId)!;
      conv.messages.push(msg);
      
      if (msg.recipient_id === user.id && !msg.is_read) {
        conv.unreadCount++;
      }

      if (!conv.lastMessage || new Date(msg.created_at) > new Date(conv.lastMessage.created_at)) {
        conv.lastMessage = msg;
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => {
      const aDate = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bDate = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [messages, players, user?.id]);

  return {
    messages,
    players,
    unreadCount,
    isLoading,
    sendMessage,
    markAsRead,
    markAllAsRead,
    getConversations,
    refetch,
  };
}
