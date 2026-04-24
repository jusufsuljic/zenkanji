import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const createAuth = () => {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
};

export const auth = createAuth();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let activeGoogleSignIn: Promise<User | null> | null = null;
let redirectResultPromise: Promise<User | null> | null = null;

const isEmbeddedBrowser = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isMobileBrowser = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const shouldPreferRedirectSignIn = () => isEmbeddedBrowser() || isMobileBrowser();

const getErrorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';

const shouldRetryWithRedirect = (error: unknown, popupStartedAt: number) => {
  const code = getErrorCode(error);

  if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
    return true;
  }

  return code === 'auth/popup-closed-by-user' && Date.now() - popupStartedAt < 1500;
};

const startGoogleRedirectSignIn = async () => {
  await signInWithRedirect(auth, googleProvider);
  return null;
};

export const signInWithGoogle = async () => {
  if (activeGoogleSignIn) {
    return activeGoogleSignIn;
  }

  activeGoogleSignIn = (async () => {
    if (shouldPreferRedirectSignIn()) {
      return startGoogleRedirectSignIn();
    }

    const popupStartedAt = Date.now();

    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      if (shouldRetryWithRedirect(error, popupStartedAt)) {
        return startGoogleRedirectSignIn();
      }

      console.error('Error signing in with Google', error);
      throw error;
    }
  })().finally(() => {
    activeGoogleSignIn = null;
  });

  return activeGoogleSignIn;
};

export const logout = () => signOut(auth);

export const consumeRedirectResult = () => {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => result?.user ?? null)
      .catch((error) => {
        redirectResultPromise = null;
        throw error;
      });
  }

  return redirectResultPromise;
};

export const getGoogleAuthErrorMessage = (error: unknown) => {
  const code = getErrorCode(error);

  if (code === 'auth/unauthorized-domain') {
    const origin =
      typeof window === 'undefined' ? 'this origin' : window.location.origin;
    return `Google sign-in is not authorized for ${origin}. Use localhost locally or add this domain in Firebase Authentication > Settings > Authorized domains.`;
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled for this Firebase project. Enable the Google provider in Firebase Authentication.';
  }

  if (code === 'auth/popup-blocked') {
    return 'The browser blocked the Google sign-in popup. Try again and allow popups for this site.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed before it finished. Try again.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Google sign-in could not reach Firebase. Check your network connection and try again.';
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }

  return 'Google sign-in failed. Check the browser console for the Firebase error code and try again.';
};

export { onAuthStateChanged };
export type { User };
