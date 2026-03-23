import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DB } from '../utils/db';
import { Session, User, Shopkeeper } from '../types';

interface AuthContextType {
  session: Session | null;
  isStudent: boolean;
  isShopkeeper: boolean;
  currentUser: User | null;
  currentShop: Shopkeeper | null;
  login: (user: User | Shopkeeper, role: Session['role']) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = DB.getSession();
    if (stored) setSession(stored);
    setLoading(false);
  }, []);

  const login = (user: User | Shopkeeper, role: Session['role']) => {
    DB.setSession(user, role);
    setSession({ user, role });
  };

  const logout = () => {
    DB.clearSession();
    setSession(null);
  };

  const isStudent = session?.role === 'student';
  const isShopkeeper = session?.role === 'shopkeeper';
  const currentUser = isStudent ? (session?.user as User) : null;
  const currentShop = isShopkeeper ? (session?.user as Shopkeeper) : null;

  return (
    <AuthContext.Provider value={{ session, isStudent, isShopkeeper, currentUser, currentShop, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
