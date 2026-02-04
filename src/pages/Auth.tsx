import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TerminalLoader } from "@/components/ui/TerminalLoader";
import { toast } from "sonner";
import { X, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import headerImage from "@/assets/campaign-console-header.png";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Password reset email sent");
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Access granted");
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) throw error;
        toast.success("Account created - access granted");
        // After successful signup, sign in automatically and redirect
        const { error: signInError } = await signIn(email, password);
        if (!signInError) {
          navigate("/campaigns");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Shared button styles to match Google button
  const authButtonClass = "w-full flex items-center justify-center gap-2 bg-card border border-primary/30 py-2.5 text-sm font-mono uppercase tracking-wider hover:bg-primary/10 hover:border-primary/50 transition-all disabled:opacity-50";

  const getTitle = () => {
    if (mode === "forgot") return "Reset Password";
    if (mode === "signup") return "Create Account";
    return "System Login";
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
              {getTitle()}
            </h2>
            <button className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Forgot Password - Success State */}
            {mode === "forgot" && resetSent ? (
              <div className="space-y-4 text-center">
                <div className="p-4 border border-primary/30 bg-primary/5">
                  <p className="text-sm text-foreground">
                    Check your email for a password reset link.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    If you don't see it, check your spam folder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setResetSent(false);
                    setError(null);
                  }}
                  className={authButtonClass}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </div>
            ) : (
              <>
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
                    {mode === "forgot" ? "Email Address" : "Username"}
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

                {mode !== "forgot" && (
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
                      minLength={6}
                      className="w-full bg-input border border-primary/30 px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/70 focus:shadow-[0_0_8px_hsl(var(--primary)/0.2)] transition-all"
                    />
                    {mode === "signup" && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Must be 6+ characters with uppercase, lowercase, and a number
                      </p>
                    )}
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex items-center justify-between">
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
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="text-xs text-primary/70 hover:text-primary hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {mode === "forgot" && (
                  <p className="text-xs text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                )}

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

                {/* Main action button - matches Google button style */}
                <button
                  type="submit"
                  disabled={loading}
                  className={authButtonClass}
                >
                  {loading ? (
                    <TerminalLoader text={mode === "forgot" ? "Sending" : mode === "login" ? "Authenticating" : "Creating"} size="sm" />
                  ) : (
                    mode === "forgot" ? "Send Reset Link" : mode === "login" ? "Login" : "Create Account"
                  )}
                </button>

                {/* Toggle mode button - matches Google button style */}
                {mode === "forgot" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className={authButtonClass}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setError(null);
                    }}
                    className={authButtonClass}
                  >
                    {mode === "login" ? "Create Account" : "Back to Login"}
                  </button>
                )}

                {/* Divider - hide on forgot mode */}
                {mode !== "forgot" && (
                  <>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-primary/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    {/* Google Sign-in */}
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        setError(null);
                        try {
                          const { error } = await lovable.auth.signInWithOAuth("google", {
                            redirect_uri: window.location.origin,
                          });
                          if (error) throw error;
                        } catch (err: any) {
                          setError(err.message || "Google sign-in failed");
                          toast.error(err.message || "Google sign-in failed");
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className={authButtonClass}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}

                {/* Version */}
                <p className="text-center text-xs text-muted-foreground pt-2 border-t border-primary/20">
                  v0.9.21
                </p>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}