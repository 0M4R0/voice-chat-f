export interface User {
  id?: string;
  _id?: string;
  username: string;
  discriminator: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  register: (credentials: RegisterCredentials) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface Friend {
  _id: string;
  username: string;
  discriminator: string;
}

export interface FriendRequest {
  from: {
    _id: string;
    username: string;
    discriminator: string;
  };
}

export interface Message {
  _id: string;
  from: {
    _id: string;
    username: string;
    discriminator: string;
  };
  to: {
    _id: string;
    username: string;
    discriminator: string;
  };
  content: string;
  createdAt: string;
}
