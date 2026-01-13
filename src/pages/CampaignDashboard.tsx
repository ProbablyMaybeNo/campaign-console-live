import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useDashboardComponents, DashboardComponent } from "@/hooks/useDashboardComponents";
import { useAuth } from "@/hooks/useAuth";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { InfiniteCanvas } from "@/components/dashboard/InfiniteCanvas";
import { AddComponentModal } from "@/components/dashboard/AddComponentModal";
import { AIComponentBuilder } from "@/components/dashboard/AIComponentBuilder";
import { ComponentsManagerOverlay } from "@/components/dashboard/ComponentsManagerOverlay";
import { PlayersManagerOverlay } from "@/components/dashboard/PlayersManagerOverlay";
import { NarrativeManagerOverlay } from "@/components/dashboard/NarrativeManagerOverlay";
import { MapEditorOverlay } from "@/components/dashboard/MapEditorOverlay";
import { BattlesManagerOverlay } from "@/components/dashboard/BattlesManagerOverlay";
import { MessagesManagerOverlay } from "@/components/dashboard/MessagesManagerOverlay";
import { SettingsManagerOverlay } from "@/components/dashboard/SettingsManagerOverlay";
import { WarbandManagerOverlay } from "@/components/dashboard/WarbandManagerOverlay";
import { RulesLibrary } from "@/components/dashboard/RulesLibrary";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Map, 
  Scroll, 
  Swords, 
  MessageSquare, 
  Plus,
  LayoutGrid,
  Database,
  BookOpen,
  Bot
} from "lucide-react";

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: components = [], isLoading: componentsLoading } = useDashboardComponents(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);

  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  
  // Overlay states
  const [showComponentsOverlay, setShowComponentsOverlay] = useState(false);
  const [showPlayersOverlay, setShowPlayersOverlay] = useState(false);
  const [showNarrativeOverlay, setShowNarrativeOverlay] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [showBattlesOverlay, setShowBattlesOverlay] = useState(false);
  const [showMessagesOverlay, setShowMessagesOverlay] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showWarbandOverlay, setShowWarbandOverlay] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);

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

  // GM sidebar items
  const gmNavItems = [
    { icon: <LayoutGrid className="w-4 h-4" />, label: "Home", onClick: () => {} },
    { icon: <Database className="w-4 h-4" />, label: "Components", onClick: () => setShowComponentsOverlay(true) },
    { icon: <Swords className="w-4 h-4" />, label: "Warbands", onClick: () => setShowWarbandOverlay(true) },
    { icon: <Users className="w-4 h-4" />, label: "Players", onClick: () => setShowPlayersOverlay(true) },
    { icon: <Scroll className="w-4 h-4" />, label: "Rules", onClick: () => setShowRulesOverlay(true) },
    { icon: <Map className="w-4 h-4" />, label: "Map", onClick: () => setShowMapOverlay(true) },
    { icon: <BookOpen className="w-4 h-4" />, label: "Narrative", onClick: () => setShowNarrativeOverlay(true) },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", onClick: () => setShowMessagesOverlay(true) },
    { icon: <Swords className="w-4 h-4" />, label: "Battles", onClick: () => setShowBattlesOverlay(true) },
  ];

  // Player sidebar items (limited)
  const playerNavItems = [
    { icon: <LayoutGrid className="w-4 h-4" />, label: "Home", onClick: () => {} },
    { icon: <Swords className="w-4 h-4" />, label: "My Warband", onClick: () => setShowWarbandOverlay(true) },
    { icon: <BookOpen className="w-4 h-4" />, label: "Narrative", onClick: () => setShowNarrativeOverlay(true) },
  ];

  const navItems = isGM ? gmNavItems : playerNavItems;

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
                {isGM ? "[ GM Mode ]" : "[ Player Mode ]"} • {campaign.points_limit} pts
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-3">
            {isGM ? "Campaign Control" : "Player Menu"}
          </p>
          <nav className="space-y-1 flex-1">
            {navItems.map((item, index) => (
              <NavItem 
                key={index}
                icon={item.icon} 
                label={item.label} 
                active={index === 0}
                onClick={item.onClick}
              />
            ))}

            {isGM && (
              <>
                <div className="h-px bg-border my-3" />
                <NavItem 
                  icon={<Settings className="w-4 h-4" />} 
                  label="Settings" 
                  active={false}
                  onClick={() => setShowSettingsOverlay(true)}
                />
              </>
            )}
          </nav>
        </aside>

        {/* Main View - Always show infinite canvas */}
        <main className="flex-1 p-4 overflow-auto relative">
          <InfiniteCanvas
            components={components}
            isGM={isGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            onComponentSelect={setSelectedComponent}
          />

          {/* Floating Add Buttons (GM only) */}
          {isGM && (
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
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

      {/* Add Component Modal */}
      <AddComponentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        campaignId={campaignId!}
      />

      {/* AI Component Builder */}
      <AIComponentBuilder
        open={showAIBuilder}
        onOpenChange={setShowAIBuilder}
        campaignId={campaignId!}
      />

      {/* Components Manager Overlay */}
      <ComponentsManagerOverlay
        open={showComponentsOverlay}
        onOpenChange={setShowComponentsOverlay}
        campaignId={campaignId!}
        onAddComponent={() => setShowAddModal(true)}
      />

      {/* Players Manager Overlay */}
      <PlayersManagerOverlay
        open={showPlayersOverlay}
        onOpenChange={setShowPlayersOverlay}
        campaignId={campaignId!}
        isGM={isGM}
      />

      {/* Warband Manager Overlay */}
      {user && (
        <WarbandManagerOverlay
          open={showWarbandOverlay}
          onOpenChange={setShowWarbandOverlay}
          campaignId={campaignId!}
          userId={user.id}
        />
      )}

      {/* Narrative Manager Overlay */}
      <NarrativeManagerOverlay
        open={showNarrativeOverlay}
        onOpenChange={setShowNarrativeOverlay}
        campaignId={campaignId!}
        isGM={isGM}
      />

      {/* Map Editor Overlay (GM only) */}
      {isGM && (
        <MapEditorOverlay
          open={showMapOverlay}
          onOpenChange={setShowMapOverlay}
          campaignId={campaignId!}
          isGM={isGM}
        />
      )}

      {/* Battles Manager Overlay (GM only) */}
      {isGM && (
        <BattlesManagerOverlay
          open={showBattlesOverlay}
          onOpenChange={setShowBattlesOverlay}
          campaignId={campaignId!}
          isGM={isGM}
        />
      )}

      {/* Messages Manager Overlay (GM only) */}
      {isGM && (
        <MessagesManagerOverlay
          open={showMessagesOverlay}
          onOpenChange={setShowMessagesOverlay}
          campaignId={campaignId!}
        />
      )}

      {/* Rules Library Overlay (GM only) */}
      {isGM && showRulesOverlay && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-primary/30 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-primary/20 flex items-center justify-between">
              <h2 className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                <Scroll className="w-4 h-4" />
                Rules Manager
              </h2>
              <TerminalButton
                variant="ghost"
                size="sm"
                onClick={() => setShowRulesOverlay(false)}
              >
                Close
              </TerminalButton>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <RulesLibrary campaignId={campaignId!} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Manager Overlay (GM only) */}
      {isGM && (
        <SettingsManagerOverlay
          open={showSettingsOverlay}
          onOpenChange={setShowSettingsOverlay}
          campaignId={campaignId!}
        />
      )}
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