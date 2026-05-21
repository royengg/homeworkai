import { api } from "@/lib/api";
import type { AuthResponse, LoginCredentials, RegisterData } from "@/lib/types";
import { wrap, type ServiceResponse } from "./service-utils";

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
