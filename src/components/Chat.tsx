import React, { useState, useEffect, useRef } from "react";
import type { Friend, Message } from "../types/User";
import { getMessages } from "../services/message.service";
import { useAuth } from "../context/useAuth";
import {
  loadMessages as loadMessagesFromStorage,
  saveMessages,
} from "../utils/messageStorage";

interface ChatProps {
  friend: Friend | null;
  onClose: () => void;
  sendMessage: (friendId: string, content: string) => void;
  getMessagesForChat: (friendId: string) => Message[];
}

interface ChatProps {
  friend: Friend | null;
  onClose: () => void;
  sendMessage: (friendId: string, content: string) => void;
  getMessagesForChat: (friendId: string) => Message[];
}

export const Chat: React.FC<ChatProps> = ({
  friend,
  onClose,
  sendMessage,
  getMessagesForChat,
}) => {
  const { user } = useAuth();
  const userId =
    (user as { _id?: string; id?: string })?._id ||
    (user as { _id?: string; id?: string })?.id;
  const [messageInput, setMessageInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const currentFriendIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (friend && userId) {
      // Prevent duplicate loads for the same friend
      if (isLoadingRef.current && currentFriendIdRef.current === friend._id) {
        return;
      }

      // If friend changed, reset the flag
      if (currentFriendIdRef.current !== friend._id) {
        currentFriendIdRef.current = friend._id;
        isLoadingRef.current = true;
      }

      const loadAllMessages = async () => {
        setLoading(true);

        // Step 1: Load from localStorage first (instant display)
        const storedMessages = loadMessagesFromStorage(userId, friend._id);
        if (storedMessages.length > 0) {
          setChatMessages(storedMessages);
        }

        // Step 2: Try to load from HTTP API (database)
        try {
          const apiMessages = await getMessages(friend._id);

          if (apiMessages.length > 0) {
            // Merge API messages with stored messages, avoiding duplicates
            const existingIds = new Set(storedMessages.map((m) => m._id));
            const newApiMessages = apiMessages.filter(
              (m) => !existingIds.has(m._id),
            );

            // Combine and sort by timestamp
            const merged = [...storedMessages, ...newApiMessages].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );

            // Save merged messages to localStorage
            saveMessages(userId, friend._id, merged);
            setChatMessages(merged);
          } else if (storedMessages.length === 0) {
            // No messages from API and no stored messages
            setChatMessages([]);
          }
        } catch (error: unknown) {
          // API failed - use stored messages or empty
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.warn(
            "Could not load messages from API, using localStorage:",
            errorMessage,
          );
          if (storedMessages.length === 0) {
            setChatMessages([]);
          }
        } finally {
          setLoading(false);
          isLoadingRef.current = false;
        }
      };

      loadAllMessages();
    }
  }, [friend?._id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (friend && userId) {
      // Update chat messages when socket messages change (real-time updates)
      // Only process if we're currently viewing this friend's chat
      if (currentFriendIdRef.current !== friend._id) {
        return;
      }

      const socketMessages = getMessagesForChat(friend._id);
      if (socketMessages.length > 0) {
        // Merge current messages with new socket messages, avoiding duplicates
        setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const newMessages = socketMessages.filter(
            (m) => !existingIds.has(m._id),
          );

          if (newMessages.length === 0) {
            return prev; // No new messages
          }

          const merged = [...prev, ...newMessages].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          // Save merged messages to localStorage for persistence
          saveMessages(userId, friend._id, merged);
          return merged;
        });
      }
    }
  }, [friend?._id, userId, getMessagesForChat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !friend) return;

    sendMessage(friend._id, messageInput.trim());
    setMessageInput("");
  };

  const handleRefreshMessages = async () => {
    if (!friend || !userId) return;

    setLoading(true);
    try {
      const apiMessages = await getMessages(friend._id);
      if (apiMessages.length > 0) {
        // Merge with existing messages
        const existingIds = new Set(chatMessages.map((m) => m._id));
        const newMessages = apiMessages.filter((m) => !existingIds.has(m._id));
        const merged = [...chatMessages, ...newMessages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        saveMessages(userId, friend._id, merged);
        setChatMessages(merged);
      }
    } catch (error: unknown) {
      console.error("Error refreshing messages:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!friend) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#36393f",
          color: "#dcddde",
        }}
      >
        <p>Select a friend to start chatting</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#36393f",
        color: "#dcddde",
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #202225",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#2f3136",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#5865f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            {friend.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              {friend.username}#{friend.discriminator}
            </div>
            <div style={{ fontSize: "12px", color: "#b9bbbe" }}>Online</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleRefreshMessages}
            disabled={loading}
            title="Refresh messages from server"
            style={{
              background: "transparent",
              border: "none",
              color: "#b9bbbe",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              padding: "8px",
              borderRadius: "4px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            ↻
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#b9bbbe",
              cursor: "pointer",
              fontSize: "20px",
              padding: "8px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {loading && (
          <div style={{ textAlign: "center", color: "#b9bbbe" }}>
            Loading messages...
          </div>
        )}
        {!loading && chatMessages.length === 0 && (
          <div
            style={{ textAlign: "center", color: "#b9bbbe", marginTop: "20px" }}
          >
            No messages yet. Start the conversation!
          </div>
        )}
        {chatMessages.map((message) => {
          const userId = user?._id || user?.id;
          const isOwnMessage = message.from._id === userId;
          return (
            <div
              key={message._id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isOwnMessage ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: isOwnMessage ? "#5865f2" : "#40444b",
                  color: "#ffffff",
                  wordWrap: "break-word",
                }}
              >
                {!isOwnMessage && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      marginBottom: "4px",
                      color: "#ffffff",
                    }}
                  >
                    {message.from.username}
                  </div>
                )}
                <div>{message.content}</div>
                <div
                  style={{ fontSize: "10px", opacity: 0.7, marginTop: "4px" }}
                >
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: "16px",
          borderTop: "1px solid #202225",
          background: "#2f3136",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Message ${friend.username}`}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#40444b",
              color: "#dcddde",
              fontSize: "16px",
            }}
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: messageInput.trim() ? "#5865f2" : "#40444b",
              color: "#ffffff",
              cursor: messageInput.trim() ? "pointer" : "not-allowed",
              fontWeight: "600",
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
