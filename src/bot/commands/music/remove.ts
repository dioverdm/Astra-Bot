// ===========================================
// ASTRA BOT - Remove Command
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
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption(opt =>
      opt
        .setName('position')
        .setDescription('Position of the track to remove')
        .setRequired(true)
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

    if (!queue || queue.tracks.size === 0) {
      await interaction.reply({ 
        embeds: [errorEmbed('The queue is empty!')], 
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

    const position = interaction.options.getInteger('position', true);

    if (position > queue.tracks.size) {
      await interaction.reply({ 
        embeds: [errorEmbed(`Invalid position! Queue only has ${queue.tracks.size} tracks.`)], 
        ephemeral: true 
      });
      return;
    }

    const tracks = queue.tracks.toArray();
    const removedTrack = tracks[position - 1];
    
    queue.removeTrack(position - 1);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setTitle('🗑️ Track Removed')
      .setDescription(`Removed **[${removedTrack.title}](${removedTrack.url})** from position #${position}`)
      .setThumbnail(removedTrack.thumbnail)
      .setFooter({ text: `Removed by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
