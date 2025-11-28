// ===========================================
// ASTRA BOT - Message Create Event (Leveling/XP)
// ===========================================

import { Message } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { GuildConfig, UserLevel } from '../../database/models/index.js';
import { randomInt } from '../../shared/utils/index.js';
import { automod } from '../systems/automod/index.js';
import type { BotEvent } from '../../shared/types/index.js';

// XP cooldown cache (in-memory for performance)
const xpCooldowns = new Map<string, number>();

const event: BotEvent = {
  name: 'messageCreate',
  once: false,
  execute: async (message: Message) => {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;
    
    try {
      // Run automod checks first
      const automodTriggered = await automod.checkMessage(message);
      if (automodTriggered) return; // Message was handled by automod
      
      // Get guild config
      const config = await GuildConfig.findOne({ guildId: message.guild.id });
      
      if (!config || !config.modules.leveling || !config.leveling.enabled) {
        return;
      }
      
      const levelingConfig = config.leveling;
      
      // Check if channel is ignored
      if (levelingConfig.ignoredChannels.includes(message.channel.id)) {
        return;
      }
      
      // Check if user has ignored role
      const member = message.member;
      if (member) {
        const hasIgnoredRole = levelingConfig.ignoredRoles.some(
          roleId => member.roles.cache.has(roleId)
        );
        if (hasIgnoredRole) return;
      }
      
      // Check cooldown
      const cooldownKey = `${message.guild.id}-${message.author.id}`;
      const now = Date.now();
      const cooldownTime = xpCooldowns.get(cooldownKey);
      
      if (cooldownTime && now < cooldownTime) {
        return;
      }
      
      // Set new cooldown
      xpCooldowns.set(cooldownKey, now + (levelingConfig.xpCooldown * 1000));
      
      // Calculate XP with multipliers
      let xpGain = levelingConfig.xpPerMessage;
      
      // Apply role multipliers
      if (member && levelingConfig.multipliers) {
        for (const mult of levelingConfig.multipliers) {
          if (member.roles.cache.has(mult.roleId)) {
            xpGain = Math.floor(xpGain * mult.multiplier);
            break; // Only apply highest multiplier
          }
        }
      }
      
      // Add some randomness
      xpGain = randomInt(Math.floor(xpGain * 0.8), Math.floor(xpGain * 1.2));
      
      // Get or create user level
      let userLevel = await UserLevel.findOne({
        discordId: message.author.id,
        guildId: message.guild.id,
      });
      
      if (!userLevel) {
        userLevel = await UserLevel.create({
          discordId: message.author.id,
          guildId: message.guild.id,
        });
      }
      
      // Add XP and check for level up
      const result = await (userLevel as any).addXp(xpGain);
      
      if (result.leveledUp) {
        // Send level up message
        await sendLevelUpMessage(message, result.newLevel, levelingConfig);
        
        // Check for role rewards
        await checkRoleRewards(message, result.newLevel, levelingConfig);
      }
      
    } catch (error) {
      logger.error('Error in messageCreate leveling:', error);
    }
  },
};

async function sendLevelUpMessage(
  message: Message,
  newLevel: number,
  config: any
): Promise<void> {
  const levelUpMessage = config.levelUpMessage
    .replace(/{user}/g, message.author.toString())
    .replace(/{level}/g, newLevel.toString())
    .replace(/{username}/g, message.author.username);
  
  // Determine where to send the message
  const channelId = config.levelUpChannelId || message.channel.id;
  const channel = message.guild?.channels.cache.get(channelId);
  
  if (channel && channel.isTextBased()) {
    try {
      await channel.send(levelUpMessage);
    } catch (error) {
      logger.error('Failed to send level up message:', error);
    }
  }
}

async function checkRoleRewards(
  message: Message,
  newLevel: number,
  config: any
): Promise<void> {
  if (!config.roleRewards || !message.member) return;
  
  for (const reward of config.roleRewards) {
    if (reward.level === newLevel) {
      const role = message.guild?.roles.cache.get(reward.roleId);
      if (role) {
        try {
          await message.member.roles.add(role);
          logger.debug(`Added role reward ${role.name} to ${message.author.tag}`);
        } catch (error) {
          logger.error(`Failed to add role reward:`, error);
        }
      }
    }
  }
}

export default event;
