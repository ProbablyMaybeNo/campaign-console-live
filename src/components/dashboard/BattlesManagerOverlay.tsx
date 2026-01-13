import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignPlayers, useCampaignOwner, CampaignPlayer } from "@/hooks/useCampaignPlayers";
import { 
  Swords, 
  Plus, 
  Trash2, 
  Save,
  X,
  Trophy,
  Calendar,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleEntry {
  id: string;
  campaign_id: string;
  round_number: number;
  title: string;
  scenario: string | null;
  scheduled_date: string | null;
  status: string | null;
  created_at: string;
}

interface BattlesManagerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  isGM: boolean;
}

export function BattlesManagerOverlay({
  open,
  onOpenChange,
  campaignId,
  isGM,
}: BattlesManagerOverlayProps) {
  const queryClient = useQueryClient();
  const { data: players } = useCampaignPlayers(campaignId);
  const { data: owner } = useCampaignOwner(campaignId);
  
  const [selectedRound, setSelectedRound] = useState<ScheduleEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editRoundNumber, setEditRoundNumber] = useState(1);
  const [editScenario, setEditScenario] = useState("");
  const [editStatus, setEditStatus] = useState<string>("upcoming");
  const [editDate, setEditDate] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["schedule_entries", campaignId],
    queryFn: async (): Promise<ScheduleEntry[]> => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("round_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && open,
  });

  const createEntry = useMutation({
    mutationFn: async (data: Partial<ScheduleEntry>) => {
      const { error } = await supabase.from("schedule_entries").insert({
        campaign_id: campaignId,
        title: data.title,
        round_number: data.round_number,
        scenario: data.scenario,
        status: data.status,
        scheduled_date: data.scheduled_date,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", campaignId] });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ScheduleEntry>) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", campaignId] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("schedule_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedRound(null);
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", campaignId] });
    },
  });

  // Combine all players
  const allPlayers: CampaignPlayer[] = [];
  if (owner) allPlayers.push(owner);
  if (players) {
    players.forEach((p) => {
      if (!owner || p.user_id !== owner.user_id) allPlayers.push(p);
    });
  }

  const resetForm = () => {
    setEditTitle("");
    setEditRoundNumber((entries.length || 0) + 1);
    setEditScenario("");
    setEditStatus("upcoming");
    setEditDate("");
    setIsCreating(false);
    setSelectedRound(null);
  };

  const handleSelectRound = (entry: ScheduleEntry) => {
    setIsCreating(false);
    setSelectedRound(entry);
    setEditTitle(entry.title);
    setEditRoundNumber(entry.round_number);
    setEditScenario(entry.scenario || "");
    setEditStatus(entry.status || "upcoming");
    setEditDate(entry.scheduled_date || "");
  };

  const handleStartCreate = () => {
    setSelectedRound(null);
    setIsCreating(true);
    setEditTitle("");
    setEditRoundNumber((entries.length || 0) + 1);
    setEditScenario("");
    setEditStatus("upcoming");
    setEditDate("");
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;

    const data = {
      title: editTitle,
      round_number: editRoundNumber,
      scenario: editScenario || null,
      status: editStatus,
      scheduled_date: editDate || null,
    };

    if (isCreating) {
      createEntry.mutate(data);
    } else if (selectedRound) {
      updateEntry.mutate({ id: selectedRound.id, ...data });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteEntry.mutateAsync(id);
    setDeletingId(null);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      case "in_progress":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "upcoming":
      default:
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Battles & Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Rounds List */}
          <div className="w-2/5 border-r border-primary/20 flex flex-col">
            {isGM && (
              <div className="p-3 border-b border-primary/10">
                <TerminalButton onClick={handleStartCreate} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Round
                </TerminalButton>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <TerminalLoader text="Loading" size="sm" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No rounds scheduled</p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {entries.map((entry) => {
                    const isSelected = selectedRound?.id === entry.id;
                    
                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleSelectRound(entry)}
                        className={cn(
                          "w-full text-left p-3 transition-colors",
                          isSelected 
                            ? "bg-primary/10 border-l-2 border-primary" 
                            : "hover:bg-accent/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                                R{entry.round_number}
                              </span>
                              <span className="text-xs font-mono text-foreground truncate">
                                {entry.title}
                              </span>
                            </div>
                            {entry.scenario && (
                              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                {entry.scenario}
                              </p>
                            )}
                          </div>
                          <span className={cn(
                            "shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase",
                            getStatusColor(entry.status)
                          )}>
                            {entry.status || "upcoming"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Round Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRound || isCreating ? (
              <>
                {/* Editor Header */}
                <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {isCreating ? "New Round" : `Round ${selectedRound?.round_number}`}
                  </span>
                  <button
                    onClick={resetForm}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Editor Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Round Number
                      </label>
                      <input
                        type="number"
                        value={editRoundNumber}
                        onChange={(e) => setEditRoundNumber(parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                        disabled={!isGM}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                        disabled={!isGM}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      placeholder="Round title..."
                      disabled={!isGM}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Scenario
                    </label>
                    <input
                      type="text"
                      value={editScenario}
                      onChange={(e) => setEditScenario(e.target.value)}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      placeholder="Scenario name or description..."
                      disabled={!isGM}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                      disabled={!isGM}
                    />
                  </div>

                  {/* Match-ups Section */}
                  <div className="border border-border rounded p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <p className="text-xs font-mono">Match-ups</p>
                    </div>
                    
                    {allPlayers.length < 2 ? (
                      <p className="text-[10px] text-muted-foreground">
                        Need at least 2 players to create match-ups
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground">
                          Match-up management coming soon. Players in campaign:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {allPlayers.map((player) => (
                            <span
                              key={player.id}
                              className="text-[10px] bg-muted/30 px-2 py-0.5 rounded font-mono"
                            >
                              {player.profile?.display_name || `User ${player.user_id.slice(0, 6)}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Results Section */}
                  {selectedRound?.status === "completed" && (
                    <div className="border border-border rounded p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <p className="text-xs font-mono">Results</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Results tracking coming soon
                      </p>
                    </div>
                  )}
                </div>

                {/* Editor Footer */}
                {isGM && (
                  <div className="p-4 border-t border-primary/20 flex gap-2">
                    {selectedRound && (
                      <TerminalButton
                        variant="outline"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(selectedRound.id)}
                        disabled={deletingId === selectedRound.id}
                      >
                        {deletingId === selectedRound.id ? (
                          <TerminalLoader text="" size="sm" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </TerminalButton>
                    )}
                    <TerminalButton
                      className="flex-1"
                      onClick={handleSave}
                      disabled={!editTitle.trim() || createEntry.isPending || updateEntry.isPending}
                    >
                      {createEntry.isPending || updateEntry.isPending ? (
                        <TerminalLoader text="Saving" size="sm" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {isCreating ? "Create Round" : "Save Changes"}
                        </>
                      )}
                    </TerminalButton>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Calendar className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-xs font-mono">Select a round to view details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
