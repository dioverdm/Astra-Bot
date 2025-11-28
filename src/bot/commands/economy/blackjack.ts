// ===========================================
// ASTRA BOT - Blackjack Command
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

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Card {
  suit: string;
  value: string;
  numValue: number;
}

interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  bet: number;
  gameOver: boolean;
}

const activeGames = new Map<string, GameState>();

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play blackjack')
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
    const odiscordId = interaction.user.id;
    const gameKey = `${guildId}-${odiscordId}`;

    // Check if already in a game
    if (activeGames.has(gameKey)) {
      await interaction.reply({ embeds: [errorEmbed('You already have an active game!')], ephemeral: true });
      return;
    }

    // Get economy data
    const economyData = await UserEconomy.findOne({ guildId, discordId: odiscordId });
    
    if (!economyData || economyData.balance < bet) {
      await interaction.reply({ 
        embeds: [errorEmbed(`You don't have enough coins! You have **${economyData?.balance.toLocaleString() || 0}** coins.`)], 
        ephemeral: true 
      });
      return;
    }

    // Deduct bet
    await UserEconomy.updateOne(
      { guildId, discordId: odiscordId },
      { $inc: { balance: -bet } }
    );

    // Create and shuffle deck
    const deck = createDeck();
    shuffle(deck);

    // Deal cards
    const playerHand: Card[] = [deck.pop()!, deck.pop()!];
    const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

    const game: GameState = {
      deck,
      playerHand,
      dealerHand,
      bet,
      gameOver: false
    };

    activeGames.set(gameKey, game);

    const playerValue = calculateHand(playerHand);
    const dealerShown = calculateCard(dealerHand[0]);

    // Check for natural blackjack
    if (playerValue === 21) {
      game.gameOver = true;
      const winnings = Math.floor(bet * 2.5);
      await UserEconomy.updateOne(
        { guildId, discordId: odiscordId },
        { $inc: { balance: winnings } }
      );
      activeGames.delete(gameKey);

      const embed = createGameEmbed(game, true, true);
      embed.setColor(EMBED_COLORS.success)
        .setTitle('🎰 Blackjack! 🎉')
        .addFields({ name: '💰 Winnings', value: `+${winnings.toLocaleString()} coins (2.5x)` });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const embed = createGameEmbed(game, false);
    const row = createButtons();

    const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === odiscordId,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      const game = activeGames.get(gameKey);
      if (!game || game.gameOver) {
        await i.reply({ content: 'Game ended!', ephemeral: true });
        return;
      }

      if (i.customId === 'bj_hit') {
        // Draw card
        game.playerHand.push(game.deck.pop()!);
        const playerValue = calculateHand(game.playerHand);

        if (playerValue > 21) {
          // Bust
          game.gameOver = true;
          activeGames.delete(gameKey);

          const embed = createGameEmbed(game, true);
          embed.setColor(EMBED_COLORS.error)
            .setTitle('💥 Bust!')
            .addFields({ name: '💸 Lost', value: `-${bet.toLocaleString()} coins` });

          await i.update({ embeds: [embed], components: [] });
          collector.stop();
        } else if (playerValue === 21) {
          // Auto-stand on 21
          await handleStand(game, i, bet, guildId, odiscordId, gameKey, collector);
        } else {
          const embed = createGameEmbed(game, false);
          await i.update({ embeds: [embed], components: [createButtons()] });
        }

      } else if (i.customId === 'bj_stand') {
        await handleStand(game, i, bet, guildId, odiscordId, gameKey, collector);

      } else if (i.customId === 'bj_double') {
        // Check balance for double
        const currentData = await UserEconomy.findOne({ guildId, discordId: odiscordId });
        if (!currentData || currentData.balance < bet) {
          await i.reply({ content: 'Not enough coins to double down!', ephemeral: true });
          return;
        }

        // Deduct additional bet
        await UserEconomy.updateOne(
          { guildId, discordId: odiscordId },
          { $inc: { balance: -bet } }
        );
        game.bet *= 2;

        // Draw one card and stand
        game.playerHand.push(game.deck.pop()!);
        const playerValue = calculateHand(game.playerHand);

        if (playerValue > 21) {
          game.gameOver = true;
          activeGames.delete(gameKey);

          const embed = createGameEmbed(game, true);
          embed.setColor(EMBED_COLORS.error)
            .setTitle('💥 Bust!')
            .addFields({ name: '💸 Lost', value: `-${game.bet.toLocaleString()} coins` });

          await i.update({ embeds: [embed], components: [] });
          collector.stop();
        } else {
          await handleStand(game, i, game.bet, guildId, odiscordId, gameKey, collector);
        }
      }
    });

    collector.on('end', async () => {
      if (activeGames.has(gameKey)) {
        activeGames.delete(gameKey);
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};

async function handleStand(
  game: GameState, 
  i: any, 
  bet: number, 
  guildId: string, 
  odiscordId: string, 
  gameKey: string,
  collector: any
) {
  game.gameOver = true;

  // Dealer draws
  while (calculateHand(game.dealerHand) < 17) {
    game.dealerHand.push(game.deck.pop()!);
  }

  const playerValue = calculateHand(game.playerHand);
  const dealerValue = calculateHand(game.dealerHand);

  let result: 'win' | 'lose' | 'push';
  let winnings = 0;

  if (dealerValue > 21) {
    result = 'win';
    winnings = bet * 2;
  } else if (playerValue > dealerValue) {
    result = 'win';
    winnings = bet * 2;
  } else if (playerValue < dealerValue) {
    result = 'lose';
  } else {
    result = 'push';
    winnings = bet;
  }

  if (winnings > 0) {
    await UserEconomy.updateOne(
      { guildId, discordId: odiscordId },
      { $inc: { balance: winnings } }
    );
  }

  activeGames.delete(gameKey);

  const embed = createGameEmbed(game, true);
  
  if (result === 'win') {
    embed.setColor(EMBED_COLORS.success)
      .setTitle('🎉 You Win!')
      .addFields({ name: '💰 Winnings', value: `+${(winnings - bet).toLocaleString()} coins` });
  } else if (result === 'lose') {
    embed.setColor(EMBED_COLORS.error)
      .setTitle('😢 Dealer Wins')
      .addFields({ name: '💸 Lost', value: `-${bet.toLocaleString()} coins` });
  } else {
    embed.setColor(EMBED_COLORS.warning)
      .setTitle('🤝 Push')
      .addFields({ name: '💵 Bet Returned', value: `${bet.toLocaleString()} coins` });
  }

  await i.update({ embeds: [embed], components: [] });
  collector.stop();
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      let numValue = parseInt(value);
      if (value === 'A') numValue = 11;
      else if (['J', 'Q', 'K'].includes(value)) numValue = 10;
      
      deck.push({ suit, value, numValue });
    }
  }
  return deck;
}

function shuffle(deck: Card[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function calculateCard(card: Card): number {
  return card.numValue;
}

function calculateHand(hand: Card[]): number {
  let total = hand.reduce((sum, card) => sum + card.numValue, 0);
  let aces = hand.filter(card => card.value === 'A').length;
  
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  
  return total;
}

function formatHand(hand: Card[]): string {
  return hand.map(card => `${card.value}${card.suit}`).join(' ');
}

function createGameEmbed(game: GameState, showDealer: boolean, blackjack = false): EmbedBuilder {
  const playerValue = calculateHand(game.playerHand);
  const dealerValue = showDealer ? calculateHand(game.dealerHand) : calculateCard(game.dealerHand[0]);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle('🃏 Blackjack')
    .addFields(
      { 
        name: `Your Hand (${playerValue})`, 
        value: formatHand(game.playerHand), 
        inline: true 
      },
      { 
        name: `Dealer (${showDealer ? dealerValue : '?'})`, 
        value: showDealer ? formatHand(game.dealerHand) : `${game.dealerHand[0].value}${game.dealerHand[0].suit} 🂠`, 
        inline: true 
      }
    )
    .setFooter({ text: `Bet: ${game.bet.toLocaleString()} coins` });

  return embed;
}

function createButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('Hit')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🃏'),
      new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('Stand')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✋'),
      new ButtonBuilder()
        .setCustomId('bj_double')
        .setLabel('Double')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💰')
    );
}

export default command;
