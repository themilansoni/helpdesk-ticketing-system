import { hasPermission, type Permission } from "@helpdesk/shared";
import type { CurrentUser } from "@/types";

// Shared by every test that needs a fake signed-in user without touching
// real Firebase Auth. Call setMockUser(...) before rendering, then
// `vi.mock("@/lib/auth", () => import("./mocks/auth-mock"))` in the test
// file (hoisted by vitest, so it must be a static import path).
let currentUser: CurrentUser | null = null;

export function setMockUser(user: CurrentUser | null) {
  currentUser = user;
}

export function useAuth() {
  return {
    user: currentUser,
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    refreshProfile: async () => {},
    can: (permission: Permission) => hasPermission(currentUser?.role.name, permission),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
