import api from "../api/axios";
import type { Message } from "../types/User";

// Try multiple possible endpoint patterns
export const getMessages = async (friendId: string): Promise<Message[]> => {
  const endpoints = [`/chat/get-messages/${friendId}`];

  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      if (data && Array.isArray(data)) {
        return data;
      }
    } catch (error: any) {
      // If 404, try next endpoint
      if (error.response?.status === 404) {
        continue;
      }
      // For other errors, throw
      throw error;
    }
  }

  // If all endpoints fail, return empty array
  return [];
};
