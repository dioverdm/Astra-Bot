// ===========================================
// ASTRA BOT - Lock/Unlock Command
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
    .setName('lock')
    .setDescription('Lock or unlock a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub
        .setName('channel')
        .setDescription('Lock a channel')
        .addChannelOption(opt =>
          opt
            .setName('target')
            .setDescription('Channel to lock (default: current)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for locking')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption(opt =>
          opt
            .setName('target')
            .setDescription('Channel to unlock (default: current)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const channel = (interaction.options.getChannel('target') || interaction.channel) as TextChannel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed('Invalid text channel.')], ephemeral: true });
      return;
    }

    const everyoneRole = interaction.guild.roles.everyone;

    try {
      if (subcommand === 'channel') {
        // Lock channel
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false,
          AddReactions: false,
        });

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.error)
          .setTitle('🔒 Channel Locked')
          .setDescription(`${channel} has been locked.`)
          .addFields({ name: '📝 Reason', value: reason })
          .setFooter({ text: `Locked by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send notice in locked channel
        if (channel.id !== interaction.channelId) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(EMBED_COLORS.error)
                .setDescription(`🔒 This channel has been locked by ${interaction.user}\n**Reason:** ${reason}`)
            ]
          }).catch(() => {});
        }
      } else {
        // Unlock channel
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: null,
          AddReactions: null,
        });

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.success)
          .setTitle('🔓 Channel Unlocked')
          .setDescription(`${channel} has been unlocked.`)
          .setFooter({ text: `Unlocked by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send notice in unlocked channel
        if (channel.id !== interaction.channelId) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(EMBED_COLORS.success)
                .setDescription(`🔓 This channel has been unlocked by ${interaction.user}`)
            ]
          }).catch(() => {});
        }
      }
    } catch (error: any) {
      await interaction.reply({ 
        embeds: [errorEmbed(`Failed to ${subcommand === 'channel' ? 'lock' : 'unlock'} channel: ${error.message}`)], 
        ephemeral: true 
      });
    }
  },
};

export default command;
