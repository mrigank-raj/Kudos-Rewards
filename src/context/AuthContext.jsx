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

  // Sign up: create auth user → reconcile profile row created by the
  // `handle_new_user` trigger.
  //
  // The trigger (see supabase/migrations/007_team_and_pending_members.sql)
  // fires synchronously when the auth user is created, before this
  // function continues — so a `users` row for this id already exists by
  // the time we get here. It's either a pending-member-aware row (correct
  // org/role/team already applied) or a generic recipient default. We
  // upsert only the fields we own client-side, so we never clobber a
  // pending-member assignment we can't see from here.
  const signUp = async ({ email, password, name, role, orgName }) => {
    // 1. Create the auth user (this also fires handle_new_user server-side)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('Sign up failed — no user ID returned.');

    if (role === 'admin') {
      // Admins always create a fresh organization — the trigger has no way
      // to know about it, so this upsert must override its defaults.
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName || `${name}'s Organization` })
        .select('id')
        .single();

      if (orgError) throw orgError;

      const { error: profileError } = await supabase
        .from('users')
        .upsert({ id: userId, email, name, role: 'admin', org_id: orgData.id }, { onConflict: 'id' });

      if (profileError) throw profileError;
    } else {
      // Recipients: leave org_id/role/team alone — the trigger already set
      // them correctly (from a pending invite, or the default org). Only
      // sync the display name, in case it differs from the trigger's
      // email-derived guess.
      const { error: profileError } = await supabase
        .from('users')
        .upsert({ id: userId, name }, { onConflict: 'id' });

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
