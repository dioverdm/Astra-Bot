// ===========================================
// ASTRA BOT - Skip Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import { useQueue } from 'discord-player';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song')
    .addIntegerOption(opt =>
      opt
        .setName('to')
        .setDescription('Skip to a specific position in queue')
        .setRequired(false)
        .setMinValue(1)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.isPlaying()) {
      await interaction.reply({ 
        embeds: [errorEmbed('No music is currently playing!')], 
        ephemeral: true 
      });
      return;
    }

    // Check if user is in the same voice channel
    if (member.voice.channelId !== queue.channel?.id) {
      await interaction.reply({ 
        embeds: [errorEmbed('You need to be in the same voice channel as the bot!')], 
        ephemeral: true 
      });
      return;
    }

    const skipTo = interaction.options.getInteger('to');
    const currentTrack = queue.currentTrack;

    try {
      if (skipTo && skipTo > 1) {
        // Skip to specific position
        if (skipTo > queue.tracks.size) {
          await interaction.reply({ 
            embeds: [errorEmbed(`There are only ${queue.tracks.size} tracks in the queue!`)], 
            ephemeral: true 
          });
          return;
        }

        queue.node.skipTo(skipTo - 1);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.music)
          .setDescription(`⏭️ **Skipped to track #${skipTo}**`)
          .setFooter({ text: `Skipped by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
      } else {
        // Skip current track
        queue.node.skip();

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.music)
          .setDescription(`⏭️ **Skipped:** ${currentTrack?.title || 'Unknown'}`)
          .setFooter({ text: `Skipped by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      await interaction.reply({ embeds: [errorEmbed('Failed to skip the track.')], ephemeral: true });
    }
  },
};

export default command;
