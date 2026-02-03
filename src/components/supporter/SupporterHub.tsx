import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Crown, 
  Heart, 
  Palette, 
  Sparkles, 
  Type, 
  Sticker,
  Lock,
  ChevronRight,
  Unlock,
  Zap,
  Rocket
} from "lucide-react";
import supporterIcon from "@/assets/supporter-icon.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemePreviewCard } from "@/components/supporter/ThemePreviewCard";
import { THEMES } from "@/lib/themes";
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
        "w-full flex items-center gap-3 p-3 rounded-md border transition-all text-left group",
        isLocked 
          ? "opacity-40 cursor-not-allowed border-muted/30 bg-muted/5" 
          : "border-primary/40 bg-primary/5 hover:bg-primary/15 hover:border-primary"
      )}
      style={!isLocked ? {
        boxShadow: '0 0 12px hsl(var(--primary) / 0.15)'
      } : undefined}
    >
      <div className={cn(
        "p-2 rounded-md transition-all",
        isLocked ? "bg-muted/10" : "bg-primary/20 group-hover:bg-primary/30"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider transition-colors",
            isLocked ? "text-muted-foreground/70" : "text-foreground group-hover:text-primary"
          )}>
            {title}
          </span>
          {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
        </div>
        <p className="text-[10px] text-muted-foreground/80 truncate">
          {description}
        </p>
      </div>
      {!isLocked && (
        <ChevronRight className="w-4 h-4 text-primary/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      )}
    </button>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary/70">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
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
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        {isSupporter ? (
          <button
            className="relative flex items-center gap-2 w-full py-2.5 px-3 rounded-md transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(200, 100%, 45%) 0%, hsl(210, 100%, 55%) 50%, hsl(220, 100%, 50%) 100%)',
              boxShadow: '0 0 25px hsl(200 100% 65% / 0.6), 0 0 50px hsl(210 100% 60% / 0.4), inset 0 1px 0 hsl(200 100% 80% / 0.4)',
            }}
          >
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: 'linear-gradient(45deg, transparent 30%, hsl(200, 100%, 75%) 50%, transparent 70%)',
                animation: 'shimmer 2.5s ease-in-out infinite',
              }}
            />
            <img src={supporterIcon} alt="Supporter" className="w-5 h-5 relative z-10" style={{ filter: 'drop-shadow(0 0 6px hsl(200, 100%, 70%)) drop-shadow(0 0 2px hsl(200, 100%, 90%)) brightness(1.1) contrast(1.2)', mixBlendMode: 'screen' }} />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white relative z-10" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
              Supporter Hub
            </span>
            <Zap className="w-3 h-3 text-cyan-200 ml-auto relative z-10" style={{ filter: 'drop-shadow(0 0 4px hsl(200, 100%, 50%))' }} />
          </button>
        ) : (
          <button
            className="relative flex items-center gap-2 w-full py-2.5 px-3 rounded-md transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, hsl(200, 60%, 25%) 0%, hsl(210, 50%, 30%) 50%, hsl(220, 50%, 25%) 100%)',
              boxShadow: '0 0 15px hsl(200 60% 45% / 0.3), 0 0 30px hsl(210 50% 40% / 0.2)',
              border: '1px solid hsl(200, 50%, 50% / 0.4)'
            }}
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity"
              style={{
                background: 'linear-gradient(45deg, transparent 30%, hsl(200, 80%, 60%) 50%, transparent 70%)',
              }}
            />
            <img src={supporterIcon} alt="Supporter" className="w-5 h-5 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" style={{ filter: 'drop-shadow(0 0 4px hsl(200, 100%, 60%)) brightness(1.1) contrast(1.2)', mixBlendMode: 'screen' }} />
            <span className="font-mono text-xs font-medium uppercase tracking-wider relative z-10 transition-colors" style={{ color: 'hsl(200, 70%, 70%)' }}>
              Support
            </span>
          </button>
        )}
      </SheetTrigger>

      <SheetContent 
        side="left" 
        className="w-[380px] sm:w-[420px] p-0 border-r-2 bg-background z-50"
        style={{ 
          boxShadow: '4px 0 60px hsl(200 100% 50% / 0.4), 8px 0 100px hsl(200 100% 60% / 0.2)',
          borderColor: 'hsl(200, 100%, 60%)'
        }}
      >
        {/* Header with gradient accent */}
        <SheetHeader className="relative p-4 border-b border-primary/30 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: isSupporter 
                ? 'linear-gradient(135deg, hsl(280, 80%, 45%) 0%, hsl(320, 70%, 50%) 100%)'
                : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(200, 100%, 50%) 100%)'
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-md"
                style={{
                  background: isSupporter 
                    ? 'linear-gradient(135deg, hsl(280, 80%, 45%) 0%, hsl(320, 70%, 50%) 100%)'
                    : 'hsl(var(--primary) / 0.2)',
                  boxShadow: isSupporter 
                    ? '0 0 15px hsl(280 80% 50% / 0.5)'
                    : '0 0 15px hsl(var(--primary) / 0.3)'
                }}
              >
                {isSupporter ? (
                  <Crown className="w-5 h-5 text-amber-300" style={{ filter: 'drop-shadow(0 0 6px hsl(45, 100%, 50%))' }} />
                ) : (
                  <Heart className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
                  {isSupporter ? "Supporter Hub" : "Become a Supporter"}
                </SheetTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isSupporter ? "Your exclusive features" : "Unlock premium features"}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-85px)]">
          <div className="p-4 space-y-5">
            {/* Unlock CTA for non-supporters */}
            {!isSupporter && (
              <div 
                className="relative rounded-lg p-5 border-2 overflow-hidden"
                style={{
                  borderColor: 'hsl(200, 100%, 60%)',
                  background: 'linear-gradient(135deg, hsl(200, 100%, 50% / 0.05) 0%, hsl(220, 100%, 50% / 0.1) 100%)'
                }}
              >
                {/* Animated background glow */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{ 
                    background: 'radial-gradient(ellipse at 50% 0%, hsl(200, 100%, 65%) 0%, transparent 60%)',
                  }}
                />
                <div className="relative text-center">
                  <div 
                    className="inline-flex p-3 rounded-full mb-3"
                    style={{
                      background: 'linear-gradient(135deg, hsl(200, 100%, 55%) 0%, hsl(220, 100%, 60%) 100%)',
                      boxShadow: '0 0 30px hsl(200 100% 60% / 0.5)'
                    }}
                  >
                    <Unlock className="w-6 h-6 text-white" />
                  </div>
                  <h3 
                    className="font-mono text-base font-bold uppercase tracking-wider mb-2"
                    style={{ 
                      color: 'hsl(200, 100%, 70%)',
                      textShadow: '0 0 20px hsl(200 100% 60% / 0.6)'
                    }}
                  >
                    Unlock Everything
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-4 max-w-[260px] mx-auto leading-relaxed">
                    10 exclusive themes, AI Smart Paste, stickers, text widgets, and 5 active campaigns.
                  </p>
                  <Link 
                    to="/settings?tab=billing"
                    onClick={() => setOpen(false)}
                    className="inline-block"
                  >
                    <Button
                      className="font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 h-auto"
                      style={{
                        background: 'linear-gradient(135deg, hsl(200, 100%, 55%) 0%, hsl(220, 100%, 60%) 100%)',
                        boxShadow: '0 0 25px hsl(200 100% 60% / 0.5), 0 4px 15px hsl(220 100% 50% / 0.3)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Support — $2.99/mo
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions Section */}
            <div>
              <SectionDivider>Quick Actions</SectionDivider>
              <div className="space-y-2 mt-3">
                <FeatureItem
                  icon={<Sparkles className={cn("w-4 h-4", isLocked ? "text-muted-foreground/50" : "text-primary")} />}
                  title="AI Smart Paste"
                  description="Paste rules text and let AI structure it"
                  isLocked={isLocked}
                  onClick={() => {
                    onAddSmartPaste?.();
                    setOpen(false);
                  }}
                />
                <FeatureItem
                  icon={<Sticker className={cn("w-4 h-4", isLocked ? "text-muted-foreground/50" : "text-primary")} />}
                  title="Add Sticker"
                  description="Place visual markers on your dashboard"
                  isLocked={isLocked}
                  onClick={() => {
                    onAddSticker?.();
                    setOpen(false);
                  }}
                />
                <FeatureItem
                  icon={<Type className={cn("w-4 h-4", isLocked ? "text-muted-foreground/50" : "text-primary")} />}
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary/70" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dashboard Themes
                  </span>
                </div>
                {isLocked && (
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono uppercase">
                    <Lock className="w-2.5 h-2.5" />
                    Supporter Only
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
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
              <div 
                className="rounded-lg p-4 border overflow-hidden relative"
                style={{
                  borderColor: 'hsl(280, 60%, 50% / 0.3)',
                  background: 'linear-gradient(135deg, hsl(280, 60%, 50% / 0.05) 0%, hsl(320, 60%, 50% / 0.08) 100%)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px hsl(45, 100%, 50%))' }} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    Your Benefits
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>5 Active Campaigns</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>10 OS Themes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>AI Smart Paste</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>Text & Stickers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>Custom Banners</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>Priority Support</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Subscription Link */}
            {isSupporter && (
              <Link 
                to="/settings?tab=billing"
                onClick={() => setOpen(false)}
                className="block w-full"
              >
                <Button 
                  variant="outline" 
                  className="w-full font-mono text-[10px] uppercase tracking-wider border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                >
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
