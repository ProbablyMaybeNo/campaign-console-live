import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";
import { DeleteConfirmModal } from "@/components/campaigns/DeleteConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Crown, User, AlertCircle } from "lucide-react";

export default function Campaigns() {
  const { user, signOut } = useAuth();
  const { data: campaigns, isLoading, error } = useCampaigns();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const navigate = useNavigate();

  const getStatusColor = (campaign: Campaign) => {
    // Simple status logic based on dates or we can add status field later
    return "text-green-400"; // Active by default
  };

  const getStatusLabel = () => {
    return "Active";
  };

  const getRoleIcon = (campaign: Campaign) => {
    if (campaign.owner_id === user?.id) {
      return <Crown className="w-4 h-4 text-yellow-400" />;
    }
    return <User className="w-4 h-4 text-blue-400" />;
  };

  const handleRowClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleOpenCampaign = () => {
    if (selectedCampaignId) {
      navigate(`/campaign/${selectedCampaignId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 relative">
      {/* Frame borders */}
      <div className="absolute inset-4 border border-cyan-500/30 pointer-events-none" />
      <div className="absolute inset-6 border border-cyan-500/20 pointer-events-none" />

      {/* User icon */}
      <div className="absolute top-8 right-8 p-3 border border-primary/40 text-primary">
        <UserPlus className="w-6 h-6" />
      </div>

      <div className="max-w-5xl mx-auto pt-8 relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <div className="w-8 h-8 border border-primary rounded-full flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono tracking-widest text-primary">
            -- CAMPAIGN OVERVIEW --
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4" />
        </div>

        {/* Campaign Table */}
        <div className="border border-primary/30 border-dashed p-6 mb-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <TerminalLoader text="Loading campaigns" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">[ERROR] Failed to load campaigns</p>
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/30">
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Campaign Name</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Wargame</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Start Date</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr 
                      key={campaign.id}
                      onClick={() => handleRowClick(campaign.id)}
                      onDoubleClick={() => navigate(`/campaign/${campaign.id}`)}
                      className={`border-b border-border/30 cursor-pointer transition-colors ${
                        selectedCampaignId === campaign.id 
                          ? "bg-primary/10" 
                          : "hover:bg-accent/30"
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-2">
                        {getRoleIcon(campaign)}
                        <span className="text-foreground">{campaign.name}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {campaign.rules_repo_url ? "Custom Rules" : "Manual Setup"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(campaign.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className={`py-3 px-4 ${getStatusColor(campaign)}`}>
                        {getStatusLabel()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No campaigns found</p>
              <p className="text-xs mt-2">Create your first campaign to get started</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <TerminalButton onClick={() => setShowCreateModal(true)}>
            [ Create ]
          </TerminalButton>
          <TerminalButton variant="outline" onClick={handleOpenCampaign} disabled={!selectedCampaignId}>
            [ Open ]
          </TerminalButton>
          <TerminalButton 
            variant="destructive" 
            onClick={() => {
              const campaign = campaigns?.find(c => c.id === selectedCampaignId);
              if (campaign && campaign.owner_id === user?.id) {
                setDeletingCampaign(campaign);
              }
            }}
            disabled={!selectedCampaignId || campaigns?.find(c => c.id === selectedCampaignId)?.owner_id !== user?.id}
          >
            [ Remove Campaign ]
          </TerminalButton>
        </div>

        {/* User info footer */}
        <div className="mt-8 flex justify-between items-center text-xs text-muted-foreground">
          <span>Operative: <span className="text-secondary">{user?.email}</span></span>
          <TerminalButton variant="ghost" size="sm" onClick={() => signOut()}>
            Logout
          </TerminalButton>
        </div>

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
