import { api } from "@/lib/api";
import type {
  AuthResponse,
  LoginCredentials,
  MeResponse,
  RegisterData,
} from "@/lib/types";
import { wrap, type ServiceResponse } from "./service-utils";

export const authService = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ServiceResponse<AuthResponse>> => {
    return wrap(
      api.post<AuthResponse>("/auth/login", credentials).then((r) => r.data),
    );
  },

  register: async (
    data: RegisterData,
  ): Promise<ServiceResponse<AuthResponse>> => {
    return wrap(
      api.post<AuthResponse>("/auth/register", data).then((r) => r.data),
    );
  },

  // Validate the auth cookie against the DB and return the current user along
  // with the token's expiry. Used by AuthProvider on cold load instead of
  // trusting any client-side state.
  me: async (): Promise<ServiceResponse<MeResponse>> => {
    return wrap(api.get<MeResponse>("/auth/me").then((r) => r.data));
  },

  // Server-side logout: clears the HttpOnly cookie so the session can't be
  // reused. Fire-and-forget — the SPA clears its own state regardless of the
  // response since the user is leaving the session either way.
  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore — we log out locally regardless.
    }
  },
};