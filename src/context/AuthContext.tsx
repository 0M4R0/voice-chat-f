import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import api, { setAccessToken } from "../api/axios";
import {
  login as authServiceLogin,
  logout as authServiceLogout,
} from "../services/auth.service";
import type {
  User,
  RegisterCredentials,
  LoginCredentials,
} from "../types/User";
import { AuthContext } from "./AuthContext";

import { disconnectSocket } from "../utils/socketManager";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // Added token state
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);

  const register = async (credentials: RegisterCredentials) => {
    try {
      const { data } = await api.post("/auth/register", credentials);
      setUser(data.user);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Registration failed:", err.response?.data);
      } else {
        console.error("Unexpected error:", err);
      }
      throw err;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const userData = await authServiceLogin(credentials);
      setUser(userData);

      // Fetch complete user data after login to ensure we have all fields
      try {
        const { data: completeUserData } = await api.get("/me");
        setUser(completeUserData);
        await checkAuth(); // Re-check auth state to ensure token is loaded
      } catch (err) {
        console.error("Failed to fetch complete user data:", err);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          console.error("Invalid credentials");
        } else {
          console.error("Login failed:", err.response?.data);
        }
      } else {
        console.error("Unexpected error:", err);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authServiceLogout();
      setUser(null);
      setToken(null); // Clear token state on logout
      // Disconnect socket on logout
      disconnectSocket();
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  const checkAuth = async () => {
    if (isRefreshing.current) {
      console.log("Auth check already in progress, skipping...");
      return;
    }

    isRefreshing.current = true;

    try {
      // Try to refresh the token
      const { data } = await api.post("/auth/refresh-token");
      setAccessToken(data.accessToken);
      setToken(data.accessToken); // Set token state

      // If the refresh works, we request the user data
      if (data.accessToken) {
        const userRes = await api.get("/me");
        setUser(userRes.data);
      }
    } catch (error) {
      // If the refresh fails, we clear the token and user data
      console.log("No valid session found");
      if (axios.isAxiosError(error)) {
        // Only treat as auth failure for 401/403 errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error(
            "Auth check failed:",
            error.response?.status,
            error.response?.data,
          );
        } else {
          // For other errors (like 500), log as server error but still clear auth state
          console.error(
            "Server error during auth check:",
            error.response?.status,
            error.response?.data,
          );
        }
      } else {
        console.error("Unexpected auth error:", error);
      }
      setAccessToken(null);
      setToken(null); // Clear token state
      setUser(null);
      // Clear the invalid refresh token cookie
      document.cookie =
        "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
