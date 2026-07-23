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

const TOKEN_KEY = "token";
const USER_KEY = "user";

// Refresh the user's auth state once a minute. Catches token expiry while
// the tab is open (no real refresh-token flow yet, so on expiry we log out).
const REVALIDATE_INTERVAL_MS = 60_000;
// Pre-emptively log out this many seconds before the JWT actually expires,
// so users don't see a 401 mid-interaction.
const EXPIRY_GRACE_SECONDS = 30;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStored(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage throws in private mode / quota; auth still works in-session.
  }
}

function clearStored() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const expiryTimerRef = useRef<number | null>(null);

  const logout = useCallback(() => {
    clearStored();
    setUser(null);
    if (expiryTimerRef.current !== null) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  // Schedule a proactive logout for when the bearer token expires. Replaces
  // any previous timer so we never double-fire.
  const scheduleExpiryLogout = useCallback(
    (token: string) => {
      if (expiryTimerRef.current !== null) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return;
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
        ) as { exp?: number };
        if (typeof payload.exp !== "number") return;
        const msUntilLogout =
          (payload.exp - EXPIRY_GRACE_SECONDS) * 1000 - Date.now();
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
      } catch {
        // malformed token — logout() will be triggered by /me failure.
      }
    },
    [logout],
  );

  // Cold-load validation: ask the server whether the stored token still maps
  // to a real user. We never trust localStorage blindly — a tampered record
  // is discarded and the user is treated as logged out.
  useEffect(() => {
    let cancelled = false;
    const token = readStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          clearStored();
          setUser(null);
        } else {
          setUser(data.user);
          scheduleExpiryLogout(token);
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
  // the user revoked their token from another device, or the server rotated it.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (!readStoredToken()) {
        logout();
        return;
      }
      void authService.me().then(({ data, error }) => {
        if (error || !data) logout();
        else setUser(data.user);
      });
    }, REVALIDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, logout]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { data, error } = await authService.login(credentials);
      if (error || !data) {
        throw new Error(error || "Login failed");
      }
      writeStored(data.token, data.user);
      setUser(data.user);
      scheduleExpiryLogout(data.token);
    },
    [scheduleExpiryLogout],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { data: response, error } = await authService.register(data);
      if (error || !response) {
        throw new Error(error || "Registration failed");
      }
      writeStored(response.token, response.user);
      setUser(response.user);
      scheduleExpiryLogout(response.token);
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