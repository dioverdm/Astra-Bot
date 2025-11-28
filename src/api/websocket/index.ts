// ===========================================
// ASTRA BOT - WebSocket Server for Real-time Updates
// ===========================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../../shared/utils/logger.js';

let io: Server | null = null;

// Event types for type safety
export interface ServerToClientEvents {
  // Guild events
  'guild:memberJoin': (data: { guildId: string; member: MemberData }) => void;
  'guild:memberLeave': (data: { guildId: string; memberId: string }) => void;
  'guild:memberUpdate': (data: { guildId: string; member: MemberData }) => void;
  
  // Moderation events
  'moderation:action': (data: ModerationActionData) => void;
  'moderation:log': (data: ModerationLogData) => void;
  
  // Stats updates
  'stats:update': (data: { guildId: string; stats: GuildStatsData }) => void;
  
  // Level/XP updates
  'level:update': (data: { guildId: string; userId: string; level: number; xp: number }) => void;
  'level:up': (data: { guildId: string; userId: string; newLevel: number }) => void;
  
  // Economy updates
  'economy:update': (data: { guildId: string; userId: string; balance: number; bank: number }) => void;
  
  // Ticket events
  'ticket:create': (data: { guildId: string; ticket: TicketData }) => void;
  'ticket:update': (data: { guildId: string; ticket: TicketData }) => void;
  'ticket:close': (data: { guildId: string; ticketId: string }) => void;
  
  // Bot status
  'bot:status': (data: BotStatusData) => void;
}

export interface ClientToServerEvents {
  // Join/leave guild rooms for targeted updates
  'guild:join': (guildId: string) => void;
  'guild:leave': (guildId: string) => void;
  
  // Request fresh data
  'stats:request': (guildId: string) => void;
}

// Data types
interface MemberData {
  id: string;
  username: string;
  avatar: string | null;
  joinedAt: string;
}

interface ModerationActionData {
  guildId: string;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
}

interface ModerationLogData {
  guildId: string;
  caseId: number;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
}

interface GuildStatsData {
  memberCount: number;
  onlineCount: number;
  messageCount: number;
  commandsUsed: number;
}

interface TicketData {
  id: string;
  number: number;
  userId: string;
  status: string;
  category: string;
  createdAt: string;
}

interface BotStatusData {
  online: boolean;
  guilds: number;
  users: number;
  uptime: number;
  ping: number;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.DASHBOARD_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    logger.api.debug(`WebSocket client connected: ${socket.id}`);

    // Handle joining guild rooms
    socket.on('guild:join', (guildId: string) => {
      socket.join(`guild:${guildId}`);
      logger.api.debug(`Client ${socket.id} joined guild room: ${guildId}`);
    });

    // Handle leaving guild rooms
    socket.on('guild:leave', (guildId: string) => {
      socket.leave(`guild:${guildId}`);
      logger.api.debug(`Client ${socket.id} left guild room: ${guildId}`);
    });

    // Handle stats request
    socket.on('stats:request', async (guildId: string) => {
      // This would fetch fresh stats and emit them
      // Implementation depends on your stats service
    });

    socket.on('disconnect', () => {
      logger.api.debug(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  logger.api.info('✓ WebSocket server initialized');
  return io;
}

/**
 * Get the WebSocket server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit event to a specific guild room
 */
export function emitToGuild<K extends keyof ServerToClientEvents>(
  guildId: string,
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (io) {
    io.to(`guild:${guildId}`).emit(event, data as any);
  }
}

/**
 * Emit event to all connected clients
 */
export function emitToAll<K extends keyof ServerToClientEvents>(
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (io) {
    io.emit(event, data as any);
  }
}

/**
 * Get count of connected clients
 */
export async function getConnectedClientsCount(): Promise<number> {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
}
