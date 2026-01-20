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
import { AIComponentBuilder } from "@/components/dashboard/AIComponentBuilder";
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
  Bot
} from "lucide-react";
import { toast } from "sonner";

// Sidebar nav item configuration
const sidebarItems: { 
  id: OverlayType | "home"; 
  label: string; 
  icon: React.ElementType;
  gmOnly?: boolean;
}[] = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "components", label: "Components", icon: Database, gmOnly: true },
  { id: "warbands", label: "Warbands", icon: Swords },
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

  // URL-based overlay state
  const { activeOverlay, openOverlay, closeOverlay } = useOverlayState();

  // Local modal state (not URL-based as they're transient)
  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  
  // GM can toggle to preview player view
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);
  const effectiveIsGM = isGM && !previewAsPlayer;

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
      // Close any open overlay and go to dashboard
      closeOverlay();
    } else {
      // Open the overlay
      openOverlay(itemId);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-primary/20 bg-card/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/campaigns">
              <TerminalButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Campaigns
              </TerminalButton>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-lg font-bold text-primary uppercase tracking-wider">
                {campaign.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {campaign.points_limit} pts
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Role Indicator Badge - Clickable for GMs to toggle view */}
            {isGM ? (
              <button
                onClick={() => {
                  setPreviewAsPlayer(!previewAsPlayer);
                  toast.info(previewAsPlayer ? "Returning to GM view" : "Previewing as Player");
                }}
                className={`px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:opacity-90 ${
                  previewAsPlayer 
                    ? "bg-[hsl(142,76%,36%)] text-black ring-2 ring-[hsl(200,100%,50%)] ring-offset-2 ring-offset-background" 
                    : "bg-[hsl(200,100%,50%)] text-black"
                }`}
                title={previewAsPlayer ? "Click to return to GM view" : "Click to preview as Player"}
              >
                {previewAsPlayer ? "Player (Preview)" : "Games Master"}
              </button>
            ) : (
              <div className="px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[hsl(142,76%,36%)] text-black">
                Player
              </div>
            )}
            <span className="text-xs text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            <TerminalButton variant="outline" size="sm" onClick={() => signOut()}>
              Logout
            </TerminalButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-56 border-r border-primary/20 bg-sidebar flex-shrink-0 p-4 hidden md:flex flex-col">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-3">Campaign Control</p>
          <nav className="space-y-1 flex-1">
            {sidebarItems.map((item) => {
              // Hide GM-only items for players (or GMs previewing as player)
              if (item.gmOnly && !effectiveIsGM) return null;
              
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

            {effectiveIsGM && (
              <>
                <div className="h-px bg-border my-3" />
                <NavItem 
                  icon={<Settings className="w-4 h-4" />} 
                  label="Settings" 
                  active={activeOverlay === "settings"}
                  onClick={() => openOverlay("settings")}
                />
              </>
            )}
          </nav>
        </aside>

        {/* Main View - Always show dashboard/canvas */}
        <main className="flex-1 p-4 overflow-auto relative">
          <InfiniteCanvas
            components={components}
            isGM={effectiveIsGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            onComponentSelect={setSelectedComponent}
          />

          {/* Floating Add Buttons (GM only, hidden in preview mode) */}
          {effectiveIsGM && (
            <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3">
              <TerminalButton
                variant="outline"
                className="h-12 w-12 rounded-full border-primary/50 hover:border-primary"
                onClick={() => setShowAIBuilder(true)}
                title="AI Component Builder"
              >
                <Bot className="w-5 h-5" />
              </TerminalButton>
              <TerminalButton
                className="h-14 w-14 rounded-full glow-primary text-xl"
                onClick={() => setShowAddModal(true)}
                title="Add Component"
              >
                <Plus className="w-6 h-6" />
              </TerminalButton>
            </div>
          )}
        </main>
      </div>

      {/* URL-based Overlays */}
      <CampaignOverlays
        activeOverlay={activeOverlay}
        onClose={closeOverlay}
        campaignId={campaignId!}
        isGM={effectiveIsGM}
      />

      {/* Transient Modals (not URL-based) */}
      <AddComponentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        campaignId={campaignId!}
      />

      <AIComponentBuilder
        open={showAIBuilder}
        onOpenChange={setShowAIBuilder}
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
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
