import { useEffect } from 'react';
import { Sidebar, MobileHeader, MobileBottomNav } from '@/components/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSettings } from '@/hooks/useClinicSettings';

const Index = () => {
  const { role } = useAuth();
  const { settings, loading } = useClinicSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;
    if (role !== 'admin') return;
    if (pathname.startsWith('/onboarding')) return;
    if (!settings || !settings.onboarding_completed) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, role, settings, pathname, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Index;
