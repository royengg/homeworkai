import { api } from "@/lib/api";
import type { AuthResponse, LoginCredentials, RegisterData, User } from "@/lib/types";
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

  // Validate the bearer token against the DB and return the current user.
  // Used by AuthProvider on cold load instead of trusting localStorage.
  me: async (): Promise<ServiceResponse<{ user: User }>> => {
    return wrap(api.get<{ user: User }>("/auth/me").then((r) => r.data));
  },
};