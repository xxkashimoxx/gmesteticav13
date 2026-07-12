import { ReactNode } from 'react';

// Auth temporarily disabled — all routes are open with full permissions.
export function ProtectedRoute({ children }: { children: ReactNode; allow?: string[] }) {
  return <>{children}</>;
}
