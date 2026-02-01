import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCog, 
  MessageSquare, 
  Scroll, 
  X,
  ChevronUp,
  Calendar,
  Map,
  BookOpen
} from "lucide-react";
import { OverlayType } from "@/hooks/useOverlayState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PlayerFABProps {
  campaignId: string;
  onOpenOverlay: (overlay: OverlayType) => void;
}

interface FABItem {
  id: OverlayType;
  label: string;
  icon: React.ElementType;
  color: string;
}

const fabItems: FABItem[] = [
  { id: "player-settings", label: "My Settings", icon: UserCog, color: "hsl(142, 76%, 50%)" },
  { id: "messages", label: "Messages", icon: MessageSquare, color: "hsl(200, 100%, 65%)" },
  { id: "rules", label: "Rules", icon: Scroll, color: "hsl(280, 80%, 60%)" },
  { id: "schedule", label: "Schedule", icon: Calendar, color: "hsl(45, 100%, 50%)" },
  { id: "map", label: "Map", icon: Map, color: "hsl(15, 90%, 55%)" },
  { id: "narrative", label: "Narrative", icon: BookOpen, color: "hsl(330, 80%, 60%)" },
];

export function PlayerFAB({ campaignId, onOpenOverlay }: PlayerFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Fetch unread message count (messages since last visit)
  useEffect(() => {
    if (!campaignId || !user?.id) return;

    const lastVisit = localStorage.getItem(`campaign-${campaignId}-last-visit`);
    const lastVisitDate = lastVisit ? new Date(lastVisit) : new Date(0);

    async function fetchUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gt("created_at", lastVisitDate.toISOString());

      setUnreadCount(count || 0);
    }

    fetchUnread();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, user?.id]);

  const handleItemClick = (id: OverlayType) => {
    onOpenOverlay(id);
    setIsExpanded(false);

    // Clear unread count when opening messages
    if (id === "messages") {
      setUnreadCount(0);
      localStorage.setItem(`campaign-${campaignId}-last-visit`, new Date().toISOString());
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
      {/* Expanded menu items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 mb-2"
          >
            {fabItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleItemClick(item.id)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/95 border border-primary/30 backdrop-blur-sm transition-all hover:scale-105 hover:border-primary/60 group"
                style={{ boxShadow: `0 0 15px ${item.color}30, 0 4px 12px rgba(0,0,0,0.3)` }}
              >
                <span className="text-xs font-mono uppercase tracking-wider text-foreground whitespace-nowrap">
                  {item.label}
                </span>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.color }}
                >
                  <item.icon className="w-5 h-5 text-black" />
                </div>
                {/* Badge for messages */}
                {item.id === "messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-14 w-14 rounded-full flex items-center justify-center transition-all relative"
        style={{ 
          backgroundColor: isExpanded ? "hsl(0, 60%, 50%)" : "hsl(142, 76%, 50%)",
          boxShadow: isExpanded 
            ? '0 0 20px hsl(0 60% 50% / 0.5), 0 0 40px hsl(0 60% 50% / 0.25)' 
            : '0 0 20px hsl(142 76% 50% / 0.5), 0 0 40px hsl(142 76% 50% / 0.25)' 
        }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <ChevronUp className="w-6 h-6 text-black" />
          )}
        </motion.div>

        {/* Notification badge on main button */}
        {!isExpanded && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
