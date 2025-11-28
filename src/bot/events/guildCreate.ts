// ===========================================
// ASTRA BOT - Guild Create Event
// ===========================================

import { Guild } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { GuildConfig } from '../../database/models/index.js';
import type { BotEvent } from '../../shared/types/index.js';

const event: BotEvent = {
  name: 'guildCreate',
  once: false,
  execute: async (guild: Guild) => {
    logger.bot.info(`✨ Joined new guild: ${guild.name} (${guild.id})`);
    logger.bot.info(`   Members: ${guild.memberCount}`);
    
    try {
      // Create guild config if it doesn't exist
      let config = await GuildConfig.findOne({ guildId: guild.id });
      
      if (!config) {
        config = await GuildConfig.create({
          guildId: guild.id,
          guildName: guild.name,
        });
        logger.db.info(`Created config for guild: ${guild.name}`);
      } else {
        // Update guild name if changed
        config.guildName = guild.name;
        await config.save();
      }
    } catch (error) {
      logger.error(`Failed to create config for guild ${guild.name}:`, error);
    }
  },
};

export default event;
