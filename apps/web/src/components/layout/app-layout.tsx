import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const COLLAPSE_KEY = "helpdesk:sidebar-collapsed";

export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={user.role.name}
        open={sidebarOpen}
        collapsed={collapsed}
        onNavigate={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
