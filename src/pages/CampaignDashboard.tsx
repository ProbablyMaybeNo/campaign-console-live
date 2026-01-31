import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useDashboardComponents, DashboardComponent } from "@/hooks/useDashboardComponents";
import { useAuth } from "@/hooks/useAuth";
import { useOverlayState, OverlayType } from "@/hooks/useOverlayState";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { InfiniteCanvas } from "@/components/dashboard/InfiniteCanvas";
import { AddComponentModal } from "@/components/dashboard/AddComponentModal";
import { CampaignOverlays } from "@/components/dashboard/CampaignOverlays";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Map, 
  Scroll, 
  Swords, 
  MessageSquare, 
  Calendar, 
  Plus,
  LayoutGrid,
  Database,
  BookOpen,
  UserCog
} from "lucide-react";
import { toast } from "sonner";

const sidebarItems: { 
  id: OverlayType | "home"; 
  label: string; 
  icon: React.ElementType;
  gmOnly?: boolean;
  playerOnly?: boolean;
}[] = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "components", label: "Components", icon: Database, gmOnly: true },
  { id: "player-settings", label: "My Settings", icon: UserCog, playerOnly: true },
  { id: "players", label: "Players", icon: Users },
  { id: "rules", label: "Rules", icon: Scroll },
  { id: "map", label: "Map", icon: Map },
  { id: "narrative", label: "Narrative", icon: BookOpen },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "schedule", label: "Schedule", icon: Calendar },
];

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: components = [], isLoading: componentsLoading } = useDashboardComponents(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);

  const { activeOverlay, openOverlay, closeOverlay } = useOverlayState();

  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);
  const effectiveIsGM = isGM && !previewAsPlayer;

  // Filter components based on visibility for players
  const visibleComponents = effectiveIsGM 
    ? components 
    : components.filter((c) => {
        const visibility = (c.config as { visibility?: string })?.visibility;
        return visibility !== "gm";
      });

  const isLoading = campaignLoading || componentsLoading;

  if (isLoading) {
    return <FullScreenLoader text="Loading campaign" />;
  }

  if (campaignError || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-primary/30 rounded p-8 text-center">
          <p className="text-destructive mb-4">[ERROR] Campaign not found</p>
          <Link to="/campaigns">
            <TerminalButton variant="outline" size="sm">
              {"<"} Back to Campaigns
            </TerminalButton>
          </Link>
        </div>
      </div>
    );
  }

  const handleNavClick = (itemId: OverlayType | "home") => {
    if (itemId === "home") {
      closeOverlay();
    } else {
      openOverlay(itemId);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <header className="border-b border-primary/20 bg-card/95 backdrop-blur-sm px-4 py-3 flex-shrink-0 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Link 
            to="/campaigns" 
            className="text-[hsl(200,100%,65%)] hover:text-[hsl(200,100%,75%)] transition-all"
            style={{ textShadow: '0 0 10px hsl(200 100% 50% / 0.6), 0 0 20px hsl(200 100% 50% / 0.3)' }}
          >
            <span className="flex items-center gap-1 font-mono text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Campaigns
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            {isGM ? (
              <button
                onClick={() => {
                  setPreviewAsPlayer(!previewAsPlayer);
                  toast.info(previewAsPlayer ? "Returning to GM view" : "Previewing as Player");
                }}
                className={`px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:opacity-90 ${
                  previewAsPlayer 
                    ? "bg-[hsl(142,76%,45%)] text-black ring-2 ring-[hsl(200,100%,60%)] ring-offset-2 ring-offset-background" 
                    : "bg-[hsl(200,100%,60%)] text-black"
                }`}
                style={{ 
                  boxShadow: previewAsPlayer 
                    ? '0 0 15px hsl(142 76% 50% / 0.5), 0 0 30px hsl(142 76% 50% / 0.25)' 
                    : '0 0 15px hsl(200 100% 50% / 0.5), 0 0 30px hsl(200 100% 50% / 0.25)' 
                }}
                title={previewAsPlayer ? "Click to return to GM view" : "Click to preview as Player"}
              >
                {previewAsPlayer ? "Player (Preview)" : "Games Master"}
              </button>
            ) : (
              <div 
                className="px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[hsl(142,76%,45%)] text-black"
                style={{ boxShadow: '0 0 15px hsl(142 76% 50% / 0.5), 0 0 30px hsl(142 76% 50% / 0.25)' }}
              >
                Player
              </div>
            )}
            <TerminalButton variant="outline" size="sm" onClick={() => signOut()}>
              Logout
            </TerminalButton>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Fixed Sidebar - GM only */}
        {effectiveIsGM && (
          <aside className="w-56 border-r border-primary/20 bg-sidebar/95 backdrop-blur-sm flex-shrink-0 p-4 hidden md:flex flex-col sticky left-0 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-3">Campaign Control</p>
            <nav className="space-y-1 flex-1">
              {sidebarItems.map((item) => {
                if (item.gmOnly && !effectiveIsGM) return null;
                if (item.playerOnly && effectiveIsGM) return null;
                
                const isActive = item.id === "home" 
                  ? !activeOverlay 
                  : activeOverlay === item.id;
                
                return (
                  <NavItem
                    key={item.id}
                    icon={<item.icon className="w-4 h-4" />}
                    label={item.label}
                    active={isActive}
                    onClick={() => handleNavClick(item.id)}
                  />
                );
              })}

              <div className="h-px bg-border my-3" />
              <NavItem 
                icon={<Settings className="w-4 h-4" />} 
                label="Settings" 
                active={activeOverlay === "settings"}
                onClick={() => openOverlay("settings")}
              />
            </nav>
          </aside>
        )}

        <main className="flex-1 p-4 overflow-hidden relative min-h-0">
          <InfiniteCanvas
            components={visibleComponents}
            isGM={effectiveIsGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            onComponentSelect={setSelectedComponent}
          />

          {/* GM: Add component button */}
          {effectiveIsGM && (
            <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3">
              <TerminalButton
                className="h-14 w-14 rounded-full glow-primary text-xl"
                onClick={() => setShowAddModal(true)}
                title="Add Component"
              >
                <Plus className="w-6 h-6" />
              </TerminalButton>
            </div>
          )}

          {/* Player: Settings button */}
          {!effectiveIsGM && (
            <button
              onClick={() => openOverlay("player-settings")}
              className="fixed bottom-8 right-8 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              title="My Settings"
            >
              <UserCog className="w-6 h-6" />
            </button>
          )}
        </main>
      </div>

      <CampaignOverlays
        activeOverlay={activeOverlay}
        onClose={closeOverlay}
        campaignId={campaignId!}
        isGM={effectiveIsGM}
      />

      <AddComponentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        campaignId={campaignId!}
      />
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider transition-all ${
        active
          ? "bg-[hsl(200,100%,50%)]/10 text-[hsl(200,100%,65%)] border-l-2 border-[hsl(200,100%,60%)]"
          : "text-[hsl(142,76%,50%)] hover:text-[hsl(142,76%,65%)] hover:bg-[hsl(142,76%,50%)]/10"
      }`}
      style={active ? { textShadow: '0 0 8px hsl(200 100% 50% / 0.5)' } : { textShadow: '0 0 6px hsl(142 76% 50% / 0.3)' }}
    >
      {icon}
      {label}
    </button>
  );
}
