// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // MySQL Users row
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log('🔥 AUTH STATE CHANGED:', user?.uid, 'verified:', user?.emailVerified);
    setFirebaseUser(user);

        if (user && user.emailVerified) {
      setLoadingProfile(true);
      try {
        const { user: dbUser } = await api.get('/api/users/me');
        console.log('✅ profile loaded:', dbUser);
        setProfile(dbUser);
      } catch (err) {
        console.log('❌ profile fetch failed, checking pending sync:', err.message);
        try {
          const pending = await AsyncStorage.getItem('pendingProfile');
          if (pending) {
            const payload = JSON.parse(pending);
            await api.post('/api/users/sync', payload);
            const { user: dbUser } = await api.get('/api/users/me');
            console.log('✅ profile synced + loaded:', dbUser);
            setProfile(dbUser);
            await AsyncStorage.removeItem('pendingProfile');
          } else {
          console.log('⚠️ no pendingProfile found — needs manual onboarding');
          setProfile(null);
          setNeedsOnboarding(true);   // ค่าใหม่ที่ RootNavigator เช็คแทน
          }
        } catch (syncErr) {
          console.log('❌ retry sync failed:', syncErr.message);
          setProfile(null);
        }
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setProfile(null);
    }

    setInitializing(false);
    console.log('🔥 initializing -> false');
  });

    return unsubscribe;
  }, []);

  // Local, instantly-toggleable role for the current session.
  // Persisted to the backend via switchRole so it's remembered next login.
  const [activeRole, setActiveRole] = useState('REQUESTER');

  useEffect(() => {
    if (profile?.role) {
      setActiveRole(profile.role);
    }
  }, [profile]);

  async function switchRole(nextRole) {
    setActiveRole(nextRole); // optimistic UI update
    try {
      const { user: updated } = await api.patch('/api/users/role', { role: nextRole });
      setProfile(updated);
    } catch (err) {
      // Revert on failure
      setActiveRole(profile?.role || 'REQUESTER');
      throw err;
    }
  }

  async function refreshProfile() {
    const { user: dbUser } = await api.get('/api/users/me');
    setProfile(dbUser);
    return dbUser;
  }

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      initializing,
      loadingProfile,
      activeRole,
      switchRole,
      refreshProfile,
      isAuthenticated: !!firebaseUser && firebaseUser.emailVerified,
    }),
    [firebaseUser, profile, initializing, loadingProfile, activeRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
