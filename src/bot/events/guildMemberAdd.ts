// ===========================================
// ASTRA BOT - Guild Member Add Event (Welcome)
// ===========================================

import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { GuildConfig } from '../../database/models/index.js';
import { EMBED_COLORS } from '../../shared/constants/index.js';
import type { BotEvent } from '../../shared/types/index.js';

const event: BotEvent = {
  name: 'guildMemberAdd',
  once: false,
  execute: async (member: GuildMember) => {
    try {
      // Get guild config
      const config = await GuildConfig.findOne({ guildId: member.guild.id });
      
      if (!config || !config.modules.welcome || !config.welcome.enabled) {
        return;
      }
      
      const welcomeConfig = config.welcome;
      
      // Send welcome message to channel
      if (welcomeConfig.channelId) {
        const channel = member.guild.channels.cache.get(welcomeConfig.channelId) as TextChannel;
        
        if (channel) {
          const message = formatWelcomeMessage(welcomeConfig.message, member);
          
          if (welcomeConfig.embedEnabled) {
            const embed = new EmbedBuilder()
              .setColor(welcomeConfig.embedColor as `#${string}`)
              .setTitle(formatWelcomeMessage(welcomeConfig.embedTitle, member))
              .setDescription(formatWelcomeMessage(welcomeConfig.embedDescription, member))
              .setTimestamp();
            
            if (welcomeConfig.embedThumbnail) {
              embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            }
            
            if (welcomeConfig.embedImage) {
              embed.setImage(welcomeConfig.embedImage);
            }
            
            await channel.send({ content: message, embeds: [embed] });
          } else {
            await channel.send(message);
          }
        }
      }
      
      // Send DM if enabled
      if (welcomeConfig.dmEnabled && welcomeConfig.dmMessage) {
        try {
          const dmMessage = formatWelcomeMessage(welcomeConfig.dmMessage, member);
          await member.send(dmMessage);
        } catch {
          // User might have DMs disabled
          logger.debug(`Could not send welcome DM to ${member.user.tag}`);
        }
      }
      
      // Add auto roles
      if (welcomeConfig.autoRoles && welcomeConfig.autoRoles.length > 0) {
        for (const roleId of welcomeConfig.autoRoles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            try {
              await member.roles.add(role);
            } catch (error) {
              logger.error(`Failed to add auto role ${roleId} to ${member.user.tag}:`, error);
            }
          }
        }
      }
      
    } catch (error) {
      logger.error('Error in guildMemberAdd event:', error);
    }
  },
};

function formatWelcomeMessage(template: string, member: GuildMember): string {
  return template
    .replace(/{user}/g, member.toString())
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString());
}

export default event;
