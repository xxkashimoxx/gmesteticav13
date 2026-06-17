import { useState } from 'react';
import {
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  Sparkles,
  Flame,
  Plug,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads', href: '/leads', icon: Flame },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/schedule', icon: Calendar },
  { name: 'Financeiro', href: '/finance', icon: CreditCard },
  { name: 'Integrações', href: '/integrations', icon: Plug },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

const mobileBottomNav = [
  { name: 'Início', href: '/', icon: BarChart3 },
  { name: 'Leads', href: '/leads', icon: Flame },
  { name: 'Agenda', href: '/schedule', icon: Calendar },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Integrar', href: '/integrations', icon: Plug },
];


function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 h-16 px-5 border-b border-sidebar-border bg-gradient-primary">
        <Sparkles className="w-5 h-5 text-primary-foreground" />
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
          Glow Clinic
        </h1>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-smooth',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-primary rounded-full flex items-center justify-center shadow-card ring-2 ring-secondary">
            <span className="text-sm font-bold text-primary-foreground tracking-wide">GM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">GM Estética</p>
            <p className="text-xs text-muted-foreground truncate">Avançada</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border shadow-card">
      <SidebarContent />
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-gradient-primary border-b border-sidebar-border shadow-card">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-foreground" />
        <h1 className="text-base font-bold text-primary-foreground tracking-tight">
          Glow Clinic
        </h1>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-elevated">
      <ul className="flex items-stretch justify-around">
        {mobileBottomNav.map((item) => {

          const isActive = location.pathname === item.href;
          return (
            <li key={item.name} className="flex-1">
              <NavLink
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-smooth',
                  isActive
                    ? 'text-primary-foreground bg-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="leading-none">{item.name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
