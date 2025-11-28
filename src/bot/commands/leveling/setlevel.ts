// ===========================================
// ASTRA BOT - Set Level Command (Admin)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserLevel } from '../../../database/models/UserLevel.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Set a user\'s level (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to modify')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('level')
        .setDescription('The level to set')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(1000)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const newLevel = interaction.options.getInteger('level', true);
    const guildId = interaction.guild.id;

    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot modify bot levels.')], ephemeral: true });
      return;
    }

    // Calculate total XP needed for the level
    let totalXp = 0;
    for (let i = 0; i < newLevel; i++) {
      totalXp += Math.floor(100 * Math.pow(1.5, i));
    }

    // Update or create user level
    const updated = await UserLevel.findOneAndUpdate(
      { guildId, discordId: target.id },
      { 
        $set: { 
          level: newLevel, 
          xp: 0, 
          totalXp 
        } 
      },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle('📊 Level Updated')
      .setDescription(`${target}'s level has been set to **${newLevel}**`)
      .addFields(
        { name: '👤 User', value: `${target.tag}`, inline: true },
        { name: '📊 New Level', value: `${newLevel}`, inline: true },
        { name: '✨ Total XP', value: totalXp.toLocaleString(), inline: true }
      )
      .setFooter({ text: `Set by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
