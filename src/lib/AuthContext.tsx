import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  consumeRedirectResult,
  onAuthStateChanged,
  User,
  signInWithGoogle,
  logout,
} from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: Error | null;
  login: () => Promise<User | null>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        setAuthError(null);
      }
    });

    consumeRedirectResult().catch((error) => {
      console.error('Error completing Google redirect sign-in', error);
      setAuthError(error as Error);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    loading,
    authError,
    login: signInWithGoogle,
    logout: logout,
    clearAuthError: () => setAuthError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
