// ===========================================
// ASTRA BOT - Shop Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Default shop items if none configured
const DEFAULT_SHOP_ITEMS = [
  { id: 'role_color_red', name: '🔴 Red Name Color', description: 'Get a red colored name!', price: 5000, type: 'role' },
  { id: 'role_color_blue', name: '🔵 Blue Name Color', description: 'Get a blue colored name!', price: 5000, type: 'role' },
  { id: 'role_color_green', name: '🟢 Green Name Color', description: 'Get a green colored name!', price: 5000, type: 'role' },
  { id: 'role_vip', name: '⭐ VIP Role', description: 'Exclusive VIP status!', price: 25000, type: 'role' },
  { id: 'xp_boost_small', name: '✨ XP Boost (1h)', description: '2x XP for 1 hour', price: 2000, type: 'boost' },
  { id: 'xp_boost_large', name: '🌟 XP Boost (24h)', description: '2x XP for 24 hours', price: 10000, type: 'boost' },
  { id: 'lottery_ticket', name: '🎟️ Lottery Ticket', description: 'Enter the weekly lottery!', price: 500, type: 'consumable' },
  { id: 'mystery_box', name: '📦 Mystery Box', description: 'Contains a random reward!', price: 3000, type: 'consumable' },
];

const ITEMS_PER_PAGE = 6;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the server shop'),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const guildId = interaction.guild.id;

    // Get shop items from config or use defaults
    const config = await GuildConfig.findOne({ guildId }) as any;
    const shopItems = config?.shopItems?.length ? config.shopItems : DEFAULT_SHOP_ITEMS;

    if (shopItems.length === 0) {
      await interaction.reply({ 
        embeds: [errorEmbed('The shop is empty! Server admins can add items via the dashboard.')], 
        ephemeral: true 
      });
      return;
    }

    let currentPage = 0;
    const totalPages = Math.ceil(shopItems.length / ITEMS_PER_PAGE);

    const createEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const pageItems = shopItems.slice(start, start + ITEMS_PER_PAGE);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.economy)
        .setTitle(`🛒 ${interaction.guild!.name} Shop`)
        .setDescription('Use `/buy <item>` to purchase an item!')
        .setFooter({ text: `Page ${page + 1}/${totalPages} • Use /inventory to view owned items` })
        .setTimestamp();

      pageItems.forEach((item: any, index: number) => {
        const typeEmoji = item.type === 'role' ? '🏷️' : item.type === 'boost' ? '⚡' : '📦';
        embed.addFields({
          name: `${item.name}`,
          value: `${item.description}\n💰 **${item.price.toLocaleString()}** coins • ${typeEmoji} ${item.type}`,
          inline: true
        });
      });

      return embed;
    };

    const createComponents = (page: number) => {
      const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

      // Pagination buttons
      if (totalPages > 1) {
        rows.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('shop_prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('◀️')
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('shop_next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('▶️')
              .setDisabled(page === totalPages - 1)
          )
        );
      }

      // Quick buy select menu for current page items
      const start = page * ITEMS_PER_PAGE;
      const pageItems = shopItems.slice(start, start + ITEMS_PER_PAGE);
      
      if (pageItems.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('shop_quickbuy')
          .setPlaceholder('Quick buy an item...')
          .addOptions(
            pageItems.map((item: any) => ({
              label: item.name.replace(/[^\w\s]/gi, '').trim().slice(0, 25),
              description: `${item.price.toLocaleString()} coins`,
              value: item.id,
              emoji: item.name.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🛒'
            }))
          );

        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
      }

      return rows;
    };

    const response = await interaction.reply({ 
      embeds: [createEmbed(currentPage)], 
      components: createComponents(currentPage),
      fetchReply: true 
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'shop_prev') {
        currentPage = Math.max(0, currentPage - 1);
        await i.update({ embeds: [createEmbed(currentPage)], components: createComponents(currentPage) });
      } else if (i.customId === 'shop_next') {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        await i.update({ embeds: [createEmbed(currentPage)], components: createComponents(currentPage) });
      } else if (i.customId === 'shop_quickbuy') {
        if (!i.isStringSelectMenu()) return;
        const itemId = i.values[0];
        await i.reply({ 
          content: `Use \`/buy ${itemId}\` to purchase this item!`, 
          ephemeral: true 
        });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
