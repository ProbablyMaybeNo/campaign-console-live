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
  BookOpen,
  HelpCircle
} from "lucide-react";
import { OverlayType } from "@/hooks/useOverlayState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HelpFAQModal } from "@/components/help/HelpFAQModal";

interface PlayerFABProps {
  campaignId: string;
  onOpenOverlay: (overlay: OverlayType) => void;
}

interface FABItem {
  id: OverlayType;
  label: string;
  icon: React.ElementType;
}

// Unified icon mapping - matches sidebar nav icons
const fabItems: FABItem[] = [
  { id: "player-settings", label: "My Settings", icon: UserCog },
  { id: "player-messages", label: "Messages", icon: MessageSquare },
  { id: "rules", label: "Rules", icon: Scroll },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "map", label: "Map", icon: Map },
  { id: "narrative", label: "Narrative", icon: BookOpen },
];

export function PlayerFAB({ campaignId, onOpenOverlay }: PlayerFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
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
    if (id === "player-messages") {
      setUnreadCount(0);
      localStorage.setItem(`campaign-${campaignId}-last-visit`, new Date().toISOString());
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
      {/* Expanded menu items - horizontal row layout */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-row-reverse flex-wrap justify-end gap-2.5 mb-2 max-w-[calc(100vw-4rem)]"
          >
            {fabItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ delay: index * 0.04, duration: 0.15 }}
                onClick={() => handleItemClick(item.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card/95 border border-secondary/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-secondary hover:bg-secondary/10 group relative"
                style={{ 
                  boxShadow: `0 0 15px hsl(200 100% 70% / 0.15), 0 4px 12px rgba(0,0,0,0.4)`,
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_15px_hsl(200_100%_70%/0.5)]"
                  style={{ 
                    backgroundColor: "transparent",
                    border: "2px solid hsl(200, 100%, 70%)",
                    boxShadow: "0 0 8px hsl(200 100% 70% / 0.3)"
                  }}
                >
                  <item.icon className="w-5 h-5 text-secondary transition-all duration-200 group-hover:text-secondary-bright" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap text-primary transition-colors duration-200 group-hover:text-primary-bright">
                  {item.label}
                </span>
                {/* Badge for messages */}
                {item.id === "player-messages" && unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_hsl(0_80%_55%/0.5)]"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </motion.button>
            ))}
            
            {/* Help button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ delay: fabItems.length * 0.04, duration: 0.15 }}
              onClick={() => { setShowHelp(true); setIsExpanded(false); }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card/95 border border-secondary/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-secondary hover:bg-secondary/10 group"
              style={{ 
                boxShadow: `0 0 15px hsl(200 100% 70% / 0.15), 0 4px 12px rgba(0,0,0,0.4)`,
              }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_15px_hsl(200_100%_70%/0.5)]"
                style={{ 
                  backgroundColor: "transparent",
                  border: "2px solid hsl(200, 100%, 70%)",
                  boxShadow: "0 0 8px hsl(200 100% 70% / 0.3)"
                }}
              >
                <HelpCircle className="w-5 h-5 text-secondary transition-all duration-200 group-hover:text-secondary-bright" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap text-primary transition-colors duration-200 group-hover:text-primary-bright">
                Help
              </span>
            </motion.button>
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
          backgroundColor: isExpanded ? "hsl(0, 80%, 55%)" : "hsl(142, 76%, 50%)",
          boxShadow: isExpanded 
            ? '0 0 25px hsl(0 80% 55% / 0.6), 0 0 50px hsl(0 80% 55% / 0.3)' 
            : '0 0 20px hsl(142 76% 50% / 0.5), 0 0 40px hsl(142 76% 50% / 0.25)',
          animation: isExpanded ? 'pulse-glow 1.5s ease-in-out infinite' : 'none'
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

      {/* Help Modal */}
      <HelpFAQModal open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Keyframe animation for red glow pulse */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 25px hsl(0 80% 55% / 0.6), 0 0 50px hsl(0 80% 55% / 0.3);
          }
          50% {
            box-shadow: 0 0 35px hsl(0 80% 55% / 0.8), 0 0 70px hsl(0 80% 55% / 0.4);
          }
        }
      `}</style>
    </div>
  );
}
