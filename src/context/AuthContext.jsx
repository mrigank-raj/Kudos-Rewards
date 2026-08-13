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

  // Sign up: create auth user → insert profile into `users` table
  const signUp = async ({ email, password, name, role, orgName }) => {
    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('Sign up failed — no user ID returned.');

    // 2. Create or find the organization
    let orgId = null;
    if (role === 'admin') {
      // Admin creates a new organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName || `${name}'s Organization` })
        .select('id')
        .single();

      if (orgError) throw orgError;
      orgId = orgData.id;
    }
    // Recipients will join an org later (or be assigned by an admin)

    // 3. Insert the profile row
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email,
      name,
      role,
      org_id: orgId,
      points_balance: 0,
    });

    if (profileError) throw profileError;

    // 4. Fetch the newly created profile
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
