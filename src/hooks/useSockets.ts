import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Friend, FriendRequest, Message } from "../types/User";
import { setSocketInstance } from "../utils/socketManager";
import {
  addMessage as saveMessageToStorage,
  loadMessages as loadMessagesFromStorage,
} from "../utils/messageStorage";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
export const useSocket = (token: string | null, currentUserId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  // Load messages from localStorage when friends are loaded (for quick access)
  // Note: Full message history should be loaded via HTTP when opening a chat
  useEffect(() => {
    if (currentUserId && friends.length > 0) {
      const loadedMessages: Record<string, Message[]> = {};
      friends.forEach((friend) => {
        const stored = loadMessagesFromStorage(currentUserId, friend._id);
        if (stored.length > 0) {
          loadedMessages[friend._id] = stored;
        }
      });
      if (Object.keys(loadedMessages).length > 0) {
        setTimeout(() => {
          setMessages((prev) => ({ ...prev, ...loadedMessages }));
        }, 0);
      }
    }
  }, [friends, currentUserId]);
  useEffect(() => {
    if (!token) {
      // Disconnect socket on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
      setTimeout(() => {
        setIsConnected(false);
        setFriends([]);
        setFriendRequests([]);
        setMessages({});
      }, 0);
      return;
    }
    if (socketRef.current?.connected) {
      // Update token for existing socket
      socketRef.current.auth = { token: `Bearer ${token}` };
      return;
    }
    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    setSocketInstance(socket);
    // Remove all existing listeners first to prevent duplicates
    socket.removeAllListeners();
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));
    // Friend-related events
    socket.on("friends_list", (data: Friend[]) => {
      console.log("Socket received friends_list:", data);
      setFriends(data);
    });
    socket.on("friend_requests", (data: FriendRequest[]) => {
      console.log("Socket received friend_requests:", data);
      setFriendRequests(data);
    });
    socket.on("friend_request_received", (data: FriendRequest) => {
      console.log("Socket received friend_request_received:", data);
      setFriendRequests((prev) => [...prev, data]);
    });
    // Handle respond_to_friend_request event
    socket.on(
      "friend_request_response",
      (response: { error?: string; friend?: Friend }) => {
        if (response.error) {
          console.error("Error responding to friend request:", response.error);
        } else {
          console.log("Friend request response:", response);
          setFriends((prev) => [...prev, response.friend!]);
          setFriendRequests((prev) =>
            prev.filter((req) => req.from._id !== response.friend?._id),
          );
        }
      },
    );
    socket.on("friend_request_accepted", (data: Friend) => {
      console.log("Socket received friend_request_accepted:", data);
      setFriends((prev) => [...prev, data]);
      setFriendRequests((prev) =>
        prev.filter((req) => req.from._id !== data._id),
      );
    });
    socket.on("friend_request_rejected", (senderId: string) => {
      console.log("Socket received friend_request_rejected:", senderId);
      setFriendRequests((prev) =>
        prev.filter((req) => req.from._id !== senderId),
      );
    });
    socket.on("friend_added", (data: Friend) => {
      console.log("Socket received friend_added:", data);
      setFriends((prev) => [...prev, data]);
    });
    socket.on("friend_removed", (friendId: string) => {
      console.log("Socket received friend_removed:", friendId);
      setFriends((prev) => prev.filter((f) => f._id !== friendId));
      setMessages((prev) => {
        const newMessages = { ...prev };
        delete newMessages[friendId];
        return newMessages;
      });
    });
    // Message-related events
    socket.on("new_private_message", (message: Message) => {
      console.log("Socket received new_private_message:", message);
      // Determine chatId based on message direction
      // We need to figure out which friend this message is with
      // The chatId should be the friend's ID (the one who is NOT the current user)
      // Try to get userId from socket.data first, fallback to currentUserId parameter
      const userId = currentUserId;
      if (!userId) return;
      const chatId =
        message.from._id === userId ? message.to._id : message.from._id;
      // Save to localStorage
      saveMessageToStorage(userId, chatId, message);
      // Update state
      setMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), message],
      }));
    });
    socket.on("message_error", (error: { error: string }) => {
      console.error("Message error:", error);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [token, currentUserId]);
  const loadFriends = useCallback(() => {
    console.log(
      "loadFriends called, socket connected:",
      socketRef.current?.connected,
    );
    if (socketRef.current?.connected) {
      socketRef.current.emit("get_friends");
      console.log("Emitted get_friends event");
    }
  }, []);
  const loadRequests = useCallback(() => {
    console.log(
      "loadRequests called, socket connected:",
      socketRef.current?.connected,
    );
    if (socketRef.current?.connected) {
      socketRef.current.emit("get_friend_requests");
      console.log("Emitted get_friend_requests event");
    }
  }, []);
  const sendFriendRequest = useCallback(
    (username: string, discriminator: string) => {
      console.log("sendFriendRequest called:", { username, discriminator });
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_friend_request", {
          username,
          discriminator,
        });
        console.log("Emitted send_friend_request event");
      }
    },
    [],
  );
  const respondToRequest = useCallback((senderId: string, accept: boolean) => {
    console.log("respondToRequest called:", { senderId, accept });
    if (socketRef.current?.connected) {
      socketRef.current.emit("respond_friend_request", { senderId, accept });
      console.log("Emitted respond_friend_request event");
    }
  }, []);
  const sendMessage = useCallback((toUserId: string, content: string) => {
    console.log("sendMessage called:", { toUserId, content });
    if (socketRef.current?.connected) {
      socketRef.current.emit("private_message", { toUserId, content });
      console.log("Emitted private_message event");
    }
  }, []);
  const getMessagesForChat = useCallback(
    (friendId: string): Message[] => {
      return messages[friendId] || [];
    },
    [messages],
  );
  return {
    socket: socketRef,
    isConnected,
    friends,
    friendRequests,
    messages,
    loadFriends,
    loadRequests,
    sendFriendRequest,
    respondToRequest,
    sendMessage,
    getMessagesForChat,
  };
};
