// ===========================================
// ASTRA BOT - Now Playing Command
// Modern Card-Style Embed
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
} from 'discord.js';
import { useQueue } from 'discord-player';
import { errorEmbed } from '../../../shared/utils/index.js';
import { 
  createNowPlayingEmbed, 
  createPlayerButtons,
  createPlayerButtonsRow2,
  musicSuccess,
  getLoopMode
} from '../../utils/musicEmbeds.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song with controls'),
    
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

    const embed = createNowPlayingEmbed(queue, true);
    const buttons = createPlayerButtons(queue.node.isPaused());
    const buttons2 = createPlayerButtonsRow2();

    const response = await interaction.reply({ 
      embeds: [embed], 
      components: [buttons, buttons2], 
      fetchReply: true 
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      const currentQueue = useQueue(interaction.guild!.id);
      if (!currentQueue || !currentQueue.currentTrack) {
        await i.reply({ embeds: [errorEmbed('No active queue!')], ephemeral: true });
        return;
      }

      switch (i.customId) {
        case 'music_prev':
          try {
            await currentQueue.history.previous();
            await i.reply({ embeds: [musicSuccess('Playing previous track!', '⏮️')], ephemeral: true });
          } catch {
            await i.reply({ embeds: [errorEmbed('No previous track!')], ephemeral: true });
          }
          break;
        case 'music_playpause':
          currentQueue.node.setPaused(!currentQueue.node.isPaused());
          await i.update({ 
            embeds: [createNowPlayingEmbed(currentQueue, true)],
            components: [createPlayerButtons(currentQueue.node.isPaused()), buttons2]
          });
          break;
        case 'music_skip':
          currentQueue.node.skip();
          await i.reply({ embeds: [musicSuccess('Skipped!', '⏭️')], ephemeral: true });
          break;
        case 'music_stop':
          currentQueue.delete();
          await i.reply({ embeds: [musicSuccess('Stopped and cleared queue!', '⏹️')], ephemeral: true });
          break;
        case 'music_loop':
          const modes = [0, 1, 2, 3] as const;
          const currentMode = currentQueue.repeatMode;
          const nextMode = modes[(modes.indexOf(currentMode as any) + 1) % modes.length];
          currentQueue.setRepeatMode(nextMode as any);
          const loopInfo = getLoopMode(nextMode);
          await i.reply({ embeds: [musicSuccess(`Loop: ${loopInfo.icon} ${loopInfo.name}`, '🔁')], ephemeral: true });
          break;
        case 'music_shuffle':
          currentQueue.tracks.shuffle();
          await i.reply({ embeds: [musicSuccess('Queue shuffled!', '🔀')], ephemeral: true });
          break;
        case 'music_voldown':
          const newVolDown = Math.max(0, currentQueue.node.volume - 10);
          currentQueue.node.setVolume(newVolDown);
          await i.reply({ embeds: [musicSuccess(`Volume: ${newVolDown}%`, '🔉')], ephemeral: true });
          break;
        case 'music_volup':
          const newVolUp = Math.min(100, currentQueue.node.volume + 10);
          currentQueue.node.setVolume(newVolUp);
          await i.reply({ embeds: [musicSuccess(`Volume: ${newVolUp}%`, '🔊')], ephemeral: true });
          break;
        case 'music_queue':
          await i.reply({ content: 'Use `/queue` to see the full queue!', ephemeral: true });
          break;
        case 'music_lyrics':
          await i.reply({ content: 'Lyrics feature coming soon!', ephemeral: true });
          break;
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
