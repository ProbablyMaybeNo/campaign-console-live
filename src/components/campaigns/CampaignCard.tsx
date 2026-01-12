import { Link } from "react-router-dom";
import { Campaign } from "@/hooks/useCampaigns";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Pencil, Trash2, Users, Target } from "lucide-react";

interface CampaignCardProps {
  campaign: Campaign;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function CampaignCard({ campaign, isOwner, onEdit, onDelete }: CampaignCardProps) {
  const formattedDate = new Date(campaign.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-card border border-primary/20 p-4 relative group hover:border-primary/40 transition-colors">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50" />

      <div className="space-y-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider truncate">
            {campaign.name}
          </h3>
          {isOwner && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 shrink-0">
              GM
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {campaign.description || "No description"}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>{campaign.points_limit || 1000} pts</span>
          </div>
          <div className="flex items-center gap-1 text-secondary">
            <span>Updated: {formattedDate}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Link to={`/campaign/${campaign.id}`} className="flex-1">
            <TerminalButton size="sm" className="w-full">
              {">> Enter"}
            </TerminalButton>
          </Link>
          
          {isOwner && (
            <>
              <TerminalButton
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
                className="h-8 w-8"
              >
                <Pencil className="w-4 h-4" />
              </TerminalButton>
              <TerminalButton
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
                className="h-8 w-8 hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </TerminalButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
