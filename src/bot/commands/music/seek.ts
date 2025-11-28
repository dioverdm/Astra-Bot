// ===========================================
// ASTRA BOT - Seek Command
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
    .setName('seek')
    .setDescription('Seek to a specific position in the song')
    .addStringOption(opt =>
      opt
        .setName('position')
        .setDescription('Position to seek to (e.g., 1:30, 90, 2:00)')
        .setRequired(true)
    ),
    
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

    const positionStr = interaction.options.getString('position', true);
    const position = parseTimeString(positionStr);

    if (position === null) {
      await interaction.reply({ 
        embeds: [errorEmbed('Invalid time format! Use formats like: `1:30`, `90`, `2:00:30`')], 
        ephemeral: true 
      });
      return;
    }

    const duration = queue.currentTrack.durationMS;
    
    if (position > duration) {
      await interaction.reply({ 
        embeds: [errorEmbed(`Cannot seek past the song duration (${queue.currentTrack.duration})!`)], 
        ephemeral: true 
      });
      return;
    }

    await queue.node.seek(position);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setTitle('⏩ Seeked')
      .setDescription(`Seeked to **${formatTime(position)}** in **${queue.currentTrack.title}**`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

function parseTimeString(str: string): number | null {
  // Support formats: "90" (seconds), "1:30" (min:sec), "1:30:00" (hour:min:sec)
  const parts = str.split(':').map(p => parseInt(p.trim()));
  
  if (parts.some(isNaN)) return null;

  if (parts.length === 1) {
    // Just seconds
    return parts[0] * 1000;
  } else if (parts.length === 2) {
    // min:sec
    return (parts[0] * 60 + parts[1]) * 1000;
  } else if (parts.length === 3) {
    // hour:min:sec
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }

  return null;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default command;
