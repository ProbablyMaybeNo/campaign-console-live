import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useAuth } from "@/hooks/useAuth";

export default function Campaigns() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-widest">CAMPAIGNS</h1>
            <p className="text-xs text-muted-foreground">// Select or create a campaign</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Logged in as: <span className="text-secondary">{user?.email}</span>
            </span>
            <TerminalButton variant="outline" size="sm" onClick={() => signOut()}>
              Logout
            </TerminalButton>
          </div>
        </div>

        {/* Campaign List Placeholder */}
        <TerminalCard title="Your Campaigns">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No campaigns found</p>
            <p className="text-xs mt-2">Create your first campaign to get started</p>
          </div>
        </TerminalCard>

        <div className="flex justify-center">
          <TerminalButton>
            + Create New Campaign
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}
