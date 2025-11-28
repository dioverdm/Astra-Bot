// ===========================================
// ASTRA BOT - Play Command
// Modern Card-Style Embed
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  GuildMember
} from 'discord.js';
import { useMainPlayer } from 'discord-player';
import { errorEmbed } from '../../../shared/utils/index.js';
import { createQueuedEmbed, musicInfo, getSourceInfo } from '../../utils/musicEmbeds.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription('Song name, URL, or playlist URL (YouTube, Spotify, SoundCloud)')
        .setRequired(true)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({ 
        embeds: [errorEmbed('You need to be in a voice channel to play music!')], 
        ephemeral: true 
      });
      return;
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions?.has(['Connect', 'Speak'])) {
      await interaction.reply({ 
        embeds: [errorEmbed('I need permissions to join and speak in your voice channel!')], 
        ephemeral: true 
      });
      return;
    }

    const query = interaction.options.getString('query', true);

    await interaction.deferReply();

    try {
      const player = useMainPlayer();
      
      const result = await player.play(voiceChannel as any, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            requestedBy: interaction.user
          },
          volume: 50,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60000,
          leaveOnEnd: false,
          leaveOnEndCooldown: 60000,
        },
        requestedBy: interaction.user as any
      });

      const track = result.track;
      const queue = result.queue;
      const source = getSourceInfo(track.url);

      // If the track was queued (not immediately playing)
      if (queue.tracks.size > 0 && queue.currentTrack !== track) {
        const embed = createQueuedEmbed(track, queue.tracks.size);
        await interaction.editReply({ embeds: [embed] });
      } else {
        // Track is playing now
        const embed = musicInfo(`**${source.icon} Loading:** [${track.title}](${track.url})`, '🎵');
        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error: any) {
      console.error('Play error:', error);
      
      let errorMessage = 'Failed to play the track.';
      if (error.message?.includes('No results')) {
        errorMessage = 'No results found for your search query.';
      } else if (error.message?.includes('age-restricted')) {
        errorMessage = 'This video is age-restricted and cannot be played.';
      } else if (error.message?.includes('private')) {
        errorMessage = 'This video is private or unavailable.';
      }

      await interaction.editReply({ embeds: [errorEmbed(errorMessage)] });
    }
  },
};

export default command;
