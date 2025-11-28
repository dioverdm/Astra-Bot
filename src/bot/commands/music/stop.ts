// ===========================================
// ASTRA BOT - Stop Command
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
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const queue = useQueue(interaction.guild.id);

    if (!queue) {
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

    try {
      const trackCount = queue.tracks.size + (queue.currentTrack ? 1 : 0);
      
      queue.delete();

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setDescription(`⏹️ **Playback stopped** and cleared ${trackCount} track(s) from the queue.`)
        .setFooter({ text: `Stopped by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ embeds: [errorEmbed('Failed to stop playback.')], ephemeral: true });
    }
  },
};

export default command;
