import { useState } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { JoinCampaignModal } from "@/components/campaigns/JoinCampaignModal";
import { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";
import { DeleteConfirmModal } from "@/components/campaigns/DeleteConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Crown, User, AlertCircle, Copy, Check, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { HelpButton } from "@/components/help/HelpButton";

export default function Campaigns() {
  const { user, signOut } = useAuth();
  const { data: campaigns, isLoading, error } = useCampaigns();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const getStatusColor = (campaign: Campaign) => {
    return "text-green-400";
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

  const getRoleLabel = (campaign: Campaign) => {
    return campaign.owner_id === user?.id ? "GM" : "Player";
  };

  const handleRowClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleOpenCampaign = () => {
    if (selectedCampaignId) {
      navigate(`/campaign/${selectedCampaignId}`);
    }
  };

  const handleCopyId = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(campaignId);
      setCopiedId(campaignId);
      toast.success("Campaign ID copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 relative">
      {/* Frame borders */}
      <div className="absolute inset-4 pointer-events-none" style={{ border: '1px solid hsl(142, 76%, 65%, 0.4)' }} />
      <div className="absolute inset-6 pointer-events-none" style={{ border: '1px solid hsl(142, 76%, 65%, 0.25)' }} />

      {/* User icon and Help */}
      <div className="absolute top-8 right-8 flex items-center gap-3">
        <HelpButton variant="icon" />
        <div className="p-3 border border-primary/40 text-primary">
          <UserPlus className="w-6 h-6" />
        </div>
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
          <h1 
            className="text-3xl font-bold tracking-widest uppercase"
            style={{ 
              color: 'hsl(142, 76%, 65%)',
              textShadow: '0 0 8px hsl(142, 76%, 50%, 0.6)',
              fontFamily: '"IBM Plex Mono", monospace'
            }}
          >
            CAMPAIGN DIRECTORY
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4" />
        </div>

        {/* Campaign Table */}
        <div className="p-6 mb-6" style={{ border: '1px dashed hsl(142, 76%, 65%, 0.4)' }}>
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
                  <tr style={{ borderBottom: '1px solid hsl(142, 76%, 65%, 0.4)' }}>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Campaign Name</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Players</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider">Campaign ID</th>
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
                      className={`cursor-pointer transition-colors ${
                        selectedCampaignId === campaign.id 
                          ? "bg-primary/10" 
                          : "hover:bg-accent/30"
                      }`}
                      style={{ borderBottom: '1px solid hsl(142, 76%, 65%, 0.25)' }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(campaign)}
                          <span className={campaign.owner_id === user?.id ? "text-yellow-400" : "text-blue-400"}>
                            {getRoleLabel(campaign)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {campaign.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-mono">{campaign.player_count ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                            {campaign.id.slice(0, 8)}...
                          </code>
                          {campaign.owner_id === user?.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => handleCopyId(e, campaign.id)}
                                  className="p-1 hover:bg-primary/20 rounded transition-colors"
                                >
                                  {copiedId === campaign.id ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Copy ID to share with players</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
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
              <p className="text-xs mt-2">Create a new campaign or join one using a Campaign ID</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <TerminalButton onClick={() => setShowCreateModal(true)}>
            [ Create ]
          </TerminalButton>
          <TerminalButton variant="secondary" onClick={() => setShowJoinModal(true)}>
            [ Join ]
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

        <JoinCampaignModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
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
