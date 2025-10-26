import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (!token) return;
    
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await api.get('/auth/me');
        setUser(res.data.data);
      } catch (error) {
        // If token is invalid, remove it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'tenant') => {
    try {
      setLoading(true);
      const res = await api.post('/auth/register', { name, email, password, role });
      return res.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      loading,
      login,
      register,
      logout
    }),
    [token, user, isAuthenticated, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}