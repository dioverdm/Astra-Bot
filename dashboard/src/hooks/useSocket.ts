// ===========================================
// ASTRA DASHBOARD - WebSocket React Hook
// ===========================================

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getSocket, 
  connectSocket, 
  joinGuildRoom, 
  leaveGuildRoom,
  type ModerationLogData,
  type GuildStatsData,
  type MemberData,
  type TicketData,
} from '../lib/socket';

/**
 * Hook to manage WebSocket connection and guild room subscription
 */
export function useSocket(guildId?: string) {
  const queryClient = useQueryClient();
  const currentGuildRef = useRef<string | null>(null);

  // Connect on mount
  useEffect(() => {
    connectSocket();
  }, []);

  // Join/leave guild room when guildId changes
  useEffect(() => {
    if (!guildId) return;

    const socket = getSocket();

    // Leave previous room
    if (currentGuildRef.current && currentGuildRef.current !== guildId) {
      leaveGuildRoom(currentGuildRef.current);
    }

    // Join new room
    joinGuildRoom(guildId);
    currentGuildRef.current = guildId;

    // Set up event listeners for this guild
    const handleStatsUpdate = (data: { guildId: string; stats: GuildStatsData }) => {
      if (data.guildId === guildId) {
        queryClient.setQueryData(['guild-stats', guildId], (old: unknown) => ({
          ...(old as object),
          ...data.stats,
        }));
      }
    };

    const handleModerationLog = (data: ModerationLogData) => {
      if (data.guildId === guildId) {
        // Invalidate moderation logs query to refetch
        queryClient.invalidateQueries({ queryKey: ['moderation-logs', guildId] });
      }
    };

    const handleMemberJoin = (data: { guildId: string; member: MemberData }) => {
      if (data.guildId === guildId) {
        queryClient.invalidateQueries({ queryKey: ['guild-members', guildId] });
        queryClient.invalidateQueries({ queryKey: ['guild-stats', guildId] });
      }
    };

    const handleMemberLeave = (data: { guildId: string; memberId: string }) => {
      if (data.guildId === guildId) {
        queryClient.invalidateQueries({ queryKey: ['guild-members', guildId] });
        queryClient.invalidateQueries({ queryKey: ['guild-stats', guildId] });
      }
    };

    const handleTicketCreate = (data: { guildId: string; ticket: TicketData }) => {
      if (data.guildId === guildId) {
        queryClient.invalidateQueries({ queryKey: ['tickets', guildId] });
      }
    };

    const handleTicketUpdate = (data: { guildId: string; ticket: TicketData }) => {
      if (data.guildId === guildId) {
        queryClient.invalidateQueries({ queryKey: ['tickets', guildId] });
      }
    };

    const handleLevelUp = (data: { guildId: string; userId: string; newLevel: number }) => {
      if (data.guildId === guildId) {
        queryClient.invalidateQueries({ queryKey: ['leaderboard', guildId, 'levels'] });
      }
    };

    // Register listeners
    socket.on('stats:update', handleStatsUpdate);
    socket.on('moderation:log', handleModerationLog);
    socket.on('guild:memberJoin', handleMemberJoin);
    socket.on('guild:memberLeave', handleMemberLeave);
    socket.on('ticket:create', handleTicketCreate);
    socket.on('ticket:update', handleTicketUpdate);
    socket.on('level:up', handleLevelUp);

    // Cleanup
    return () => {
      socket.off('stats:update', handleStatsUpdate);
      socket.off('moderation:log', handleModerationLog);
      socket.off('guild:memberJoin', handleMemberJoin);
      socket.off('guild:memberLeave', handleMemberLeave);
      socket.off('ticket:create', handleTicketCreate);
      socket.off('ticket:update', handleTicketUpdate);
      socket.off('level:up', handleLevelUp);
      
      if (guildId) {
        leaveGuildRoom(guildId);
      }
    };
  }, [guildId, queryClient]);

  return {
    socket: getSocket(),
    isConnected: getSocket().connected,
  };
}

/**
 * Hook for global bot status updates
 */
export function useBotStatus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    const handleBotStatus = (data: { online: boolean; guilds: number; users: number; uptime: number; ping: number }) => {
      queryClient.setQueryData(['bot-status'], data);
    };

    socket.on('bot:status', handleBotStatus);

    return () => {
      socket.off('bot:status', handleBotStatus);
    };
  }, [queryClient]);
}
