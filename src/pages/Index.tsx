import { Link } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useAuth } from "@/hooks/useAuth";
import headerImage from "@/assets/campaign-console-header.png";

export default function Index() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Radial gradient overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)'
        }}
      />

      <header className="text-center space-y-2 relative z-10">
        <div className="flex justify-center -mb-10">
          <img 
            src={headerImage} 
            alt="Campaign Console — Wargame Campaign Manager" 
            className="w-full max-w-2xl h-auto drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-lg text-white uppercase tracking-wider text-glow-white">
            Tabletop Campaign Tracker for Wargames &amp; RPGs
          </h1>
          <p className="text-xs text-white/90 font-mono text-glow-white animate-pulse">
            BOOT: CAMPAIGN OPTIMIZATION — INITIALIZING...
          </p>
        </div>

        <section className="space-y-2 pt-2" aria-label="Features">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A free, rules-agnostic campaign hub built for tabletop games. Track rounds and battles, organize players and warbands, manage maps and schedules, and publish rules and narrative updates to your group.
          </p>
        </section>

        <nav className="flex flex-col sm:flex-row gap-4 justify-center pt-6" aria-label="Primary">
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
        </nav>

        <footer className="pt-10 text-xs text-foreground/80 space-y-1">
          <p>[ System Status: <span className="text-primary text-glow-primary">ONLINE</span> ]</p>
          <p className="text-muted-foreground">v1.0.0 - Powered by Lovable Cloud</p>
        </footer>
      </header>
    </main>
  );
}
