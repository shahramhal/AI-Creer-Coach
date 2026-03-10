'use client';

import {
  LayoutDashboard,
  FileText,
  User,
  ChevronLeft,
  Zap,
  LogOut,
  Briefcase,
  DollarSign,
  ScanSearch,
  GraduationCap,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../../library/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import { useAuth } from "../../context/authContext";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "CV Analysis", url: "/cvs", icon: FileText },
  { title: "ATS Score", url: "/ats-score", icon: ScanSearch },
  { title: 'Job Matches', url: '/jobs', icon: Briefcase },
  { title: "Salary Insights", url: "/salary-insights", icon: DollarSign },
  { title: 'Learning Paths', url: '/learning', icon: GraduationCap },
  { title: "Profile", url: "/profile", icon: User }
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">AI Career Coach</span>
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
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin panel link */}
      {isAdmin && (
        <div className="px-2 mt-2">
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname?.startsWith('/admin')
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        </div>
      )}

      {/* User info and logout */}
      {!collapsed && user && (
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
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
    </aside>
  );
}
