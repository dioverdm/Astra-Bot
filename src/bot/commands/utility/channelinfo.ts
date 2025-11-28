// ===========================================
// ASTRA BOT - Channel Info Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  CategoryChannel
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const CHANNEL_TYPE_NAMES: Record<number, string> = {
  [ChannelType.GuildText]: '💬 Text Channel',
  [ChannelType.GuildVoice]: '🔊 Voice Channel',
  [ChannelType.GuildCategory]: '📁 Category',
  [ChannelType.GuildAnnouncement]: '📢 Announcement',
  [ChannelType.GuildStageVoice]: '🎭 Stage Channel',
  [ChannelType.GuildForum]: '📋 Forum Channel',
  [ChannelType.PublicThread]: '🧵 Public Thread',
  [ChannelType.PrivateThread]: '🔒 Private Thread',
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Get information about a channel')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('The channel to get info about (default: current)')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const channel = (interaction.options.getChannel('channel') || interaction.channel) as GuildChannel;

    if (!channel) {
      await interaction.reply({ embeds: [errorEmbed('Channel not found.')], ephemeral: true });
      return;
    }

    const typeName = CHANNEL_TYPE_NAMES[channel.type] || 'Unknown';

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle(`${typeName}: ${channel.name}`)
      .addFields(
        { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
        { name: '📁 Type', value: typeName.split(' ')[1], inline: true },
        { name: '📍 Position', value: channel.position?.toString() || 'N/A', inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true }
      );

    // Add parent category if exists
    if (channel.parent) {
      embed.addFields({ name: '📂 Category', value: channel.parent.name, inline: true });
    }

    // Text channel specific
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      const textChannel = channel as TextChannel;
      embed.addFields(
        { name: '🔞 NSFW', value: textChannel.nsfw ? 'Yes' : 'No', inline: true },
        { name: '⏱️ Slowmode', value: textChannel.rateLimitPerUser ? `${textChannel.rateLimitPerUser}s` : 'Off', inline: true }
      );
      if (textChannel.topic) {
        embed.addFields({ name: '📝 Topic', value: textChannel.topic.slice(0, 1024) });
      }
    }

    // Voice channel specific
    if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
      const voiceChannel = channel as VoiceChannel;
      embed.addFields(
        { name: '👥 Connected', value: voiceChannel.members.size.toString(), inline: true },
        { name: '👤 User Limit', value: voiceChannel.userLimit ? voiceChannel.userLimit.toString() : 'Unlimited', inline: true },
        { name: '📶 Bitrate', value: `${voiceChannel.bitrate / 1000}kbps`, inline: true }
      );
    }

    // Category specific
    if (channel.type === ChannelType.GuildCategory) {
      const category = channel as CategoryChannel;
      embed.addFields(
        { name: '📊 Channels', value: category.children.cache.size.toString(), inline: true }
      );
    }

    embed.setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
