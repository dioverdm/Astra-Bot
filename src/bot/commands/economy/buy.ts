// ===========================================
// ASTRA BOT - Buy Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Default shop items
const DEFAULT_SHOP_ITEMS = [
  { id: 'role_color_red', name: '🔴 Red Name Color', description: 'Get a red colored name!', price: 5000, type: 'role', roleId: null },
  { id: 'role_color_blue', name: '🔵 Blue Name Color', description: 'Get a blue colored name!', price: 5000, type: 'role', roleId: null },
  { id: 'role_color_green', name: '🟢 Green Name Color', description: 'Get a green colored name!', price: 5000, type: 'role', roleId: null },
  { id: 'role_vip', name: '⭐ VIP Role', description: 'Exclusive VIP status!', price: 25000, type: 'role', roleId: null },
  { id: 'xp_boost_small', name: '✨ XP Boost (1h)', description: '2x XP for 1 hour', price: 2000, type: 'boost', duration: 3600000 },
  { id: 'xp_boost_large', name: '🌟 XP Boost (24h)', description: '2x XP for 24 hours', price: 10000, type: 'boost', duration: 86400000 },
  { id: 'lottery_ticket', name: '🎟️ Lottery Ticket', description: 'Enter the weekly lottery!', price: 500, type: 'consumable' },
  { id: 'mystery_box', name: '📦 Mystery Box', description: 'Contains a random reward!', price: 3000, type: 'consumable' },
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('The item ID to buy')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('quantity')
        .setDescription('How many to buy (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const itemId = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') || 1;
    const guildId = interaction.guild.id;
    const odiscordId = interaction.user.id;

    // Get shop items
    const config = await GuildConfig.findOne({ guildId }) as any;
    const shopItems = config?.shopItems?.length ? config.shopItems : DEFAULT_SHOP_ITEMS;

    // Find item
    const item = shopItems.find((i: any) => i.id === itemId || i.name.toLowerCase().includes(itemId.toLowerCase()));
    
    if (!item) {
      await interaction.reply({ 
        embeds: [errorEmbed(`Item "${itemId}" not found! Use \`/shop\` to see available items.`)], 
        ephemeral: true 
      });
      return;
    }

    const totalCost = item.price * quantity;

    // Get user economy
    let economyData = await UserEconomy.findOne({ guildId, discordId: odiscordId });
    
    if (!economyData || economyData.balance < totalCost) {
      await interaction.reply({ 
        embeds: [errorEmbed(`You don't have enough coins! You need **${totalCost.toLocaleString()}** coins but only have **${economyData?.balance.toLocaleString() || 0}**.`)], 
        ephemeral: true 
      });
      return;
    }

    // Process purchase
    await UserEconomy.updateOne(
      { guildId, discordId: odiscordId },
      { 
        $inc: { balance: -totalCost },
        $push: { 
          inventory: { 
            $each: Array(quantity).fill({
              itemId: item.id,
              name: item.name,
              type: item.type,
              purchasedAt: new Date(),
              ...(item.duration && { duration: item.duration }),
              ...(item.roleId && { roleId: item.roleId })
            })
          }
        }
      }
    );

    // Handle role items - give role immediately
    if (item.type === 'role' && item.roleId) {
      const role = interaction.guild.roles.cache.get(item.roleId);
      if (role) {
        const member = await interaction.guild.members.fetch(odiscordId).catch(() => null);
        if (member) {
          await member.roles.add(role).catch(() => {});
        }
      }
    }

    // Handle mystery box
    let bonusMessage = '';
    if (item.id === 'mystery_box') {
      const rewards = [
        { name: '100 coins', amount: 100 },
        { name: '500 coins', amount: 500 },
        { name: '1000 coins', amount: 1000 },
        { name: '2500 coins', amount: 2500 },
        { name: '5000 coins', amount: 5000 },
      ];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      
      await UserEconomy.updateOne(
        { guildId, discordId: odiscordId },
        { $inc: { balance: reward.amount * quantity } }
      );
      
      bonusMessage = `\n\n🎁 **Mystery Box Opened!**\nYou received **${(reward.amount * quantity).toLocaleString()}** coins!`;
    }

    // Get updated balance
    const updatedData = await UserEconomy.findOne({ guildId, discordId: odiscordId });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle('🛒 Purchase Successful!')
      .setDescription(
        `You bought **${quantity}x ${item.name}** for **${totalCost.toLocaleString()}** coins!` +
        bonusMessage
      )
      .addFields(
        { name: '💰 Spent', value: `${totalCost.toLocaleString()} coins`, inline: true },
        { name: '💵 New Balance', value: `${updatedData?.balance.toLocaleString() || 0} coins`, inline: true }
      )
      .setFooter({ text: 'Use /inventory to view your items' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
