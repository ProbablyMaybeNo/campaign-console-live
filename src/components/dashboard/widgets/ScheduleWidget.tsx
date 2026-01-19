import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar } from "lucide-react";

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

interface ScheduleWidgetProps {
  campaignId: string;
  isGM: boolean;
}

export function ScheduleWidget({ campaignId, isGM }: ScheduleWidgetProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);

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
    enabled: !!campaignId,
  });

  const createEntry = useMutation({
    mutationFn: async ({ title, roundNumber }: { title: string; roundNumber: number }) => {
      const { error } = await supabase.from("schedule_entries").insert({
        campaign_id: campaignId,
        title,
        round_number: roundNumber,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setRoundNumber((entries.length || 0) + 1);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", campaignId] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", campaignId] });
    },
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "text-accent";
      case "in_progress":
        return "text-primary";
      case "upcoming":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground animate-pulse">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No rounds scheduled. {isGM && "Add one to get started."}
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-primary/30">
                <th className="text-left p-2 text-primary font-mono">Round</th>
                <th className="text-left p-2 text-primary font-mono">Title</th>
                <th className="text-left p-2 text-primary font-mono">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{entry.round_number}</td>
                  <td className="p-2">{entry.title}</td>
                  <td className="p-2">
                    {isGM ? (
                      <select
                        value={entry.status || "upcoming"}
                        onChange={(e) => updateStatus.mutate({ id: entry.id, status: e.target.value })}
                        className={`bg-transparent border-none text-xs ${getStatusColor(entry.status)} cursor-pointer`}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <span className={getStatusColor(entry.status)}>
                        {entry.status || "Upcoming"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isGM && (
        <div className="pt-2 border-t border-border mt-auto">
          {showForm ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-16 bg-input border border-border rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Round title..."
                  className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createEntry.mutate({ title, roundNumber })}
                  disabled={!title.trim() || createEntry.isPending}
                  className="flex-1 bg-primary/20 border border-primary text-primary text-xs py-1 rounded hover:bg-primary/30 disabled:opacity-50"
                >
                  Add Round
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setRoundNumber((entries.length || 0) + 1);
                setShowForm(true);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Round
            </button>
          )}
        </div>
      )}
    </div>
  );
}
