'use client';

import {
  LayoutDashboard,
  FileText,
  User,
  ChevronLeft,
  LogOut,
  Briefcase,
  DollarSign,
  ScanSearch,
  GraduationCap,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../../library/utils";
import { Button } from "../ui/button";
import { useAuth } from "../../context/authContext";
import { Sheet, SheetContent } from "../ui/sheet";
import { useIsMobile } from "../../hooks/useIsMobile";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "CV Analysis", url: "/cvs", icon: FileText },
  { title: "ATS Score", url: "/ats-score", icon: ScanSearch },
  { title: 'Job Matches', url: '/jobs', icon: Briefcase },
  { title: "Salary Insights", url: "/salary-insights", icon: DollarSign },
  { title: 'Learning Paths', url: '/learning', icon: GraduationCap },
  { title: "Profile", url: "/profile", icon: User }
];

interface SidebarContentProps {
  isCollapsed: boolean;
  showCollapseToggle: boolean;
  pathname: string | null;
  user: { firstName?: string; lastName?: string; email: string } | null;
  isAdmin: boolean;
  onNavClick: () => void;
  onCollapsedToggle: () => void;
  onLogout: () => void;
}

function SidebarContent({
  isCollapsed,
  showCollapseToggle,
  pathname,
  user,
  isAdmin,
  onNavClick,
  onCollapsedToggle,
  onLogout,
}: SidebarContentProps) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-3">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden">
          {isCollapsed ? (
            <Image
              src="/LOGO_to_circle.png"
              alt="BYC"
              width={140}
              height={32}
              className="rounded-lg shrink-0"
            />
          ) : (
            <Image
              src="/LOGO.png"
              alt="Build Your Career"
              width={180}
              height={32}
              className="h-8 w-auto object-contain"
            />
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
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onNavClick}
              aria-label={isCollapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <div className="px-2 mt-2">
          <Link
            href="/admin"
            onClick={onNavClick}
            aria-label={isCollapsed ? "Admin Panel" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              pathname?.startsWith('/admin')
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Admin Panel</span>}
          </Link>
        </div>
      )}

      {!isCollapsed && user && (
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-medium text-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
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
        </div>
      )}
    </>
  );
}

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
  collapsed = false,
  onCollapsedChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
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
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 hidden md:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent
          isCollapsed={collapsed}
          showCollapseToggle={true}
          pathname={pathname}
          user={user}
          isAdmin={isAdmin}
          onNavClick={() => {}}
          onCollapsedToggle={() => onCollapsedChange?.(!collapsed)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar (sheet drawer) */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent className="w-72 p-0">
            <SidebarContent
              isCollapsed={false}
              showCollapseToggle={false}
              pathname={pathname}
              user={user}
              isAdmin={isAdmin}
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
