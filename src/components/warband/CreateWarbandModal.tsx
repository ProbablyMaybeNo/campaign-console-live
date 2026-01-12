import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFactions } from "@/hooks/useCampaignUnits";
import { useCreateWarband } from "@/hooks/useWarband";
import { useAuth } from "@/hooks/useAuth";
import { Swords, Shield, AlertTriangle } from "lucide-react";

interface CreateWarbandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess?: (warbandId: string) => void;
}

export function CreateWarbandModal({ 
  open, 
  onOpenChange, 
  campaignId,
  onSuccess 
}: CreateWarbandModalProps) {
  const { user } = useAuth();
  const factions = useFactions(campaignId);
  const createWarband = useCreateWarband();

  const [name, setName] = useState("");
  const [faction, setFaction] = useState("");
  const [subFaction, setSubFaction] = useState("");

  const selectedFactionData = factions.find(f => f.faction === faction);
  const hasSubFactions = selectedFactionData && selectedFactionData.subFactions.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !name.trim() || !faction) return;

    try {
      const result = await createWarband.mutateAsync({
        campaign_id: campaignId,
        owner_id: user.id,
        name: name.trim(),
        faction,
        sub_faction: subFaction || null,
      });

      setName("");
      setFaction("");
      setSubFaction("");
      onOpenChange(false);
      
      if (onSuccess && result) {
        onSuccess(result.id);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleFactionChange = (value: string) => {
    setFaction(value);
    setSubFaction(""); // Reset sub-faction when faction changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Create Warband
          </DialogTitle>
        </DialogHeader>

        {factions.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
            <div>
              <p className="text-foreground font-mono">No units in library</p>
              <p className="text-muted-foreground text-sm mt-2">
                The GM needs to add units to the campaign library before you can create a warband.
              </p>
            </div>
            <TerminalButton variant="outline" onClick={() => onOpenChange(false)}>
              [ Close ]
            </TerminalButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warband Name */}
            <div className="space-y-2">
              <Label htmlFor="warband-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                Warband Name
              </Label>
              <TerminalInput
                id="warband-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter warband name..."
                required
              />
            </div>

            {/* Faction Selection */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Faction
              </Label>
              <Select value={faction} onValueChange={handleFactionChange} required>
                <SelectTrigger className="bg-background border-primary/30 font-mono">
                  <SelectValue placeholder="Select faction..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30">
                  {factions.map((f) => (
                    <SelectItem 
                      key={f.faction} 
                      value={f.faction}
                      className="font-mono"
                    >
                      {f.faction}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-Faction Selection (if available) */}
            {hasSubFactions && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sub-Faction <span className="text-muted-foreground/50">(optional)</span>
                </Label>
                <Select value={subFaction} onValueChange={setSubFaction}>
                  <SelectTrigger className="bg-background border-primary/30 font-mono">
                    <SelectValue placeholder="Select sub-faction..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/30">
                    <SelectItem value="" className="font-mono text-muted-foreground">
                      None
                    </SelectItem>
                    {selectedFactionData?.subFactions.map((sf) => (
                      <SelectItem 
                        key={sf} 
                        value={sf}
                        className="font-mono"
                      >
                        {sf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {name && faction && (
              <div className="border border-primary/20 bg-background/50 rounded p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Preview</p>
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-mono text-foreground font-bold">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {faction}{subFaction ? ` • ${subFaction}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <TerminalButton
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                [ Cancel ]
              </TerminalButton>
              <TerminalButton
                type="submit"
                disabled={!name.trim() || !faction || createWarband.isPending}
                className="flex-1"
              >
                {createWarband.isPending ? "Creating..." : "[ Create ]"}
              </TerminalButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
