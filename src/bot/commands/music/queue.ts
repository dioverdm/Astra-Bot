// ===========================================
// ASTRA BOT - Queue Command
// Modern Card-Style Embed
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { useQueue } from 'discord-player';
import { errorEmbed } from '../../../shared/utils/index.js';
import { createQueueEmbed } from '../../utils/musicEmbeds.js';
import type { BotCommand } from '../../../shared/types/index.js';

const TRACKS_PER_PAGE = 8;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue')
    .addIntegerOption(opt =>
      opt
        .setName('page')
        .setDescription('Page number')
        .setRequired(false)
        .setMinValue(1)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      await interaction.reply({ 
        embeds: [errorEmbed('No music is currently playing!')], 
        ephemeral: true 
      });
      return;
    }

    const tracks = queue.tracks.toArray();
    const totalPages = Math.ceil(tracks.length / TRACKS_PER_PAGE) || 1;
    let currentPage = Math.min(interaction.options.getInteger('page') || 1, totalPages);

    const createButtons = (page: number) => {
      return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('queue_first')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId('queue_prev')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId('queue_page')
            .setLabel(`📄 ${page}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('queue_next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages),
          new ButtonBuilder()
            .setCustomId('queue_last')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
        );
    };

    const response = await interaction.reply({ 
      embeds: [createQueueEmbed(queue, currentPage, totalPages)], 
      components: totalPages > 1 ? [createButtons(currentPage)] : [],
      fetchReply: true 
    });

    if (totalPages > 1) {
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        const currentQueue = useQueue(interaction.guild!.id);
        if (!currentQueue) return;

        switch (i.customId) {
          case 'queue_first': currentPage = 1; break;
          case 'queue_prev': currentPage = Math.max(1, currentPage - 1); break;
          case 'queue_next': currentPage = Math.min(totalPages, currentPage + 1); break;
          case 'queue_last': currentPage = totalPages; break;
        }

        await i.update({ 
          embeds: [createQueueEmbed(currentQueue, currentPage, totalPages)], 
          components: [createButtons(currentPage)] 
        });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  },
};

export default command;
