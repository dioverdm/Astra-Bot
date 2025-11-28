// ===========================================
// ASTRA BOT - Interaction Create Event
// ===========================================

import { 
  Interaction, 
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  Collection,
  PermissionsBitField,
  GuildMember
} from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { errorEmbed } from '../../shared/utils/index.js';
import { DEFAULT_COOLDOWN } from '../../shared/constants/index.js';
import { giveawayManager } from '../systems/giveaway/index.js';
import type { BotEvent, BotCommand } from '../../shared/types/index.js';

const event: BotEvent = {
  name: 'interactionCreate',
  once: false,
  execute: async (interaction: Interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }
    
    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }
    
    // Handle button interactions
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
    
    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      // Select menu handling will be implemented per-module
      return;
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      // Modal handling will be implemented per-module
      return;
    }
  },
};

async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const client = interaction.client;
  const command = client.commands.get(interaction.commandName) as BotCommand | undefined;
  
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }
  
  // Check if command is guild-only
  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed('This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }
  
  // Check if command is owner-only
  if (command.ownerOnly) {
    const ownerId = process.env.BOT_OWNER_ID;
    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        embeds: [errorEmbed('This command is restricted to the bot owner.')],
        ephemeral: true,
      });
      return;
    }
  }
  
  // Check permissions
  if (command.permissions && interaction.guild) {
    const member = interaction.member;
    if (member && 'permissions' in member) {
      const memberPerms = member.permissions as PermissionsBitField;
      const missingPerms = command.permissions.filter(
        perm => !memberPerms.has(perm)
      );
      
      if (missingPerms.length > 0) {
        await interaction.reply({
          embeds: [errorEmbed(`You need the following permissions: ${missingPerms.join(', ')}`)],
          ephemeral: true,
        });
        return;
      }
    }
  }
  
  // Handle cooldowns
  const cooldownAmount = (command.cooldown ?? DEFAULT_COOLDOWN) * 1000;
  
  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }
  
  const now = Date.now();
  const timestamps = client.cooldowns.get(command.data.name)!;
  
  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
    
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      await interaction.reply({
        embeds: [errorEmbed(`Please wait ${timeLeft.toFixed(1)} seconds before using \`/${command.data.name}\` again.`)],
        ephemeral: true,
      });
      return;
    }
  }
  
  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  
  // Execute the command
  try {
    await command.execute(interaction);
    logger.debug(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = 'An error occurred while executing this command.';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        embeds: [errorEmbed(errorMessage)],
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        embeds: [errorEmbed(errorMessage)],
        ephemeral: true,
      });
    }
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const client = interaction.client;
  const command = client.commands.get(interaction.commandName) as BotCommand | undefined;
  
  if (!command || !command.autocomplete) {
    return;
  }
  
  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  // Giveaway button handling
  if (interaction.customId === 'giveaway_enter') {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: 'This can only be used in a server!', ephemeral: true });
      return;
    }

    const result = await giveawayManager.enter(
      interaction.message.id,
      interaction.user.id,
      interaction.member as GuildMember
    );

    await interaction.reply({ 
      content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
      ephemeral: true 
    });
    return;
  }

  // Other button handlers can be added here
}

export default event;
