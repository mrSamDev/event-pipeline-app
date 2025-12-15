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
  console.log("session: ", session);
  const logoutMutation = useLogout();

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value: AuthContextValue = {
    session: session || null,
    isLoading,
    isAuthenticated: !!session,
    logout,
  };

  console.log("value: ", value);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
