// ===========================================
// ASTRA BOT - Clear Queue Command
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
    .setName('clearqueue')
    .setDescription('Clear all tracks from the queue'),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const queue = useQueue(interaction.guild.id);

    if (!queue || queue.tracks.size === 0) {
      await interaction.reply({ 
        embeds: [errorEmbed('The queue is already empty!')], 
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

    const trackCount = queue.tracks.size;
    queue.tracks.clear();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle('🗑️ Queue Cleared')
      .setDescription(`Removed **${trackCount}** tracks from the queue.\nThe current song will continue playing.`)
      .setFooter({ text: `Cleared by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
