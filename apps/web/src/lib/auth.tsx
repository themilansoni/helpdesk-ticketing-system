import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { toIsoOrNull } from "./db/helpers";
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

async function loadProfile(uid: string): Promise<CurrentUser> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    throw new Error("No profile found for this account. Contact an administrator.");
  }
  const data = snap.data();
  if (data.status !== "active") {
    throw new Error("This account has been disabled. Contact an administrator.");
  }
  return {
    id: snap.id,
    employeeId: data.employeeId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone ?? null,
    jobTitle: data.jobTitle ?? null,
    status: data.status,
    lastLoginAt: toIsoOrNull(data.lastLoginAt),
    role: { name: data.role },
    department: data.departmentId ? { id: data.departmentId, name: data.departmentName } : null,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    managerId: data.managerId ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyFirebaseUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await loadProfile(fbUser.uid);
      setUser(profile);
    } catch (err) {
      await firebaseSignOut(auth).catch(() => {});
      setUser(null);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, applyFirebaseUser);
    return unsubscribe;
  }, [applyFirebaseUser]);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await loadProfile(credential.user.uid);
    await updateDoc(doc(db, "users", credential.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  const can = useCallback((permission: Permission) => hasPermission(user?.role.name, permission), [user]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const profile = await loadProfile(auth.currentUser.uid);
    setUser(profile);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, can, refreshProfile }),
    [user, isLoading, login, logout, can, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
