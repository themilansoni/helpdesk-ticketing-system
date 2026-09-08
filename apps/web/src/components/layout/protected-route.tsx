import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Permission } from "@helpdesk/shared";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading HelpDesk Pro...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}
