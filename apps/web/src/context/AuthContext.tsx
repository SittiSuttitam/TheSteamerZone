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

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** false = ไม่มีค่า env Supabase */
  supabaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const s = getSupabase();
  const supabaseConfigured = !!s;

  useEffect(() => {
    if (!s) {
      setLoading(false);
      return;
    }
    void s.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = s.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [s]);

  const signInWithGoogle = useCallback(async () => {
    if (!s) return;
    const redirect = `${window.location.origin}/app/connection`;
    await s.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect },
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
      supabaseConfigured,
      signInWithGoogle,
      signOut,
    }),
    [
      session,
      loading,
      supabaseConfigured,
      signInWithGoogle,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
