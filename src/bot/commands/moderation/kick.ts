// ===========================================
// ASTRA BOT - Kick Command (Enhanced)
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
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('silent')
        .setDescription('Do not DM the user')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
    
  permissions: [PermissionFlagsBits.KickMembers],
  guildOnly: true,
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const silent = interaction.options.getBoolean('silent') || false;
    
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
    
    // Permission checks
    const permError = checkKickPermissions(targetUser, targetMember, moderator, guild, interaction);
    if (permError) {
      await interaction.reply({ embeds: [errorEmbed(permError)], ephemeral: true });
      return;
    }
    
    await interaction.deferReply();
    
    try {
      // Collect member info before kick
      const memberRoles = targetMember.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .first(5)
        .map(r => r.toString())
        .join(' ') || 'None';
      
      const joinedAt = targetMember.joinedTimestamp 
        ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` 
        : 'Unknown';
      
      // DM the user before kicking
      let dmSent = false;
      if (!silent) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(EMBED_COLORS.warning)
            .setTitle(`👢 You have been kicked`)
            .setDescription(`You have been kicked from **${guild.name}**`)
            .addFields(
              { name: '📋 Reason', value: reason },
              { name: '👮 Moderator', value: moderator.user.tag }
            )
            .setThumbnail(guild.iconURL() || null)
            .addFields({
              name: '💡 Note',
              value: 'You can rejoin the server if you have an invite link.',
              inline: false
            })
            .setTimestamp();
          
          await targetUser.send({ embeds: [dmEmbed] });
          dmSent = true;
        } catch {
          // User might have DMs disabled
        }
      }
      
      // Perform the kick
      await targetMember.kick(`${reason} | Kicked by ${moderator.user.tag}`);
      
      // Log to database
      const caseId = await (ModerationLog as any).getNextCaseId(guild.id);
      await ModerationLog.create({
        guildId: guild.id,
        moderatorId: moderator.id,
        targetId: targetUser.id,
        action: 'kick',
        reason,
        caseId,
      });
      
      // Send to mod log channel
      await sendModLog(guild, targetUser, moderator, reason, caseId);
      
      // Success response
      const successEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setAuthor({ 
          name: 'Member Kicked', 
          iconURL: targetUser.displayAvatarURL() 
        })
        .setDescription(`**${targetUser.tag}** has been kicked from the server.`)
        .addFields(
          { name: '👤 User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: false },
          { name: '📋 Reason', value: reason, inline: true },
          { name: '🔢 Case ID', value: `#${caseId}`, inline: true },
          { name: '📬 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true },
          { name: '📅 Joined', value: joinedAt, inline: true },
          { name: '🎭 Roles', value: memberRoles, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Moderator: ${moderator.user.tag}` })
        .setTimestamp();
      
      // Quick action buttons
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`ban_${targetUser.id}`)
            .setLabel('Ban User')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔨'),
          new ButtonBuilder()
            .setLabel('View User')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${targetUser.id}`)
            .setEmoji('👤')
        );
      
      const response = await interaction.editReply({ embeds: [successEmbed], components: [row] });
      
      // Handle ban button
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.customId === `ban_${targetUser.id}`,
        time: 120000,
      });
      
      collector.on('collect', async (i) => {
        const clicker = i.member as GuildMember;
        if (!clicker.permissions.has(PermissionFlagsBits.BanMembers)) {
          await i.reply({ content: '❌ You do not have permission to ban members.', ephemeral: true });
          return;
        }
        
        try {
          await guild.members.ban(targetUser.id, { 
            reason: `Follow-up ban after kick | By ${clicker.user.tag}` 
          });
          
          const banEmbed = new EmbedBuilder()
            .setColor(EMBED_COLORS.error)
            .setDescription(`🔨 **${targetUser.tag}** has also been banned by ${clicker.user.tag}`)
            .setTimestamp();
          
          await i.update({ embeds: [successEmbed, banEmbed], components: [] });
        } catch {
          await i.reply({ content: '❌ Failed to ban user.', ephemeral: true });
        }
      });
      
      collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('disabled')
              .setLabel('Ban User')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔨')
              .setDisabled(true),
            new ButtonBuilder()
              .setLabel('View User')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/users/${targetUser.id}`)
              .setEmoji('👤')
          );
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error('Error executing kick command:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Failed to kick the user. Please check my permissions.')],
      });
    }
  },
};

function checkKickPermissions(
  targetUser: any,
  targetMember: GuildMember,
  moderator: GuildMember,
  guild: any,
  interaction: ChatInputCommandInteraction
): string | null {
  if (targetUser.id === interaction.user.id) {
    return 'You cannot kick yourself.';
  }
  
  if (targetUser.id === interaction.client.user?.id) {
    return 'I cannot kick myself.';
  }
  
  if (targetUser.id === guild.ownerId) {
    return 'You cannot kick the server owner.';
  }
  
  if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
    return 'You cannot kick a member with equal or higher role.';
  }
  
  const botMember = guild.members.me;
  if (botMember && targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return 'I cannot kick a member with equal or higher role than me.';
  }
  
  if (!targetMember.kickable) {
    return 'I cannot kick this member. They may have higher permissions.';
  }
  
  return null;
}

async function sendModLog(
  guild: any,
  targetUser: any,
  moderator: GuildMember,
  reason: string,
  caseId: number
): Promise<void> {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  if (!config?.moderation?.logChannelId) return;
  
  const logChannel = guild.channels.cache.get(config.moderation.logChannelId);
  if (!logChannel?.isTextBased()) return;
  
  const logEmbed = new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setTitle('👢 Member Kicked')
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
