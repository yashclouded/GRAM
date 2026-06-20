import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  createLocalAccount,
  getLocalAuthMetadata,
  isLocalAuthSupported,
  unlockLocalAccount,
  updateLocalAccount,
} from '../auth/localAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';
const supabaseEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseKey);

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [vaultKey, setVaultKey] = useState(null);
  const [localAccountMeta, setLocalAccountMeta] = useState({ exists: false });
  const [localAuthAvailable, setLocalAuthAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const localMetaRef = useRef({ exists: false });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    const bootstrap = async () => {
      setLocalAuthAvailable(isLocalAuthSupported());
      const metadata = await getLocalAuthMetadata().catch(() => ({ exists: false }));
      if (!cancelled) {
        setLocalAccountMeta(metadata);
        localMetaRef.current = metadata;
      }

      if (!supabaseEnabled) {
        if (!cancelled) {
          setAuthMode(metadata.exists ? 'local-locked' : null);
          setLoading(false);
        }
        return;
      }

      // Check active sessions and sets the user
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          setAuthMode('supabase');
          fetchProfile(session.user.id);
        } else {
          setAuthMode(metadata.exists ? 'local-locked' : null);
          setLoading(false);
        }
      });

      // Listen for changes on auth state (logged in, signed out, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          setAuthMode('supabase');
          setVaultKey(null);
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setVaultKey(null);
          setAuthMode(localMetaRef.current.exists ? 'local-locked' : null);
          setLoading(false);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    };
    bootstrap();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (authMode === 'local') {
      try {
        const result = await updateLocalAccount(vaultKey, updates);
        setUser(result.user);
        setProfile(result.profile);
        setLocalAccountMeta(result.metadata);
        localMetaRef.current = result.metadata;
        return;
      } catch (err) {
        console.error('Update local profile error:', err);
        throw err;
      }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, ...updates });
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  };

  const signUpLocal = async ({ name, phone, email, passphrase }) => {
    const result = await createLocalAccount({ name, phone, email, passphrase });
    setUser(result.user);
    setProfile(result.profile);
    setVaultKey(result.vaultKey);
    setAuthMode('local');
    setLocalAccountMeta(result.metadata);
    localMetaRef.current = result.metadata;
    return result;
  };

  const signInLocal = async ({ passphrase }) => {
    const result = await unlockLocalAccount(passphrase);
    setUser(result.user);
    setProfile(result.profile);
    setVaultKey(result.vaultKey);
    setAuthMode('local');
    setLocalAccountMeta(result.metadata);
    localMetaRef.current = result.metadata;
    return result;
  };

  const signOut = async () => {
    if (authMode === 'local') {
      setUser(null);
      setProfile(null);
      setVaultKey(null);
      setAuthMode(localMetaRef.current.exists ? 'local-locked' : null);
      return;
    }

    if (supabaseEnabled) {
      await supabase.auth.signOut();
    }
  };

  const value = {
    user,
    profile,
    updateProfile,
    loading,
    supabase,
    supabaseEnabled,
    authMode,
    vaultKey,
    signOut,
    signInLocal,
    signUpLocal,
    localAccountMeta,
    hasLocalAccount: localAccountMeta.exists,
    localAuthAvailable,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
