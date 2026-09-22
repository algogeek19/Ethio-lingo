import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/api';
import { storage } from '../services/storage';

const RoleContext = createContext();

const STORAGE_KEY_AUTH = 'birrend_auth_session';

export const RoleProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to persist session user state and access token asynchronously
  const saveAuthSession = async (userObj, token = '') => {
    setAuthUser(userObj);
    const existing = await storage.getItem(STORAGE_KEY_AUTH);
    let currentToken = token;
    if (!currentToken && existing) {
      try {
        const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing;
        currentToken = parsed.token;
      } catch {}
    }
    await storage.setItem(
      STORAGE_KEY_AUTH,
      { user: userObj, token: currentToken || '' }
    );
  };

  // Sync Supabase Auth state changes with backend & local state
  useEffect(() => {
    // 1. Initial Supabase Session Check
    const initSession = async () => {
      try {
        // Load initial local storage session first
        const saved = await storage.getItem(STORAGE_KEY_AUTH);
        if (saved) {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (parsed && parsed.user) {
            setAuthUser(parsed.user);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          await handleSessionUser(session.user, session.access_token);
        } else if (saved) {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (parsed && parsed.token) {
            const res = await api.getMe().catch(() => null);
            if (res && res.success && res.data) {
              await saveAuthSession(res.data, parsed.token);
            }
          }
        }
      } catch (err) {
        console.warn('Session init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Supabase Auth State Change Listener (handles OAuth redirects, token refreshes, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        await handleSessionUser(session.user, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        await storage.removeItem(STORAGE_KEY_AUTH);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSessionUser = async (sbUser, accessToken) => {
    const role = sbUser.user_metadata?.role || (sbUser.email?.includes('admin') ? 'admin' : 'learner');
    const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0];
    const level = sbUser.user_metadata?.level || 'Beginner I';
    const isFreeTrial = sbUser.user_metadata?.isFreeTrial !== false;

    const userObj = {
      id: sbUser.id,
      email: sbUser.email,
      name,
      role,
      level,
      isActive: isFreeTrial,
      status: isFreeTrial ? 'ACTIVE' : 'PENDING_APPROVAL',
    };

    await saveAuthSession(userObj, accessToken);

    // Clean up OAuth hash fragment from address bar if present
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Attempt to sync / fetch full DB record from Express server
    try {
      const res = await api.getMe();
      if (res && res.success && res.data) {
        await saveAuthSession(res.data, accessToken);
      }
    } catch {}
  };

  // 1. Primary Email & Password Sign In via Express API
  const login = async (email, password) => {
    try {
      // Clear all cached storage data to start completely fresh on login
      await storage.clear().catch(() => {});

      // 1. Primary attempt: Direct Express API authentication
      let res = null;
      try {
        res = await api.login(email, password);
      } catch (apiErr) {
        // Backend API error or offline fallback
      }

      if (res && res.success && res.data) {
        const { user, token } = res.data;
        await saveAuthSession(user, token);
        return { success: true, role: user.role, user };
      }

      // 2. Fallback: Direct Supabase Auth sign-in
      const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!sbErr && sbData && sbData.user) {
        await handleSessionUser(sbData.user, sbData.session?.access_token || '');
        const role = sbData.user.user_metadata?.role || (email.includes('admin') ? 'admin' : 'learner');
        return { success: true, role, user: sbData.user };
      }

      return { success: false, message: (res && res.message) || sbErr?.message || 'Login failed.' };
    } catch (err) {
      return { success: false, message: err.message || 'Authentication error.' };
    }
  };

  // 2. Email & Password Registration via Supabase with API Fallback
  const signup = async ({
    name,
    email,
    password,
    level = 'Beginner I',
    role = 'learner',
    isFreeTrial = true,
    phone,
    age,
    interests,
    listeningMinutesPerDay,
    listeningCategories,
  }) => {
    const basePayload = { name, email, password, level, role, isFreeTrial, phone, age, interests, listeningMinutesPerDay, listeningCategories };
    try {
      // 1. Attempt backend API direct registration first
      let apiRes = null;
      try {
        apiRes = await api.signup(basePayload);
      } catch (backendErr) {
        if (backendErr.message && backendErr.message.toLowerCase().includes('already exists')) {
          return {
            success: false,
            message: 'An account with this email address already exists. Please sign in instead.',
          };
        }
      }

      if (apiRes && apiRes.success && apiRes.data) {
        const { user, token } = apiRes.data;
        await saveAuthSession(user, token);

        // Synchronize with Supabase Auth in background (non-blocking)
        supabase.auth
          .signUp({
            email,
            password,
            options: { data: { name, role, level, isFreeTrial } },
          })
          .catch(() => null);

        return { success: true, role: user.role, user };
      }

      // 2. Fallback: Direct Supabase Auth signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, level, isFreeTrial },
        },
      });

      if (error) {
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.toLowerCase().includes('rate limit')) ||
          (error.message && error.message.toLowerCase().includes('too many requests'));

        const userMsg = isRateLimit
          ? 'Too many registration attempts (Supabase rate limit). Please try signing in if you already created an account, or try again in a few minutes.'
          : error.message && error.message.toLowerCase().includes('already registered')
          ? 'An account with this email address already exists. Please sign in instead.'
          : error.message || 'Registration failed.';

        return { success: false, message: userMsg };
      }

      if (data.user) {
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          name,
          role,
          level,
          isActive: isFreeTrial,
          status: isFreeTrial ? 'ACTIVE' : 'PENDING_APPROVAL',
        };
        await saveAuthSession(userObj, data.session?.access_token || '');

        // Sync with backend API silently
        await api.signup(basePayload).catch(() => null);

        return { success: true, role, user: userObj };
      }

      return { success: false, message: 'Account creation failed.' };
    } catch (err) {
      const isRateLimit =
        err.status === 429 ||
        (err.message && err.message.toLowerCase().includes('rate limit')) ||
        (err.message && err.message.toLowerCase().includes('too many requests'));

      const msg = isRateLimit
        ? 'Too many registration attempts. Please try signing in or wait a few minutes.'
        : err.message || 'Registration error.';

      return { success: false, message: msg };
    }
  };

  // 4. Update Profile
  const updateUserProfile = async (updates) => {
    if (!authUser) return;
    const updated = { ...authUser, ...updates };
    saveAuthSession(updated);
    try {
      await api.updateProfile(updates);
    } catch (err) {
      console.error('Failed to sync profile update to server:', err);
    }
  };

  // 5. Refresh User
  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res && res.success && res.data) {
        saveAuthSession(res.data);
        return res.data;
      }
    } catch {}
    return authUser;
  };

  // 6. Sign Out
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setAuthUser(null);
    await storage.clear().catch(() => {});
  };

  const isAuthenticated = !!authUser;
  const role = authUser ? authUser.role : null;

  return (
    <RoleContext.Provider
      value={{
        authUser,
        role,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        updateUserProfile,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
