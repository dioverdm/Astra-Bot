import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on auth check - let the app handle it
    // Only redirect on 401 for protected API calls (not /auth/me)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      // Clear any stale auth state and redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Auth
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  
  // Guilds
  getGuilds: () => api.get('/guilds'),
  getGuild: (guildId: string) => api.get(`/guilds/${guildId}`),
  updateGuild: (guildId: string, data: unknown) => api.patch(`/guilds/${guildId}`, data),
  updateModule: (guildId: string, module: string, data: unknown) => 
    api.patch(`/guilds/${guildId}/modules/${module}`, data),
  toggleModule: (guildId: string, module: string, enabled: boolean) =>
    api.post(`/guilds/${guildId}/modules/${module}/toggle`, { enabled }),
  
  // Stats
  getGuildStats: (guildId: string) => api.get(`/stats/${guildId}`),
  getModerationLogs: (guildId: string, page = 1, limit = 20) =>
    api.get(`/stats/${guildId}/moderation`, { params: { page, limit } }),
  getLeaderboard: (guildId: string, type: 'levels' | 'economy', limit = 10) =>
    api.get(`/stats/${guildId}/leaderboard/${type}`, { params: { limit } }),
  
  // User
  getUserProfile: () => api.get('/users/profile'),
  getUserLevel: (guildId: string) => api.get(`/users/level/${guildId}`),
  getUserEconomy: (guildId: string) => api.get(`/users/economy/${guildId}`),
};
