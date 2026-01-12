import { useState } from "react";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, useCreateCampaign, useDeleteCampaign, Campaign } from "@/hooks/useCampaigns";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";
import { DeleteConfirmModal } from "@/components/campaigns/DeleteConfirmModal";
import { Link } from "react-router-dom";

export default function Campaigns() {
  const { user, signOut } = useAuth();
  const { data: campaigns, isLoading, error } = useCampaigns();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link to="/" className="text-muted-foreground hover:text-primary text-xs mb-2 inline-block transition-colors">
              {"<"} Back to Home
            </Link>
            <h1 className="text-2xl font-bold text-primary tracking-widest">CAMPAIGNS</h1>
            <p className="text-xs text-muted-foreground">// Select or create a campaign</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Operative: <span className="text-secondary">{user?.email}</span>
            </span>
            <TerminalButton variant="outline" size="sm" onClick={() => signOut()}>
              Logout
            </TerminalButton>
          </div>
        </div>

        {/* Campaign List */}
        <TerminalCard 
          title="Your Campaigns"
          headerActions={
            <TerminalButton size="sm" onClick={() => setShowCreateModal(true)}>
              + New Campaign
            </TerminalButton>
          }
        >
          {isLoading ? (
            <div className="flex justify-center py-12">
              <TerminalLoader text="Loading campaigns" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p className="text-sm">[ERROR] Failed to load campaigns</p>
              <p className="text-xs mt-2">{(error as Error).message}</p>
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  isOwner={campaign.owner_id === user?.id}
                  onEdit={() => setEditingCampaign(campaign)}
                  onDelete={() => setDeletingCampaign(campaign)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No campaigns found</p>
              <p className="text-xs mt-2">Create your first campaign to get started</p>
            </div>
          )}
        </TerminalCard>

        {/* Modals */}
        <CreateCampaignModal 
          open={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
        
        {editingCampaign && (
          <EditCampaignModal
            campaign={editingCampaign}
            open={!!editingCampaign}
            onClose={() => setEditingCampaign(null)}
          />
        )}

        {deletingCampaign && (
          <DeleteConfirmModal
            campaign={deletingCampaign}
            open={!!deletingCampaign}
            onClose={() => setDeletingCampaign(null)}
          />
        )}
      </div>
    </div>
  );
}
