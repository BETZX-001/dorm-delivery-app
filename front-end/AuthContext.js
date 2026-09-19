// src/context/AuthContext.js
import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushNotifications } from './notificationService';

const AuthContext = createContext(null);
const ADMIN_EMAILS = new Set(['6710210025@psu.ac.th']);

function settleWithin(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase connection timed out')), timeoutMs)),
  ]);
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // MySQL Users row
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [unreadByOrder, setUnreadByOrder] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [systemRevision, setSystemRevision] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!auth.currentUser?.emailVerified) {
      setUnreadByOrder({});
      setUnreadTotal(0);
      return;
    }
    try {
      const result = await api.get('/api/chats/unread');
      setUnreadByOrder(result.by_order || {});
      setUnreadTotal(Number(result.total || 0));
    } catch (error) {
      console.log('Unread chat refresh skipped:', error.message);
    }
  }, []);

  useEffect(() => {
    // The verification link is opened outside the app, so reload once when
    // the signed-in session is restored. onAuthStateChanged is intentional:
    // onIdTokenChanged plus reload/getIdToken caused an infinite callback loop.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // A restored, already-verified session does not need a network reload.
      // Reload only while waiting for an email-verification state change.
      if (user && !user.emailVerified) {
        try {
          await settleWithin(user.reload(), 10_000);
          user = auth.currentUser;
        } catch (err) {
          // Keep the signed-in session usable if a temporary network failure
          // prevents a refresh; the next token update will retry.
          console.log('⚠️ Could not refresh Firebase user:', err.message);
        }
      }

      console.log('🔥 AUTH STATE CHANGED:', user?.uid, 'verified:', user?.emailVerified);
      setFirebaseUser(user);
      // Routing only depends on Firebase Auth. Do not keep the whole app behind
      // a spinner while the Firestore-backed profile is fetched.
      setInitializing(false);

      if (user && user.emailVerified) {
        setLoadingProfile(true);
        try {
          const { user: dbUser } = await api.getCached('/api/users/me');
          console.log('✅ profile loaded:', dbUser);
          setProfile(dbUser);
        } catch (err) {
          console.log('❌ profile fetch failed, checking pending sync:', err.message);
          try {
            const pending = await AsyncStorage.getItem('pendingProfile');
            if (pending) {
              const payload = JSON.parse(pending);
              const pendingEmail = payload.email?.trim().toLowerCase();
              const signedInEmail = user.email?.trim().toLowerCase();
              if (pendingEmail && pendingEmail !== signedInEmail) {
                throw new Error('ข้อมูลสมัครสมาชิกเป็นของบัญชีอื่น');
              }
              const { email: _pendingEmail, ...profilePayload } = payload;
              await api.post('/api/users/sync', profilePayload);
              const { user: dbUser } = await api.get('/api/users/me');
              console.log('✅ profile synced + loaded:', dbUser);
              setProfile(dbUser);
              await AsyncStorage.removeItem('pendingProfile');
            } else {
              console.log('⚠️ no pendingProfile found — needs manual onboarding');
              setProfile(null);
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

      console.log('🔥 initializing -> false');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser?.emailVerified) return;
    registerPushNotifications().catch((error) => console.log('Push registration skipped:', error.message));
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  useEffect(() => {
    if (!firebaseUser?.emailVerified) {
      setUnreadByOrder({});
      setUnreadTotal(0);
      return undefined;
    }
    refreshUnread();
    const timer = setInterval(refreshUnread, 20_000);
    return () => clearInterval(timer);
  }, [firebaseUser?.uid, firebaseUser?.emailVerified, refreshUnread]);

  useEffect(() => {
    if (!firebaseUser?.emailVerified) return undefined;
    let active = true;
    const checkRevision = async () => {
      try {
        const result = await api.get('/api/events/revision');
        if (active) setSystemRevision((current) => current === result.revision ? current : result.revision);
      } catch { /* retain the last working screen state while offline */ }
    };
    checkRevision();
    const timer = setInterval(checkRevision, 1_500);
    return () => { active = false; clearInterval(timer); };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Local, instantly-toggleable role for the current session.
  // Persisted to the backend via switchRole so it's remembered next login.
  const [activeRole, setActiveRole] = useState('REQUESTER');

  useEffect(() => {
    AsyncStorage.getItem('activeRole').then((saved) => {
      if (saved === 'RUNNER' || saved === 'REQUESTER') setActiveRole(saved);
    });
  }, []);

  async function switchRole(nextRole) {
    if (!['RUNNER', 'REQUESTER'].includes(nextRole)) return;
    setActiveRole(nextRole);
    await AsyncStorage.setItem('activeRole', nextRole);
    api.patch('/api/users/role', { role: nextRole })
      .then(({ user: updated }) => setProfile(updated))
      .catch((error) => console.log('Role sync deferred:', error.message));
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
      refreshUnread,
      unreadByOrder,
      unreadTotal,
      systemRevision,
      isAdmin: ADMIN_EMAILS.has(firebaseUser?.email?.toLowerCase()),
      isAuthenticated: !!firebaseUser && firebaseUser.emailVerified,
    }),
    [firebaseUser, profile, initializing, loadingProfile, activeRole, refreshUnread, unreadByOrder, unreadTotal, systemRevision]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
