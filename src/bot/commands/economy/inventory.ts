// ===========================================
// ASTRA BOT - Inventory Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import type { BotCommand } from '../../../shared/types/index.js';

const ITEMS_PER_PAGE = 10;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to check inventory (default: yourself)')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    // Get user economy data
    const economyData = await UserEconomy.findOne({ guildId, discordId: target.id });
    const inventory = economyData?.inventory || [];

    if (inventory.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setTitle(`📦 ${target.username}'s Inventory`)
        .setDescription(target.id === interaction.user.id 
          ? 'Your inventory is empty!\nUse `/shop` to browse and `/buy` to purchase items.'
          : `${target.username}'s inventory is empty.`
        )
        .setThumbnail(target.displayAvatarURL());

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Group items by type and count
    const groupedItems = new Map<string, { name: string; type: string; count: number }>();
    
    inventory.forEach((item: any) => {
      const key = item.itemId || item.name;
      if (groupedItems.has(key)) {
        groupedItems.get(key)!.count++;
      } else {
        groupedItems.set(key, {
          name: item.name,
          type: item.type,
          count: 1
        });
      }
    });

    const items = Array.from(groupedItems.values());
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    let currentPage = 0;

    const createEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const pageItems = items.slice(start, start + ITEMS_PER_PAGE);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.primary)
        .setTitle(`📦 ${target.username}'s Inventory`)
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: `Page ${page + 1}/${totalPages} • ${inventory.length} total items` })
        .setTimestamp();

      if (pageItems.length === 0) {
        embed.setDescription('No items to display.');
      } else {
        const itemList = pageItems.map(item => {
          const typeEmoji = item.type === 'role' ? '🏷️' : item.type === 'boost' ? '⚡' : '📦';
          return `${typeEmoji} **${item.name}** x${item.count}`;
        }).join('\n');

        embed.setDescription(itemList);
      }

      // Add summary by type
      const roles = items.filter(i => i.type === 'role').reduce((acc, i) => acc + i.count, 0);
      const boosts = items.filter(i => i.type === 'boost').reduce((acc, i) => acc + i.count, 0);
      const consumables = items.filter(i => i.type === 'consumable').reduce((acc, i) => acc + i.count, 0);

      embed.addFields({
        name: '📊 Summary',
        value: `🏷️ Roles: ${roles} • ⚡ Boosts: ${boosts} • 📦 Consumables: ${consumables}`,
        inline: false
      });

      return embed;
    };

    const createComponents = (page: number) => {
      if (totalPages <= 1) return [];

      return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('inv_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️')
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('inv_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('▶️')
            .setDisabled(page === totalPages - 1)
        )
      ];
    };

    const response = await interaction.reply({ 
      embeds: [createEmbed(currentPage)], 
      components: createComponents(currentPage),
      fetchReply: true 
    });

    if (totalPages > 1) {
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'inv_prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'inv_next') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }
        await i.update({ embeds: [createEmbed(currentPage)], components: createComponents(currentPage) });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  },
};

export default command;
