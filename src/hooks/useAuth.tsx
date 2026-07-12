import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'traffic_manager' | 'staff';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth temporarily disabled — expose an admin-like context so gated UI keeps working.
  const value: AuthContextValue = {
    user: null,
    session: null,
    role: 'admin',
    loading: false,
    signOut: async () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  return {
    user: null,
    session: null,
    role: 'admin' as AppRole,
    loading: false,
    signOut: async () => {},
  } satisfies AuthContextValue;
}
