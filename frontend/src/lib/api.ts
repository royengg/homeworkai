import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Hard cap for hung backend responses so a single stuck request can't pin
  // the UI forever. Upload requests pass their own longer timeout per call.
  timeout: 30_000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Keep the SPA alive but force revalidation by clearing the stored
      // token — the AuthProvider's next /me call will log the user out
      // cleanly. We still hard-redirect to /login so a deep-link attempt
      // after the session expired lands on the auth page instead of a
      // broken protected route.
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Preserve the current path so login can bounce back to it.
        const returnTo = encodeURIComponent(path + window.location.search);
        window.location.href = `/login?from=${returnTo}`;
      }
    }

    const message =
      error.response?.data?.error ||
      error.message ||
      'An error occurred';

    return Promise.reject({
      message,
      status: error.response?.status,
      correlationId: error.response?.data?.correlationId,
      details: error.response?.data?.details,
    });
  }
);

export const handleApiError = (error: any): string => {
  if (error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};
