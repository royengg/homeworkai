import { api } from "@/lib/api";
import type { AuthResponse, LoginCredentials, RegisterData } from "@/lib/types";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

async function wrap<T>(promise: Promise<T>): Promise<ServiceResponse<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err: any) {
    const message =
      err?.message || err?.response?.data?.error || "An unexpected error occurred";
    return { data: null, error: message };
  }
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<ServiceResponse<AuthResponse>> => {
    return wrap(
      api.post<AuthResponse>("/auth/login", credentials).then((r) => r.data),
    );
  },

  register: async (data: RegisterData): Promise<ServiceResponse<AuthResponse>> => {
    return wrap(
      api.post<AuthResponse>("/auth/register", data).then((r) => r.data),
    );
  },
};
