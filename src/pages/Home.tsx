import { useState } from "react";
import { FriendsComponent } from "../components/FriendsComponent";
import { Chat } from "../components/Chat";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../hooks/useSockets";
import { getAccessToken } from "../utils/tokenManager";
import type { Friend, User } from "../types/User";

export const Home = () => {
  const { user, logout } = useAuth();
  const token = getAccessToken();
  const userId =
    (user as { _id?: string; id?: string })?._id ||
    (user as { _id?: string; id?: string })?.id;
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Initialize socket connection (only once, here in Home)
  const socketHook = useSocket(token, userId);
  const { sendMessage, getMessagesForChat } = socketHook;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleUser = (user: User) => {
    return `${user.username}#${user.discriminator}`;
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#36393f",
        color: "#dcddde",
      }}
    >
      {/* Left Sidebar - User Info */}
      <div
        style={{
          width: "320px",
          background: "#2f3136",
          borderRight: "1px solid #202225",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* User Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #202225",
            background: "#292b2f",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
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
              {user?.username[0].toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                background: "#ed4245",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              Logout
            </button>
          </div>
          <div style={{ fontSize: "14px", fontWeight: "600" }}>
            {user && handleUser(user)}
          </div>
          <div style={{ fontSize: "12px", color: "#b9bbbe" }}>
            {user?.email}
          </div>
        </div>

        {/* Friends Component */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <FriendsComponent
            onFriendClick={setSelectedFriend}
            socketHook={socketHook}
          />
        </div>
      </div>

      {/* Main Content Area - Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Chat
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          sendMessage={sendMessage}
          getMessagesForChat={getMessagesForChat}
        />
      </div>
    </div>
  );
};
