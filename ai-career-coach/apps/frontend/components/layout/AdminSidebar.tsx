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
import { Button } from '../ui/button';
import { useAuth } from '../../context/authContext';
import { Sheet, SheetContent } from '../ui/sheet';
import { useIsMobile } from '../../hooks/useIsMobile';

const adminNavItems = [
  { title: 'Overview', url: '/admin', icon: LayoutDashboard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Jobs', url: '/admin/jobs', icon: Briefcase },
  { title: 'System', url: '/admin/system', icon: Activity },
  { title: 'Audit Log', url: '/admin/audit', icon: ScrollText },
];

interface AdminSidebarContentProps {
  isCollapsed: boolean;
  showCollapseToggle: boolean;
  pathname: string | null;
  user: { firstName?: string | null; lastName?: string | null; email: string } | null;
  onNavClick: () => void;
  onCollapsedToggle: () => void;
  onLogout: () => void;
}

function AdminSidebarContent({
  isCollapsed,
  showCollapseToggle,
  pathname,
  user,
  onNavClick,
  onCollapsedToggle,
  onLogout,
}: AdminSidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-4 w-4 text-destructive-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-foreground">Admin Panel</span>
          )}
        </div>
        {showCollapseToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onCollapsedToggle}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                isCollapsed && 'rotate-180'
              )}
            />
          </Button>
        )}
      </div>

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
              onClick={onNavClick}
              aria-label={isCollapsed ? item.title : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 space-y-2">
        <Link
          href="/dashboard"
          onClick={onNavClick}
          aria-label={isCollapsed ? "Back to App" : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            isCollapsed && 'justify-center'
          )}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Back to App</span>}
        </Link>

        {!isCollapsed && user && (
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
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminSidebar({
  mobileOpen,
  onMobileOpenChange,
  collapsed = false,
  onCollapsedChange,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const closeMobileDrawer = () => {
    onMobileOpenChange?.(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 hidden md:block',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <AdminSidebarContent
          isCollapsed={collapsed}
          showCollapseToggle={true}
          pathname={pathname}
          user={user}
          onNavClick={() => {}}
          onCollapsedToggle={() => onCollapsedChange?.(!collapsed)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar (sheet drawer) */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent className="w-72 p-0">
            <AdminSidebarContent
              isCollapsed={false}
              showCollapseToggle={false}
              pathname={pathname}
              user={user}
              onNavClick={closeMobileDrawer}
              onCollapsedToggle={() => {}}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
