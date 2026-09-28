import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  role: 'super_admin' | 'admin' | 'user';
  collectif_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  acceptInvite: (newPassword: string) => Promise<void>;
  actingCollectifId: string | null;
  enterCollectif: (collectifId: string) => void;
  exitCollectif: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingCollectifId, setActingCollectifId] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('role, collectif_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data ?? null);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session);
    }).catch((error) => {
      console.error('Error getting session:', error);
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      resolveSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setActingCollectifId(null);
  };

  const acceptInvite = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const enterCollectif = (collectifId: string) => setActingCollectifId(collectifId);
  const exitCollectif = () => setActingCollectifId(null);

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    acceptInvite,
    actingCollectifId,
    enterCollectif,
    exitCollectif,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
