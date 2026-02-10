import { useState, useEffect, useCallback } from "react";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  usePlayerSettings, 
  usePlayerNarrativeEntries,
  useCreatePlayerNarrativeEntry,
  useDeletePlayerNarrativeEntry,
  useLeaveCampaign,
} from "@/hooks/usePlayerSettings";
import { useAutoSavePlayerSettings } from "@/hooks/useAutoSavePlayerSettings";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Swords, 
  Link2, 
  FileText, 
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  LogOut,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlayerSettingsOverlayProps {
  campaignId: string;
}

// Simple URL validation
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function PlayerSettingsOverlay({ campaignId }: PlayerSettingsOverlayProps) {
  const navigate = useNavigate();
  const { data: settings, isLoading } = usePlayerSettings(campaignId);
  const { data: narrativeEntries, isLoading: narrativeLoading } = usePlayerNarrativeEntries(campaignId);
  const { save, isSaving } = useAutoSavePlayerSettings(campaignId);
  const createNarrativeEntry = useCreatePlayerNarrativeEntry(campaignId);
  const deleteNarrativeEntry = useDeletePlayerNarrativeEntry(campaignId);
  const leaveCampaign = useLeaveCampaign();

  const handleLeaveCampaign = async () => {
    await leaveCampaign.mutateAsync(campaignId);
    navigate("/campaigns");
  };

  // Form state
  const [playerName, setPlayerName] = useState("");
  const [faction, setFaction] = useState("");
  const [subFaction, setSubFaction] = useState("");
  const [currentPoints, setCurrentPoints] = useState("");
  const [warbandLink, setWarbandLink] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // New narrative entry state
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryContent, setNewEntryContent] = useState("");

  // Initialize form with existing settings
  useEffect(() => {
    if (settings) {
      setPlayerName(settings.player_name || "");
      setFaction(settings.faction || "");
      setSubFaction(settings.sub_faction || "");
      setCurrentPoints(settings.current_points?.toString() || "");
      setWarbandLink(settings.warband_link || "");
      setAdditionalInfo(settings.additional_info || "");
    }
  }, [settings]);

  const isGMPreview = settings?.id === "gm-preview";

  // Manual save handler
  const handleSaveSettings = useCallback(() => {
    if (isGMPreview) return;
    
    save({
      player_name: playerName.trim() || null,
      faction: faction.trim() || null,
      sub_faction: subFaction.trim() || null,
      current_points: currentPoints ? parseInt(currentPoints, 10) : null,
      warband_link: warbandLink.trim() || null,
      additional_info: additionalInfo.trim() || null,
    });
  }, [playerName, faction, subFaction, currentPoints, warbandLink, additionalInfo, save, isGMPreview]);

  const handleAddNarrativeEntry = async () => {
    if (!newEntryTitle.trim()) return;
    await createNarrativeEntry.mutateAsync({
      title: newEntryTitle.trim(),
      content: newEntryContent.trim(),
    });
    setNewEntryTitle("");
    setNewEntryContent("");
    setShowNewEntry(false);
  };

  const warbandLinkValid = !warbandLink.trim() || isValidUrl(warbandLink.trim());

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <TerminalLoader text="Loading settings..." />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <User className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm font-mono text-center">
          You need to be a member of this campaign to access player settings.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1 pr-4">
        {/* GM Preview Notice */}
        {isGMPreview && (
          <div className="bg-secondary/20 border border-secondary/50 rounded p-3 text-center">
            <p className="text-xs font-mono text-secondary">
              [ GM PREVIEW MODE ] This is what players see. Changes won't be saved.
            </p>
          </div>
        )}

        {/* Save Button */}
        {!isGMPreview && (
          <TerminalButton
            variant="secondary"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </TerminalButton>
        )}

        {/* Player Info Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider">Player Info</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TerminalInput
              label="Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name or alias..."
            />

            <TerminalInput
              label="Current Points / Gold"
              value={currentPoints}
              onChange={(e) => setCurrentPoints(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              type="text"
            />
          </div>
        </section>

        {/* Faction Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Swords className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider">Faction</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TerminalInput
              label="Faction"
              value={faction}
              onChange={(e) => setFaction(e.target.value)}
              placeholder="e.g., Space Marines"
            />

            <TerminalInput
              label="Sub-Faction"
              value={subFaction}
              onChange={(e) => setSubFaction(e.target.value)}
              placeholder="e.g., Ultramarines"
            />
          </div>
        </section>

        {/* Warband Link Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Link2 className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider">Warband Link</h3>
          </div>

          <div className="space-y-2">
            <TerminalInput
              value={warbandLink}
              onChange={(e) => setWarbandLink(e.target.value)}
              placeholder="https://newrecruit.eu/..."
              className={!warbandLinkValid ? "border-destructive" : ""}
            />
            {!warbandLinkValid && (
              <p className="text-[10px] text-destructive">
                Please enter a valid URL (starting with http:// or https://)
              </p>
            )}
            {warbandLink.trim() && warbandLinkValid && (
              <a
                href={warbandLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open warband link
              </a>
            )}
            <p className="text-[10px] text-muted-foreground">
              Link to your warband on New Recruit or another roster builder
            </p>
          </div>
        </section>

        {/* Additional Info Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider">Additional Info</h3>
          </div>

          <Textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Paste your warband list or any additional notes here..."
            className="min-h-[150px] font-mono text-sm bg-input border-border"
          />
        </section>

        {/* Narrative Section */}
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-xs font-mono uppercase tracking-wider">Your Narrative</h3>
            </div>
            <TerminalButton
              variant="outline"
              size="sm"
              onClick={() => setShowNewEntry(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Entry
            </TerminalButton>
          </div>

          {/* New Entry Form */}
          {showNewEntry && (
            <div className="border border-primary/30 rounded p-4 space-y-3 bg-primary/5 animate-fade-in">
              <TerminalInput
                label="Title"
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                placeholder="Entry title..."
              />
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Content
                </Label>
                <Textarea
                  value={newEntryContent}
                  onChange={(e) => setNewEntryContent(e.target.value)}
                  placeholder="Write your narrative entry..."
                  className="min-h-[100px] font-mono text-sm bg-input border-border"
                />
              </div>
              <div className="flex justify-end gap-2">
                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewEntry(false);
                    setNewEntryTitle("");
                    setNewEntryContent("");
                  }}
                >
                  Cancel
                </TerminalButton>
                <TerminalButton
                  size="sm"
                  onClick={handleAddNarrativeEntry}
                  disabled={!newEntryTitle.trim() || createNarrativeEntry.isPending}
                >
                  {createNarrativeEntry.isPending ? "Adding..." : "Add Entry"}
                </TerminalButton>
              </div>
            </div>
          )}

          {/* Existing Entries */}
          {narrativeLoading ? (
            <TerminalLoader text="Loading narrative..." />
          ) : narrativeEntries && narrativeEntries.length > 0 ? (
            <div className="space-y-3">
              {narrativeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-border rounded p-3 bg-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-mono text-sm text-foreground">{entry.title}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{entry.title}"? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteNarrativeEntry.mutate(entry.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {entry.content && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono">No narrative entries yet</p>
              <p className="text-[10px] mt-1">Click "Add Entry" to create your first one</p>
            </div>
          )}
        </section>

        {/* Leave Campaign - only for real players, not GM preview */}
        {!isGMPreview && (
          <section className="border-t border-destructive/30 pt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TerminalButton
                  variant="destructive"
                  className="w-full"
                  disabled={leaveCampaign.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {leaveCampaign.isPending ? "Leaving..." : "Leave Campaign"}
                </TerminalButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this campaign? Your player settings and narrative entries will be deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveCampaign}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Leave Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
