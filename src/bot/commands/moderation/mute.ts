// ===========================================
// ASTRA BOT - Mute/Unmute Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  Role
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import { ModerationLog } from '../../../database/models/ModerationLog.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute or unmute a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Mute a member')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to mute').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the mute').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('duration').setDescription('Duration (e.g., 1h, 30m, 1d)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Unmute a member')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to unmute').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Setup or view the mute role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The mute role to use').setRequired(false)
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await handleSetup(interaction);
    } else if (subcommand === 'add') {
      await handleMute(interaction);
    } else if (subcommand === 'remove') {
      await handleUnmute(interaction);
    }
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction) {
  const role = interaction.options.getRole('role') as Role | null;
  const guildId = interaction.guild!.id;

  if (!role) {
    // Show current mute role
    const config = await GuildConfig.findOne({ guildId }) as any;
    if (config?.muteRoleId) {
      const muteRole = interaction.guild!.roles.cache.get(config.muteRoleId);
      if (muteRole) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.info)
          .setTitle('🔇 Mute Role Configuration')
          .setDescription(`Current mute role: ${muteRole}\n\nUse \`/mute setup role:@role\` to change it.`);
        await interaction.reply({ embeds: [embed] });
        return;
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle('🔇 Mute Role Not Set')
      .setDescription('No mute role is configured.\n\nUse `/mute setup role:@role` to set one.');
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // Set mute role
  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { muteRoleId: role.id } },
    { upsert: true }
  );

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✅ Mute Role Set')
    .setDescription(`Mute role has been set to ${role}\n\nMake sure this role has the proper permissions (Send Messages denied in channels).`);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleMute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const durationStr = interaction.options.getString('duration');
  const guildId = interaction.guild!.id;

  // Get mute role
  const config = await GuildConfig.findOne({ guildId }) as any;
  if (!config?.muteRoleId) {
    await interaction.reply({ 
      embeds: [errorEmbed('No mute role configured! Use `/mute setup` first.')], 
      ephemeral: true 
    });
    return;
  }

  const muteRole = interaction.guild!.roles.cache.get(config.muteRoleId);
  if (!muteRole) {
    await interaction.reply({ 
      embeds: [errorEmbed('Mute role not found! It may have been deleted.')], 
      ephemeral: true 
    });
    return;
  }

  // Get member
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });
    return;
  }

  // Check if already muted
  if (member.roles.cache.has(muteRole.id)) {
    await interaction.reply({ embeds: [errorEmbed('This user is already muted!')], ephemeral: true });
    return;
  }

  // Check hierarchy
  if (member.roles.highest.position >= interaction.guild!.members.me!.roles.highest.position) {
    await interaction.reply({ 
      embeds: [errorEmbed('I cannot mute this user. Their role is higher than mine.')], 
      ephemeral: true 
    });
    return;
  }

  // Parse duration
  let duration: number | null = null;
  if (durationStr) {
    duration = parseDuration(durationStr);
    if (!duration) {
      await interaction.reply({ 
        embeds: [errorEmbed('Invalid duration format! Use formats like: 30m, 1h, 1d, 1w')], 
        ephemeral: true 
      });
      return;
    }
  }

  await interaction.deferReply();

  try {
    // Add mute role
    await member.roles.add(muteRole, `Muted by ${interaction.user.tag}: ${reason}`);

    // Log to database
    await ModerationLog.create({
      guildId,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: 'mute',
      reason,
    } as any);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.moderation)
      .setTitle('🔇 Member Muted')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
        { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: '📝 Reason', value: reason },
        { name: '⏱️ Duration', value: durationStr || 'Permanent', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Schedule unmute if duration set
    if (duration) {
      setTimeout(async () => {
        try {
          const memberToUnmute = await interaction.guild!.members.fetch(target.id).catch(() => null);
          if (memberToUnmute && memberToUnmute.roles.cache.has(muteRole.id)) {
            await memberToUnmute.roles.remove(muteRole, 'Mute duration expired');
          }
        } catch {}
      }, duration);
    }

  } catch (error: any) {
    await interaction.editReply({ embeds: [errorEmbed(`Failed to mute: ${error.message}`)] });
  }
}

async function handleUnmute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('user', true);
  const guildId = interaction.guild!.id;

  // Get mute role
  const config = await GuildConfig.findOne({ guildId }) as any;
  if (!config?.muteRoleId) {
    await interaction.reply({ 
      embeds: [errorEmbed('No mute role configured!')], 
      ephemeral: true 
    });
    return;
  }

  const muteRole = interaction.guild!.roles.cache.get(config.muteRoleId);
  if (!muteRole) {
    await interaction.reply({ embeds: [errorEmbed('Mute role not found!')], ephemeral: true });
    return;
  }

  // Get member
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });
    return;
  }

  // Check if muted
  if (!member.roles.cache.has(muteRole.id)) {
    await interaction.reply({ embeds: [errorEmbed('This user is not muted!')], ephemeral: true });
    return;
  }

  try {
    await member.roles.remove(muteRole, `Unmuted by ${interaction.user.tag}`);

    // Log to database
    await ModerationLog.create({
      guildId,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: 'unmute',
      reason: 'Manual unmute',
    } as any);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle('🔊 Member Unmuted')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
        { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error: any) {
    await interaction.reply({ embeds: [errorEmbed(`Failed to unmute: ${error.message}`)], ephemeral: true });
  }
}

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

export default command;
