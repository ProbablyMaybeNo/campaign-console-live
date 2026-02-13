import { X, Trophy, Minus, FileText, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBattleReports, type BattleReport } from "@/hooks/useBattleTracker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ViewReportOverlayProps {
  matchId: string;
  onClose: () => void;
}

export function ViewReportOverlay({ matchId, onClose }: ViewReportOverlayProps) {
  const { data: reports = [], isLoading } = useBattleReports(matchId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="relative w-full max-w-lg bg-card border border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)] flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-primary/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono uppercase tracking-widest text-primary">Battle Reports</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-accent rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No reports submitted yet
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReportCard({ report }: { report: BattleReport }) {
  const outcomeColors = {
    win: "bg-green-500/20 text-green-400 border-green-500/50",
    loss: "bg-red-500/20 text-red-400 border-red-500/50",
    draw: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  };
  
  return (
    <div className="border border-border/50 rounded p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", outcomeColors[report.outcome])}>
            {report.outcome === 'win' && <Trophy className="w-3 h-3 mr-1" />}
            {report.outcome.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            +{report.points_earned} pts
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {report.approved_at ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              Approved
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              Pending
            </>
          )}
        </div>
      </div>
      
      {/* Narrative */}
      {report.narrative && (
        <div className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/20 p-2 rounded">
          {report.narrative}
        </div>
      )}
      
      {/* Injuries */}
      {report.injuries && report.injuries.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Injuries</div>
          <div className="space-y-1">
            {report.injuries.map((injury, i) => (
              <div key={i} className="text-xs flex gap-2">
                <span className="font-medium">{injury.unitName}:</span>
                <span className="text-muted-foreground">{injury.injury}</span>
                {injury.notes && <span className="text-muted-foreground/70">({injury.notes})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Notable Events */}
      {report.notable_events && report.notable_events.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notable Events</div>
          <div className="flex flex-wrap gap-1">
            {report.notable_events.map((event, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {event.tag}: {event.description}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Loot */}
      {report.loot_found && report.loot_found.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Loot Found</div>
          <div className="flex flex-wrap gap-1">
            {report.loot_found.map((loot, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {loot.item} {loot.quantity && loot.quantity > 1 && `x${loot.quantity}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Resources */}
      {report.resources && (report.resources.gained || report.resources.spent) && (
        <div className="flex gap-4 text-xs">
          {report.resources.gained && (
            <span className="text-green-400">+{report.resources.gained} resources</span>
          )}
          {report.resources.spent && (
            <span className="text-red-400">-{report.resources.spent} resources</span>
          )}
        </div>
      )}
      
      {/* Timestamp */}
      <div className="text-[10px] text-muted-foreground/50">
        Submitted {new Date(report.submitted_at).toLocaleDateString()}
      </div>
    </div>
  );
}
