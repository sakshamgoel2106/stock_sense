import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user state:', err);
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    localStorage.removeItem('companyId');
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    await fetchUser();
  };

  const register = async (name, email, password, role = 'WORKER') => {
    localStorage.removeItem('companyId');
    const res = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('token', res.data.token);
    await fetchUser();
  };

  const googleLogin = async (credential) => {
    localStorage.removeItem('companyId');
    const res = await api.post('/auth/google', { credential });
    localStorage.setItem('token', res.data.token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('companyId');
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const switchCompany = async (companyId) => {
    localStorage.setItem('companyId', companyId);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      company: user?.activeCompany || null,
      membership: user?.activeMembership || null,
      hasCompany: user?.hasCompany ?? false,
      role: user?.activeMembership?.role || user?.role || 'WORKER',
      login, 
      register, 
      googleLogin, 
      logout, 
      refreshUser,
      switchCompany,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
