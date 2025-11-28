// ===========================================
// ASTRA BOT - Warn Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { ModerationLog } from '../../../database/models/ModerationLog.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Warn a member')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to warn').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a warning')
        .addStringOption(opt =>
          opt.setName('case_id').setDescription('The case ID to remove').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List warnings for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to check').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Clear all warnings for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to clear warnings for').setRequired(true)
        )
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'add':
        await handleWarnAdd(interaction);
        break;
      case 'remove':
        await handleWarnRemove(interaction);
        break;
      case 'list':
        await handleWarnList(interaction);
        break;
      case 'clear':
        await handleWarnClear(interaction);
        break;
    }
  },
};

async function handleWarnAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  const guild = interaction.guild!;
  const moderator = interaction.user;

  // Check if target is a member
  let member: GuildMember | null = null;
  try {
    member = await guild.members.fetch(target.id);
  } catch {
    // User might have left the server
  }

  // Don't warn bots
  if (target.bot) {
    await interaction.reply({ embeds: [errorEmbed('You cannot warn bots.')], ephemeral: true });
    return;
  }

  // Don't warn yourself
  if (target.id === moderator.id) {
    await interaction.reply({ embeds: [errorEmbed('You cannot warn yourself.')], ephemeral: true });
    return;
  }

  // Get next case ID
  const caseId = await (ModerationLog as any).getNextCaseId(guild.id);

  // Create warning in database
  await ModerationLog.create({
    guildId: guild.id,
    caseId,
    action: 'warn',
    targetId: target.id,
    moderatorId: moderator.id,
    reason,
    timestamp: new Date(),
  });

  // Count total warnings
  const totalWarnings = await ModerationLog.countDocuments({
    guildId: guild.id,
    targetId: target.id,
    action: 'warn',
  });

  // Try to DM the user
  let dmSent = false;
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle(`⚠️ You have been warned in ${guild.name}`)
      .addFields(
        { name: '📝 Reason', value: reason },
        { name: '⚠️ Total Warnings', value: `${totalWarnings}`, inline: true },
        { name: '👮 Moderator', value: moderator.tag, inline: true }
      )
      .setTimestamp();
    await target.send({ embeds: [dmEmbed] });
    dmSent = true;
  } catch {
    // User has DMs disabled
  }

  // Create response embed
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setAuthor({ name: '⚠️ Member Warned', iconURL: target.displayAvatarURL() })
    .setThumbnail(target.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: '👤 User', value: `${target} (${target.tag})`, inline: true },
      { name: '🔢 Case ID', value: `#${caseId}`, inline: true },
      { name: '⚠️ Total Warnings', value: `${totalWarnings}`, inline: true },
      { name: '📝 Reason', value: reason },
      { name: '📬 DM Sent', value: dmSent ? '✅ Yes' : '❌ No (DMs disabled)', inline: true }
    )
    .setFooter({ text: `Moderator: ${moderator.tag}` })
    .setTimestamp();

  // Add action buttons
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`warn_timeout_${target.id}`)
        .setLabel('Timeout')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏰'),
      new ButtonBuilder()
        .setCustomId(`warn_kick_${target.id}`)
        .setLabel('Kick')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👢')
    );

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  // Handle button interactions
  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === moderator.id,
    time: 60000,
  });

  collector.on('collect', async (i) => {
    if (i.customId === `warn_timeout_${target.id}`) {
      if (member) {
        try {
          await member.timeout(3600000, `Follow-up to warning: ${reason}`);
          await i.reply({ content: `✅ ${target} has been timed out for 1 hour.`, ephemeral: true });
        } catch (error) {
          await i.reply({ content: '❌ Failed to timeout user.', ephemeral: true });
        }
      } else {
        await i.reply({ content: '❌ User is not in the server.', ephemeral: true });
      }
    } else if (i.customId === `warn_kick_${target.id}`) {
      if (member) {
        try {
          await member.kick(`Follow-up to warning: ${reason}`);
          await i.reply({ content: `✅ ${target} has been kicked.`, ephemeral: true });
        } catch (error) {
          await i.reply({ content: '❌ Failed to kick user.', ephemeral: true });
        }
      } else {
        await i.reply({ content: '❌ User is not in the server.', ephemeral: true });
      }
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });

  // Send to mod log channel
  try {
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (config?.moderation?.logChannelId) {
      const logChannel = guild.channels.cache.get(config.moderation.logChannelId);
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle('⚠️ Warning Issued')
          .addFields(
            { name: 'User', value: `${target} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${moderator} (${moderator.id})`, inline: true },
            { name: 'Case ID', value: `#${caseId}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Total Warnings', value: `${totalWarnings}` }
          )
          .setTimestamp();
        await (logChannel as any).send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    logger.debug('Could not send to mod log channel:', error);
  }
}

async function handleWarnRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const caseIdStr = interaction.options.getString('case_id', true);
  const caseId = parseInt(caseIdStr.replace('#', ''));
  const guild = interaction.guild!;

  if (isNaN(caseId)) {
    await interaction.reply({ embeds: [errorEmbed('Invalid case ID.')], ephemeral: true });
    return;
  }

  const warning = await ModerationLog.findOneAndDelete({
    guildId: guild.id,
    caseId,
    action: 'warn',
  });

  if (!warning) {
    await interaction.reply({ embeds: [errorEmbed(`Warning #${caseId} not found.`)], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✅ Warning Removed')
    .setDescription(`Warning #${caseId} has been removed.`)
    .addFields(
      { name: 'User ID', value: warning.targetId, inline: true },
      { name: 'Original Reason', value: warning.reason || 'No reason', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleWarnList(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const guild = interaction.guild!;

  const warnings = await ModerationLog.find({
    guildId: guild.id,
    targetId: target.id,
    action: 'warn',
  }).sort({ timestamp: -1 }).limit(10);

  if (warnings.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle('📋 Warnings')
      .setDescription(`${target} has no warnings.`)
      .setThumbnail(target.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setTitle(`📋 Warnings for ${target.tag}`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(
      warnings.map((w, i) => 
        `**#${w.caseId}** • ${w.reason || 'No reason'}\n` +
        `<t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R> by <@${w.moderatorId}>`
      ).join('\n\n')
    )
    .setFooter({ text: `Total: ${warnings.length} warning(s)` });

  await interaction.reply({ embeds: [embed] });
}

async function handleWarnClear(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const guild = interaction.guild!;

  const result = await ModerationLog.deleteMany({
    guildId: guild.id,
    targetId: target.id,
    action: 'warn',
  });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✅ Warnings Cleared')
    .setDescription(`Cleared **${result.deletedCount}** warning(s) for ${target}.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export default command;
