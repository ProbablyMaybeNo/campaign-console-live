import { Bot, Upload, Scroll, Sparkles, MessageSquare, X } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";

interface GettingStartedCardProps {
  onOpenAIBuilder: () => void;
  onOpenRules: () => void;
  onDismiss: () => void;
}

export function GettingStartedCard({ onOpenAIBuilder, onOpenRules, onDismiss }: GettingStartedCardProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-card border border-primary/30 rounded-lg p-8 shadow-lg relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-primary uppercase tracking-wider mb-2">
            Welcome to Your Campaign
          </h2>
          <p className="text-muted-foreground text-sm">
            Let's get your campaign dashboard set up with custom components.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 bg-muted/30 border border-border rounded">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Import Your Rules
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload a PDF or paste text from your wargame rulebook. The AI will extract 
                tables, skills, equipment, and campaign rules automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted/30 border border-border rounded">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Talk to the AI Builder
              </h3>
              <p className="text-sm text-muted-foreground">
                Use natural language to create dashboard components. Try prompts like:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground font-mono">
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  "Give me a breakdown of all the rules sections from the Trench Crusade campaign rules"
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  "Create an exploration results table for Common loot"
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  "Show me all Combat Skills as cards"
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted/30 border border-border rounded">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
                <Scroll className="w-4 h-4 text-primary" />
                Customize & Arrange
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag components around the infinite canvas, resize them, and build your 
                perfect campaign management dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <TerminalButton variant="outline" onClick={onOpenRules} className="flex-1">
            <Upload className="w-4 h-4 mr-2" />
            Import Rules First
          </TerminalButton>
          <TerminalButton onClick={onOpenAIBuilder} className="flex-1">
            <Bot className="w-4 h-4 mr-2" />
            Open AI Builder
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}
