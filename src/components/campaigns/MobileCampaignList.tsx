import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Campaign, useArchiveCampaign } from "@/hooks/useCampaigns";
import { Crown, User, Users, Archive, ArchiveRestore, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface MobileCampaignListProps {
  campaigns: Campaign[];
  userId: string | undefined;
  showArchived: boolean;
}

export const MobileCampaignList = memo(function MobileCampaignList({
  campaigns,
  userId,
  showArchived,
}: MobileCampaignListProps) {
  const navigate = useNavigate();
  const archiveCampaign = useArchiveCampaign();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyJoinCode = async (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    const text = campaign.join_code || campaign.id;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(campaign.id);
      toast.success(campaign.join_code ? "Join code copied!" : "Campaign ID copied!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground px-4">
        <p className="text-sm">
          {showArchived ? "No archived campaigns" : "No active campaigns"}
        </p>
        <p className="text-xs mt-2">
          {showArchived
            ? "Archived campaigns will appear here"
            : "Create a new campaign or join one using a Campaign ID"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {campaigns.map((campaign) => {
        const isGM = campaign.owner_id === userId;
        return (
          <button
            key={campaign.id}
            onClick={() => navigate(`/campaign/${campaign.id}`)}
            className="w-full text-left border border-primary/30 rounded-lg p-3 bg-card/60 transition-all active:scale-[0.98] hover:border-primary hover:bg-primary/5"
            style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.08)" }}
          >
            <div className="flex items-start justify-between gap-2">
              {/* Left: role icon + name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    isGM
                      ? "bg-warning/15 text-warning"
                      : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {isGM ? (
                    <Crown className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {campaign.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider ${
                        isGM ? "text-warning" : "text-secondary"
                      }`}
                    >
                      {isGM ? "GM" : "Player"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">•</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {campaign.player_count ?? 0}
                    </span>
                    {campaign.game_system && (
                      <>
                        <span className="text-[10px] text-muted-foreground/50">•</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                          {campaign.game_system}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isGM && (
                  <>
                    <button
                      onClick={(e) => handleCopyJoinCode(e, campaign)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
                      aria-label="Copy join code"
                    >
                      {copiedId === campaign.id ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveCampaign.mutate({
                          campaignId: campaign.id,
                          isArchived: !campaign.is_archived,
                        });
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
                      aria-label={
                        campaign.is_archived
                          ? "Restore campaign"
                          : "Archive campaign"
                      }
                    >
                      {campaign.is_archived ? (
                        <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});
