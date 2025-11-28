// ===========================================
// ASTRA BOT - Loop Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import { useQueue, QueueRepeatMode } from 'discord-player';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption(opt =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: '❌ Off - Disable loop', value: 'off' },
          { name: '🔂 Track - Loop current song', value: 'track' },
          { name: '🔁 Queue - Loop entire queue', value: 'queue' },
          { name: '📻 Autoplay - Auto-play similar songs', value: 'autoplay' }
        )
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

    const mode = interaction.options.getString('mode', true);
    
    let repeatMode: QueueRepeatMode;
    let modeName: string;
    let modeEmoji: string;
    let description: string;

    switch (mode) {
      case 'off':
        repeatMode = QueueRepeatMode.OFF;
        modeName = 'Off';
        modeEmoji = '❌';
        description = 'Loop has been disabled.';
        break;
      case 'track':
        repeatMode = QueueRepeatMode.TRACK;
        modeName = 'Track';
        modeEmoji = '🔂';
        description = 'Now looping the current track.';
        break;
      case 'queue':
        repeatMode = QueueRepeatMode.QUEUE;
        modeName = 'Queue';
        modeEmoji = '🔁';
        description = 'Now looping the entire queue.';
        break;
      case 'autoplay':
        repeatMode = QueueRepeatMode.AUTOPLAY;
        modeName = 'Autoplay';
        modeEmoji = '📻';
        description = 'Autoplay enabled - similar songs will be added automatically.';
        break;
      default:
        repeatMode = QueueRepeatMode.OFF;
        modeName = 'Off';
        modeEmoji = '❌';
        description = 'Loop has been disabled.';
    }

    queue.setRepeatMode(repeatMode);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setTitle(`${modeEmoji} Loop Mode: ${modeName}`)
      .setDescription(description)
      .setFooter({ text: `Changed by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
