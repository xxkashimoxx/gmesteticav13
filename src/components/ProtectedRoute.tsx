import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: AppRole[];
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (allow && (!role || !allow.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
