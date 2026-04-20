// src/features/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginMatrix } from '../../api/auth';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(() => localStorage.getItem('matrix_token'));
  const [userId,  setUserId]  = useState(() => localStorage.getItem('matrix_user_id'));
  const [loading, setLoading] = useState(false);

  // displayName récupéré depuis sessionStorage (nom utilisé dans les réunions)
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('displayName') || ''
  );

  useEffect(() => {
    if (token)  localStorage.setItem('matrix_token',   token);
    else        localStorage.removeItem('matrix_token');
    if (userId) localStorage.setItem('matrix_user_id', userId);
    else        localStorage.removeItem('matrix_user_id');
  }, [token, userId]);

  const signIn = async ({ username, password }) => {
    setLoading(true);
    try {
      const { access_token, user_id } = await loginMatrix({ username, password });
      setToken(access_token);
      setUserId(user_id);
      const name = username;
      setDisplayName(name);
      sessionStorage.setItem('displayName', name);
      return { user_id };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setToken(null);
    setUserId(null);
    setDisplayName('');
    localStorage.clear();
    sessionStorage.clear();
  };

  // Mise à jour du displayName (utilisé dans les réunions)
  const updateDisplayName = (name) => {
    setDisplayName(name);
    sessionStorage.setItem('displayName', name);
  };

  const value = useMemo(() => ({
    token,
    userId,
    loading,
    displayName,
    signIn,
    signOut,
    updateDisplayName,
    isAuthenticated: !!token,
    user: token ? { displayName, userId } : null,
  }), [token, userId, loading, displayName]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
