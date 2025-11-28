// ===========================================
// ASTRA BOT - Slots Command
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

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];
const WEIGHTS = [25, 20, 18, 15, 8, 5, 5, 4]; // Higher = more common

const PAYOUTS: Record<string, number> = {
  '7️⃣': 10,   // 10x for triple 7s
  '💎': 8,     // 8x for diamonds
  '⭐': 6,     // 6x for stars
  '🔔': 5,     // 5x for bells
  '🍇': 3,     // 3x for grapes
  '🍊': 2.5,   // 2.5x for oranges
  '🍋': 2,     // 2x for lemons
  '🍒': 1.5,   // 1.5x for cherries
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addIntegerOption(opt =>
      opt
        .setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(10)
        .setMaxValue(10000)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const bet = interaction.options.getInteger('bet', true);
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Get economy data
    let economyData = await UserEconomy.findOne({ guildId, discordId: userId });
    
    if (!economyData || economyData.balance < bet) {
      await interaction.reply({ 
        embeds: [errorEmbed(`You don't have enough coins! You have **${economyData?.balance.toLocaleString() || 0}** coins.`)], 
        ephemeral: true 
      });
      return;
    }

    // Deduct bet
    await UserEconomy.updateOne(
      { guildId, discordId: userId },
      { $inc: { balance: -bet } }
    );

    // Spin the slots
    const results = [spinSlot(), spinSlot(), spinSlot()];
    const { win, multiplier, winType } = calculateWin(results);

    const winnings = win ? Math.floor(bet * multiplier) : 0;
    const netChange = winnings - bet;

    // Update balance if won
    if (win) {
      await UserEconomy.updateOne(
        { guildId, discordId: userId },
        { $inc: { balance: winnings } }
      );
    }

    // Get updated balance
    const updatedData = await UserEconomy.findOne({ guildId, discordId: userId });

    const slotDisplay = `
╔═══════════════╗
║  ${results[0]}  │  ${results[1]}  │  ${results[2]}  ║
╚═══════════════╝`;

    const embed = new EmbedBuilder()
      .setColor(win ? EMBED_COLORS.success : EMBED_COLORS.error)
      .setTitle('🎰 Slot Machine')
      .setDescription(slotDisplay)
      .addFields(
        { name: '💰 Bet', value: `${bet.toLocaleString()} coins`, inline: true },
        { name: win ? '🎉 Winnings' : '💸 Lost', value: `${win ? '+' : ''}${netChange.toLocaleString()} coins`, inline: true },
        { name: '💵 Balance', value: `${updatedData?.balance.toLocaleString() || 0} coins`, inline: true }
      );

    if (win && winType) {
      embed.addFields({ name: '🏆 Win Type', value: winType });
    }

    embed.setFooter({ text: win ? '🎊 Congratulations!' : 'Better luck next time!' })
      .setTimestamp();

    // Add play again button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`slots_again_${bet}`)
          .setLabel(`Spin Again (${bet} coins)`)
          .setStyle(win ? ButtonStyle.Success : ButtonStyle.Primary)
          .setEmoji('🎰')
      );

    const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Handle play again
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('slots_again') && i.user.id === userId,
      time: 30000,
      max: 1
    });

    collector.on('collect', async (i) => {
      // Check balance again
      const currentData = await UserEconomy.findOne({ guildId, discordId: userId });
      if (!currentData || currentData.balance < bet) {
        await i.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        return;
      }

      // Deduct and spin again
      await UserEconomy.updateOne(
        { guildId, discordId: userId },
        { $inc: { balance: -bet } }
      );

      const newResults = [spinSlot(), spinSlot(), spinSlot()];
      const newWin = calculateWin(newResults);
      const newWinnings = newWin.win ? Math.floor(bet * newWin.multiplier) : 0;
      const newNetChange = newWinnings - bet;

      if (newWin.win) {
        await UserEconomy.updateOne(
          { guildId, discordId: userId },
          { $inc: { balance: newWinnings } }
        );
      }

      const newUpdatedData = await UserEconomy.findOne({ guildId, discordId: userId });

      const newSlotDisplay = `
╔═══════════════╗
║  ${newResults[0]}  │  ${newResults[1]}  │  ${newResults[2]}  ║
╚═══════════════╝`;

      embed.setColor(newWin.win ? EMBED_COLORS.success : EMBED_COLORS.error)
        .setDescription(newSlotDisplay)
        .spliceFields(0, 3,
          { name: '💰 Bet', value: `${bet.toLocaleString()} coins`, inline: true },
          { name: newWin.win ? '🎉 Winnings' : '💸 Lost', value: `${newWin.win ? '+' : ''}${newNetChange.toLocaleString()} coins`, inline: true },
          { name: '💵 Balance', value: `${newUpdatedData?.balance.toLocaleString() || 0} coins`, inline: true }
        )
        .setFooter({ text: newWin.win ? '🎊 Congratulations!' : 'Better luck next time!' });

      if (newWin.win && newWin.winType) {
        if (embed.data.fields && embed.data.fields.length > 3) {
          embed.spliceFields(3, 1, { name: '🏆 Win Type', value: newWin.winType });
        } else {
          embed.addFields({ name: '🏆 Win Type', value: newWin.winType });
        }
      } else if (embed.data.fields && embed.data.fields.length > 3) {
        embed.spliceFields(3, 1);
      }

      await i.update({ embeds: [embed], components: [] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

function spinSlot(): string {
  const totalWeight = WEIGHTS.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < SYMBOLS.length; i++) {
    random -= WEIGHTS[i];
    if (random <= 0) return SYMBOLS[i];
  }
  
  return SYMBOLS[0];
}

function calculateWin(results: string[]): { win: boolean; multiplier: number; winType: string | null } {
  // Check for triple
  if (results[0] === results[1] && results[1] === results[2]) {
    const symbol = results[0];
    return {
      win: true,
      multiplier: PAYOUTS[symbol] || 2,
      winType: `Triple ${symbol} (${PAYOUTS[symbol]}x)`
    };
  }

  // Check for double
  const counts: Record<string, number> = {};
  results.forEach(s => counts[s] = (counts[s] || 0) + 1);
  
  const double = Object.entries(counts).find(([_, count]) => count === 2);
  if (double) {
    const [symbol] = double;
    const mult = (PAYOUTS[symbol] || 1) / 2;
    if (mult >= 1) {
      return {
        win: true,
        multiplier: mult,
        winType: `Double ${symbol} (${mult}x)`
      };
    }
  }

  return { win: false, multiplier: 0, winType: null };
}

export default command;
