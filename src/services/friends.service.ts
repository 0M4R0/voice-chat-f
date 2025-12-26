import api from "../api/axios";
import type { Friend, FriendRequest } from "../types/User";

export const getAllFriends = async (): Promise<Friend[]> => {
  const { data } = await api.get("/friends/list");
  return data;
};

export const getRequests = async (): Promise<FriendRequest[]> => {
  const { data } = await api.get("/friends/requests");
  return data;
};

export const sendRequest = async (username: string, discriminator: string) => {
  await api.post("/friends/send-request", {
    username,
    discriminator,
  });
};

export const respondToRequest = async (senderId: string, accept: boolean) => {
  await api.post("/friends/respond-to-request", {
    senderId,
    accept,
  });
};

export const removeFriend = async (friendId: string) => {
  await api.delete(`/friends/${friendId}`);
};

