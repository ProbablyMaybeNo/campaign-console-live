import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthStorage = () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
      if (projectId) {
        // supabase-js v2 default storage key
        const base = `sb-${projectId}-auth-token`;
        localStorage.removeItem(base);
        localStorage.removeItem(`${base}-code-verifier`);
      }

      // Fallback: remove any supabase auth keys (covers older/newer key variants)
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.includes("auth-token")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    // 1) Best-effort local signout (no network required)
    const { error } = await supabase.auth.signOut({ scope: "local" });

    // 2) Force-clear any persisted auth tokens (helps on id-preview domains / stale sessions)
    clearAuthStorage();

    // 3) Clear hook state
    setUser(null);
    setSession(null);

    // 4) Force navigation so ProtectedRoute/AuthRoute can't bounce back
    window.location.assign("/auth");

    return { error };
  };

  return { user, session, loading, signIn, signUp, signOut };
}
