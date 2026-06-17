import { Sidebar, MobileHeader, MobileBottomNav } from '@/components/Sidebar';
import { Outlet } from 'react-router-dom';

const Index = () => {
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
