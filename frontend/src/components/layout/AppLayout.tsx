import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/PageSpinner';
import { ThemeButton, ThemeSwitch } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { UnreadBadge } from '@/features/notifications/components/UnreadBadge';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useNewNotificationToast } from '@/features/notifications/useNewNotificationToast';
import { cn } from '@/lib/utils';

// Only pages that exist are listed. New modules add a line here.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/applications', label: 'Applications', icon: Briefcase },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/recruiters', label: 'Recruiters', icon: Users },
  { to: '/interviews', label: 'Interviews', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/account', label: 'Account', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount().data;

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5 text-lg font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </span>
        CareerTrack
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
            {to === '/notifications' && <UnreadBadge count={unread} className="ml-auto" />}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t p-3">
        <ThemeSwitch />
        <div className="px-3">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = useUnreadCount().data;
  useNewNotificationToast(); // a toast when a new reminder arrives while the app is open

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-background shadow-lg">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-bold">CareerTrack</span>
          <Button asChild variant="ghost" size="icon" className="relative ml-auto">
            <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
              <Bell className="h-5 w-5" />
              <UnreadBadge count={unread} className="absolute -right-0.5 -top-0.5 min-w-4 px-1 text-[10px] leading-4" />
            </Link>
          </Button>
          <ThemeButton />
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
