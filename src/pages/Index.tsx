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

      <div className="text-center space-y-2 relative z-10">
        {/* Header Image */}
        <div className="flex justify-center -mb-4">
          <img 
            src={headerImage} 
            alt="Campaign Console" 
            className="w-full max-w-2xl h-auto"
          />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg text-foreground uppercase tracking-wider">
            Wargame Campaign Tracker
          </p>
          <div className="text-xs text-foreground/80 font-mono">
            // GM-First · Rules-Aware · Infinite Whiteboard
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link to="/campaigns">
              <TerminalButton size="lg">
                {">> Enter Console"}
              </TerminalButton>
            </Link>
          ) : (
            <Link to="/auth">
              <TerminalButton size="lg">
                {">> Access System"}
              </TerminalButton>
            </Link>
          )}
        </div>

        <div className="pt-8 text-xs text-foreground/80 space-y-1">
          <p>[ System Status: <span className="text-primary">ONLINE</span> ]</p>
          <p>v1.0.0 - Powered by Lovable Cloud</p>
        </div>
      </div>
    </div>
  );
}
