import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { toast } from "sonner";
import { X, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import headerImage from "@/assets/campaign-console-header.png";

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

      {/* Frame border - neon green matching dashboard */}
      <div className="absolute inset-4 border border-primary/40 pointer-events-none shadow-[0_0_15px_hsl(var(--primary)/0.15)]" />
      <div className="absolute inset-6 border border-primary/25 pointer-events-none" />

      {/* User icon in top right */}
      <div className="absolute top-8 right-8 p-3 border border-primary/50 text-primary glow-primary">
        <UserPlus className="w-6 h-6" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Image */}
        <div className="flex justify-center">
          <img 
            src={headerImage} 
            alt="Campaign Console" 
            className="w-full max-w-sm h-auto"
          />
        </div>

        {/* Login Card */}
        <div className="border border-primary/50 bg-card/80 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-primary/30 bg-primary/5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-primary text-glow-primary">
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
                <label className="text-xs uppercase tracking-wider text-primary/80">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Enter display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-input border border-primary/30 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/70 focus:shadow-[0_0_8px_hsl(var(--primary)/0.2)] transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-primary/80">
                Username
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-input border border-primary/30 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/70 focus:shadow-[0_0_8px_hsl(var(--primary)/0.2)] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-primary/80">
                Password
              </label>
              <input
                type="password"
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-input border border-primary/30 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/70 focus:shadow-[0_0_8px_hsl(var(--primary)/0.2)] transition-all"
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
              className="w-full bg-primary/20 border border-primary text-primary py-2 text-sm font-mono uppercase tracking-wider hover:bg-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)] transition-all disabled:opacity-50 text-glow-primary"
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
              className="w-full text-xs text-primary hover:underline uppercase tracking-wider text-glow-primary"
            >
              {mode === "login" ? "Create Account" : "Back to Login"}
            </button>

            {/* Version */}
            <p className="text-center text-xs text-muted-foreground pt-2 border-t border-primary/20">
              v0.9.21
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
