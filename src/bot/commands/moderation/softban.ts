// ===========================================
// ASTRA BOT - Softban Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { ModerationLog } from '../../../database/models/ModerationLog.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user to delete their messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to softban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('reason')
        .setDescription('Reason for the softban')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt
        .setName('days')
        .setDescription('Days of messages to delete (default: 7)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(7)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 7;

    // Can't softban yourself
    if (target.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot softban yourself!')], ephemeral: true });
      return;
    }

    // Can't softban the bot
    if (target.id === interaction.client.user?.id) {
      await interaction.reply({ embeds: [errorEmbed('I cannot softban myself!')], ephemeral: true });
      return;
    }

    // Check if target is in the guild
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    
    if (member) {
      // Check role hierarchy
      if (interaction.guild.ownerId !== interaction.user.id) {
        const executorMember = await interaction.guild.members.fetch(interaction.user.id);
        if (member.roles.highest.position >= executorMember.roles.highest.position) {
          await interaction.reply({ 
            embeds: [errorEmbed('You cannot softban someone with a higher or equal role!')], 
            ephemeral: true 
          });
          return;
        }
      }

      // Check if bannable
      if (!member.bannable) {
        await interaction.reply({ 
          embeds: [errorEmbed('I cannot softban this user. They may have higher permissions than me.')], 
          ephemeral: true 
        });
        return;
      }
    }

    await interaction.deferReply();

    try {
      // Ban the user
      await interaction.guild.members.ban(target.id, {
        deleteMessageDays: days,
        reason: `[Softban] ${reason} | By: ${interaction.user.tag}`
      });

      // Immediately unban
      await interaction.guild.members.unban(target.id, 'Softban complete');

      // Log to database
      await ModerationLog.create({
        guildId: interaction.guild.id,
        targetId: target.id,
        targetTag: target.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        action: 'softban',
        reason,
      } as any);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setTitle('🔨 User Softbanned')
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
          { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Reason', value: reason },
          { name: '🗑️ Messages Deleted', value: `${days} day(s)`, inline: true }
        )
        .setFooter({ text: 'User has been banned and unbanned' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
      await interaction.editReply({ 
        embeds: [errorEmbed(`Failed to softban user: ${error.message}`)] 
      });
    }
  },
};

export default command;
