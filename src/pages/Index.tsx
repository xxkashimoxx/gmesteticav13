import { Sidebar } from '@/components/Sidebar';
import { Outlet } from 'react-router-dom';

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Index;
