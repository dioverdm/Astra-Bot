// ===========================================
// ASTRA BOT - Rank Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserLevel } from '../../../database/models/UserLevel.js';
import { generateRankCard } from '../../utils/cardGenerator.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or someone else\'s level and rank')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    // Get or create level data
    let levelData = await UserLevel.findOne({ guildId, discordId: target.id });
    
    if (!levelData) {
      levelData = await UserLevel.create({
        guildId,
        discordId: target.id,
        level: 0,
        xp: 0,
        totalXp: 0,
        messages: 0,
      });
    }

    // Calculate XP needed for next level
    const xpNeeded = Math.floor(100 * Math.pow(1.5, levelData.level));

    // Get rank
    const rank = await UserLevel.countDocuments({
      guildId,
      totalXp: { $gt: levelData.totalXp },
    }) + 1;

    // Get member for display name and accent color
    let displayName = target.username;
    let accentColor: string | undefined;
    try {
      const member = await interaction.guild.members.fetch(target.id);
      displayName = member.displayName;
      // Get user's accent color if available
      const fullUser = await target.fetch();
      if (fullUser.accentColor) {
        accentColor = `#${fullUser.accentColor.toString(16).padStart(6, '0')}`;
      }
    } catch {
      // Use defaults
    }

    // Generate rank card image
    const cardBuffer = await generateRankCard({
      username: target.username,
      displayName: displayName !== target.username ? displayName : undefined,
      avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
      level: levelData.level,
      xp: levelData.xp,
      xpNeeded,
      rank,
      totalXp: levelData.totalXp || 0,
      messages: levelData.messages || 0,
      accentColor,
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank.png' });

    // Add buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rank_leaderboard')
          .setLabel('View Leaderboard')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🏆'),
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://astra.novaplex.xyz/dashboard/guild/${guildId}/member/${target.id}`)
          .setEmoji('🔗')
      );

    const response = await interaction.editReply({ 
      files: [attachment], 
      components: [row] 
    });

    // Handle leaderboard button
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === 'rank_leaderboard' && i.user.id === interaction.user.id,
      time: 60000,
      max: 1
    });

    collector.on('collect', async (i) => {
      const leaderboard = await UserLevel.find({ guildId })
        .sort({ totalXp: -1 })
        .limit(10);

      const leaderboardEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.primary)
        .setTitle(`🏆 ${interaction.guild!.name} Leaderboard`)
        .setDescription(
          leaderboard.map((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
            const isTarget = user.discordId === target.id;
            return `${medal} <@${user.discordId}> ${isTarget ? '← You' : ''}\n` +
              `   Level **${user.level}** • ${user.totalXp.toLocaleString()} XP`;
          }).join('\n\n')
        )
        .setFooter({ text: 'Top 10 members by XP' })
        .setTimestamp();

      await i.reply({ embeds: [leaderboardEmbed], ephemeral: true });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
