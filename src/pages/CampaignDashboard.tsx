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
import { CampaignSettingsModal } from "@/components/campaigns/CampaignSettingsModal";
import { PlayersWidget } from "@/components/dashboard/widgets/PlayersWidget";
import { MessagesWidget } from "@/components/dashboard/widgets/MessagesWidget";
import { NarrativeWidget } from "@/components/dashboard/widgets/NarrativeWidget";
import { ScheduleWidget } from "@/components/dashboard/widgets/ScheduleWidget";
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

type DashboardView = "dashboard" | "players" | "warbands" | "narrative" | "messages" | "schedule" | "rules" | "map";

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: components = [], isLoading: componentsLoading } = useDashboardComponents(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);

  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

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

  const renderMainContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <InfiniteCanvas
            components={components}
            isGM={isGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            onComponentSelect={setSelectedComponent}
          />
        );
      case "players":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4 min-h-[400px]">
              <PlayersWidget campaignId={campaignId!} />
            </div>
          </div>
        );
      case "warbands":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Warbands
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4">
              <p className="text-muted-foreground text-sm">
                Build and manage your warband roster with validated unit selection and points tracking.
              </p>
              <Link to={`/campaign/${campaignId}/warband-builder`}>
                <TerminalButton className="mt-4">
                  Open Warband Builder
                </TerminalButton>
              </Link>
            </div>
          </div>
        );
      case "narrative":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Narrative Tracker
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4 min-h-[400px]">
              <NarrativeWidget campaignId={campaignId!} isGM={isGM} />
            </div>
          </div>
        );
      case "messages":
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4 h-[500px]">
              <MessagesWidget campaignId={campaignId!} />
            </div>
          </div>
        );
      case "schedule":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Match Schedule
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4 min-h-[400px]">
              <ScheduleWidget campaignId={campaignId!} isGM={isGM} />
            </div>
          </div>
        );
      case "rules":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Scroll className="w-5 h-5" />
              Rules Reference
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4">
              {campaign.rules_repo_url ? (
                <p className="text-muted-foreground text-sm">
                  Rules loaded from: {campaign.rules_repo_url}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No rules repository configured. Add one in campaign settings.
                </p>
              )}
            </div>
          </div>
        );
      case "map":
        return (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Map className="w-5 h-5" />
              Campaign Map
            </h2>
            <div className="bg-card border border-primary/30 rounded p-4 aspect-video flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Interactive map coming soon.
              </p>
            </div>
          </div>
        );
      default:
        return null;
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
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-3">Campaign Control</p>
          <nav className="space-y-1 flex-1">
            <NavItem 
              icon={<LayoutGrid className="w-4 h-4" />} 
              label="Home" 
              active={activeView === "dashboard"}
              onClick={() => setActiveView("dashboard")}
            />
            <NavItem 
              icon={<Database className="w-4 h-4" />} 
              label="Components" 
              active={false}
              onClick={() => setActiveView("dashboard")}
            />
            <NavItem 
              icon={<Swords className="w-4 h-4" />} 
              label="Warbands" 
              active={activeView === "warbands"}
              onClick={() => setActiveView("warbands")}
            />
            <NavItem 
              icon={<Users className="w-4 h-4" />} 
              label="Players" 
              active={activeView === "players"}
              onClick={() => setActiveView("players")}
            />
            <NavItem 
              icon={<Scroll className="w-4 h-4" />} 
              label="Rules" 
              active={activeView === "rules"}
              onClick={() => setActiveView("rules")}
            />
            <NavItem 
              icon={<Map className="w-4 h-4" />} 
              label="Map" 
              active={activeView === "map"}
              onClick={() => setActiveView("map")}
            />
            <NavItem 
              icon={<BookOpen className="w-4 h-4" />} 
              label="Narrative" 
              active={activeView === "narrative"}
              onClick={() => setActiveView("narrative")}
            />
            <NavItem 
              icon={<MessageSquare className="w-4 h-4" />} 
              label="Messages" 
              active={activeView === "messages"}
              onClick={() => setActiveView("messages")}
            />
            <NavItem 
              icon={<Calendar className="w-4 h-4" />} 
              label="Schedule" 
              active={activeView === "schedule"}
              onClick={() => setActiveView("schedule")}
            />

            {isGM && (
              <>
                <div className="h-px bg-border my-3" />
                <NavItem 
                  icon={<Settings className="w-4 h-4" />} 
                  label="Settings" 
                  active={false}
                  onClick={() => setShowSettingsModal(true)}
                />
              </>
            )}
          </nav>
        </aside>

        {/* Main View */}
        <main className="flex-1 p-4 overflow-auto relative">
          {renderMainContent()}

          {/* Floating Add Buttons (GM only, only on dashboard view) */}
          {isGM && activeView === "dashboard" && (
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

      {/* Settings Modal */}
      {campaignId && (
        <CampaignSettingsModal
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          campaignId={campaignId}
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
