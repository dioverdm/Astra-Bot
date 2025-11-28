// ===========================================
// ASTRA BOT - Leaderboard Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserLevel } from '../../../database/models/UserLevel.js';
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import { generateLeaderboardCard } from '../../utils/cardGenerator.js';
import type { BotCommand } from '../../../shared/types/index.js';

type LeaderboardType = 'xp' | 'level' | 'messages' | 'balance' | 'weekly';

interface LeaderboardResult {
  cardBuffer: Buffer;
  totalPages: number;
}

const TYPE_CONFIG: Record<LeaderboardType, { title: string; valueKey: string; valueSuffix: string; sortField: string; filter: Record<string, any> }> = {
  xp: { title: 'XP Leaderboard', valueKey: 'totalXp', valueSuffix: ' XP', sortField: 'totalXp', filter: { totalXp: { $gt: 0 } } },
  level: { title: 'Level Leaderboard', valueKey: 'level', valueSuffix: '', sortField: 'level', filter: { level: { $gt: 0 } } },
  messages: { title: 'Messages Leaderboard', valueKey: 'messages', valueSuffix: ' msgs', sortField: 'messages', filter: { messages: { $gt: 0 } } },
  balance: { title: 'Balance Leaderboard', valueKey: 'balance', valueSuffix: ' coins', sortField: 'balance', filter: {} },
  weekly: { title: 'Weekly XP Leaderboard', valueKey: 'weeklyXp', valueSuffix: ' XP', sortField: 'weeklyXp', filter: { weeklyXp: { $gt: 0 } } },
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View server leaderboards')
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: '✨ XP (All-time)', value: 'xp' },
          { name: '📊 Level', value: 'level' },
          { name: '💬 Messages', value: 'messages' },
          { name: '💰 Balance', value: 'balance' },
          { name: '📅 Weekly XP', value: 'weekly' }
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const type = (interaction.options.getString('type') || 'xp') as LeaderboardType;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const perPage = 10;

    const { cardBuffer, totalPages } = await fetchLeaderboardData(guildId, guildName, type, 1, perPage);

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'leaderboard.png' });

    // Create components
    const createComponents = (currentPage: number, maxPages: number, currentType: LeaderboardType) => {
      const navRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('lb_prev')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 1),
          new ButtonBuilder()
            .setCustomId('lb_page')
            .setLabel(`Page ${currentPage} / ${maxPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('lb_next')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= maxPages)
        );

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('lb_type')
            .setPlaceholder('Change leaderboard type')
            .addOptions([
              { label: 'XP (All-time)', value: 'xp', emoji: '✨', default: currentType === 'xp' },
              { label: 'Level', value: 'level', emoji: '📊', default: currentType === 'level' },
              { label: 'Messages', value: 'messages', emoji: '💬', default: currentType === 'messages' },
              { label: 'Balance', value: 'balance', emoji: '💰', default: currentType === 'balance' },
              { label: 'Weekly XP', value: 'weekly', emoji: '📅', default: currentType === 'weekly' },
            ])
        );

      return [navRow, selectRow];
    };

    const response = await interaction.editReply({ 
      files: [attachment], 
      components: createComponents(1, totalPages, type) 
    });

    // Handle interactions
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    let currentType = type;
    let currentPage = 1;

    collector.on('collect', async (i) => {
      if (i.isStringSelectMenu() && i.customId === 'lb_type') {
        currentType = i.values[0] as LeaderboardType;
        currentPage = 1;
      } else if (i.isButton()) {
        if (i.customId === 'lb_prev') {
          currentPage = Math.max(1, currentPage - 1);
        } else if (i.customId === 'lb_next') {
          currentPage++;
        }
      }

      const { cardBuffer: newBuffer, totalPages: newTotal } = await fetchLeaderboardData(
        guildId, guildName, currentType, currentPage, perPage
      );

      const newAttachment = new AttachmentBuilder(newBuffer, { name: 'leaderboard.png' });

      await i.update({ 
        files: [newAttachment], 
        components: createComponents(currentPage, newTotal, currentType) 
      });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

async function fetchLeaderboardData(
  guildId: string,
  guildName: string,
  type: LeaderboardType,
  page: number,
  perPage: number
): Promise<LeaderboardResult> {
  const config = TYPE_CONFIG[type];
  const skip = (page - 1) * perPage;
  
  let data: any[] = [];
  let totalCount = 0;

  if (type === 'balance') {
    data = await UserEconomy.find({ guildId, ...config.filter })
      .sort({ [config.sortField]: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();
    totalCount = await UserEconomy.countDocuments({ guildId, ...config.filter });
  } else {
    data = await UserLevel.find({ guildId, ...config.filter })
      .sort({ [config.sortField]: -1, totalXp: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();
    totalCount = await UserLevel.countDocuments({ guildId, ...config.filter });
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  // Fetch real usernames from Discord
  const client = (global as any).discordClient;

  // Build users array with real Discord data
  const users = await Promise.all(data.map(async (user, index) => {
    let username = `User ${user.discordId?.slice(-4) || '????'}`;
    let avatarUrl: string | undefined;

    // Try to fetch real user data from Discord
    if (client && user.discordId) {
      try {
        const discordUser = await client.users.fetch(user.discordId);
        if (discordUser) {
          username = discordUser.username;
          avatarUrl = discordUser.displayAvatarURL({ extension: 'png', size: 128 });
        }
      } catch {
        // User not found, use fallback
      }
    }

    return {
      username,
      avatarUrl,
      value: user[config.valueKey] || 0,
      valueSuffix: config.valueSuffix,
      level: type !== 'balance' ? user.level : undefined,
      rank: skip + index + 1,
    };
  }));

  // Generate the leaderboard card
  const cardBuffer = await generateLeaderboardCard({
    title: `${guildName} Leaderboard`,
    users,
    type,
  });

  return { cardBuffer, totalPages };
}

export default command;
