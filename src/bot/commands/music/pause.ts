// ===========================================
// ASTRA BOT - Pause/Resume Command
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
    .setName('pause')
    .setDescription('Pause or resume the current song'),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
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

    const wasPaused = queue.node.isPaused();
    queue.node.setPaused(!wasPaused);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setTitle(wasPaused ? '▶️ Resumed' : '⏸️ Paused')
      .setDescription(
        wasPaused 
          ? `Resumed playing **${queue.currentTrack.title}**`
          : `Paused **${queue.currentTrack.title}**`
      )
      .setThumbnail(queue.currentTrack.thumbnail)
      .setFooter({ text: `${wasPaused ? 'Resumed' : 'Paused'} by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
