import axios from "axios";
import { setAccessToken as setGlobalAccessToken } from "../utils/tokenManager";

// Extend the axios request config to include _retry property
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store token in memory (closure)
let accessToken: string | null = null;

// Handle token refresh in progress
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Update token from outside
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  setGlobalAccessToken(token); // Update global token in AuthContext
};

// Centalized logout function
export const logout = () => {
  setAccessToken(null);
  if (typeof window !== "undefined") {
    document.cookie =
      "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  }
};

// Notify all subscribers when the token is refreshed
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Add a subscriber to wait for the token refresh
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Intercept each request and add token to headers
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Return the modified config
    return config;
  },
  (error) => Promise.reject(error),
);

// Intercept each response and handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't retried yet
    // And it's not a request for refresh-token to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      /*
       * QUEUE
       * All pending requests are queued until the refresh is complete
       */
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh-token");
        const newToken = data.accessToken;

        // Update token in memory
        setAccessToken(newToken);

        // Notificamos a todos los requests que estaban esperando
        onRefreshed(newToken);

        // Actualizamos el header del request original que falló
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Return the original request with the new token
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
