import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, hasFirebaseConfig } from '../lib/firebase';

function toFriendlyAuthError(error) {
  const code = error?.code || '';

  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'Invalid credentials. Please verify your email and password.';
  }

  if (code.includes('user-not-found')) {
    return 'No account found with this email address.';
  }

  if (code.includes('email-already-in-use')) {
    return 'An account already exists with this email address.';
  }

  if (code.includes('weak-password')) {
    return 'Password should be at least 6 characters long.';
  }

  if (code.includes('popup-closed-by-user')) {
    return 'Google sign-in was cancelled before completion.';
  }

  if (code.includes('network-request-failed')) {
    return 'Network error while contacting Firebase. Check your connection.';
  }

  return error?.message || 'Authentication request failed.';
}

export function useAurixaAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError('');
  }, []);

  const ensureConfigured = useCallback(() => {
    if (!hasFirebaseConfig || !auth) {
      throw new Error(
        'Firebase is not configured. Add Firebase values to your .env file and restart the dev server.'
      );
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    clearAuthError();

    try {
      ensureConfigured();
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      const friendly = toFriendlyAuthError(error);
      setAuthError(friendly);
      return false;
    }
  }, [clearAuthError, ensureConfigured]);

  const signUpWithEmail = useCallback(async ({ name, email, password }) => {
    clearAuthError();

    try {
      ensureConfigured();
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name && credential.user) {
        await updateProfile(credential.user, {
          displayName: name,
        });
      }
      return true;
    } catch (error) {
      const friendly = toFriendlyAuthError(error);
      setAuthError(friendly);
      return false;
    }
  }, [clearAuthError, ensureConfigured]);

  const signInWithGoogle = useCallback(async () => {
    clearAuthError();

    try {
      ensureConfigured();
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error) {
      const friendly = toFriendlyAuthError(error);
      setAuthError(friendly);
      return false;
    }
  }, [clearAuthError, ensureConfigured]);

  const signOutUser = useCallback(async () => {
    clearAuthError();

    try {
      ensureConfigured();
      await signOut(auth);
      return true;
    } catch (error) {
      const friendly = toFriendlyAuthError(error);
      setAuthError(friendly);
      return false;
    }
  }, [clearAuthError, ensureConfigured]);

  return useMemo(
    () => ({
      user,
      loading,
      authError,
      isConfigured: hasFirebaseConfig,
      clearAuthError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOutUser,
    }),
    [
      user,
      loading,
      authError,
      clearAuthError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOutUser,
    ]
  );
}
