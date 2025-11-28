// ===========================================
// ASTRA BOT - Deploy Slash Commands
// ===========================================

import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';
import { logger } from '../shared/utils/logger.js';
import type { BotCommand } from '../shared/types/index.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  
  if (!token) {
    logger.error('DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
  }
  
  if (!clientId) {
    logger.error('DISCORD_CLIENT_ID is not set in environment variables');
    process.exit(1);
  }
  
  logger.startup('ASTRA COMMAND DEPLOYER');
  
  // Load all commands
  const commands: any[] = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFolders = readdirSync(commandsPath);
  
  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(
      file => file.endsWith('.ts') || file.endsWith('.js')
    );
    
    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      try {
        const commandModule = await import(filePath);
        const command: BotCommand = commandModule.default || commandModule;
        
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          logger.info(`📦 Loaded: /${command.data.name}`);
        }
      } catch (error) {
        logger.error(`Failed to load command at ${filePath}:`, error);
      }
    }
  }
  
  logger.info(`\n📊 Total commands: ${commands.length}`);
  
  // Create REST instance
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    // Check if we should deploy globally or to a specific guild
    const deployGlobal = process.argv.includes('--global');
    
    if (deployGlobal) {
      logger.info('\n🌍 Deploying commands globally...');
      logger.warn('Note: Global commands can take up to 1 hour to propagate.');
      
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      ) as any[];
      
      logger.info(`✅ Successfully deployed ${data.length} commands globally!`);
    } else if (guildId) {
      logger.info(`\n🏠 Deploying commands to guild: ${guildId}`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      ) as any[];
      
      logger.info(`✅ Successfully deployed ${data.length} commands to guild!`);
    } else {
      logger.info('\n🌍 Deploying commands globally (no DISCORD_GUILD_ID set)...');
      logger.warn('Note: Global commands can take up to 1 hour to propagate.');
      
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      ) as any[];
      
      logger.info(`✅ Successfully deployed ${data.length} commands globally!`);
    }
    
    logger.info('\n🎉 Command deployment complete!');
    
  } catch (error) {
    logger.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
