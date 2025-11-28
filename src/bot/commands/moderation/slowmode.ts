// ===========================================
// ASTRA BOT - Slowmode Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt =>
      opt
        .setName('seconds')
        .setDescription('Slowmode in seconds (0 to disable, max 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Channel to set slowmode (default: current)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed('Invalid text channel.')], ephemeral: true });
      return;
    }

    try {
      await channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.success)
        .setTitle('⏱️ Slowmode Updated')
        .setDescription(
          seconds === 0
            ? `Slowmode has been **disabled** in ${channel}`
            : `Slowmode set to **${formatDuration(seconds)}** in ${channel}`
        )
        .setFooter({ text: `Set by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ 
        embeds: [errorEmbed(`Failed to set slowmode: ${error.message}`)], 
        ephemeral: true 
      });
    }
  },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

export default command;
