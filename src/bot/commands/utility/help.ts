// ===========================================
// ASTRA BOT - Help Command (Dynamic & Modern)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AutocompleteInteraction
} from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EMBED_COLORS, EMOJIS, BOT_LINKS, generateBotInviteUrl } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Category metadata with emojis and descriptions
const CATEGORY_META: Record<string, { emoji: string; description: string; color: number }> = {
  moderation: { 
    emoji: '🛡️', 
    description: 'Keep your server safe with powerful moderation tools',
    color: 0xED4245 // Red
  },
  utility: { 
    emoji: '🔧', 
    description: 'Useful commands for information and utilities',
    color: 0x5865F2 // Blurple
  },
  fun: { 
    emoji: '🎮', 
    description: 'Entertainment and fun commands',
    color: 0xFEE75C // Yellow
  },
  leveling: { 
    emoji: '📊', 
    description: 'Track your progress and compete with others',
    color: 0x57F287 // Green
  },
  economy: { 
    emoji: '💰', 
    description: 'Earn, spend, and manage your virtual currency',
    color: 0xF1C40F // Gold
  },
  music: { 
    emoji: '🎵', 
    description: 'Listen to music with your friends',
    color: 0x1DB954 // Spotify Green
  },
  admin: { 
    emoji: '⚙️', 
    description: 'Server configuration and admin commands',
    color: 0x99AAB5 // Grey
  },
};

// Dynamically get categories from command folders
function getCategories(): string[] {
  try {
    const commandsPath = join(__dirname, '..');
    return readdirSync(commandsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch {
    return Object.keys(CATEGORY_META);
  }
}

// Get commands grouped by their folder (category)
function getCommandsByCategory(client: any): Map<string, BotCommand[]> {
  const categorized = new Map<string, BotCommand[]>();
  
  // Get all commands from client
  const commands = Array.from(client.commands.values()) as BotCommand[];
  
  // Try to determine category from file path or use mapping
  for (const cmd of commands) {
    let category = 'utility'; // default
    
    // Check command name against known categories
    const cmdName = cmd.data.name;
    
    if (['ban', 'kick', 'timeout', 'warn', 'mute', 'unmute', 'clear', 'slowmode', 'lock', 'unlock', 'softban'].includes(cmdName)) {
      category = 'moderation';
    } else if (['anime', 'waifu', '8ball', 'meme', 'joke'].includes(cmdName)) {
      category = 'fun';
    } else if (['rank', 'leaderboard', 'setlevel', 'setxp', 'level'].includes(cmdName)) {
      category = 'leveling';
    } else if (['balance', 'daily', 'work', 'pay', 'shop', 'buy', 'inventory', 'rob', 'slots', 'coinflip', 'deposit', 'withdraw'].includes(cmdName)) {
      category = 'economy';
    } else if (['play', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'loop', 'shuffle', 'pause', 'resume'].includes(cmdName)) {
      category = 'music';
    } else if (['setup', 'config', 'settings', 'prefix', 'welcome', 'autorole'].includes(cmdName)) {
      category = 'admin';
    }
    
    if (!categorized.has(category)) {
      categorized.set(category, []);
    }
    categorized.get(category)!.push(cmd);
  }
  
  return categorized;
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with Astra commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('View commands in a specific category')
        .setRequired(false)
        .addChoices(
          { name: '🛡️ Moderation', value: 'moderation' },
          { name: '🔧 Utility', value: 'utility' },
          { name: '🎮 Fun', value: 'fun' },
          { name: '📊 Leveling', value: 'leveling' },
          { name: '💰 Economy', value: 'economy' }
        )
    ),
    
  cooldown: 3,
  
  // Autocomplete for command names
  autocomplete: async (interaction: AutocompleteInteraction) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const commands = Array.from(interaction.client.commands.values()) as BotCommand[];
    
    const filtered = commands
      .filter(cmd => cmd.data.name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(cmd => ({
        name: `/${cmd.data.name} - ${cmd.data.description.slice(0, 50)}`,
        value: cmd.data.name
      }));
    
    await interaction.respond(filtered);
  },
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const commandName = interaction.options.getString('command');
    const categoryName = interaction.options.getString('category');
    const client = interaction.client;
    
    // Get commands grouped by category
    const commandsByCategory = getCommandsByCategory(client);
    const totalCommands = Array.from(client.commands.values()).length;
    
    // Show specific command help
    if (commandName) {
      const cmd = client.commands.get(commandName.toLowerCase()) as BotCommand | undefined;
      
      if (!cmd) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.error)
          .setDescription(`${EMOJIS.error} Command \`${commandName}\` not found.\n\nUse \`/help\` to see all available commands.`);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      const embed = createCommandEmbed(cmd, client);
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️')
        );
      
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }
    
    // Show specific category
    if (categoryName) {
      const embed = createCategoryEmbed(categoryName, commandsByCategory, client);
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️')
        );
      
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }
    
    // Main help menu
    const mainEmbed = createMainEmbed(client, commandsByCategory, totalCommands);
    const selectMenu = createCategorySelect(commandsByCategory);
    
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);
    
    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`${BOT_LINKS.website}/dashboard`)
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setStyle(ButtonStyle.Link)
          .setURL(generateBotInviteUrl(client.user?.id || ''))
          .setEmoji('➕'),
        new ButtonBuilder()
          .setLabel('Support')
          .setStyle(ButtonStyle.Link)
          .setURL(BOT_LINKS.supportServer)
          .setEmoji('💬')
      );
    
    const response = await interaction.reply({ 
      embeds: [mainEmbed], 
      components: [selectRow, buttonRow] 
    });
    
    // Handle interactions
    const collector = response.createMessageComponentCollector({
      time: 120000 // 2 minutes
    });
    
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '❌ This menu is not for you!', ephemeral: true });
        return;
      }
      
      if (i.isStringSelectMenu() && i.customId === 'help_category_select') {
        const category = i.values[0];
        const categoryEmbed = createCategoryEmbed(category, commandsByCategory, client);
        
        await i.update({ embeds: [categoryEmbed] });
      }
      
      if (i.isButton() && i.customId === 'help_back') {
        const newMainEmbed = createMainEmbed(client, commandsByCategory, totalCommands);
        await i.update({ embeds: [newMainEmbed] });
      }
    });
    
    collector.on('end', async () => {
      const disabledSelect = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(disabledSelect);
      
      await response.edit({ components: [disabledRow, buttonRow] }).catch(() => {});
    });
  },
};

// Create main help embed
function createMainEmbed(client: any, commandsByCategory: Map<string, BotCommand[]>, totalCommands: number): EmbedBuilder {
  const categories = Array.from(commandsByCategory.entries())
    .filter(([_, cmds]) => cmds.length > 0)
    .map(([cat, cmds]) => {
      const meta = CATEGORY_META[cat] || { emoji: '📁', description: 'Other commands' };
      return `${meta.emoji} **${cat.charAt(0).toUpperCase() + cat.slice(1)}** — ${cmds.length} commands`;
    });
  
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.info)
    .setAuthor({ 
      name: '✨ Astra Help Center', 
      iconURL: client.user?.displayAvatarURL() 
    })
    .setDescription([
      '> Your all-in-one Discord companion for moderation,',
      '> leveling, economy, and entertainment!',
      '',
      '**📚 Categories**',
      categories.join('\n'),
      '',
      `**📊 Statistics**`,
      `• Total Commands: \`${totalCommands}\``,
      `• Servers: \`${client.guilds.cache.size}\``,
      `• Ping: \`${client.ws.ping}ms\``,
    ].join('\n'))
    .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) || null)
    .setFooter({ text: '💡 Tip: Use /help <command> for detailed info' })
    .setTimestamp();
}

// Create category embed
function createCategoryEmbed(category: string, commandsByCategory: Map<string, BotCommand[]>, client: any): EmbedBuilder {
  const meta = CATEGORY_META[category] || { emoji: '📁', description: 'Other commands', color: EMBED_COLORS.info };
  const commands = commandsByCategory.get(category) || [];
  
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setAuthor({ 
      name: `${meta.emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`, 
      iconURL: client.user?.displayAvatarURL() 
    })
    .setDescription(meta.description);
  
  if (commands.length > 0) {
    // Group commands in a nice format
    const commandList = commands
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .map(cmd => {
        const cooldown = cmd.cooldown ? `⏱️ ${cmd.cooldown}s` : '';
        return `\`/${cmd.data.name}\` ${cooldown}\n↳ ${cmd.data.description}`;
      })
      .join('\n\n');
    
    embed.addFields({ 
      name: `Commands (${commands.length})`, 
      value: commandList.slice(0, 1024) // Discord field limit
    });
  } else {
    embed.addFields({ 
      name: 'Commands', 
      value: '🚧 No commands in this category yet' 
    });
  }
  
  embed.setFooter({ text: '💡 Use /help <command> for detailed command info' });
  
  return embed;
}

// Create command detail embed
function createCommandEmbed(cmd: BotCommand, client: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.info)
    .setAuthor({ 
      name: `Command: /${cmd.data.name}`, 
      iconURL: client.user?.displayAvatarURL() 
    })
    .setDescription(cmd.data.description);
  
  // Usage
  const options = cmd.data.options || [];
  if (options.length > 0) {
    const usage = options.map((opt: any) => {
      return opt.required ? `<${opt.name}>` : `[${opt.name}]`;
    }).join(' ');
    
    embed.addFields({ 
      name: '📝 Usage', 
      value: `\`/${cmd.data.name} ${usage}\``,
      inline: false
    });
  }
  
  // Options
  if (options.length > 0) {
    const optionsText = options.map((opt: any) => {
      const required = opt.required ? '`required`' : '`optional`';
      const type = getOptionType(opt.type);
      return `**${opt.name}** ${required} ${type}\n↳ ${opt.description}`;
    }).join('\n\n');
    
    embed.addFields({ 
      name: '⚙️ Options', 
      value: optionsText.slice(0, 1024),
      inline: false
    });
  }
  
  // Metadata
  const metadata: string[] = [];
  if (cmd.cooldown) metadata.push(`⏱️ Cooldown: ${cmd.cooldown}s`);
  if (cmd.guildOnly) metadata.push('🏠 Server only');
  if (cmd.ownerOnly) metadata.push('👑 Owner only');
  if (cmd.permissions && cmd.permissions.length > 0) {
    metadata.push(`🔒 Requires permissions`);
  }
  
  if (metadata.length > 0) {
    embed.addFields({ 
      name: '📋 Info', 
      value: metadata.join(' • '),
      inline: false
    });
  }
  
  return embed;
}

// Create category select menu
function createCategorySelect(commandsByCategory: Map<string, BotCommand[]>): StringSelectMenuBuilder {
  const options = Array.from(commandsByCategory.entries())
    .filter(([_, cmds]) => cmds.length > 0)
    .map(([cat, cmds]) => {
      const meta = CATEGORY_META[cat] || { emoji: '📁', description: 'Other commands' };
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${cmds.length})`)
        .setDescription(meta.description.slice(0, 100))
        .setValue(cat)
        .setEmoji(meta.emoji);
    });
  
  return new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('🔍 Select a category to explore')
    .addOptions(options.length > 0 ? options : [
      new StringSelectMenuOptionBuilder()
        .setLabel('No categories available')
        .setValue('none')
        .setDescription('No commands loaded')
    ]);
}

// Get option type name
function getOptionType(type: number): string {
  const types: Record<number, string> = {
    1: '`subcommand`',
    2: '`subcommand group`',
    3: '`string`',
    4: '`integer`',
    5: '`boolean`',
    6: '`user`',
    7: '`channel`',
    8: '`role`',
    9: '`mentionable`',
    10: '`number`',
    11: '`attachment`',
  };
  return types[type] || '`unknown`';
}

export default command;
