import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  token: string | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Sync profile with backend PostgreSQL
  const syncProfile = async (authToken: string, fbUser: FirebaseUser | null, isDemo = false) => {
    try {
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          displayName: fbUser?.displayName || (isDemo ? 'Liezl Maigue (Demo Operator)' : 'Farm Operator'),
          photoUrl: fbUser?.photoURL || null,
        }),
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (err) {
      console.warn('Failed to sync profile with PostgreSQL:', err);
    }
  };

  useEffect(() => {
    // Check if session stored a demo token
    const storedDemoToken = sessionStorage.getItem('HQ16_DEMO_TOKEN');
    if (storedDemoToken) {
      setToken(storedDemoToken);
      setIsDemoUser(true);
      syncProfile(storedDemoToken, null, true).finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setUser(firebaseUser);
          setToken(idToken);
          setIsDemoUser(false);
          await syncProfile(idToken, firebaseUser, false);
        } catch (err) {
          console.error('Error getting Firebase ID token:', err);
        }
      } else {
        setUser(null);
        setToken(null);
        setUserProfile(null);
        setIsDemoUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      sessionStorage.removeItem('HQ16_DEMO_TOKEN');
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      setIsDemoUser(false);
      await syncProfile(idToken, result.user, false);
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = async () => {
    setLoading(true);
    const demoToken = 'DEMO_USER_TOKEN:demo-operator-bicol-' + Date.now();
    sessionStorage.setItem('HQ16_DEMO_TOKEN', demoToken);
    setToken(demoToken);
    setIsDemoUser(true);
    setUser({
      uid: 'demo-operator-bicol',
      email: 'demo-farmer@hq16agrilabs.ph',
      displayName: 'Liezl Maigue (Demo Farm Operator)',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => demoToken,
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'demo',
    } as unknown as FirebaseUser);

    await syncProfile(demoToken, null, true);
    setLoading(false);
  };

  const signOut = async () => {
    sessionStorage.removeItem('HQ16_DEMO_TOKEN');
    setIsDemoUser(false);
    setUser(null);
    setToken(null);
    setUserProfile(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await syncProfile(token, user, isDemoUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        token,
        loading,
        isDemoUser,
        signInWithGoogle,
        signInAsDemo,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
