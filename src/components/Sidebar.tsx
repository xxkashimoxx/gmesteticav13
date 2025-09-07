import { Calendar, Users, CreditCard, BarChart3, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/schedule', icon: Calendar },
  { name: 'Financeiro', href: '/finance', icon: CreditCard },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-card border-r border-border shadow-card">
      <div className="flex items-center justify-center h-16 px-4 border-b border-border bg-gradient-primary">
        <h1 className="text-lg font-bold text-primary-foreground">
          Glow Clinic
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-smooth",
                isActive
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-accent-foreground">DR</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Dr. Admin</p>
            <p className="text-xs text-muted-foreground">Estética Avançada</p>
          </div>
        </div>
      </div>
    </div>
  );
}