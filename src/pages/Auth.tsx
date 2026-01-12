import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { toast } from "sonner";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Access granted");
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) throw error;
        toast.success("Account created - access granted");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-widest text-primary text-glow-primary">
            CAMPAIGN CONSOLE
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            // Wargame Campaign Tracker v1.0
          </p>
        </div>

        {/* Auth Card */}
        <TerminalCard title={mode === "login" ? "System Access" : "Register Operative"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <TerminalInput
                label="Callsign"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}
            
            <TerminalInput
              label="Email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <TerminalInput
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <TerminalButton type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <TerminalLoader text={mode === "login" ? "Authenticating" : "Registering"} size="sm" />
              ) : (
                mode === "login" ? ">> Login" : ">> Create Account"
              )}
            </TerminalButton>
          </form>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login" 
                ? "[ No account? Register here ]" 
                : "[ Have an account? Login here ]"}
            </button>
          </div>
        </TerminalCard>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          <span className="text-primary">{">"}</span> Secure connection established
        </p>
      </div>
    </div>
  );
}
