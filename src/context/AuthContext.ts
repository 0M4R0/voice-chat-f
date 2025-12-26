import { createContext } from "react";
import type { AuthContextType } from "../types/User";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
