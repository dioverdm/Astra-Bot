// ===========================================
// ASTRA DASHBOARD - WebSocket Client
// ===========================================

import { io, Socket } from 'socket.io-client';

// Event types matching server
interface ServerToClientEvents {
  'guild:memberJoin': (data: { guildId: string; member: MemberData }) => void;
  'guild:memberLeave': (data: { guildId: string; memberId: string }) => void;
  'guild:memberUpdate': (data: { guildId: string; member: MemberData }) => void;
  'moderation:action': (data: ModerationActionData) => void;
  'moderation:log': (data: ModerationLogData) => void;
  'stats:update': (data: { guildId: string; stats: GuildStatsData }) => void;
  'level:update': (data: { guildId: string; userId: string; level: number; xp: number }) => void;
  'level:up': (data: { guildId: string; userId: string; newLevel: number }) => void;
  'economy:update': (data: { guildId: string; userId: string; balance: number; bank: number }) => void;
  'ticket:create': (data: { guildId: string; ticket: TicketData }) => void;
  'ticket:update': (data: { guildId: string; ticket: TicketData }) => void;
  'ticket:close': (data: { guildId: string; ticketId: string }) => void;
  'bot:status': (data: BotStatusData) => void;
}

interface ClientToServerEvents {
  'guild:join': (guildId: string) => void;
  'guild:leave': (guildId: string) => void;
  'stats:request': (guildId: string) => void;
}

// Data types
export interface MemberData {
  id: string;
  username: string;
  avatar: string | null;
  joinedAt: string;
}

export interface ModerationActionData {
  guildId: string;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
}

export interface ModerationLogData {
  guildId: string;
  caseId: number;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
}

export interface GuildStatsData {
  memberCount: number;
  onlineCount: number;
  messageCount: number;
  commandsUsed: number;
}

export interface TicketData {
  id: string;
  number: number;
  userId: string;
  status: string;
  category: string;
  createdAt: string;
}

export interface BotStatusData {
  online: boolean;
  guilds: number;
  users: number;
  uptime: number;
  ping: number;
}

// Socket instance
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Get or create socket connection
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const url = (import.meta as any).env?.PROD ? '' : 'http://localhost:3001';
    
    socket = io(url, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error.message);
    });
  }

  return socket;
}

/**
 * Connect to WebSocket server
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

/**
 * Disconnect from WebSocket server
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

/**
 * Join a guild room for targeted updates
 */
export function joinGuildRoom(guildId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('guild:join', guildId);
  }
}

/**
 * Leave a guild room
 */
export function leaveGuildRoom(guildId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('guild:leave', guildId);
  }
}

/**
 * Request fresh stats for a guild
 */
export function requestStats(guildId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('stats:request', guildId);
  }
}
