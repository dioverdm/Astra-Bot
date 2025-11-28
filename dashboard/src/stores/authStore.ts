import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  avatarUrl: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  checkAuth: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        set({ 
          user: response.data.data, 
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
      });
    }
  },
  
  login: () => {
    // Redirect to Discord OAuth
    window.location.href = '/api/auth/discord';
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null, isAuthenticated: false });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
  
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
