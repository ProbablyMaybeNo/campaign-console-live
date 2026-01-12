import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { toast } from "sonner";
import { Swords, X, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      toast.error(err.message || "Authentication failed");
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

      {/* Frame border */}
      <div className="absolute inset-4 border border-cyan-500/30 pointer-events-none" />
      <div className="absolute inset-6 border border-cyan-500/20 pointer-events-none" />

      {/* User icon in top right */}
      <div className="absolute top-8 right-8 p-3 border border-primary/40 text-primary">
        <UserPlus className="w-6 h-6" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Swords className="w-20 h-20 text-primary" strokeWidth={1} />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-widest text-primary italic">
            CAMPAIGN CONSOLE
          </h1>
        </div>

        {/* Login Card */}
        <div className="border border-primary/40 bg-card/80">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-primary/30 bg-primary/5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-foreground">
              {mode === "login" ? "System Login" : "Create Account"}
            </h2>
            <button className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Enter display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-input border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-input border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            {mode === "login" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground uppercase cursor-pointer">
                  Remember Me
                </label>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary/20 border border-primary text-primary py-2 text-sm font-mono uppercase tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <TerminalLoader text={mode === "login" ? "Authenticating" : "Creating"} size="sm" />
              ) : (
                mode === "login" ? "Login" : "Create Account"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="w-full text-xs text-primary hover:underline uppercase tracking-wider"
            >
              {mode === "login" ? "Create Account" : "Back to Login"}
            </button>

            {/* Version */}
            <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
              v0.9.21
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
