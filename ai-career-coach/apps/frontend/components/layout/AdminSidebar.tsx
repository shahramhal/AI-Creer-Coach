'use client';

import {
  LayoutDashboard,
  Users,
  Briefcase,
  Activity,
  ScrollText,
  ChevronLeft,
  Shield,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../../library/utils';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/authContext';

const adminNavItems = [
  { title: 'Overview', url: '/admin', icon: LayoutDashboard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Jobs', url: '/admin/jobs', icon: Briefcase },
  { title: 'System', url: '/admin/system', icon: Activity },
  { title: 'Audit Log', url: '/admin/audit', icon: ScrollText },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-4 w-4 text-destructive-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">Admin Panel</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        {adminNavItems.map((item) => {
          const isActive =
            item.url === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(item.url);
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to app + user info */}
      <div className="absolute bottom-4 left-0 right-0 px-4 space-y-2">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Back to App</span>}
        </Link>

        {!collapsed && user && (
          <>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
