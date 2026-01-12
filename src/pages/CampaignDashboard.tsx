import { useParams, Link } from "react-router-dom";
import { useCampaign, useIsGM } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { ArrowLeft, Settings, Users, Map, Scroll, Swords, MessageSquare, Calendar } from "lucide-react";

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data: campaign, isLoading, error } = useCampaign(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);

  if (isLoading) {
    return <FullScreenLoader text="Loading campaign" />;
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <TerminalCard title="Error">
          <div className="text-center py-8">
            <p className="text-destructive">[ERROR] Campaign not found</p>
            <Link to="/campaigns" className="mt-4 inline-block">
              <TerminalButton variant="outline" size="sm">
                {"<"} Back to Campaigns
              </TerminalButton>
            </Link>
          </div>
        </TerminalCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header Bar */}
      <header className="border-b border-primary/20 bg-card/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
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
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-56 border-r border-primary/20 bg-sidebar min-h-[calc(100vh-57px)] p-4 hidden md:block">
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
                <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
              </>
            )}
          </nav>
        </aside>

        {/* Dashboard Canvas Placeholder */}
        <main className="flex-1 p-6 relative">
          <TerminalCard title="Infinite Whiteboard">
            <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-4">
                <p className="text-sm">Dashboard canvas coming soon</p>
                <p className="text-xs">
                  {isGM 
                    ? "As GM, you'll be able to add and arrange components here"
                    : "Components added by the GM will appear here"
                  }
                </p>
              </div>
            </div>
          </TerminalCard>

          {/* Floating Add Button (GM only) */}
          {isGM && (
            <div className="fixed bottom-8 right-8">
              <TerminalButton className="h-14 w-14 rounded-full glow-primary animate-pulse-glow">
                +
              </TerminalButton>
            </div>
          )}
        </main>
      </div>
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
