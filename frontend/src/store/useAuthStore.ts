import { create } from 'zustand';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface AuthState {
  token: string | null;
  playerId: string | null;
  username: string | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: () => boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('sam-token'),
  playerId: localStorage.getItem('sam-player-id'),
  username: localStorage.getItem('sam-username'),
  loading: false,
  error: null,

  isLoggedIn: () => !!get().token,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      localStorage.setItem('sam-token', data.token);
      localStorage.setItem('sam-player-id', data.playerId);
      localStorage.setItem('sam-username', data.username);
      set({ token: data.token, playerId: data.playerId, username: data.username, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      localStorage.setItem('sam-token', data.token);
      localStorage.setItem('sam-player-id', data.playerId);
      localStorage.setItem('sam-username', data.username);
      set({ token: data.token, playerId: data.playerId, username: data.username, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  logout: () => {
    localStorage.removeItem('sam-token');
    localStorage.removeItem('sam-player-id');
    localStorage.removeItem('sam-username');
    set({ token: null, playerId: null, username: null });
  },

  clearError: () => set({ error: null }),
}));
