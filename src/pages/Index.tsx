import { Link } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useAuth } from "@/hooks/useAuth";
import headerImage from "@/assets/campaign-console-header.png";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Radial gradient overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)'
        }}
      />

      <div className="text-center space-y-2 relative z-10">
        {/* Header Image with glow */}
        <div className="flex justify-center -mb-10">
          <img 
            src={headerImage} 
            alt="Campaign Console" 
            className="w-full max-w-2xl h-auto drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
          />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg text-white uppercase tracking-wider text-glow-white">
            Table Top Campaign Tracker
          </p>
          <div className="text-xs text-white/90 font-mono text-glow-white animate-pulse">
            BOOT: CAMPAIGN OPTIMIZATION — INITIALIZING...
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          {user ? (
            <Link to="/campaigns">
              <TerminalButton size="lg" className="hover-glow-primary transition-all duration-200 hover:scale-105 active:scale-95">
                Enter Console
              </TerminalButton>
            </Link>
          ) : (
            <Link to="/auth">
              <TerminalButton size="lg" className="hover-glow-primary transition-all duration-200 hover:scale-105 active:scale-95">
                Access System
              </TerminalButton>
            </Link>
          )}
        </div>

        <div className="pt-10 text-xs text-foreground/80 space-y-1">
          <p>[ System Status: <span className="text-primary text-glow-primary">ONLINE</span> ]</p>
          <p className="text-muted-foreground">v1.0.0 - Powered by Lovable Cloud</p>
        </div>
      </div>
    </div>
  );
}
