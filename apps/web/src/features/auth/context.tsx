import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useSession, useLogout } from "./hooks";
import type { Session } from "./schemas";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSession();
  const logoutMutation = useLogout();

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    session: session || null,
    isLoading,
    isAuthenticated: !!session,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
