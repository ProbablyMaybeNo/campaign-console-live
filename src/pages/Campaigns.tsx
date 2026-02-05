import { useState, useMemo } from "react";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, useArchiveCampaign, Campaign } from "@/hooks/useCampaigns";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { JoinCampaignModal } from "@/components/campaigns/JoinCampaignModal";
import { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";
import { DeleteConfirmModal } from "@/components/campaigns/DeleteConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, User, AlertCircle, Copy, Check, Users, Archive, ArchiveRestore } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { HelpButton } from "@/components/help/HelpButton";
import supporterIcon from "@/assets/supporter-icon.png";

export default function Campaigns() {
  const { user, signOut } = useAuth();
  const { data: campaigns, isLoading, error } = useCampaigns();
  const archiveCampaign = useArchiveCampaign();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  // Separate active and archived campaigns
  const { activeCampaigns, archivedCampaigns } = useMemo(() => {
    if (!campaigns) return { activeCampaigns: [], archivedCampaigns: [] };
    return {
      activeCampaigns: campaigns.filter(c => !c.is_archived),
      archivedCampaigns: campaigns.filter(c => c.is_archived),
    };
  }, [campaigns]);

  const displayedCampaigns = showArchived ? archivedCampaigns : activeCampaigns;
  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

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

  // Handle keyboard navigation for campaign list
  const handleKeyDown = (e: React.KeyboardEvent, campaignId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/campaign/${campaignId}`);
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
      <div className="absolute inset-4 pointer-events-none border border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.15)]" />
      <div className="absolute inset-6 pointer-events-none border border-primary/25" />

      {/* Supporter icon - top right */}
      <div className="absolute top-8 right-8 flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 border transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                borderColor: 'hsl(200, 100%, 60%)',
                boxShadow: '0 0 15px hsl(200 100% 60% / 0.4)',
              }}
            >
              <img src={supporterIcon} alt="Supporters" className="w-10 h-10" style={{ filter: 'drop-shadow(0 0 6px hsl(200, 100%, 70%))' }} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Supporters</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Help button - bottom right */}
      <div className="fixed bottom-8 right-8 z-50">
        <HelpButton variant="icon" />
      </div>

      <div className="max-w-5xl mx-auto pt-8 relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-bright mb-6 transition-all duration-200 group">
          <div className="w-8 h-8 border border-primary/60 rounded-full flex items-center justify-center transition-all duration-200 group-hover:border-primary group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)] group-hover:scale-105">
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </div>
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-primary text-glow-primary">
            CAMPAIGN DIRECTORY
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent mt-4" />
        </div>

        {/* Archive Toggle */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <TerminalButton
              variant={!showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(false)}
            >
              Active ({activeCampaigns.length})
            </TerminalButton>
            <TerminalButton
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(true)}
            >
              <Archive className="w-3 h-3 mr-1" />
              Archived ({archivedCampaigns.length})
            </TerminalButton>
          </div>
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
          ) : displayedCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/40">
                    <th className="text-left py-3 px-2 sm:px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Role</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Campaign Name</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Players</th>
                    <th className="hidden md:table-cell text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Campaign ID</th>
                    <th className="hidden md:table-cell text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Start Date</th>
                    <th className="hidden md:table-cell text-left py-3 px-4 text-primary font-mono uppercase tracking-wider text-glow-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                    {displayedCampaigns.map((campaign) => (
                      <tr 
                        key={campaign.id}
                        onClick={() => handleRowClick(campaign.id)}
                        onDoubleClick={() => navigate(`/campaign/${campaign.id}`)}
                        onKeyDown={(e) => handleKeyDown(e, campaign.id)}
                        tabIndex={0}
                        role="button"
                        aria-selected={selectedCampaignId === campaign.id}
                        className={`cursor-pointer transition-all duration-200 border-b border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                          selectedCampaignId === campaign.id 
                            ? "bg-primary/15 shadow-[inset_0_0_25px_hsl(var(--primary)/0.15)]" 
                            : "hover:bg-primary/5 hover:shadow-[inset_0_0_15px_hsl(var(--primary)/0.05)]"
                        }`}
                      >
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getRoleIcon(campaign)}
                          <span className={`hidden sm:inline ${campaign.owner_id === user?.id ? "text-warning" : "text-secondary"}`}>
                            {getRoleLabel(campaign)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-foreground text-base sm:text-sm">
                        {campaign.name}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-mono">{campaign.player_count ?? 0}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell py-3 px-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                            {campaign.id.slice(0, 8)}...
                          </code>
                          {campaign.owner_id === user?.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => handleCopyId(e, campaign.id)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label="Copy campaign ID to clipboard"
                                >
                                  {copiedId === campaign.id ? (
                                    <Check className="w-3 h-3 text-primary" />
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
                      <td className="hidden md:table-cell py-3 px-4 text-muted-foreground font-mono">
                        {new Date(campaign.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className={`hidden md:table-cell py-3 px-4 ${getStatusColor()}`}>
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
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <TerminalButton className="w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
            [ Create ]
          </TerminalButton>
          <TerminalButton className="w-full sm:w-auto" variant="secondary" onClick={() => setShowJoinModal(true)}>
            [ Join ]
          </TerminalButton>
          <TerminalButton className="w-full sm:w-auto" variant="outline" onClick={handleOpenCampaign} disabled={!selectedCampaignId}>
            [ Open ]
          </TerminalButton>
          <TerminalButton 
            className="w-full sm:w-auto"
            variant="destructive" 
            onClick={() => {
              const campaign = campaigns?.find(c => c.id === selectedCampaignId);
              if (campaign && campaign.owner_id === user?.id) {
                setDeletingCampaign(campaign);
              }
            }}
            disabled={!selectedCampaignId || campaigns?.find(c => c.id === selectedCampaignId)?.owner_id !== user?.id}
          >
            [ Remove ]
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
