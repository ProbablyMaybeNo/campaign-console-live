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
import { ArrowLeft, Crown, User, AlertCircle, Copy, Check, Users, Settings } from "lucide-react";
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

  const getStatusColor = () => {
    return "text-primary text-glow-primary";
  };

  const getStatusLabel = () => {
    return "Active";
  };

  const getRoleIcon = (campaign: Campaign) => {
    if (campaign.owner_id === user?.id) {
      return <Crown className="w-4 h-4 text-warning" />;
    }
    return <User className="w-4 h-4 text-secondary" />;
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
      {/* Frame borders with neon glow */}
      <div className="absolute inset-4 pointer-events-none border border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.15)]" />
      <div className="absolute inset-6 pointer-events-none border border-primary/25" />

      {/* User icon and Help */}
      <div className="absolute top-8 right-8 flex items-center gap-3">
        <HelpButton variant="icon" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/settings")}
              className="p-3 border border-primary/50 text-primary hover:glow-primary transition-all"
            >
              <Settings className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Settings</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="max-w-5xl mx-auto pt-8 relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-glow-primary mb-6 transition-all">
          <div className="w-8 h-8 border border-primary/60 rounded-full flex items-center justify-center hover:glow-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary text-glow-primary">
            CAMPAIGN DIRECTORY
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent mt-4" />
        </div>

        {/* Campaign Table */}
        <div className="p-6 mb-6 border border-dashed border-primary/40">
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
                  <tr className="border-b border-primary/40">
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Role</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Campaign Name</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Players</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Campaign ID</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Start Date</th>
                    <th className="text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr 
                      key={campaign.id}
                      onClick={() => handleRowClick(campaign.id)}
                      onDoubleClick={() => navigate(`/campaign/${campaign.id}`)}
                      className={`cursor-pointer transition-all border-b border-primary/20 ${
                        selectedCampaignId === campaign.id 
                          ? "bg-primary/15 shadow-[inset_0_0_20px_hsl(var(--primary)/0.1)]" 
                          : "hover:bg-primary/5"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(campaign)}
                          <span className={campaign.owner_id === user?.id ? "text-warning" : "text-secondary"}>
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
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {new Date(campaign.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className={`py-3 px-4 ${getStatusColor()}`}>
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
