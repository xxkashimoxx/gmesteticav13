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

const AUTH_TIMEOUT_MS = 6000;
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Tempo limite da autenticação excedido')), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRole(userId: string) {
      try {
        const { data } = await withTimeout(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle(),
          AUTH_TIMEOUT_MS,
        );

        if (active) setRole((data?.role as AppRole | undefined) ?? null);
      } catch (error) {
        console.warn('Não foi possível carregar o perfil de acesso.', error);
        if (active) setRole(null);
      }
    }

    async function applySession(nextSession: Session | null) {
      if (!active) return;

      setSession(nextSession);
      if (nextSession?.user) {
        await loadRole(nextSession.user.id);
      } else {
        setRole(null);
      }
    }

    async function initializeAuth() {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS);
        await applySession(data.session);
      } catch (error) {
        console.warn('A verificação da sessão demorou além do esperado.', error);
        if (active) {
          setSession(null);
          setRole(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || event === 'INITIAL_SESSION') return;

      setLoading(true);
      void applySession(nextSession).finally(() => {
        if (active) setLoading(false);
      });
    });

    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false);
    }, AUTH_TIMEOUT_MS + 500);

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
