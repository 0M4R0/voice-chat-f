import React, { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import type { Friend } from "../types/User";
import { useSocket } from "../hooks/useSockets";
import { getAccessToken } from "../utils/tokenManager";
import { removeFriend } from "../services/friends.service";

type View = "all" | "pending" | "add";

interface FriendsComponentProps {
  onFriendClick?: (friend: Friend) => void;
  socketHook?: ReturnType<typeof useSocket>;
}

export const FriendsComponent: React.FC<FriendsComponentProps> = ({
  onFriendClick,
  socketHook,
}) => {
  const { user } = useAuth();
  const token = getAccessToken();
  
  // Always call useSocket hook, but use the provided socketHook if available
  const defaultSocket = useSocket(token, (user as { _id?: string; id?: string })?._id || (user as { _id?: string; id?: string })?.id);
  const socket = socketHook || defaultSocket;
  
  const {
    friends,
    friendRequests,
    loadFriends,
    loadRequests,
    sendFriendRequest,
    respondToRequest,
    isConnected,
  } = socket;

  const [activeView, setActiveView] = useState<View>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userInput, setUserInput] = useState("");

  // Load data when socket connects
  useEffect(() => {
    if (isConnected && user) {
      loadFriends();
      loadRequests();
    }
  }, [isConnected, user, loadFriends, loadRequests]);

  // Load data when switching views
  useEffect(() => {
    if (isConnected) {
      if (activeView === "all") {
        loadFriends();
      } else if (activeView === "pending") {
        loadRequests();
      }
    }
  }, [activeView, isConnected, loadFriends, loadRequests]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const parts = userInput.split("#");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      setError("Please enter a valid format: username#1234");
      return;
    }

    const [username, discriminator] = parts;

    if (!/^\d{4}$/.test(discriminator.trim())) {
      setError("Discriminator must be exactly 4 digits");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      sendFriendRequest(username.trim(), discriminator.trim());
      setSuccess(
        `Friend request sent to ${username.trim()}#${discriminator.trim()}!`,
      );
      setUserInput("");
    } catch {
      setError("Error sending friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (userId: string, accept: boolean) => {
    try {
      setLoading(true);
      setError("");
      respondToRequest(userId, accept);
    } catch {
      setError("Error responding to request");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      await removeFriend(friendId);
      loadFriends();
    } catch {
      setError("Error removing friend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#2f3136",
        color: "#dcddde",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #202225",
          background: "#2f3136",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
          Friends
        </h2>
        {!isConnected && (
          <div style={{ fontSize: "12px", color: "#ed4245", marginTop: "4px" }}>
            Disconnected
          </div>
        )}
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          gap: "4px",
          padding: "8px",
          borderBottom: "1px solid #202225",
          background: "#2f3136",
        }}
      >
        <button
          onClick={() => setActiveView("all")}
          style={{
            padding: "8px 16px",
            background: activeView === "all" ? "#5865f2" : "transparent",
            color: activeView === "all" ? "#ffffff" : "#b9bbbe",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: activeView === "all" ? "600" : "400",
          }}
        >
          All
        </button>
        <button
          onClick={() => setActiveView("pending")}
          style={{
            padding: "8px 16px",
            background: activeView === "pending" ? "#5865f2" : "transparent",
            color: activeView === "pending" ? "#ffffff" : "#b9bbbe",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: activeView === "pending" ? "600" : "400",
            position: "relative",
          }}
        >
          Pending
          {friendRequests.length > 0 && (
            <span
              style={{
                marginLeft: "8px",
                background: "#ed4245",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "2px 6px",
                fontSize: "12px",
              }}
            >
              {friendRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveView("add")}
          style={{
            padding: "8px 16px",
            background: activeView === "add" ? "#5865f2" : "transparent",
            color: activeView === "add" ? "#ffffff" : "#b9bbbe",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: activeView === "add" ? "600" : "400",
          }}
        >
          Add Friend
        </button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#ed4245",
            color: "#ffffff",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "12px 16px",
            background: "#43b581",
            color: "#ffffff",
            fontSize: "14px",
          }}
        >
          {success}
        </div>
      )}

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {loading && (
          <div
            style={{ textAlign: "center", color: "#b9bbbe", padding: "20px" }}
          >
            Loading...
          </div>
        )}

        {/* All Friends View */}
        {activeView === "all" && !loading && (
          <div>
            {friends.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#b9bbbe",
                  padding: "40px 20px",
                }}
              >
                <p>You don't have any friends yet.</p>
                <p>Send a friend request to get started!</p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    onClick={() => onFriendClick?.(friend)}
                    style={{
                      padding: "12px",
                      background: "#40444b",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#484c52";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#40444b";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
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
                        <div style={{ fontWeight: "600" }}>
                          {friend.username}#{friend.discriminator}
                        </div>
                        <div style={{ fontSize: "12px", color: "#b9bbbe" }}>
                          Click to message
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend._id);
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#ed4245",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests View */}
        {activeView === "pending" && !loading && (
          <div>
            {friendRequests.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#b9bbbe",
                  padding: "40px 20px",
                }}
              >
                No pending friend requests.
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {friendRequests.map((request) => (
                  <div
                    key={request.from._id}
                    style={{
                      padding: "16px",
                      background: "#40444b",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
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
                          {request.from.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "600" }}>
                            {request.from.username}#{request.from.discriminator}
                          </div>
                          <div style={{ fontSize: "12px", color: "#b9bbbe" }}>
                            Wants to be your friend
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() =>
                            handleRespondToRequest(request.from._id, true)
                          }
                          disabled={loading}
                          style={{
                            padding: "8px 16px",
                            background: "#43b581",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            handleRespondToRequest(request.from._id, false)
                          }
                          disabled={loading}
                          style={{
                            padding: "8px 16px",
                            background: "#ed4245",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Friend View */}
        {activeView === "add" && !loading && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "#b9bbbe", marginBottom: "8px" }}>
                Enter the username and discriminator in the format:
                username#1234
              </p>
            </div>
            <form
              onSubmit={handleSendRequest}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Username#Discriminator
                </label>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="e.g., testuser#1234"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "4px",
                    border: "none",
                    background: "#40444b",
                    color: "#dcddde",
                    fontSize: "16px",
                  }}
                />
                <small style={{ color: "#b9bbbe", fontSize: "12px" }}>
                  Format: username#1234
                </small>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px",
                  background: loading ? "#40444b" : "#5865f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                {loading ? "Sending..." : "Send Friend Request"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
