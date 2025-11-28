// ===========================================
// ASTRA BOT - Role Info Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Role
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get information about a role')
    .addRoleOption(opt =>
      opt
        .setName('role')
        .setDescription('The role to get info about')
        .setRequired(true)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const role = interaction.options.getRole('role', true) as Role;

    // Get key permissions
    const permissions = role.permissions.toArray();
    const keyPerms = [
      'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
      'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone'
    ];
    const hasKeyPerms = keyPerms.filter(p => permissions.includes(p as any));

    // Count members with this role
    const memberCount = role.members.size;

    const embed = new EmbedBuilder()
      .setColor(role.color || EMBED_COLORS.primary)
      .setTitle(`📋 Role: ${role.name}`)
      .setThumbnail(role.iconURL() || interaction.guild.iconURL())
      .addFields(
        { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
        { name: '🎨 Color', value: role.hexColor.toUpperCase(), inline: true },
        { name: '👥 Members', value: memberCount.toString(), inline: true },
        { name: '📍 Position', value: `${role.position} / ${interaction.guild.roles.cache.size}`, inline: true },
        { name: '📢 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: '🔝 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: '🤖 Managed', value: role.managed ? 'Yes (Bot/Integration)' : 'No', inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '💬 Mention', value: `${role}`, inline: true }
      );

    if (hasKeyPerms.length > 0) {
      embed.addFields({
        name: '🔑 Key Permissions',
        value: hasKeyPerms.map(p => `\`${p}\``).join(', ')
      });
    }

    if (permissions.includes('Administrator' as any)) {
      embed.setDescription('⚠️ **This role has Administrator permissions!**');
    }

    embed.setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
