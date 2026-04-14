'use client';

import {
  LayoutDashboard,
  FileText,
  ChevronLeft,
  Briefcase,
  ClipboardList,
  DollarSign,
  ScanSearch,
  GraduationCap,
  Shield,
  Settings,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "../../library/utils";
import { EASE_OUT } from "../../library/motion";
import { Button } from "../ui/button";
import { useAuth } from "../../context/authContext";
import { Sheet, SheetContent } from "../ui/sheet";
import { useIsMobile } from "../../hooks/useIsMobile";
import { API_BASE_URL } from "../../library/config";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "CV Analysis", url: "/cvs", icon: FileText },
  { title: "ATS Score", url: "/ats-score", icon: ScanSearch },
  { title: 'Job Matches', url: '/jobs', icon: Briefcase },
  { title: 'Applications', url: '/applications', icon: ClipboardList },
  { title: "Salary Insights", url: "/salary-insights", icon: DollarSign },
  { title: 'Learning Paths', url: '/learning', icon: GraduationCap },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface SidebarContentProps {
  isCollapsed: boolean;
  showCollapseToggle: boolean;
  pathname: string | null;
  user: { firstName?: string | null; lastName?: string | null; email: string; avatarUrl?: string | null } | null;
  isAdmin: boolean;
  onNavClick: () => void;
  onCollapsedToggle: () => void;
}

function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http')
    ? avatarUrl
    : `${API_BASE_URL.replace('/api', '')}${avatarUrl}`;
}

function SidebarContent({
  isCollapsed,
  showCollapseToggle,
  pathname,
  user,
  isAdmin,
  onNavClick,
  onCollapsedToggle,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
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
                "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                />
              )}
              <item.icon className="relative h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="relative">{item.title}</span>}
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
              "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              pathname?.startsWith('/admin')
                ? "text-destructive"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {pathname?.startsWith('/admin') && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-destructive/10"
                transition={{ duration: 0.2, ease: EASE_OUT }}
              />
            )}
            <Shield className="relative h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="relative">Admin Panel</span>}
          </Link>
        </div>
      )}

      {user && (
        <div className="mt-auto p-3 border-t border-border">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden">
                {resolveAvatarUrl(user.avatarUrl) ? (
                  <img src={resolveAvatarUrl(user.avatarUrl)!} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '') || user.email.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shrink-0 overflow-hidden">
                {resolveAvatarUrl(user.avatarUrl) ? (
                  <img src={resolveAvatarUrl(user.avatarUrl)!} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '') || user.email.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();

  const closeMobileDrawer = () => {
    onMobileOpenChange?.(false);
  };

  return (
    <>
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
        />
      </aside>

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
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
