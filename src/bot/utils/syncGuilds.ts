// ===========================================
// ASTRA BOT - Sync Guilds Utility
// ===========================================

import { Client } from 'discord.js';
import { GuildConfig } from '../../database/models/index.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Sync all guilds the bot is in to the database
 * This ensures existing guilds are recognized in the dashboard
 */
export async function syncGuilds(client: Client<true>): Promise<void> {
  logger.bot.info('Syncing guilds to database...');
  
  let created = 0;
  let updated = 0;
  
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const existing = await GuildConfig.findOne({ guildId });
      
      if (!existing) {
        await GuildConfig.create({
          guildId: guild.id,
          guildName: guild.name,
        });
        created++;
      } else if (existing.guildName !== guild.name) {
        existing.guildName = guild.name;
        await existing.save();
        updated++;
      }
    } catch (error) {
      logger.error(`Failed to sync guild ${guild.name}:`, error);
    }
  }
  
  logger.bot.info(`✓ Guild sync complete: ${created} created, ${updated} updated`);
}
