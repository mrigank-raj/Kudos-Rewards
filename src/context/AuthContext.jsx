import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile from the `users` table
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, organizations(name)')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // HR removed this person (migration 019). Their login is already
      // blocked server-side; drop the local session too.
      if (data.removed_at) {
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setProfile(null);
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      setProfile(null);
      return null;
    }
  }, []);

  // Listen for auth state changes (login, logout, token refresh, multi-tab sync)
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Re-fetch profile on token refresh to stay in sync
          await fetchProfile(newSession.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Re-check on tab focus so someone HR removes mid-session is signed out
  // when they come back to the tab, not only on the next hard refresh.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const onFocus = () => fetchProfile(userId);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session?.user?.id, fetchProfile]);

  // Sign up: create auth user → reconcile profile row created by the
  // `handle_new_user` trigger.
  //
  // The trigger (see supabase/migrations/018_kiit_portal.sql) fires
  // synchronously when the auth user is created and rejects any email HR
  // hasn't invited, so a `users` row with the invited org/role/team
  // already exists by the time we get here. We update only the fields we
  // own client-side.
  const signUp = async ({ email, password, name }) => {
    // 1. Create the auth user (this also fires handle_new_user server-side,
    //    which reads full_name from the metadata for the profile name)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('Sign up failed — no user ID returned.');

    // Role/org/team come from the HR invite via the handle_new_user trigger
    // (migration 018). Only sync the display name. An update, not an
    // upsert: an upsert sends a partial row that fails the users.email NOT
    // NULL check. With email confirmation on there's no session yet and
    // the full_name metadata above already covers it.
    if (authData.session) {
      const { error: profileError } = await supabase
        .from('users')
        .update({ name })
        .eq('id', userId);

      if (profileError) throw profileError;
    }

    // 2. Fetch the reconciled profile
    const profileData = await fetchProfile(userId);
    return { user: authData.user, profile: profileData };
  };

  // Sign in with email + password
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const profileData = await fetchProfile(data.user.id);
    return { user: data.user, profile: profileData };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile: () => {
      if (session?.user?.id) fetchProfile(session.user.id);
    },
    isAuthenticated: !!session?.user,
    isAdmin: profile?.role === 'admin',
    isRecipient: profile?.role === 'recipient',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
