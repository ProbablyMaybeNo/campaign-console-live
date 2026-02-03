import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Crown, 
  Heart, 
  X, 
  Palette, 
  Sparkles, 
  Type, 
  Sticker,
  Lock,
  ChevronRight,
  Unlock
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemePreviewCard } from "@/components/supporter/ThemePreviewCard";
import { THEMES, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface SupporterHubProps {
  isSupporter: boolean;
  currentThemeId?: string;
  onThemeSelect?: (themeId: string) => void;
  onAddSmartPaste?: () => void;
  onAddSticker?: () => void;
  onAddText?: () => void;
}

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isLocked: boolean;
  onClick?: () => void;
}

function FeatureItem({ icon, title, description, isLocked, onClick }: FeatureItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-md border transition-all text-left",
        isLocked 
          ? "opacity-50 cursor-not-allowed border-border bg-muted/20" 
          : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
      )}
    >
      <div className={cn(
        "p-2 rounded-md",
        isLocked ? "bg-muted/30" : "bg-primary/20"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider",
            isLocked ? "text-muted-foreground" : "text-foreground"
          )}>
            {title}
          </span>
          {isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {description}
        </p>
      </div>
      {!isLocked && (
        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
      )}
    </button>
  );
}

export function SupporterHub({
  isSupporter,
  currentThemeId = "dark",
  onThemeSelect,
  onAddSmartPaste,
  onAddSticker,
  onAddText,
}: SupporterHubProps) {
  const [open, setOpen] = useState(false);
  const isLocked = !isSupporter;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {isSupporter ? (
          <button
            className="flex items-center gap-2 w-full py-2 px-3 rounded transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, hsl(280, 80%, 45%) 0%, hsl(320, 70%, 50%) 50%, hsl(280, 80%, 45%) 100%)',
              boxShadow: '0 0 20px hsl(280 80% 50% / 0.4), 0 0 40px hsl(320 70% 50% / 0.2), inset 0 1px 0 hsl(280 80% 70% / 0.3)',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          >
            <Crown className="w-4 h-4 text-amber-300" style={{ filter: 'drop-shadow(0 0 4px hsl(45, 100%, 50%))' }} />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              Supporter Hub
            </span>
          </button>
        ) : (
          <button
            className="flex items-center gap-2 w-full py-2 px-3 rounded border border-muted/50 bg-muted/10 transition-all hover:bg-muted/20 hover:border-muted/70"
          >
            <Heart className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Support
            </span>
          </button>
        )}
      </SheetTrigger>

      <SheetContent 
        side="left" 
        className="w-[380px] sm:w-[420px] p-0 border-r-2 border-primary bg-background/98 backdrop-blur-md"
        style={{ boxShadow: '4px 0 30px hsl(var(--primary) / 0.2)' }}
      >
        <SheetHeader className="p-4 border-b border-primary/30 bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSupporter ? (
                <Crown className="w-5 h-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 6px hsl(45, 100%, 50%))' }} />
              ) : (
                <Heart className="w-5 h-5 text-primary" />
              )}
              <SheetTitle className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
                {isSupporter ? "Supporter Hub" : "Become a Supporter"}
              </SheetTitle>
            </div>
          </div>
          {isSupporter && (
            <p className="text-xs text-muted-foreground mt-1">
              Access your exclusive supporter features
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-6">
            {/* Unlock CTA for non-supporters */}
            {!isSupporter && (
              <div className="relative rounded-lg p-6 border-2 border-[hsl(200,100%,65%)] bg-[hsl(200,100%,65%)]/5 text-center">
                <div 
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{ 
                    background: 'radial-gradient(circle at center, hsl(200, 100%, 65%) 0%, transparent 70%)'
                  }}
                />
                <Unlock 
                  className="w-10 h-10 mx-auto mb-3 text-[hsl(200,100%,70%)]" 
                  style={{ filter: 'drop-shadow(0 0 12px hsl(200, 100%, 60%))' }}
                />
                <h3 
                  className="font-mono text-lg font-bold uppercase tracking-wider mb-2"
                  style={{ 
                    color: 'hsl(200, 100%, 70%)',
                    textShadow: '0 0 15px hsl(200 100% 60% / 0.8)'
                  }}
                >
                  Unlock All Features
                </h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-[280px] mx-auto">
                  Support Campaign Console to unlock exclusive themes, AI Smart Paste, stickers, and more.
                </p>
                <Link 
                  to="/settings?tab=billing"
                  onClick={() => setOpen(false)}
                >
                  <Button
                    className="font-mono text-xs font-bold uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, hsl(200, 100%, 55%) 0%, hsl(220, 100%, 60%) 100%)',
                      boxShadow: '0 0 20px hsl(200 100% 60% / 0.5), 0 0 40px hsl(200 100% 50% / 0.25)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Become a Supporter - $2.99/mo
                  </Button>
                </Link>
              </div>
            )}

            {/* Quick Actions Section */}
            <div>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <FeatureItem
                  icon={<Sparkles className={cn("w-4 h-4", isLocked ? "text-muted-foreground" : "text-primary")} />}
                  title="AI Smart Paste"
                  description="Paste rules text and let AI structure it"
                  isLocked={isLocked}
                  onClick={() => {
                    onAddSmartPaste?.();
                    setOpen(false);
                  }}
                />
                <FeatureItem
                  icon={<Sticker className={cn("w-4 h-4", isLocked ? "text-muted-foreground" : "text-primary")} />}
                  title="Add Sticker"
                  description="Place visual markers on your dashboard"
                  isLocked={isLocked}
                  onClick={() => {
                    onAddSticker?.();
                    setOpen(false);
                  }}
                />
                <FeatureItem
                  icon={<Type className={cn("w-4 h-4", isLocked ? "text-muted-foreground" : "text-primary")} />}
                  title="Add Text Widget"
                  description="Create markdown notes on the canvas"
                  isLocked={isLocked}
                  onClick={() => {
                    onAddText?.();
                    setOpen(false);
                  }}
                />
              </div>
            </div>

            {/* Themes Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Dashboard Themes
                </h4>
                {isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                  <ThemePreviewCard
                    key={theme.id}
                    theme={theme}
                    isActive={currentThemeId === theme.id}
                    isLocked={theme.supporterOnly && isLocked}
                    onSelect={(id) => {
                      if (!theme.supporterOnly || !isLocked) {
                        onThemeSelect?.(id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Supporter Benefits Summary */}
            {isSupporter && (
              <div className="rounded-lg p-4 border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                    Your Benefits
                  </span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• 5 active campaigns (vs 1 free)</li>
                  <li>• 10 exclusive OS-inspired themes</li>
                  <li>• AI Smart Paste for rules</li>
                  <li>• Text & Sticker widgets</li>
                  <li>• Custom campaign banners</li>
                  <li>• Priority feature requests</li>
                </ul>
              </div>
            )}

            {/* Manage Subscription Link */}
            {isSupporter && (
              <Link 
                to="/settings?tab=billing"
                onClick={() => setOpen(false)}
                className="block w-full"
              >
                <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">
                  Manage Subscription
                </Button>
              </Link>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
