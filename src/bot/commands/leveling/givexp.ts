// ===========================================
// ASTRA BOT - Give XP Command (Admin)
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
    .setName('givexp')
    .setDescription('Give or remove XP from a user (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to modify')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('XP amount (negative to remove)')
        .setRequired(true)
        .setMinValue(-100000)
        .setMaxValue(100000)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const guildId = interaction.guild.id;

    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot modify bot XP.')], ephemeral: true });
      return;
    }

    // Get or create user level
    let userData = await UserLevel.findOne({ guildId, discordId: target.id });
    
    if (!userData) {
      userData = await UserLevel.create({
        guildId,
        discordId: target.id,
        level: 0,
        xp: 0,
        totalXp: 0,
        messages: 0,
      });
    }

    const oldLevel = userData.level;
    let newXp = userData.xp + amount;
    let newTotalXp = Math.max(0, userData.totalXp + amount);
    let newLevel = userData.level;

    // Calculate new level based on total XP
    if (amount > 0) {
      // Check for level ups
      let xpNeeded = Math.floor(100 * Math.pow(1.5, newLevel));
      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        xpNeeded = Math.floor(100 * Math.pow(1.5, newLevel));
      }
    } else {
      // Recalculate level from total XP
      newLevel = 0;
      let totalNeeded = 0;
      while (totalNeeded + Math.floor(100 * Math.pow(1.5, newLevel)) <= newTotalXp) {
        totalNeeded += Math.floor(100 * Math.pow(1.5, newLevel));
        newLevel++;
      }
      newXp = newTotalXp - totalNeeded;
    }

    // Update database
    await UserLevel.updateOne(
      { guildId, discordId: target.id },
      { 
        $set: { 
          level: newLevel, 
          xp: Math.max(0, newXp), 
          totalXp: newTotalXp 
        } 
      }
    );

    const isAdding = amount > 0;
    const levelChanged = newLevel !== oldLevel;

    const embed = new EmbedBuilder()
      .setColor(isAdding ? EMBED_COLORS.success : EMBED_COLORS.warning)
      .setTitle(`✨ XP ${isAdding ? 'Added' : 'Removed'}`)
      .setDescription(
        `${isAdding ? 'Gave' : 'Removed'} **${Math.abs(amount).toLocaleString()}** XP ${isAdding ? 'to' : 'from'} ${target}` +
        (levelChanged ? `\n\n📊 Level: ${oldLevel} → **${newLevel}**` : '')
      )
      .addFields(
        { name: '👤 User', value: `${target.tag}`, inline: true },
        { name: '📊 Level', value: `${newLevel}`, inline: true },
        { name: '✨ Total XP', value: newTotalXp.toLocaleString(), inline: true }
      )
      .setFooter({ text: `Modified by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
