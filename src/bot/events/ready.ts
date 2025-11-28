// ===========================================
// ASTRA BOT - Ready Event
// ===========================================

import { ActivityType, Client, REST, Routes } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { syncGuilds } from '../utils/syncGuilds.js';
import { giveawayManager } from '../systems/giveaway/index.js';
import { musicPlayer } from '../systems/music/index.js';
import { BOT_LINKS } from '../../shared/constants/index.js';
import type { BotEvent, BotCommand } from '../../shared/types/index.js';

// Deploy slash commands to Discord with proper cleanup
async function deploySlashCommands(client: Client<true>): Promise<void> {
  try {
    const token = process.env.DISCORD_TOKEN;
    const clientId = client.user.id;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (!token) {
      logger.warn('DISCORD_TOKEN not set, skipping command deployment');
      return;
    }
    
    // Get commands from client
    const commands = Array.from(client.commands.values()) as BotCommand[];
    const commandData = commands.map(cmd => cmd.data.toJSON());
    
    if (commandData.length === 0) {
      logger.warn('No commands to deploy');
      return;
    }
    
    const rest = new REST({ version: '10' }).setToken(token);
    
    logger.bot.info(`🚀 Deploying ${commandData.length} slash commands...`);
    
    if (guildId) {
      // Clear global commands first to avoid duplicates
      try {
        const globalCommands = await rest.get(Routes.applicationCommands(clientId)) as any[];
        if (globalCommands.length > 0) {
          logger.bot.info(`🧹 Clearing ${globalCommands.length} global commands to avoid duplicates...`);
          await rest.put(Routes.applicationCommands(clientId), { body: [] });
        }
      } catch (e) {
        logger.debug('Could not check/clear global commands:', e);
      }
      
      // Deploy to specific guild (instant)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );
      logger.bot.info(`✅ Deployed ${commandData.length} commands to guild ${guildId}`);
    } else {
      // Clear guild commands from all guilds to avoid duplicates
      for (const guild of client.guilds.cache.values()) {
        try {
          const guildCommands = await rest.get(
            Routes.applicationGuildCommands(clientId, guild.id)
          ) as any[];
          if (guildCommands.length > 0) {
            logger.bot.info(`🧹 Clearing ${guildCommands.length} commands from guild ${guild.name}...`);
            await rest.put(
              Routes.applicationGuildCommands(clientId, guild.id),
              { body: [] }
            );
          }
        } catch (e) {
          // Skip guilds where we can't clear commands
        }
      }
      
      // Deploy globally (can take up to 1 hour)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandData }
      );
      logger.bot.info(`✅ Deployed ${commandData.length} commands globally`);
    }
  } catch (error) {
    logger.error('Failed to deploy slash commands:', error);
  }
}

const event: BotEvent = {
  name: 'clientReady',
  once: true,
  execute: async (client: Client<true>) => {
    logger.bot.info(`✨ ${client.user.tag} is online!`);
    logger.bot.info(`📊 Serving ${client.guilds.cache.size} guilds`);
    logger.bot.info(`👥 Watching ${client.users.cache.size} users`);
    
    // Sync guilds to database (for dashboard recognition)
    await syncGuilds(client);
    
    // Initialize giveaway manager
    giveawayManager.initialize(client);
    
    // Initialize music player
    await musicPlayer.initialize(client);
    
    // Deploy slash commands
    await deploySlashCommands(client);
    
    // Get website domain for status
    const websiteDomain = BOT_LINKS.website.replace(/^https?:\/\//, '');
    
    // Set bot presence
    client.user.setPresence({
      activities: [
        {
          name: `/help | ${websiteDomain}`,
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });
    
    // Rotate status every 30 seconds
    const statuses = [
      { name: `/help | ${websiteDomain}`, type: ActivityType.Watching },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'anime & chill', type: ActivityType.Playing },
      { name: 'your commands', type: ActivityType.Listening },
    ];
    
    let statusIndex = 0;
    setInterval(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      client.user.setActivity(statuses[statusIndex].name, { type: statuses[statusIndex].type });
    }, 30000);
  },
};

export default event;
