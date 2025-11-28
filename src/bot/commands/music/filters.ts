// ===========================================
// ASTRA BOT - Audio Filters Command
// Modern Card-Style Embed with Toggle Buttons
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';
import { useQueue, QueueFilters } from 'discord-player';
import { errorEmbed } from '../../../shared/utils/index.js';
import { 
  createFiltersEmbed, 
  createFilterButtons,
  musicSuccess,
  musicError,
  AUDIO_FILTERS
} from '../../utils/musicEmbeds.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('filters')
    .setDescription('Toggle audio filters for the music player')
    .addStringOption(opt =>
      opt
        .setName('filter')
        .setDescription('Filter to toggle')
        .setRequired(false)
        .addChoices(
          { name: '🔊 Bassboost', value: 'bassboost' },
          { name: '🎧 8D', value: '8D' },
          { name: '🌊 Vaporwave', value: 'vaporwave' },
          { name: '🌙 Nightcore', value: 'nightcore' },
          { name: '☕ Lofi', value: 'lofi' },
          { name: '⏪ Reverse', value: 'reverse' },
          { name: '🎵 Treble', value: 'treble' },
          { name: '🎤 Karaoke', value: 'karaoke' },
          { name: '💀 Earrape', value: 'earrape' },
          { name: '❌ Clear All', value: 'clear' }
        )
    ),
    
  cooldown: 5,
  
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

    const filterArg = interaction.options.getString('filter');
    
    // If a filter was specified, toggle it
    if (filterArg) {
      if (filterArg === 'clear') {
        await queue.filters.ffmpeg.setFilters(false);
        await interaction.reply({ 
          embeds: [musicSuccess('All filters cleared!', '🔄')],
        });
        return;
      }

      const filterName = filterArg as keyof QueueFilters;
      const isEnabled = queue.filters.ffmpeg.filters.includes(filterName);
      
      try {
        if (isEnabled) {
          await queue.filters.ffmpeg.toggle([filterName]);
          await interaction.reply({ 
            embeds: [musicSuccess(`Disabled **${filterArg}** filter`, '❌')],
          });
        } else {
          await queue.filters.ffmpeg.toggle([filterName]);
          await interaction.reply({ 
            embeds: [musicSuccess(`Enabled **${filterArg}** filter`, '✅')],
          });
        }
      } catch (error) {
        await interaction.reply({ 
          embeds: [musicError(`Failed to toggle filter: ${filterArg}`)],
          ephemeral: true 
        });
      }
      return;
    }

    // Show filters menu
    const enabledFilters = queue.filters.ffmpeg.filters as string[];
    const embed = createFiltersEmbed(enabledFilters);
    const buttonRows = createFilterButtons();

    // Add a select menu for easier selection
    const filterOptions = AUDIO_FILTERS.map(f => 
      new StringSelectMenuOptionBuilder()
        .setLabel(f.name)
        .setDescription(`Toggle ${f.name} filter`)
        .setValue(f.id)
        .setEmoji(f.emoji)
    );
    
    filterOptions.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('Clear All')
        .setDescription('Disable all filters')
        .setValue('clear')
        .setEmoji('❌')
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_select')
      .setPlaceholder('🎛️ Select a filter to toggle')
      .addOptions(filterOptions);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const response = await interaction.reply({ 
      embeds: [embed], 
      components: [selectRow, ...buttonRows],
      fetchReply: true 
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      const currentQueue = useQueue(interaction.guild!.id);
      if (!currentQueue) {
        await i.reply({ embeds: [errorEmbed('No active queue!')], ephemeral: true });
        return;
      }

      let filterId: string;
      
      if (i.isStringSelectMenu()) {
        filterId = i.values[0];
      } else {
        filterId = i.customId.replace('filter_', '');
      }

      if (filterId === 'clear') {
        await currentQueue.filters.ffmpeg.setFilters(false);
        const updatedEmbed = createFiltersEmbed([]);
        await i.update({ embeds: [updatedEmbed] });
        return;
      }

      const filterName = filterId as keyof QueueFilters;
      
      try {
        await currentQueue.filters.ffmpeg.toggle([filterName]);
        const newEnabled = currentQueue.filters.ffmpeg.filters as string[];
        const updatedEmbed = createFiltersEmbed(newEnabled);
        await i.update({ embeds: [updatedEmbed] });
      } catch (error) {
        await i.reply({ 
          embeds: [musicError(`Failed to toggle filter`)],
          ephemeral: true 
        });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
