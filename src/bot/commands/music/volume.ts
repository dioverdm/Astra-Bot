// ===========================================
// ASTRA BOT - Volume Command
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
    .setName('volume')
    .setDescription('Adjust the music volume')
    .addIntegerOption(opt =>
      opt
        .setName('level')
        .setDescription('Volume level (0-100)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
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

    const level = interaction.options.getInteger('level');

    if (level === null) {
      // Show current volume
      const volumeBar = createVolumeBar(queue.node.volume);
      
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.music)
        .setTitle('🔊 Current Volume')
        .setDescription(`${volumeBar}\n\n**Volume:** ${queue.node.volume}%`)
        .setFooter({ text: 'Use /volume <0-100> to change' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const oldVolume = queue.node.volume;
    queue.node.setVolume(level);

    const volumeBar = createVolumeBar(level);
    const volumeIcon = level === 0 ? '🔇' : level < 30 ? '🔈' : level < 70 ? '🔉' : '🔊';

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setTitle(`${volumeIcon} Volume Changed`)
      .setDescription(`${volumeBar}\n\n**${oldVolume}%** → **${level}%**`)
      .setFooter({ text: `Changed by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  },
};

function createVolumeBar(volume: number): string {
  const filled = Math.round(volume / 10);
  const empty = 10 - filled;
  return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '`';
}

export default command;
