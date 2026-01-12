import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useDashboardComponents, DashboardComponent } from "@/hooks/useDashboardComponents";
import { useAuth } from "@/hooks/useAuth";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { InfiniteCanvas } from "@/components/dashboard/InfiniteCanvas";
import { AddComponentModal } from "@/components/dashboard/AddComponentModal";
import { CampaignSettingsModal } from "@/components/campaigns/CampaignSettingsModal";
import { ArrowLeft, Settings, Users, Map, Scroll, Swords, MessageSquare, Calendar, Plus } from "lucide-react";

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: components = [], isLoading: componentsLoading } = useDashboardComponents(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);

  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
        <aside className="w-56 border-r border-primary/20 bg-sidebar flex-shrink-0 p-4 hidden md:block">
          <nav className="space-y-1">
            <NavItem icon={<Map className="w-4 h-4" />} label="Dashboard" active />
            <NavItem icon={<Users className="w-4 h-4" />} label="Players" />
            <NavItem icon={<Swords className="w-4 h-4" />} label="Warbands" />
            <NavItem icon={<Scroll className="w-4 h-4" />} label="Narrative" />
            <NavItem icon={<MessageSquare className="w-4 h-4" />} label="Messages" />
            <NavItem icon={<Calendar className="w-4 h-4" />} label="Schedule" />
            {isGM && (
              <>
                <div className="h-px bg-border my-3" />
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* Dashboard Canvas */}
        <main className="flex-1 p-4 overflow-hidden relative">
          <InfiniteCanvas
            components={components}
            isGM={isGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            onComponentSelect={setSelectedComponent}
          />

          {/* Floating Add Button (GM only) */}
          {isGM && (
            <div className="fixed bottom-8 right-8 z-50">
              <TerminalButton
                className="h-14 w-14 rounded-full glow-primary text-xl"
                onClick={() => setShowAddModal(true)}
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

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
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
