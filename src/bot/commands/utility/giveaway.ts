// ===========================================
// ASTRA BOT - Giveaway Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { giveawayManager } from '../../systems/giveaway/index.js';
import { Giveaway } from '../../../database/models/Giveaway.js';
import ms from 'ms';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(opt =>
          opt.setName('prize').setDescription('What are you giving away?').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('duration').setDescription('Duration (e.g., 1h, 1d, 1w)').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(20)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel for the giveaway').addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(opt =>
          opt.setName('description').setDescription('Additional description')
        )
        .addRoleOption(opt =>
          opt.setName('required_role').setDescription('Required role to enter')
        )
        .addIntegerOption(opt =>
          opt.setName('min_level').setDescription('Minimum level required').setMinValue(1)
        )
        .addRoleOption(opt =>
          opt.setName('bonus_role').setDescription('Role that gets bonus entries')
        )
        .addIntegerOption(opt =>
          opt.setName('bonus_entries').setDescription('Bonus entries for the role (default: 1)').setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(opt =>
          opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for a giveaway')
        .addStringOption(opt =>
          opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('count').setDescription('Number of new winners (default: 1)').setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all active giveaways')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a giveaway')
        .addStringOption(opt =>
          opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'start':
        await handleStart(interaction);
        break;
      case 'end':
        await handleEnd(interaction);
        break;
      case 'reroll':
        await handleReroll(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'delete':
        await handleDelete(interaction);
        break;
    }
  },
};

async function handleStart(interaction: ChatInputCommandInteraction) {
  const prize = interaction.options.getString('prize', true);
  const durationStr = interaction.options.getString('duration', true);
  const winnerCount = interaction.options.getInteger('winners') || 1;
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  const description = interaction.options.getString('description');
  const requiredRole = interaction.options.getRole('required_role');
  const minLevel = interaction.options.getInteger('min_level');
  const bonusRole = interaction.options.getRole('bonus_role');
  const bonusEntries = interaction.options.getInteger('bonus_entries') || 1;

  // Parse duration
  const duration = ms(durationStr as ms.StringValue);
  if (!duration || duration < 60000) { // Minimum 1 minute
    await interaction.reply({ 
      embeds: [errorEmbed('Invalid duration! Use formats like: 1m, 1h, 1d, 1w')], 
      ephemeral: true 
    });
    return;
  }

  if (duration > 30 * 24 * 60 * 60 * 1000) { // Maximum 30 days
    await interaction.reply({ 
      embeds: [errorEmbed('Duration cannot exceed 30 days!')], 
      ephemeral: true 
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Build requirements
  const requirements: any = {};
  if (requiredRole) requirements.roles = [requiredRole.id];
  if (minLevel) requirements.minLevel = minLevel;

  // Build bonus entries
  const bonusEntriesArr = bonusRole ? [{ roleId: bonusRole.id, entries: bonusEntries }] : [];

  const giveaway = await giveawayManager.create({
    guildId: interaction.guild!.id,
    channelId: channel!.id,
    hostId: interaction.user.id,
    prize,
    description: description || undefined,
    duration,
    winnerCount,
    requirements: Object.keys(requirements).length > 0 ? requirements : undefined,
    bonusEntries: bonusEntriesArr
  });

  if (!giveaway) {
    await interaction.editReply({ embeds: [errorEmbed('Failed to create giveaway.')] });
    return;
  }

  const endsAt = new Date(Date.now() + duration);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🎉 Giveaway Created!')
    .setDescription(
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winnerCount}\n` +
      `**Duration:** ${durationStr}\n` +
      `**Channel:** ${channel}\n` +
      `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>`
    )
    .setFooter({ text: `Message ID: ${giveaway.messageId}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleEnd(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('message_id', true);

  await interaction.deferReply({ ephemeral: true });

  const result = await giveawayManager.end(messageId);

  if (!result.success) {
    await interaction.editReply({ embeds: [errorEmbed(result.message!)] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✅ Giveaway Ended')
    .setDescription(
      result.winners && result.winners.length > 0
        ? `**Winners:** ${result.winners.map(id => `<@${id}>`).join(', ')}`
        : 'No valid entries - no winners selected.'
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleReroll(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('message_id', true);
  const count = interaction.options.getInteger('count') || 1;

  await interaction.deferReply({ ephemeral: true });

  const result = await giveawayManager.reroll(messageId, count);

  if (!result.success) {
    await interaction.editReply({ embeds: [errorEmbed(result.message!)] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🎲 Giveaway Rerolled')
    .setDescription(`**New Winner${result.winners!.length > 1 ? 's' : ''}:** ${result.winners!.map(id => `<@${id}>`).join(', ')}`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const giveaways = await giveawayManager.getActiveGiveaways(interaction.guild!.id);

  if (giveaways.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle('🎉 Active Giveaways')
      .setDescription('No active giveaways in this server.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle(`🎉 Active Giveaways (${giveaways.length})`)
    .setTimestamp();

  const giveawayList = giveaways.map((g, i) => {
    return `**${i + 1}. ${g.prize}**\n` +
      `┗ Channel: <#${g.channelId}>\n` +
      `┗ Ends: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>\n` +
      `┗ Entries: ${g.participants.length} | Winners: ${g.winnerCount}\n` +
      `┗ ID: \`${g.messageId}\``;
  }).join('\n\n');

  embed.setDescription(giveawayList);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('message_id', true);

  await interaction.deferReply({ ephemeral: true });

  const success = await giveawayManager.delete(messageId);

  if (!success) {
    await interaction.editReply({ embeds: [errorEmbed('Giveaway not found.')] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🗑️ Giveaway Deleted')
    .setDescription('The giveaway has been deleted.')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export default command;
