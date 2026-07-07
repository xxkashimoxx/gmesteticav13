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
  MessageCircle,
  Syringe,
  LogOut,
  Sun,
  Search,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth, type AppRole } from '@/hooks/useAuth';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/your-invite-code';

function WhatsAppGroupButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  if (variant === 'header') {
    return (
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="text-primary-foreground hover:bg-primary-foreground/10"
        aria-label="Grupo WhatsApp - Marketing"
      >
        <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="w-5 h-5" />
        </a>
      </Button>
    );
  }
  return (
    <Button
      asChild
      className="w-full justify-start gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-card"
    >
      <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="w-4 h-4" />
        Grupo Marketing
      </a>
    </Button>
  );
}

type NavItem = { name: string; href: string; icon: typeof BarChart3; roles?: AppRole[] };

const navigation: NavItem[] = [
  { name: 'Hoje', href: '/hoje', icon: Sun, roles: ['admin', 'staff'] },
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads', href: '/leads', icon: Flame },
  { name: 'Procedimentos', href: '/procedures', icon: Syringe },
  { name: 'Pacientes', href: '/patients', icon: Users, roles: ['admin', 'staff'] },
  { name: 'Agenda', href: '/schedule', icon: Calendar },
  { name: 'Financeiro', href: '/finance', icon: CreditCard, roles: ['admin', 'staff'] },
  { name: 'Integrações', href: '/integrations', icon: Plug },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['admin'] },
];

const mobileBottomNavBase: NavItem[] = [
  { name: 'Hoje', href: '/hoje', icon: Sun },
  { name: 'Agenda', href: '/schedule', icon: Calendar },
  { name: 'Leads', href: '/leads', icon: Flame },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Mais', href: '/', icon: BarChart3 },
];

function visibleNav(role: AppRole | null) {
  return navigation.filter((i) => !i.roles || (role && i.roles.includes(role)));
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { role, user, signOut } = useAuth();
  const items = visibleNav(role);
  const roleLabel = role === 'admin' ? 'Administradora' : role === 'staff' ? 'Recepção' : role === 'traffic_manager' ? 'Gestor de tráfego' : '—';

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 h-16 px-5 border-b border-sidebar-border bg-gradient-primary">
        <Sparkles className="w-5 h-5 text-primary-foreground shrink-0" />
        <h1 className="text-base font-bold text-primary-foreground tracking-tight truncate">
          GM - GESTÃO GERAL
        </h1>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {items.map((item) => {
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

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <WhatsAppGroupButton />
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-primary rounded-full flex items-center justify-center shadow-card ring-2 ring-secondary">
            <span className="text-sm font-bold text-primary-foreground tracking-wide">GM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {user?.email ?? 'GM - GESTÃO GERAL'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sair"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
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
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary-foreground/15 ring-2 ring-secondary/60 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-foreground tracking-wide">GM</span>
        </div>
        <h1 className="text-sm font-bold text-primary-foreground tracking-tight truncate">
          GM - GESTÃO GERAL
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Busca global"
          onClick={() => (window as any).__openGlobalSearch?.()}
        >
          <Search className="w-5 h-5" />
        </Button>
        <WhatsAppGroupButton variant="header" />
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
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const { role } = useAuth();
  const items = mobileBottomNavBase; // mobile bottom is shared for both roles
  void role;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-elevated">
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
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
