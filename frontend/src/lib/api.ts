import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      // Don't redirect if we're already on the login page (prevents loops/refreshes on failed login attempts)
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
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
