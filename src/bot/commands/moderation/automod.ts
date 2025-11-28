// ===========================================
// ASTRA BOT - Automod Configuration Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import { automod, DEFAULT_AUTOMOD_CONFIG, type AutomodConfig, type AutomodAction } from '../../systems/automod/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure the automoderation system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View current automod configuration')
    )
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable the automod system')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable the automod system')
    )
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Set the automod log channel')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel for automod logs')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('ignore')
        .setDescription('Ignore a channel or role')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel to ignore').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to ignore').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('unignore')
        .setDescription('Stop ignoring a channel or role')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel to unignore').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to unignore').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('antispam')
        .setDescription('Configure anti-spam filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('limit').setDescription('Max messages (default: 5)').setMinValue(3).setMaxValue(20)
        )
        .addIntegerOption(opt =>
          opt.setName('timeframe').setDescription('Timeframe in seconds (default: 5)').setMinValue(3).setMaxValue(30)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' },
            { name: 'Mute', value: 'mute' },
            { name: 'Kick', value: 'kick' },
            { name: 'Ban', value: 'ban' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('antilink')
        .setDescription('Configure anti-link filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' },
            { name: 'Mute', value: 'mute' }
          )
        )
        .addStringOption(opt =>
          opt.setName('whitelist').setDescription('Whitelisted domains (comma-separated)')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('antiinvite')
        .setDescription('Configure anti-invite filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('allow_own').setDescription('Allow own server invites')
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' },
            { name: 'Mute', value: 'mute' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('badwords')
        .setDescription('Configure bad words filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('words').setDescription('Bad words (comma-separated)')
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' },
            { name: 'Mute', value: 'mute' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('massmention')
        .setDescription('Configure mass mention filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('max').setDescription('Max mentions allowed (default: 5)').setMinValue(2).setMaxValue(20)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' },
            { name: 'Mute', value: 'mute' },
            { name: 'Kick', value: 'kick' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('capslock')
        .setDescription('Configure caps lock filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('percent').setDescription('Max caps percentage (default: 70)').setMinValue(50).setMaxValue(100)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('emojispam')
        .setDescription('Configure emoji spam filter')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Enable/disable').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('max').setDescription('Max emojis allowed (default: 10)').setMinValue(3).setMaxValue(50)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('Action to take').addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Delete', value: 'delete' }
          )
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Get current config
    const guildConfig = await GuildConfig.findOne({ guildId }) as any;
    const currentConfig: AutomodConfig = guildConfig?.automod || { ...DEFAULT_AUTOMOD_CONFIG };

    switch (subcommand) {
      case 'status':
        await showStatus(interaction, currentConfig);
        break;
      case 'enable':
        await updateConfig(interaction, guildId, { enabled: true }, 'Automod has been **enabled**.');
        break;
      case 'disable':
        await updateConfig(interaction, guildId, { enabled: false }, 'Automod has been **disabled**.');
        break;
      case 'logs':
        const logChannel = interaction.options.getChannel('channel', true);
        await updateConfig(interaction, guildId, { logChannelId: logChannel.id }, `Automod logs will be sent to ${logChannel}.`);
        break;
      case 'ignore':
        await handleIgnore(interaction, guildId, currentConfig, true);
        break;
      case 'unignore':
        await handleIgnore(interaction, guildId, currentConfig, false);
        break;
      case 'antispam':
        await handleAntiSpam(interaction, guildId, currentConfig);
        break;
      case 'antilink':
        await handleAntiLink(interaction, guildId, currentConfig);
        break;
      case 'antiinvite':
        await handleAntiInvite(interaction, guildId, currentConfig);
        break;
      case 'badwords':
        await handleBadWords(interaction, guildId, currentConfig);
        break;
      case 'massmention':
        await handleMassMention(interaction, guildId, currentConfig);
        break;
      case 'capslock':
        await handleCapsLock(interaction, guildId, currentConfig);
        break;
      case 'emojispam':
        await handleEmojiSpam(interaction, guildId, currentConfig);
        break;
    }
  },
};

async function showStatus(interaction: ChatInputCommandInteraction, config: AutomodConfig) {
  const statusEmoji = (enabled: boolean) => enabled ? '✅' : '❌';
  
  const embed = new EmbedBuilder()
    .setColor(config.enabled ? EMBED_COLORS.success : EMBED_COLORS.error)
    .setTitle('🛡️ Automod Configuration')
    .setDescription(`**Status:** ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}`)
    .addFields(
      {
        name: '📋 Filters',
        value: [
          `${statusEmoji(config.antiSpam.enabled)} **Anti-Spam** - ${config.antiSpam.action}`,
          `${statusEmoji(config.antiLink.enabled)} **Anti-Link** - ${config.antiLink.action}`,
          `${statusEmoji(config.antiInvite.enabled)} **Anti-Invite** - ${config.antiInvite.action}`,
          `${statusEmoji(config.badWords.enabled)} **Bad Words** - ${config.badWords.action} (${config.badWords.words.length} words)`,
          `${statusEmoji(config.massMention.enabled)} **Mass Mention** - ${config.massMention.action} (max ${config.massMention.maxMentions})`,
          `${statusEmoji(config.capsLock.enabled)} **Caps Lock** - ${config.capsLock.action} (${config.capsLock.maxPercent}%)`,
          `${statusEmoji(config.emojiSpam.enabled)} **Emoji Spam** - ${config.emojiSpam.action} (max ${config.emojiSpam.maxEmojis})`,
        ].join('\n'),
        inline: false
      },
      {
        name: '⚙️ Settings',
        value: [
          `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}`,
          `**Ignored Channels:** ${config.ignoredChannels.length}`,
          `**Ignored Roles:** ${config.ignoredRoles.length}`,
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: 'Use /automod <filter> to configure each filter' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function updateConfig(interaction: ChatInputCommandInteraction, guildId: string, updates: Partial<AutomodConfig>, message: string) {
  const updatePath: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    updatePath[`automod.${key}`] = value;
  }

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: updatePath },
    { upsert: true }
  );

  // Invalidate cache
  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✅ Automod Updated')
    .setDescription(message)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleIgnore(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig, adding: boolean) {
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');

  if (!channel && !role) {
    await interaction.reply({ embeds: [errorEmbed('Please specify a channel or role.')], ephemeral: true });
    return;
  }

  const updates: Partial<AutomodConfig> = {};
  const messages: string[] = [];

  if (channel) {
    if (adding) {
      if (!config.ignoredChannels.includes(channel.id)) {
        config.ignoredChannels.push(channel.id);
        messages.push(`${channel} will now be ignored.`);
      }
    } else {
      config.ignoredChannels = config.ignoredChannels.filter((id: string) => id !== channel.id);
      messages.push(`${channel} will no longer be ignored.`);
    }
    updates.ignoredChannels = config.ignoredChannels;
  }

  if (role) {
    if (adding) {
      if (!config.ignoredRoles.includes(role.id)) {
        config.ignoredRoles.push(role.id);
        messages.push(`${role} will now be ignored.`);
      }
    } else {
      config.ignoredRoles = config.ignoredRoles.filter((id: string) => id !== role.id);
      messages.push(`${role} will no longer be ignored.`);
    }
    updates.ignoredRoles = config.ignoredRoles;
  }

  await updateConfig(interaction, guildId, updates, messages.join('\n'));
}

async function handleAntiSpam(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const limit = interaction.options.getInteger('limit') || config.antiSpam.messageLimit;
  const timeframe = (interaction.options.getInteger('timeframe') || config.antiSpam.timeframe / 1000) * 1000;
  const action = (interaction.options.getString('action') as AutomodAction) || config.antiSpam.action;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.antiSpam': { enabled, messageLimit: limit, timeframe, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🚫 Anti-Spam Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Limit', value: `${limit} messages`, inline: true },
      { name: 'Timeframe', value: `${timeframe / 1000} seconds`, inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleAntiLink(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const action = (interaction.options.getString('action') as AutomodAction) || config.antiLink.action;
  const whitelistStr = interaction.options.getString('whitelist');
  const whitelist = whitelistStr 
    ? whitelistStr.split(',').map(d => d.trim().toLowerCase())
    : config.antiLink.whitelistedDomains;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.antiLink': { enabled, whitelistedDomains: whitelist, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🔗 Anti-Link Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true },
      { name: 'Whitelisted Domains', value: whitelist.join(', ') || 'None' }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleAntiInvite(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const allowOwn = interaction.options.getBoolean('allow_own') ?? config.antiInvite.allowOwnServer;
  const action = (interaction.options.getString('action') as AutomodAction) || config.antiInvite.action;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.antiInvite': { enabled, allowOwnServer: allowOwn, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('📨 Anti-Invite Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Allow Own Server', value: allowOwn ? 'Yes' : 'No', inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleBadWords(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const action = (interaction.options.getString('action') as AutomodAction) || config.badWords.action;
  const wordsStr = interaction.options.getString('words');
  const words = wordsStr 
    ? wordsStr.split(',').map(w => w.trim().toLowerCase())
    : config.badWords.words;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.badWords': { enabled, words, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🤬 Bad Words Filter Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true },
      { name: 'Word Count', value: `${words.length} words`, inline: true }
    )
    .setDescription(words.length > 0 ? `*${words.length} words configured (hidden for privacy)*` : '*No words configured*')
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMassMention(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const max = interaction.options.getInteger('max') || config.massMention.maxMentions;
  const action = (interaction.options.getString('action') as AutomodAction) || config.massMention.action;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.massMention': { enabled, maxMentions: max, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('📢 Mass Mention Filter Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Max Mentions', value: max.toString(), inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleCapsLock(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const percent = interaction.options.getInteger('percent') || config.capsLock.maxPercent;
  const action = (interaction.options.getString('action') as AutomodAction) || config.capsLock.action;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.capsLock': { enabled, maxPercent: percent, minLength: config.capsLock.minLength, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🔠 Caps Lock Filter Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Max Caps', value: `${percent}%`, inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleEmojiSpam(interaction: ChatInputCommandInteraction, guildId: string, config: AutomodConfig) {
  const enabled = interaction.options.getBoolean('enabled', true);
  const max = interaction.options.getInteger('max') || config.emojiSpam.maxEmojis;
  const action = (interaction.options.getString('action') as AutomodAction) || config.emojiSpam.action;

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'automod.emojiSpam': { enabled, maxEmojis: max, action } } },
    { upsert: true }
  );

  automod.invalidateCache(guildId);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('😀 Emoji Spam Filter Updated')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Max Emojis', value: max.toString(), inline: true },
      { name: 'Action', value: action.toUpperCase(), inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export default command;
