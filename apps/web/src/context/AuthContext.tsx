import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { oauthRedirectPath } from '../lib/appUrl';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  supabaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const SESSION_TIMEOUT_MS = 10_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const s = getSupabase();
  const supabaseConfigured = !!s;

  useEffect(() => {
    if (!s) {
      setLoading(false);
      return;
    }

    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(finish, SESSION_TIMEOUT_MS);

    void s.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setAuthError(error.message);
        setSession(data.session ?? null);
        finish();
      })
      .catch((e: unknown) => {
        setAuthError(e instanceof Error ? e.message : String(e));
        finish();
      });

    const { data: sub } = s.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      finish();
    });

    return () => {
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [s]);

  const signInWithGoogle = useCallback(async () => {
    if (!s) return;
    await s.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectPath() },
    });
  }, [s]);

  const signOut = useCallback(async () => {
    if (!s) return;
    await s.auth.signOut();
  }, [s]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      authError,
      supabaseConfigured,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, authError, supabaseConfigured, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
