// ===========================================
// ASTRA BOT - Clear/Purge Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  Collection,
  Message
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('bots')
        .setDescription('Only delete bot messages')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('attachments')
        .setDescription('Only delete messages with attachments')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const channel = interaction.channel as TextChannel;
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in text channels.')], ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
    const containsText = interaction.options.getString('contains');
    const botsOnly = interaction.options.getBoolean('bots');
    const attachmentsOnly = interaction.options.getBoolean('attachments');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch messages
      let messages = await channel.messages.fetch({ limit: 100 });
      
      // Filter messages
      let filtered: Collection<string, Message> = messages;
      
      // Filter by user
      if (targetUser) {
        filtered = filtered.filter(m => m.author.id === targetUser.id);
      }
      
      // Filter by text content
      if (containsText) {
        filtered = filtered.filter(m => m.content.toLowerCase().includes(containsText.toLowerCase()));
      }
      
      // Filter bots only
      if (botsOnly) {
        filtered = filtered.filter(m => m.author.bot);
      }
      
      // Filter attachments only
      if (attachmentsOnly) {
        filtered = filtered.filter(m => m.attachments.size > 0);
      }
      
      // Filter messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(m => m.createdTimestamp > twoWeeksAgo);
      
      // Limit to requested amount
      const toDelete = [...filtered.values()].slice(0, amount);
      
      if (toDelete.length === 0) {
        await interaction.editReply({
          embeds: [errorEmbed('No messages found matching the criteria (messages must be less than 14 days old).')]
        });
        return;
      }
      
      // Delete messages
      const deleted = await channel.bulkDelete(toDelete, true);
      
      // Build summary
      const userCounts: Record<string, number> = {};
      deleted.forEach(m => {
        if (m) {
          const author = m.author?.tag || 'Unknown';
          userCounts[author] = (userCounts[author] || 0) + 1;
        }
      });
      
      const summary = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([user, count]) => `• **${user}**: ${count} messages`)
        .join('\n');

      // Build filter description
      const filters: string[] = [];
      if (targetUser) filters.push(`User: ${targetUser.tag}`);
      if (containsText) filters.push(`Contains: "${containsText}"`);
      if (botsOnly) filters.push('Bots only');
      if (attachmentsOnly) filters.push('Attachments only');

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.success)
        .setTitle('🗑️ Messages Cleared')
        .addFields(
          { name: '📊 Deleted', value: `**${deleted.size}** message(s)`, inline: true },
          { name: '📝 Requested', value: `${amount}`, inline: true },
          { name: '📍 Channel', value: `${channel}`, inline: true }
        )
        .setFooter({ text: `Cleared by ${interaction.user.tag}` })
        .setTimestamp();
      
      if (filters.length > 0) {
        embed.addFields({ name: '🔍 Filters', value: filters.join('\n') });
      }
      
      if (summary) {
        embed.addFields({ name: '👥 By User (Top 5)', value: summary });
      }

      await interaction.editReply({ embeds: [embed] });
      
      // Send a temporary message in the channel
      const tempMsg = await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.success)
            .setDescription(`🗑️ **${deleted.size}** messages cleared by ${interaction.user}`)
        ]
      });
      
      // Delete the temp message after 5 seconds
      setTimeout(() => tempMsg.delete().catch(() => {}), 5000);
      
    } catch (error: any) {
      logger.error('Error clearing messages:', error);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to delete messages: ${error.message}`)]
      });
    }
  },
};

export default command;
