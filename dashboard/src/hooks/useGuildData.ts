// ===========================================
// ASTRA DASHBOARD - Guild Data Hooks
// ===========================================

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Channel {
  id: string;
  name: string;
  type: number; // 0=text, 2=voice, 4=category, 5=announcement, 15=forum
  parentId: string | null;
  position: number;
}

export interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

/**
 * Hook to fetch guild channels
 */
export function useGuildChannels(guildId: string | undefined) {
  return useQuery({
    queryKey: ['guild-channels', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/channels`);
      return res.data.data as Channel[];
    },
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch guild roles
 */
export function useGuildRoles(guildId: string | undefined) {
  return useQuery({
    queryKey: ['guild-roles', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/discord-roles`);
      return res.data.data as Role[];
    },
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Filter channels by type
 */
export function filterChannelsByType(channels: Channel[] | undefined, types: number[]) {
  if (!channels) return [];
  return channels.filter(c => types.includes(c.type));
}

/**
 * Get text channels only (type 0 and 5)
 */
export function getTextChannels(channels: Channel[] | undefined) {
  return filterChannelsByType(channels, [0, 5]);
}

/**
 * Get voice channels only (type 2)
 */
export function getVoiceChannels(channels: Channel[] | undefined) {
  return filterChannelsByType(channels, [2]);
}

/**
 * Get categories only (type 4)
 */
export function getCategories(channels: Channel[] | undefined) {
  return filterChannelsByType(channels, [4]);
}
