import api, { setAccessToken } from "../api/axios";
import { type LoginCredentials } from "../types/User";

export const login = async (credentials: LoginCredentials) => {
  const { data } = await api.post("/auth/login", credentials);
  setAccessToken(data.accessToken);
  return data.user;
};

export const logout = async () => {
  await api.post("/auth/logout");
  setAccessToken(null);
};

export const getMe = async () => {
  const { data } = await api.get("/me");
  return data;
};
