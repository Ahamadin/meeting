// src/features/auth/MatrixAuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginMatrix, registerMatrix, verifyMatrixToken, logoutMatrix } from '../../services/matrix-auth';

const MatrixAuthContext = createContext(null);

export function MatrixAuthProvider({ children }) {
  const [matrixToken, setMatrixToken] = useState(() => localStorage.getItem('matrix_token') || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('matrix_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  // Sauvegarder le token dans localStorage
  useEffect(() => {
    if (matrixToken) {
      localStorage.setItem('matrix_token', matrixToken);
    } else {
      localStorage.removeItem('matrix_token');
    }
  }, [matrixToken]);

  // Sauvegarder l'utilisateur dans localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('matrix_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('matrix_user');
    }
  }, [user]);

  // Vérifier le token au chargement
  useEffect(() => {
    if (matrixToken && !user) {
      verifyMatrixToken(matrixToken)
        .then((data) => {
          setUser({
            userId: data.user_id,
            deviceId: data.device_id,
          });
        })
        .catch(() => {
          // Token invalide
          setMatrixToken(null);
          setUser(null);
        });
    }
  }, [matrixToken, user]);

  /**
   * Connexion Matrix
   * @param {string} username - ex: "ahamadi" ou "@ahamadi:communication.rtn.sn"
   * @param {string} password
   */
  const signIn = async ({ username, password }) => {
    setLoading(true);
    try {
      const data = await loginMatrix(username, password);
      setMatrixToken(data.accessToken);
      setUser({
        userId: data.userId,
        deviceId: data.deviceId,
        homeServer: data.homeServer,
      });
      
      // Sauvegarder le nom d'affichage (extrait du userId)
      const displayName = data.userId.split(':')[0].replace('@', '');
      sessionStorage.setItem('displayName', displayName);
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inscription Matrix
   * @param {string} username
   * @param {string} password
   */
  const signUp = async ({ username, password }) => {
    setLoading(true);
    try {
      const data = await registerMatrix(username, password);
      setMatrixToken(data.accessToken);
      setUser({
        userId: data.userId,
        deviceId: data.deviceId,
      });
      
      const displayName = data.userId.split(':')[0].replace('@', '');
      sessionStorage.setItem('displayName', displayName);
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnexion
   */
  const signOut = async () => {
    if (matrixToken) {
      try {
        await logoutMatrix(matrixToken);
      } catch (e) {
        console.error('Erreur lors de la déconnexion Matrix:', e);
      }
    }
    setMatrixToken(null);
    setUser(null);
    sessionStorage.removeItem('displayName');
  };

  const value = useMemo(
    () => ({
      matrixToken,
      user,
      loading,
      signIn,
      signUp,
      signOut,
      isAuthenticated: !!matrixToken && !!user,
    }),
    [matrixToken, user, loading]
  );

  return <MatrixAuthContext.Provider value={value}>{children}</MatrixAuthContext.Provider>;
}

export function useMatrixAuth() {
  const ctx = useContext(MatrixAuthContext);
  if (!ctx) throw new Error('useMatrixAuth must be used within <MatrixAuthProvider>');
  return ctx;
}