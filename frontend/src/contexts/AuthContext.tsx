import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import type { User, LoginCredentials, RegisterData } from "../lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Refresh the user's auth state once a minute. Catches cookie expiry while
// the tab is open (no real refresh-token flow yet, so on expiry we log out).
const REVALIDATE_INTERVAL_MS = 60_000;
// Pre-emptively log out this many seconds before the JWT actually expires,
// so users don't see a 401 mid-interaction.
const EXPIRY_GRACE_SECONDS = 30;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const expiryTimerRef = useRef<number | null>(null);

  const logout = useCallback(() => {
    void authService.logout();
    setUser(null);
    if (expiryTimerRef.current !== null) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  // Schedule a proactive logout for when the auth cookie's JWT expires. The
  // cookie is HttpOnly so we can't read `exp` from JS — instead the server
  // sends `expiresAt` (unix seconds) with every /auth/me, /auth/login, and
  // /auth/register response.
  const scheduleExpiryLogout = useCallback(
    (expiresAt: number) => {
      if (expiryTimerRef.current !== null) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
      const msUntilLogout =
        (expiresAt - EXPIRY_GRACE_SECONDS) * 1000 - Date.now();
      if (msUntilLogout <= 0) {
        logout();
        return;
      }
      // setTimeout capped at ~24h to stay within int32 range.
      const delay = Math.min(msUntilLogout, 86_400_000);
      expiryTimerRef.current = window.setTimeout(
        () => logout(),
        delay,
      ) as unknown as number;
    },
    [logout],
  );

  // Cold-load validation: ask the server whether the HttpOnly cookie still
  // maps to a real user. We never trust any client-side state — the cookie is
  // opaque to JS, so the only source of truth is /auth/me.
  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setUser(null);
        } else {
          setUser(data.user);
          scheduleExpiryLogout(data.expiresAt);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scheduleExpiryLogout]);

  // Periodically re-validate while the tab stays open. Catches the case where
  // the user logged out from another device, or the server rotated the cookie.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void authService.me().then(({ data, error }) => {
        if (error || !data) logout();
        else {
          setUser(data.user);
          scheduleExpiryLogout(data.expiresAt);
        }
      });
    }, REVALIDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, logout, scheduleExpiryLogout]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { data, error } = await authService.login(credentials);
      if (error || !data) {
        throw new Error(error || "Login failed");
      }
      setUser(data.user);
      scheduleExpiryLogout(data.expiresAt);
    },
    [scheduleExpiryLogout],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { data: response, error } = await authService.register(data);
      if (error || !response) {
        throw new Error(error || "Registration failed");
      }
      setUser(response.user);
      scheduleExpiryLogout(response.expiresAt);
    },
    [scheduleExpiryLogout],
  );

  // Clean up the timer if the provider unmounts.
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current !== null) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}