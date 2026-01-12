import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Warband, RosterUnit } from "@/hooks/useWarband";
import { CampaignUnit } from "@/hooks/useCampaignUnits";
import {
  generateTextExport,
  generateDetailedTextExport,
  generatePrintHtml,
  copyToClipboard,
  printRoster,
  downloadTextFile,
  ExportData,
} from "@/lib/rosterExport";
import { toast } from "sonner";
import {
  Printer,
  Copy,
  Download,
  FileText,
  List,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RosterExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warband: Warband;
  units: CampaignUnit[];
  campaignName: string;
  pointsLimit: number;
}

type ExportFormat = "simple" | "detailed";

export function RosterExportModal({
  open,
  onOpenChange,
  warband,
  units,
  campaignName,
  pointsLimit,
}: RosterExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("simple");
  const [copied, setCopied] = useState(false);

  const totalPoints = warband.roster.reduce((sum, u) => sum + u.total_cost, 0);

  const exportData: ExportData = {
    warbandName: warband.name,
    faction: warband.faction || "Unknown",
    subFaction: warband.sub_faction,
    campaignName,
    pointsLimit,
    totalPoints,
    roster: warband.roster,
    units,
    exportDate: new Date().toLocaleDateString(),
  };

  const getTextContent = () => {
    return format === "detailed"
      ? generateDetailedTextExport(exportData)
      : generateTextExport(exportData);
  };

  const handleCopy = async () => {
    const text = getTextContent();
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success("Roster copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const text = getTextContent();
    const filename = `${warband.name.replace(/\s+/g, "_")}_roster.txt`;
    downloadTextFile(text, filename);
    toast.success("Roster downloaded");
  };

  const handlePrint = () => {
    const html = generatePrintHtml(exportData);
    printRoster(html);
  };

  const textPreview = getTextContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Roster
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Format Selection */}
          <div className="flex gap-2">
            <TerminalButton
              variant={format === "simple" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat("simple")}
              className="flex-1"
            >
              <List className="w-4 h-4 mr-2" />
              Simple
            </TerminalButton>
            <TerminalButton
              variant={format === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat("detailed")}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Detailed
            </TerminalButton>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 bg-background border border-primary/20 rounded overflow-hidden">
            <div className="p-2 bg-primary/10 border-b border-primary/20 text-xs text-muted-foreground font-mono">
              Preview
            </div>
            <pre className="p-4 overflow-auto h-[300px] text-xs font-mono text-foreground whitespace-pre-wrap">
              {textPreview}
            </pre>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <TerminalButton
              variant="outline"
              onClick={handleCopy}
              className={cn(copied && "text-green-500 border-green-500/50")}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy"}
            </TerminalButton>
            <TerminalButton variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </TerminalButton>
            <TerminalButton onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </TerminalButton>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Use "Print / PDF" to save as PDF via your browser&apos;s print dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
