import type { Message } from "../types/User";

const STORAGE_KEY_PREFIX = "chat_messages_";

// Get storage key for a specific chat
const getStorageKey = (userId: string, friendId: string): string => {
  // Sort IDs to ensure consistent key regardless of who initiated the chat
  const ids = [userId, friendId].sort();
  return `${STORAGE_KEY_PREFIX}${ids[0]}_${ids[1]}`;
};

// Save messages to localStorage
export const saveMessages = (userId: string, friendId: string, messages: Message[]): void => {
  try {
    const key = getStorageKey(userId, friendId);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error("Error saving messages to localStorage:", error);
  }
};

// Load messages from localStorage
export const loadMessages = (userId: string, friendId: string): Message[] => {
  try {
    const key = getStorageKey(userId, friendId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading messages from localStorage:", error);
  }
  return [];
};

// Add a single message to storage
export const addMessage = (userId: string, friendId: string, message: Message): void => {
  const existing = loadMessages(userId, friendId);
  // Check if message already exists (avoid duplicates)
  if (!existing.some(m => m._id === message._id)) {
    const updated = [...existing, message].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    saveMessages(userId, friendId, updated);
  }
};

// Clear messages for a specific chat
export const clearMessages = (userId: string, friendId: string): void => {
  try {
    const key = getStorageKey(userId, friendId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing messages from localStorage:", error);
  }
};

// Clear all messages (useful for logout)
export const clearAllMessages = (userId: string): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX) && key.includes(userId)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Error clearing all messages from localStorage:", error);
  }
};

