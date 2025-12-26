// Global variable to track current access token
let currentAccessToken: string | null = null;

// Function to get current access token
export const getAccessToken = () => currentAccessToken;

// Function to set current access token (used by axios)
export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
};
