// ===========================================
// ASTRA BOT - Balance Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import { generateBalanceCard } from '../../utils/cardGenerator.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or someone else\'s balance')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    const isOwnBalance = target.id === interaction.user.id;

    // Get or create economy data
    let economyData = await UserEconomy.findOne({ guildId, discordId: target.id });
    
    if (!economyData) {
      economyData = await UserEconomy.create({
        guildId,
        discordId: target.id,
        balance: 0,
        bank: 0,
      });
    }

    const totalBalance = economyData.balance + economyData.bank;

    // Get rank
    const rank = await UserEconomy.countDocuments({
      guildId,
      $expr: {
        $gt: [{ $add: ['$balance', '$bank'] }, totalBalance]
      }
    }) + 1;

    // Generate balance card image
    const cardBuffer = await generateBalanceCard({
      username: target.username,
      avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
      wallet: economyData.balance,
      bank: economyData.bank,
      netWorth: totalBalance,
      rank,
      dailyStreak: economyData.dailyStreak,
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'balance.png' });

    // Add buttons for own balance
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (isOwnBalance) {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('bal_deposit')
            .setLabel('Deposit All')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📥')
            .setDisabled(economyData.balance === 0),
          new ButtonBuilder()
            .setCustomId('bal_withdraw')
            .setLabel('Withdraw All')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('📤')
            .setDisabled(economyData.bank === 0),
          new ButtonBuilder()
            .setCustomId('bal_daily')
            .setLabel('Daily Reward')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎁')
        );
      components.push(row);
    }

    const response = await interaction.editReply({ 
      files: [attachment], 
      components 
    });

    if (!isOwnBalance || components.length === 0) return;

    const bankCapacity = 50000;

    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      // Refresh economy data
      economyData = await UserEconomy.findOne({ guildId, discordId: target.id });
      if (!economyData) return;

      if (i.customId === 'bal_deposit') {
        const amount = economyData.balance;
        const maxDeposit = Math.min(amount, bankCapacity - economyData.bank);
        
        if (maxDeposit <= 0) {
          await i.reply({ content: '❌ Your bank is full!', ephemeral: true });
          return;
        }

        await UserEconomy.updateOne(
          { guildId, discordId: target.id },
          { $inc: { balance: -maxDeposit, bank: maxDeposit } }
        );

        await i.reply({ 
          content: `✅ Deposited **${maxDeposit.toLocaleString()}** coins to your bank!`, 
          ephemeral: true 
        });

      } else if (i.customId === 'bal_withdraw') {
        const amount = economyData.bank;
        
        await UserEconomy.updateOne(
          { guildId, discordId: target.id },
          { $inc: { balance: amount, bank: -amount } }
        );

        await i.reply({ 
          content: `✅ Withdrew **${amount.toLocaleString()}** coins from your bank!`, 
          ephemeral: true 
        });

      } else if (i.customId === 'bal_daily') {
        // Check if daily is available
        const now = new Date();
        const lastDaily = economyData.lastDaily ? new Date(economyData.lastDaily) : null;
        
        if (lastDaily) {
          const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            const hoursLeft = Math.ceil(24 - hoursSince);
            await i.reply({ 
              content: `⏰ You can claim your daily reward in **${hoursLeft}** hour(s)!`, 
              ephemeral: true 
            });
            return;
          }
        }

        // Calculate reward with streak bonus
        const baseReward = 500;
        const streakBonus = Math.min((economyData.dailyStreak || 0) * 50, 500);
        const totalReward = baseReward + streakBonus;

        // Check if streak continues (within 48 hours)
        let newStreak = 1;
        if (lastDaily) {
          const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 48) {
            newStreak = (economyData.dailyStreak || 0) + 1;
          }
        }

        await UserEconomy.updateOne(
          { guildId, discordId: target.id },
          { 
            $inc: { balance: totalReward },
            $set: { lastDaily: now, dailyStreak: newStreak }
          }
        );

        await i.reply({ 
          content: `🎁 You claimed your daily reward!\n` +
            `💵 **+${baseReward}** base reward\n` +
            `🔥 **+${streakBonus}** streak bonus (Day ${newStreak})\n` +
            `💰 **Total: ${totalReward}** coins!`, 
          ephemeral: true 
        });
      }

      // Update the card
      const updated = await UserEconomy.findOne({ guildId, discordId: target.id });
      if (updated) {
        const newCardBuffer = await generateBalanceCard({
          username: target.username,
          avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
          wallet: updated.balance,
          bank: updated.bank,
          netWorth: updated.balance + updated.bank,
          rank,
          dailyStreak: updated.dailyStreak,
        });

        const newAttachment = new AttachmentBuilder(newCardBuffer, { name: 'balance.png' });
        
        const newRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('bal_deposit')
              .setLabel('Deposit All')
              .setStyle(ButtonStyle.Success)
              .setEmoji('📥')
              .setDisabled(updated.balance === 0),
            new ButtonBuilder()
              .setCustomId('bal_withdraw')
              .setLabel('Withdraw All')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('📤')
              .setDisabled(updated.bank === 0),
            new ButtonBuilder()
              .setCustomId('bal_daily')
              .setLabel('Daily Reward')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎁')
          );

        await interaction.editReply({ files: [newAttachment], components: [newRow] });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
