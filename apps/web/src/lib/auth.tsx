import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, tokenStorage } from "./api";
import type { CurrentUser } from "@/types";
import type { Permission } from "@helpdesk/shared";
import { hasPermission } from "@helpdesk/shared";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await api.get<CurrentUser>("/auth/me");
      setUser(profile);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("helpdesk:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("helpdesk:unauthorized", handleUnauthorized);
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ accessToken: string; refreshToken: string; user: CurrentUser }>("/auth/login", {
      email,
      password,
    });
    tokenStorage.setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    tokenStorage.clear();
    setUser(null);
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // best-effort server-side revocation; local logout has already happened
      }
    }
  }, []);

  const can = useCallback((permission: Permission) => hasPermission(user?.role.name, permission), [user]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, can, refreshProfile: loadProfile }),
    [user, isLoading, login, logout, can, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
