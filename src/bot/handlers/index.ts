// ===========================================
// ASTRA BOT - Command & Event Handlers
// ===========================================

import { Client, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/utils/logger.js';
import type { BotCommand, BotEvent } from '../../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load all commands from the commands directory
export async function loadCommands(client: Client): Promise<void> {
  // Clear existing commands first to prevent duplicates on reload
  client.commands.clear();
  
  const commandsPath = join(__dirname, '..', 'commands');
  const commandFolders = readdirSync(commandsPath);
  
  let loadedCount = 0;
  
  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(
      file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')
    );
    
    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      try {
        const commandModule = await import(filePath);
        const command: BotCommand = commandModule.default || commandModule;
        
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          loadedCount++;
          logger.debug(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Command at ${filePath} is missing required properties`);
        }
      } catch (error) {
        logger.error(`Failed to load command at ${filePath}:`, error);
      }
    }
  }
  
  logger.info(`✅ Loaded ${loadedCount} commands`);
}

// Load all events from the events directory
export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');
  const eventFiles = readdirSync(eventsPath).filter(
    file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')
  );
  
  let loadedCount = 0;
  
  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const eventModule = await import(filePath);
      const event: BotEvent = eventModule.default || eventModule;
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      loadedCount++;
      logger.debug(`Loaded event: ${event.name}`);
    } catch (error) {
      logger.error(`Failed to load event at ${filePath}:`, error);
    }
  }
  
  logger.info(`✅ Loaded ${loadedCount} events`);
}

// Deploy slash commands to Discord
export async function deployCommands(
  commands: BotCommand[],
  options: { global?: boolean; guildId?: string } = {}
): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set');
  }
  
  const rest = new REST({ version: '10' }).setToken(token);
  const commandData = commands.map(cmd => cmd.data.toJSON());
  
  try {
    logger.info(`Started refreshing ${commandData.length} application (/) commands.`);
    
    if (options.global) {
      // Deploy globally
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      logger.info('Successfully deployed commands globally.');
    } else if (options.guildId) {
      // Deploy to specific guild
      await rest.put(
        Routes.applicationGuildCommands(clientId, options.guildId),
        { body: commandData }
      );
      logger.info(`Successfully deployed commands to guild ${options.guildId}.`);
    } else {
      // Deploy to dev guild if set
      const devGuildId = process.env.DISCORD_GUILD_ID;
      if (devGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(clientId, devGuildId),
          { body: commandData }
        );
        logger.info(`Successfully deployed commands to dev guild ${devGuildId}.`);
      } else {
        // Default to global
        await rest.put(Routes.applicationCommands(clientId), { body: commandData });
        logger.info('Successfully deployed commands globally.');
      }
    }
  } catch (error) {
    logger.error('Failed to deploy commands:', error);
    throw error;
  }
}
