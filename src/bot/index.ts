// ===========================================
// ASTRA BOT - Discord Bot Entry Point
// ===========================================

import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { config } from 'dotenv';
import { logger } from '../shared/utils/logger.js';
import { connectDatabase } from '../database/index.js';
import { loadCommands, loadEvents } from './handlers/index.js';
import type { BotCommand } from '../shared/types/index.js';

// Load environment variables
config();

// Extend Client type to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, BotCommand>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}

// Create Discord client with necessary intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true,
  },
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Make client globally available for API
(global as any).discordClient = client;

// Main startup function
async function start(): Promise<void> {
  try {
    logger.startup('ASTRA BOT');
    logger.bot.info('Initializing...');
    
    // Connect to database
    logger.db.info('Connecting to MongoDB...');
    await connectDatabase();
    logger.db.info('✓ Database connected');
    
    // Load commands and events
    logger.bot.info('Loading commands...');
    await loadCommands(client);
    
    logger.bot.info('Loading events...');
    await loadEvents(client);
    
    // Login to Discord
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }
    
    logger.bot.info('Connecting to Discord...');
    await client.login(token);
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the bot
start();

export default client;
