// ===========================================
// ASTRA BOT - Timeout Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { ModerationLog, GuildConfig } from '../../../database/models/index.js';
import { EMBED_COLORS, EMOJIS } from '../../../shared/constants/index.js';
import { errorEmbed, formatDuration, parseDuration } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Quick duration presets
const DURATION_PRESETS = [
  { label: '60s', value: 60 * 1000 },
  { label: '5m', value: 5 * 60 * 1000 },
  { label: '10m', value: 10 * 60 * 1000 },
  { label: '1h', value: 60 * 60 * 1000 },
  { label: '1d', value: 24 * 60 * 60 * 1000 },
  { label: '1w', value: 7 * 24 * 60 * 60 * 1000 },
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout or untimeout a member')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Timeout a member (prevent them from interacting)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to timeout')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 60s, 10m, 1h, 1d, 1w) - Max 28 days')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the timeout')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('silent')
            .setDescription('Do not DM the user')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to untimeout')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for removing the timeout')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Check timeout status of a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to check')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
    
  permissions: [PermissionFlagsBits.ModerateMembers],
  guildOnly: true,
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'add':
        await handleTimeoutAdd(interaction);
        break;
      case 'remove':
        await handleTimeoutRemove(interaction);
        break;
      case 'info':
        await handleTimeoutInfo(interaction);
        break;
    }
  },
};

async function handleTimeoutAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const silent = interaction.options.getBoolean('silent') || false;
  
  const guild = interaction.guild!;
  const moderator = interaction.member as GuildMember;
  
  // Parse duration
  const duration = parseDuration(durationStr);
  if (!duration) {
    await interaction.reply({
      embeds: [errorEmbed('**Invalid duration format.**\n\nUse formats like: `60s`, `10m`, `1h`, `1d`, `1w`\n\nExamples:\n• `60s` = 60 seconds\n• `30m` = 30 minutes\n• `2h` = 2 hours\n• `1d` = 1 day\n• `1w` = 1 week')],
      ephemeral: true,
    });
    return;
  }
  
  // Max timeout is 28 days
  const maxTimeout = 28 * 24 * 60 * 60 * 1000;
  if (duration > maxTimeout) {
    await interaction.reply({
      embeds: [errorEmbed('**Timeout duration cannot exceed 28 days.**\n\nDiscord limits timeouts to a maximum of 28 days.')],
      ephemeral: true,
    });
    return;
  }
  
  // Get target member
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  
  if (!targetMember) {
    await interaction.reply({
      embeds: [errorEmbed('User is not a member of this server.')],
      ephemeral: true,
    });
    return;
  }
  
  // Permission checks
  const permError = checkPermissions(targetUser, targetMember, moderator, guild, interaction);
  if (permError) {
    await interaction.reply({ embeds: [errorEmbed(permError)], ephemeral: true });
    return;
  }
  
  // Check if already timed out
  if (targetMember.communicationDisabledUntil && targetMember.communicationDisabledUntil > new Date()) {
    const currentTimeout = targetMember.communicationDisabledUntil;
    await interaction.reply({
      embeds: [errorEmbed(`**${targetUser.username}** is already timed out until <t:${Math.floor(currentTimeout.getTime() / 1000)}:R>.\n\nUse \`/timeout remove\` first or wait for it to expire.`)],
      ephemeral: true,
    });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    // Apply timeout
    await targetMember.timeout(duration, `${reason} | By ${moderator.user.tag}`);
    
    // Log to database
    const caseId = await (ModerationLog as any).getNextCaseId(guild.id);
    await ModerationLog.create({
      guildId: guild.id,
      moderatorId: moderator.id,
      targetId: targetUser.id,
      action: 'timeout',
      reason,
      duration,
      caseId,
    });
    
    // Send to mod log channel
    await sendModLog(guild, targetUser, moderator, 'timeout', reason, caseId, duration);
    
    // DM the user (if not silent)
    if (!silent) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle(`${EMOJIS.timeout} You have been timed out`)
          .setDescription(`You have been timed out in **${guild.name}**`)
          .addFields(
            { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
            { name: '📋 Reason', value: reason },
            { name: '⏰ Expires', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true }
          )
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        // User might have DMs disabled
      }
    }
    
    // Calculate expiry
    const expiresAt = new Date(Date.now() + duration);
    
    // Success response
    const successEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setAuthor({ 
        name: 'Member Timed Out', 
        iconURL: targetUser.displayAvatarURL() 
      })
      .setDescription(`**${targetUser.tag}** has been timed out.`)
      .addFields(
        { name: '👤 User', value: `${targetUser} (${targetUser.id})`, inline: false },
        { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
        { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
        { name: '📋 Reason', value: reason, inline: false },
        { name: '🔢 Case ID', value: `#${caseId}`, inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `Moderator: ${moderator.user.tag}` })
      .setTimestamp();
    
    // Add quick action button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`untimeout_${targetUser.id}`)
          .setLabel('Remove Timeout')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔓')
      );
    
    const response = await interaction.editReply({ embeds: [successEmbed], components: [row] });
    
    // Handle untimeout button
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === `untimeout_${targetUser.id}`,
      time: 300000, // 5 minutes
    });
    
    collector.on('collect', async (i) => {
      // Check if user has permission
      const clicker = i.member as GuildMember;
      if (!clicker.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await i.reply({ content: '❌ You do not have permission to remove timeouts.', ephemeral: true });
        return;
      }
      
      try {
        await targetMember.timeout(null, `Timeout removed by ${clicker.user.tag}`);
        
        const removedEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.success)
          .setDescription(`✅ Timeout removed from **${targetUser.tag}** by ${clicker.user.tag}`)
          .setTimestamp();
        
        await i.update({ embeds: [successEmbed, removedEmbed], components: [] });
      } catch (error) {
        await i.reply({ content: '❌ Failed to remove timeout.', ephemeral: true });
      }
    });
    
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel('Remove Timeout')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔓')
            .setDisabled(true)
        );
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
    
  } catch (error) {
    logger.error('Error executing timeout command:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to timeout the user. Please check my permissions.')],
    });
  }
}

async function handleTimeoutRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  const guild = interaction.guild!;
  const moderator = interaction.member as GuildMember;
  
  // Get target member
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  
  if (!targetMember) {
    await interaction.reply({
      embeds: [errorEmbed('User is not a member of this server.')],
      ephemeral: true,
    });
    return;
  }
  
  // Check if currently timed out
  if (!targetMember.communicationDisabledUntil || targetMember.communicationDisabledUntil <= new Date()) {
    await interaction.reply({
      embeds: [errorEmbed(`**${targetUser.username}** is not currently timed out.`)],
      ephemeral: true,
    });
    return;
  }
  
  if (!targetMember.moderatable) {
    await interaction.reply({
      embeds: [errorEmbed('I cannot modify this member\'s timeout.')],
      ephemeral: true,
    });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    // Remove timeout
    await targetMember.timeout(null, `${reason} | By ${moderator.user.tag}`);
    
    // Log to database
    const caseId = await (ModerationLog as any).getNextCaseId(guild.id);
    await ModerationLog.create({
      guildId: guild.id,
      moderatorId: moderator.id,
      targetId: targetUser.id,
      action: 'untimeout',
      reason,
      caseId,
    });
    
    // Send to mod log
    await sendModLog(guild, targetUser, moderator, 'untimeout', reason, caseId);
    
    // Success response
    const successEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setAuthor({ 
        name: 'Timeout Removed', 
        iconURL: targetUser.displayAvatarURL() 
      })
      .setDescription(`**${targetUser.tag}**'s timeout has been removed.`)
      .addFields(
        { name: '👤 User', value: `${targetUser}`, inline: true },
        { name: '📋 Reason', value: reason, inline: true },
        { name: '🔢 Case ID', value: `#${caseId}`, inline: true }
      )
      .setFooter({ text: `Moderator: ${moderator.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [successEmbed] });
    
  } catch (error) {
    logger.error('Error removing timeout:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to remove timeout.')],
    });
  }
}

async function handleTimeoutInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const guild = interaction.guild!;
  
  // Get target member
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  
  if (!targetMember) {
    await interaction.reply({
      embeds: [errorEmbed('User is not a member of this server.')],
      ephemeral: true,
    });
    return;
  }
  
  const timeoutUntil = targetMember.communicationDisabledUntil;
  const isTimedOut = timeoutUntil && timeoutUntil > new Date();
  
  // Get recent timeout logs
  const recentLogs = await ModerationLog.find({
    guildId: guild.id,
    targetId: targetUser.id,
    action: { $in: ['timeout', 'untimeout'] }
  }).sort({ createdAt: -1 }).limit(5);
  
  const embed = new EmbedBuilder()
    .setColor(isTimedOut ? EMBED_COLORS.warning : EMBED_COLORS.success)
    .setAuthor({ 
      name: `${targetUser.username}'s Timeout Status`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .addFields({
      name: '📊 Current Status',
      value: isTimedOut 
        ? `⏰ **Timed Out** until <t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>\n(<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>)`
        : '✅ **Not Timed Out**',
      inline: false
    });
  
  // Add history
  if (recentLogs.length > 0) {
    const historyText = recentLogs.map(log => {
      const action = log.action === 'timeout' ? '🔒' : '🔓';
      const timestamp = (log as any).timestamp || (log as any).createdAt || new Date();
      const date = `<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:R>`;
      return `${action} Case #${log.caseId} - ${date}`;
    }).join('\n');
    
    embed.addFields({
      name: `📜 Recent History (${recentLogs.length})`,
      value: historyText,
      inline: false
    });
  }
  
  // Add action button if timed out
  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (isTimedOut) {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`untimeout_quick_${targetUser.id}`)
          .setLabel('Remove Timeout')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔓')
      );
    components.push(row);
  }
  
  const response = await interaction.reply({ embeds: [embed], components, fetchReply: true });
  
  if (isTimedOut) {
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === `untimeout_quick_${targetUser.id}`,
      time: 60000,
    });
    
    collector.on('collect', async (i) => {
      const clicker = i.member as GuildMember;
      if (!clicker.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await i.reply({ content: '❌ You do not have permission.', ephemeral: true });
        return;
      }
      
      try {
        await targetMember.timeout(null, `Removed by ${clicker.user.tag}`);
        await i.update({ 
          embeds: [embed.setColor(EMBED_COLORS.success).setFields({
            name: '📊 Current Status',
            value: '✅ **Timeout Removed**',
            inline: false
          })], 
          components: [] 
        });
      } catch {
        await i.reply({ content: '❌ Failed to remove timeout.', ephemeral: true });
      }
    });
  }
}

function checkPermissions(
  targetUser: any, 
  targetMember: GuildMember, 
  moderator: GuildMember, 
  guild: any,
  interaction: ChatInputCommandInteraction
): string | null {
  if (targetUser.id === interaction.user.id) {
    return 'You cannot timeout yourself.';
  }
  
  if (targetUser.id === interaction.client.user?.id) {
    return 'I cannot timeout myself.';
  }
  
  if (targetUser.id === guild.ownerId) {
    return 'You cannot timeout the server owner.';
  }
  
  if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
    return 'You cannot timeout a member with equal or higher role.';
  }
  
  if (!targetMember.moderatable) {
    return 'I cannot timeout this member. They may have higher permissions than me.';
  }
  
  return null;
}

async function sendModLog(
  guild: any, 
  targetUser: any, 
  moderator: GuildMember, 
  action: 'timeout' | 'untimeout',
  reason: string,
  caseId: number,
  duration?: number
): Promise<void> {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  if (!config?.moderation?.logChannelId) return;
  
  const logChannel = guild.channels.cache.get(config.moderation.logChannelId);
  if (!logChannel?.isTextBased()) return;
  
  const color = action === 'timeout' ? EMBED_COLORS.warning : EMBED_COLORS.success;
  const title = action === 'timeout' ? `${EMOJIS.timeout} Member Timed Out` : `🔓 Timeout Removed`;
  
  const logEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.user.tag}`, inline: true }
    );
  
  if (duration) {
    logEmbed.addFields({ name: 'Duration', value: formatDuration(duration), inline: true });
  }
  
  logEmbed.addFields(
    { name: 'Reason', value: reason },
    { name: 'Case ID', value: `#${caseId}`, inline: true }
  );
  
  logEmbed.setTimestamp();
  
  await logChannel.send({ embeds: [logEmbed] });
}

export default command;
