import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Restore session from local storage and refresh the full profile from the backend
  useEffect(() => {
    const initSession = async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY_AUTH);
        if (saved) {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (parsed && parsed.user) {
            setAuthUser(parsed.user);
          }
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
  }, []);

  // Sign In via the Express API
  const login = async (email, password) => {
    try {
      // Clear all cached storage data to start completely fresh on login
      await storage.clear().catch(() => {});

      const res = await api.login(email, password);

      if (res && res.success && res.data) {
        const { user, token } = res.data;
        await saveAuthSession(user, token);
        return { success: true, role: user.role, user };
      }

      return { success: false, message: (res && res.message) || 'Login failed.' };
    } catch (err) {
      return { success: false, message: err.message || 'Authentication error.' };
    }
  };

  // Register via the Express API
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
    const basePayload = {
      name,
      email,
      password,
      level,
      role,
      isFreeTrial,
      phone,
      age,
      interests,
      listeningMinutesPerDay,
      listeningCategories,
    };
    try {
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
        throw backendErr;
      }

      if (apiRes && apiRes.success && apiRes.data) {
        const { user, token } = apiRes.data;
        await saveAuthSession(user, token);
        return {
          success: true,
          role: user.role,
          user,
          // Verification payload from the server (debugCode surfaced in dev builds)
          verification: apiRes.data.verification || null,
        };
      }

      return { success: false, message: (apiRes && apiRes.message) || 'Account creation failed.' };
    } catch (err) {
      return { success: false, message: err.message || 'Registration error.' };
    }
  };

  // Sign In / Sign Up via a Google ID token (Google identity services)
  const googleLogin = async (idToken) => {
    try {
      await storage.clear().catch(() => {});

      const res = await api.googleLogin(idToken);

      if (res && res.success && res.data) {
        const { user, token } = res.data;
        await saveAuthSession(user, token);
        return {
          success: true,
          role: user.role,
          user,
          isNewUser: !!res.data.isNewUser,
        };
      }

      return { success: false, message: (res && res.message) || 'Google sign-in failed.' };
    } catch (err) {
      return { success: false, message: err.message || 'Google sign-in error.' };
    }
  };

  // Update Profile
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

  // Refresh User
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

  // Sign Out
  const logout = async () => {
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
        googleLogin,
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