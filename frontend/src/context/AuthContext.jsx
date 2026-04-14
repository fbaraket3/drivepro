// src/context/AuthContext.jsx — v2: teacher_type in user payload

import { createContext, useContext, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dp_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('dp_token') || null);

  function login(userData, tok) {
    setUser(userData);
    setToken(tok);
    localStorage.setItem('dp_user', JSON.stringify(userData));
    localStorage.setItem('dp_token', tok);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('dp_user');
    localStorage.removeItem('dp_token');
  }

  return (
    <AuthCtx.Provider value={{
      user,
      token,
      login,
      logout,
      isAdmin:          user?.role === 'admin',
      isTeacher:        user?.role === 'teacher',
      isTheoryTeacher:  user?.role === 'teacher' && user?.teacher_type === 'theory',
      isDrivingTeacher: user?.role === 'teacher' && user?.teacher_type === 'driving_parking',
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
