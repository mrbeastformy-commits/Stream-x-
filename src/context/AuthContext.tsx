import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isAuthorizedOwner, AUTHORIZED_OWNER_EMAILS } from '../services/firebase';
import { UserProfile } from '../types';
import { subscribeUserProfile } from '../services/mediaService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isOwner: boolean;
  isPremium: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  authorizedEmails: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isOwner: false,
  isPremium: false,
  loading: true,
  authError: null,
  signInWithGoogle: async () => false,
  loginWithEmail: async () => false,
  registerWithEmail: async () => false,
  logout: async () => {},
  clearAuthError: () => {},
  authorizedEmails: AUTHORIZED_OWNER_EMAILS
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Immediately unsubscribe any prior user profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(currentUser);

      if (currentUser) {
        const authorized = isAuthorizedOwner(currentUser.email);
        setIsOwner(authorized);

        // Ensure user document exists in firestore
        try {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'STREAMX Viewer',
              photoURL: currentUser.photoURL || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Could not sync user profile', e);
        }

        // Subscribe to user profile (for isPremium state)
        unsubProfile = subscribeUserProfile(currentUser.uid, (profile) => {
          setUserProfile(profile);
        });
      } else {
        setIsOwner(false);
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
    };
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);

      // Force account selector every time so user manually chooses account
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email;
      setIsOwner(isAuthorizedOwner(email));
      return true;
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      setAuthError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setIsOwner(isAuthorizedOwner(cred.user.email));
      return true;
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setAuthError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        displayName: name.trim() || 'STREAMX Member',
        isPremium: false,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      setIsOwner(isAuthorizedOwner(cred.user.email));
      return true;
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your credentials.';
      setAuthError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsOwner(false);
      setAuthError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const clearAuthError = () => setAuthError(null);

  // Check if premium is active and not expired
  const isPremium = Boolean(
    userProfile?.isPremium &&
    (!userProfile.premiumExpiresAt || new Date(userProfile.premiumExpiresAt).getTime() > Date.now())
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isOwner,
        isPremium,
        loading,
        authError,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        clearAuthError,
        authorizedEmails: AUTHORIZED_OWNER_EMAILS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
