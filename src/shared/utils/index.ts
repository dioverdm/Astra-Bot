// ===========================================
// ASTRA BOT - Shared Utilities
// ===========================================

import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import { EMBED_COLORS, EMOJIS } from '../constants/index.js';

// ============ Embed Builders ============

export function createEmbed(options: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  footer?: string;
  thumbnail?: string;
  image?: string;
  timestamp?: boolean;
}): EmbedBuilder {
  const embed = new EmbedBuilder();
  
  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color) embed.setColor(options.color);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.timestamp) embed.setTimestamp();
  
  return embed;
}

export function successEmbed(message: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title || `${EMOJIS.success} Success`,
    description: message,
    color: EMBED_COLORS.success,
    timestamp: true,
  });
}

export function errorEmbed(message: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title || `${EMOJIS.error} Error`,
    description: message,
    color: EMBED_COLORS.error,
    timestamp: true,
  });
}

export function warningEmbed(message: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title || `${EMOJIS.warning} Warning`,
    description: message,
    color: EMBED_COLORS.warning,
    timestamp: true,
  });
}

export function infoEmbed(message: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title || `${EMOJIS.info} Info`,
    description: message,
    color: EMBED_COLORS.info,
    timestamp: true,
  });
}

// ============ Time Utilities ============

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function parseDuration(str: string): number | null {
  const regex = /^(\d+)(s|m|h|d|w)$/i;
  const match = str.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

export function formatTimestamp(date: Date, style: 'R' | 'F' | 'f' | 'D' | 'd' | 'T' | 't' = 'R'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

// ============ String Utilities ============

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============ Permission Utilities ============

export function hasPermission(userPermissions: bigint, requiredPermission: bigint): boolean {
  return (userPermissions & requiredPermission) === requiredPermission;
}

// ============ Random Utilities ============

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============ Validation Utilities ============

export function isValidSnowflake(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============ Progress Bar ============

export function createProgressBar(current: number, max: number, length: number = 10): string {
  const progress = Math.round((current / max) * length);
  const filled = '█'.repeat(Math.min(progress, length));
  const empty = '░'.repeat(Math.max(length - progress, 0));
  return `${filled}${empty}`;
}

// ============ Async Utilities ============

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay * attempt);
      }
    }
  }
  
  throw lastError;
}

// ============ Object Utilities ============

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
