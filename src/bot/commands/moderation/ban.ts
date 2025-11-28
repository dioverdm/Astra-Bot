// ===========================================
// ASTRA BOT - Ban Command (Enhanced)
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
import { errorEmbed } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban or unban members from the server')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to ban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the ban')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('delete_days')
            .setDescription('Number of days of messages to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
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
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('The user ID to unban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the unban')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all banned users')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
    
  permissions: [PermissionFlagsBits.BanMembers],
  guildOnly: true,
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'add':
        await handleBanAdd(interaction);
        break;
      case 'remove':
        await handleBanRemove(interaction);
        break;
      case 'list':
        await handleBanList(interaction);
        break;
    }
  },
};

async function handleBanAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;
  const silent = interaction.options.getBoolean('silent') || false;
  
  const guild = interaction.guild!;
  const moderator = interaction.member as GuildMember;
  
  // Check if target is a member
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  
  // Permission checks
  const permError = checkBanPermissions(targetUser, targetMember, moderator, guild, interaction);
  if (permError) {
    await interaction.reply({ embeds: [errorEmbed(permError)], ephemeral: true });
    return;
  }
  
  // Check if already banned
  const existingBan = await guild.bans.fetch(targetUser.id).catch(() => null);
  if (existingBan) {
    await interaction.reply({
      embeds: [errorEmbed(`**${targetUser.username}** is already banned.\n\nUse \`/ban remove\` to unban them.`)],
      ephemeral: true,
    });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    // DM the user before banning (if not silent and is member)
    let dmSent = false;
    if (!silent && targetMember) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.error)
          .setTitle(`🔨 You have been banned`)
          .setDescription(`You have been banned from **${guild.name}**`)
          .addFields(
            { name: '📋 Reason', value: reason },
            { name: '👮 Moderator', value: moderator.user.tag }
          )
          .setThumbnail(guild.iconURL() || null)
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch {
        // User might have DMs disabled
      }
    }
    
    // Perform the ban
    await guild.members.ban(targetUser.id, {
      reason: `${reason} | Banned by ${moderator.user.tag}`,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });
    
    // Log to database
    const caseId = await (ModerationLog as any).getNextCaseId(guild.id);
    await ModerationLog.create({
      guildId: guild.id,
      moderatorId: moderator.id,
      targetId: targetUser.id,
      action: 'ban',
      reason,
      caseId,
    });
    
    // Send to mod log channel
    await sendModLog(guild, targetUser, moderator, 'ban', reason, caseId);
    
    // Success response
    const successEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.error)
      .setAuthor({ 
        name: 'Member Banned', 
        iconURL: targetUser.displayAvatarURL() 
      })
      .setDescription(`**${targetUser.tag}** has been banned from the server.`)
      .addFields(
        { name: '👤 User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: false },
        { name: '📋 Reason', value: reason, inline: true },
        { name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true },
        { name: '🔢 Case ID', value: `#${caseId}`, inline: true },
        { name: '📬 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `Moderator: ${moderator.user.tag}` })
      .setTimestamp();
    
    // Quick unban button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`unban_${targetUser.id}`)
          .setLabel('Unban')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );
    
    const response = await interaction.editReply({ embeds: [successEmbed], components: [row] });
    
    // Handle unban button
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === `unban_${targetUser.id}`,
      time: 300000,
    });
    
    collector.on('collect', async (i) => {
      const clicker = i.member as GuildMember;
      if (!clicker.permissions.has(PermissionFlagsBits.BanMembers)) {
        await i.reply({ content: '❌ You do not have permission to unban members.', ephemeral: true });
        return;
      }
      
      try {
        await guild.bans.remove(targetUser.id, `Unbanned by ${clicker.user.tag}`);
        
        const unbanEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.success)
          .setDescription(`✅ **${targetUser.tag}** has been unbanned by ${clicker.user.tag}`)
          .setTimestamp();
        
        await i.update({ embeds: [successEmbed, unbanEmbed], components: [] });
      } catch {
        await i.reply({ content: '❌ Failed to unban user.', ephemeral: true });
      }
    });
    
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel('Unban')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔓')
            .setDisabled(true)
        );
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
    
  } catch (error) {
    logger.error('Error executing ban command:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to ban the user. Please check my permissions.')],
    });
  }
}

async function handleBanRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.options.getString('user_id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  const guild = interaction.guild!;
  const moderator = interaction.member as GuildMember;
  
  // Validate user ID
  if (!/^\d{17,19}$/.test(userId)) {
    await interaction.reply({
      embeds: [errorEmbed('Invalid user ID. Please provide a valid Discord user ID.')],
      ephemeral: true,
    });
    return;
  }
  
  // Check if user is banned
  const ban = await guild.bans.fetch(userId).catch(() => null);
  if (!ban) {
    await interaction.reply({
      embeds: [errorEmbed('This user is not banned.')],
      ephemeral: true,
    });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    await guild.bans.remove(userId, `${reason} | Unbanned by ${moderator.user.tag}`);
    
    // Log to database
    const caseId = await (ModerationLog as any).getNextCaseId(guild.id);
    await ModerationLog.create({
      guildId: guild.id,
      moderatorId: moderator.id,
      targetId: userId,
      action: 'unban',
      reason,
      caseId,
    });
    
    // Send to mod log
    await sendModLog(guild, ban.user, moderator, 'unban', reason, caseId);
    
    const successEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setAuthor({ 
        name: 'User Unbanned', 
        iconURL: ban.user.displayAvatarURL() 
      })
      .setDescription(`**${ban.user.tag}** has been unbanned.`)
      .addFields(
        { name: '👤 User', value: `${ban.user} (\`${ban.user.id}\`)`, inline: false },
        { name: '📋 Original Ban Reason', value: ban.reason || 'Unknown', inline: true },
        { name: '📋 Unban Reason', value: reason, inline: true },
        { name: '🔢 Case ID', value: `#${caseId}`, inline: true }
      )
      .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `Moderator: ${moderator.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [successEmbed] });
    
  } catch (error) {
    logger.error('Error unbanning user:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to unban the user.')],
    });
  }
}

async function handleBanList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild!;
  
  await interaction.deferReply();
  
  try {
    const bans = await guild.bans.fetch();
    
    if (bans.size === 0) {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.info)
        .setTitle('🔨 Server Bans')
        .setDescription('No users are currently banned.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    const banList = bans.first(15).map((ban, index) => {
      const reason = ban.reason ? (ban.reason.length > 50 ? ban.reason.slice(0, 47) + '...' : ban.reason) : 'No reason';
      return `**${index + 1}.** ${ban.user.tag}\n└ ID: \`${ban.user.id}\`\n└ Reason: ${reason}`;
    }).join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.error)
      .setTitle(`🔨 Server Bans (${bans.size})`)
      .setDescription(banList)
      .setFooter({ text: bans.size > 15 ? `Showing 15 of ${bans.size} bans` : `Total: ${bans.size} bans` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('Error fetching ban list:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to fetch ban list.')],
    });
  }
}

function checkBanPermissions(
  targetUser: any,
  targetMember: GuildMember | null,
  moderator: GuildMember,
  guild: any,
  interaction: ChatInputCommandInteraction
): string | null {
  if (targetMember) {
    if (targetUser.id === interaction.user.id) {
      return 'You cannot ban yourself.';
    }
    
    if (targetUser.id === interaction.client.user?.id) {
      return 'I cannot ban myself.';
    }
    
    if (targetUser.id === guild.ownerId) {
      return 'You cannot ban the server owner.';
    }
    
    if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
      return 'You cannot ban a member with equal or higher role.';
    }
    
    const botMember = guild.members.me;
    if (botMember && targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return 'I cannot ban a member with equal or higher role than me.';
    }
    
    if (!targetMember.bannable) {
      return 'I cannot ban this member. They may have higher permissions.';
    }
  }
  
  return null;
}

async function sendModLog(
  guild: any,
  targetUser: any,
  moderator: GuildMember,
  action: 'ban' | 'unban',
  reason: string,
  caseId: number
): Promise<void> {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  if (!config?.moderation?.logChannelId) return;
  
  const logChannel = guild.channels.cache.get(config.moderation.logChannelId);
  if (!logChannel?.isTextBased()) return;
  
  const color = action === 'ban' ? EMBED_COLORS.error : EMBED_COLORS.success;
  const title = action === 'ban' ? '🔨 Member Banned' : '🔓 Member Unbanned';
  
  const logEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.user.tag}`, inline: true },
      { name: 'Reason', value: reason },
      { name: 'Case ID', value: `#${caseId}`, inline: true }
    )
    .setTimestamp();
  
  await logChannel.send({ embeds: [logEmbed] });
}

export default command;
