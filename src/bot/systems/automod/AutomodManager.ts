// ===========================================
// ASTRA BOT - Automod Manager
// Modern & Professional Automoderation System
// ===========================================

import { 
  Message, 
  EmbedBuilder, 
  TextChannel,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import { ModerationLog } from '../../../database/models/ModerationLog.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';

// ============ Types ============

export interface AutomodConfig {
  enabled: boolean;
  logChannelId?: string;
  ignoredChannels: string[];
  ignoredRoles: string[];
  
  // Filters
  antiSpam: {
    enabled: boolean;
    messageLimit: number;      // Max messages in timeframe
    timeframe: number;         // Milliseconds
    action: AutomodAction;
  };
  antiLink: {
    enabled: boolean;
    whitelistedDomains: string[];
    action: AutomodAction;
  };
  antiInvite: {
    enabled: boolean;
    allowOwnServer: boolean;
    action: AutomodAction;
  };
  badWords: {
    enabled: boolean;
    words: string[];
    action: AutomodAction;
  };
  massMention: {
    enabled: boolean;
    maxMentions: number;
    action: AutomodAction;
  };
  capsLock: {
    enabled: boolean;
    maxPercent: number;        // Max % of caps (e.g., 70)
    minLength: number;         // Min message length to check
    action: AutomodAction;
  };
  emojiSpam: {
    enabled: boolean;
    maxEmojis: number;
    action: AutomodAction;
  };
}

export type AutomodAction = 'warn' | 'delete' | 'mute' | 'kick' | 'ban';

interface SpamTracker {
  messages: number[];
  lastMessage: string;
  duplicateCount: number;
}

// ============ Default Config ============

export const DEFAULT_AUTOMOD_CONFIG: AutomodConfig = {
  enabled: false,
  ignoredChannels: [],
  ignoredRoles: [],
  
  antiSpam: {
    enabled: false,
    messageLimit: 5,
    timeframe: 5000,
    action: 'warn'
  },
  antiLink: {
    enabled: false,
    whitelistedDomains: ['discord.com', 'youtube.com', 'twitch.tv'],
    action: 'delete'
  },
  antiInvite: {
    enabled: false,
    allowOwnServer: true,
    action: 'delete'
  },
  badWords: {
    enabled: false,
    words: [],
    action: 'delete'
  },
  massMention: {
    enabled: false,
    maxMentions: 5,
    action: 'warn'
  },
  capsLock: {
    enabled: false,
    maxPercent: 70,
    minLength: 10,
    action: 'delete'
  },
  emojiSpam: {
    enabled: false,
    maxEmojis: 10,
    action: 'delete'
  }
};

// ============ Automod Manager Class ============

export class AutomodManager {
  private static instance: AutomodManager;
  private spamTrackers: Map<string, SpamTracker> = new Map();
  private configCache: Map<string, AutomodConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): AutomodManager {
    if (!AutomodManager.instance) {
      AutomodManager.instance = new AutomodManager();
    }
    return AutomodManager.instance;
  }

  // ============ Main Check Method ============

  async checkMessage(message: Message): Promise<boolean> {
    // Skip DMs, bots, webhooks
    if (!message.guild || message.author.bot || message.webhookId) return false;

    const config = await this.getConfig(message.guild.id);
    if (!config.enabled) return false;

    const member = message.member;
    if (!member) return false;

    // Skip if user has admin or is in ignored role
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return false;
    if (config.ignoredRoles.some(roleId => member.roles.cache.has(roleId))) return false;
    if (config.ignoredChannels.includes(message.channel.id)) return false;

    // Run all enabled checks
    const violations: { type: string; action: AutomodAction; reason: string }[] = [];

    // Anti-Spam
    if (config.antiSpam.enabled) {
      const spamResult = this.checkSpam(message, config.antiSpam);
      if (spamResult) violations.push({ type: 'spam', ...spamResult });
    }

    // Anti-Link
    if (config.antiLink.enabled) {
      const linkResult = this.checkLinks(message, config.antiLink);
      if (linkResult) violations.push({ type: 'link', ...linkResult });
    }

    // Anti-Invite
    if (config.antiInvite.enabled) {
      const inviteResult = await this.checkInvites(message, config.antiInvite);
      if (inviteResult) violations.push({ type: 'invite', ...inviteResult });
    }

    // Bad Words
    if (config.badWords.enabled && config.badWords.words.length > 0) {
      const badWordResult = this.checkBadWords(message, config.badWords);
      if (badWordResult) violations.push({ type: 'badword', ...badWordResult });
    }

    // Mass Mention
    if (config.massMention.enabled) {
      const mentionResult = this.checkMassMention(message, config.massMention);
      if (mentionResult) violations.push({ type: 'mention', ...mentionResult });
    }

    // Caps Lock
    if (config.capsLock.enabled) {
      const capsResult = this.checkCapsLock(message, config.capsLock);
      if (capsResult) violations.push({ type: 'caps', ...capsResult });
    }

    // Emoji Spam
    if (config.emojiSpam.enabled) {
      const emojiResult = this.checkEmojiSpam(message, config.emojiSpam);
      if (emojiResult) violations.push({ type: 'emoji', ...emojiResult });
    }

    // Process violations
    if (violations.length > 0) {
      // Get the most severe action
      const severity = { delete: 1, warn: 2, mute: 3, kick: 4, ban: 5 };
      const mostSevere = violations.sort((a, b) => severity[b.action] - severity[a.action])[0];
      
      await this.executeAction(message, mostSevere.action, mostSevere.reason, config);
      return true;
    }

    return false;
  }

  // ============ Individual Checks ============

  private checkSpam(message: Message, config: AutomodConfig['antiSpam']): { action: AutomodAction; reason: string } | null {
    const key = `${message.guild!.id}-${message.author.id}`;
    const now = Date.now();
    
    let tracker = this.spamTrackers.get(key);
    if (!tracker) {
      tracker = { messages: [], lastMessage: '', duplicateCount: 0 };
      this.spamTrackers.set(key, tracker);
    }

    // Remove old messages from tracker
    tracker.messages = tracker.messages.filter(ts => now - ts < config.timeframe);
    tracker.messages.push(now);

    // Check for duplicate messages
    if (message.content === tracker.lastMessage) {
      tracker.duplicateCount++;
    } else {
      tracker.duplicateCount = 0;
      tracker.lastMessage = message.content;
    }

    // Check violations
    if (tracker.messages.length > config.messageLimit) {
      return { action: config.action, reason: `Spam detected (${tracker.messages.length} messages in ${config.timeframe / 1000}s)` };
    }

    if (tracker.duplicateCount >= 3) {
      return { action: config.action, reason: 'Duplicate message spam detected' };
    }

    return null;
  }

  private checkLinks(message: Message, config: AutomodConfig['antiLink']): { action: AutomodAction; reason: string } | null {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const links = message.content.match(urlRegex);
    
    if (!links) return null;

    for (const link of links) {
      try {
        const url = new URL(link);
        const domain = url.hostname.replace('www.', '');
        
        // Check if domain is whitelisted
        if (!config.whitelistedDomains.some(d => domain.includes(d))) {
          return { action: config.action, reason: `Unauthorized link detected: ${domain}` };
        }
      } catch {
        // Invalid URL, still flag it
        return { action: config.action, reason: 'Invalid link detected' };
      }
    }

    return null;
  }

  private async checkInvites(message: Message, config: AutomodConfig['antiInvite']): Promise<{ action: AutomodAction; reason: string } | null> {
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
    const invites = message.content.match(inviteRegex);
    
    if (!invites) return null;

    if (config.allowOwnServer) {
      // Check if invite is for own server
      try {
        const guildInvites = await message.guild!.invites.fetch();
        const guildCodes = guildInvites.map(i => i.code);
        
        for (const invite of invites) {
          const code = invite.split('/').pop();
          if (!guildCodes.includes(code!)) {
            return { action: config.action, reason: 'External server invite detected' };
          }
        }
      } catch {
        // Can't fetch invites, block all
        return { action: config.action, reason: 'Discord invite detected' };
      }
    } else {
      return { action: config.action, reason: 'Discord invite detected' };
    }

    return null;
  }

  private checkBadWords(message: Message, config: AutomodConfig['badWords']): { action: AutomodAction; reason: string } | null {
    const content = message.content.toLowerCase();
    
    for (const word of config.words) {
      const regex = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(content)) {
        return { action: config.action, reason: 'Prohibited word detected' };
      }
    }

    return null;
  }

  private checkMassMention(message: Message, config: AutomodConfig['massMention']): { action: AutomodAction; reason: string } | null {
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    
    if (message.mentions.everyone) {
      return { action: config.action, reason: 'Everyone/here mention' };
    }

    if (totalMentions > config.maxMentions) {
      return { action: config.action, reason: `Mass mention detected (${totalMentions} mentions)` };
    }

    return null;
  }

  private checkCapsLock(message: Message, config: AutomodConfig['capsLock']): { action: AutomodAction; reason: string } | null {
    const content = message.content.replace(/[^a-zA-Z]/g, '');
    
    if (content.length < config.minLength) return null;

    const upperCount = (content.match(/[A-Z]/g) || []).length;
    const capsPercent = (upperCount / content.length) * 100;

    if (capsPercent > config.maxPercent) {
      return { action: config.action, reason: `Excessive caps lock (${Math.round(capsPercent)}%)` };
    }

    return null;
  }

  private checkEmojiSpam(message: Message, config: AutomodConfig['emojiSpam']): { action: AutomodAction; reason: string } | null {
    // Match both Unicode emojis and Discord custom emojis
    const unicodeEmojis = message.content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
    const customEmojis = message.content.match(/<a?:\w+:\d+>/g) || [];
    const totalEmojis = unicodeEmojis.length + customEmojis.length;

    if (totalEmojis > config.maxEmojis) {
      return { action: config.action, reason: `Emoji spam detected (${totalEmojis} emojis)` };
    }

    return null;
  }

  // ============ Action Execution ============

  private async executeAction(message: Message, action: AutomodAction, reason: string, config: AutomodConfig) {
    const member = message.member!;

    // Always try to delete the message first (except for kick/ban only)
    if (action !== 'kick' && action !== 'ban') {
      await message.delete().catch(() => {});
    }

    // Log the violation
    await this.logViolation(message, action, reason, config);

    try {
      switch (action) {
        case 'warn':
          await this.sendWarning(message, reason);
          break;
          
        case 'delete':
          // Already deleted above
          await this.sendWarning(message, reason);
          break;
          
        case 'mute':
          await this.muteMember(member, reason, config);
          break;
          
        case 'kick':
          if (member.kickable) {
            await message.delete().catch(() => {});
            await member.kick(`[Automod] ${reason}`);
          }
          break;
          
        case 'ban':
          if (member.bannable) {
            await message.delete().catch(() => {});
            await member.ban({ reason: `[Automod] ${reason}`, deleteMessageSeconds: 86400 });
          }
          break;
      }

      // Log to database
      await ModerationLog.create({
        guildId: message.guild!.id,
        targetId: message.author.id,
        targetTag: message.author.tag,
        moderatorId: message.client.user!.id,
        moderatorTag: 'Automod',
        action: action === 'delete' ? 'warn' : action,
        reason: `[Automod] ${reason}`,
      } as any);

    } catch (error) {
      console.error('[Automod] Failed to execute action:', error);
    }
  }

  private async sendWarning(message: Message, reason: string) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle('⚠️ Automod Warning')
      .setDescription(`${message.author}, your message was removed.\n**Reason:** ${reason}`)
      .setFooter({ text: 'Repeated violations may result in further action' })
      .setTimestamp();

    const channel = message.channel as TextChannel;
    const warning = await channel.send({ embeds: [embed] });
    
    // Delete warning after 10 seconds
    setTimeout(() => warning.delete().catch(() => {}), 10000);
  }

  private async muteMember(member: GuildMember, reason: string, config: AutomodConfig) {
    // Try to use timeout first (modern approach)
    try {
      await member.timeout(10 * 60 * 1000, `[Automod] ${reason}`); // 10 minute timeout
    } catch {
      // Fallback: Try to find and add mute role
      const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id }) as any;
      if (guildConfig?.muteRoleId) {
        const muteRole = member.guild.roles.cache.get(guildConfig.muteRoleId);
        if (muteRole) {
          await member.roles.add(muteRole, `[Automod] ${reason}`);
        }
      }
    }
  }

  private async logViolation(message: Message, action: AutomodAction, reason: string, config: AutomodConfig) {
    if (!config.logChannelId) return;

    const logChannel = message.guild!.channels.cache.get(config.logChannelId) as TextChannel;
    if (!logChannel) return;

    const actionEmojis = {
      warn: '⚠️',
      delete: '🗑️',
      mute: '🔇',
      kick: '👢',
      ban: '🔨'
    };

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.moderation)
      .setTitle(`${actionEmojis[action]} Automod Action`)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: '👤 User', value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
        { name: '📍 Channel', value: `${message.channel}`, inline: true },
        { name: '⚡ Action', value: action.toUpperCase(), inline: true },
        { name: '📝 Reason', value: reason },
        { name: '💬 Message Content', value: message.content.slice(0, 1000) || '*No text content*' }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }

  // ============ Config Management ============

  async getConfig(guildId: string): Promise<AutomodConfig> {
    // Check cache
    const cached = this.configCache.get(guildId);
    const expiry = this.cacheExpiry.get(guildId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Fetch from database
    const guildConfig = await GuildConfig.findOne({ guildId }) as any;
    const config = guildConfig?.automod || DEFAULT_AUTOMOD_CONFIG;

    // Cache it
    this.configCache.set(guildId, config);
    this.cacheExpiry.set(guildId, Date.now() + this.CACHE_TTL);

    return config;
  }

  invalidateCache(guildId: string) {
    this.configCache.delete(guildId);
    this.cacheExpiry.delete(guildId);
  }

  // Cleanup old spam trackers periodically
  cleanup() {
    const now = Date.now();
    for (const [key, tracker] of this.spamTrackers.entries()) {
      if (tracker.messages.every(ts => now - ts > 60000)) {
        this.spamTrackers.delete(key);
      }
    }
  }
}

// Export singleton instance
export const automod = AutomodManager.getInstance();

// Cleanup interval
setInterval(() => automod.cleanup(), 60000);
