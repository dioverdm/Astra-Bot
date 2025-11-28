// ===========================================
// ASTRA BOT - Coinflip Command
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
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin - optionally bet some coins!')
    .addStringOption(opt =>
      opt
        .setName('choice')
        .setDescription('Your choice')
        .setRequired(false)
        .addChoices(
          { name: '🪙 Heads', value: 'heads' },
          { name: '🪙 Tails', value: 'tails' }
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('bet')
        .setDescription('Amount to bet (optional)')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(10000)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const choice = interaction.options.getString('choice');
    const bet = interaction.options.getInteger('bet');
    
    // Simple flip without betting
    if (!choice && !bet) {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const emoji = result === 'heads' ? '👑' : '🦅';
      
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.primary)
        .setTitle('🪙 Coin Flip!')
        .setDescription(`The coin landed on **${emoji} ${result.charAt(0).toUpperCase() + result.slice(1)}**!`)
        .setFooter({ text: `Flipped by ${interaction.user.tag}` })
        .setTimestamp();

      // Add flip again button
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('coinflip_again')
            .setLabel('Flip Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🪙')
        );

      const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      // Handle button
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.customId === 'coinflip_again' && i.user.id === interaction.user.id,
        time: 30000,
      });

      collector.on('collect', async (i) => {
        const newResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const newEmoji = newResult === 'heads' ? '👑' : '🦅';
        
        embed.setDescription(`The coin landed on **${newEmoji} ${newResult.charAt(0).toUpperCase() + newResult.slice(1)}**!`);
        await i.update({ embeds: [embed] });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });

      return;
    }

    // Betting mode
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Betting can only be done in a server.')], ephemeral: true });
      return;
    }

    if (!choice) {
      await interaction.reply({ embeds: [errorEmbed('You must choose heads or tails to place a bet!')], ephemeral: true });
      return;
    }

    if (!bet) {
      await interaction.reply({ embeds: [errorEmbed('You must specify a bet amount!')], ephemeral: true });
      return;
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Check balance
    const economyData = await UserEconomy.findOne({ guildId, discordId: userId });
    
    if (!economyData || economyData.balance < bet) {
      await interaction.reply({ 
        embeds: [errorEmbed(`You don't have enough coins! You have **${economyData?.balance.toLocaleString() || 0}** coins.`)], 
        ephemeral: true 
      });
      return;
    }

    // Flip the coin
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const emoji = result === 'heads' ? '👑' : '🦅';

    // Calculate winnings (1.8x multiplier for winning)
    const winnings = won ? Math.floor(bet * 1.8) : 0;
    const netChange = won ? winnings - bet : -bet;

    // Update balance
    await UserEconomy.updateOne(
      { guildId, discordId: userId },
      { $inc: { balance: netChange } }
    );

    // Get updated balance
    const updatedData = await UserEconomy.findOne({ guildId, discordId: userId });

    const embed = new EmbedBuilder()
      .setColor(won ? EMBED_COLORS.success : EMBED_COLORS.error)
      .setTitle(`🪙 ${won ? 'You Won!' : 'You Lost!'}`)
      .setDescription(
        `The coin landed on **${emoji} ${result.charAt(0).toUpperCase() + result.slice(1)}**!\n` +
        `You chose **${choice === 'heads' ? '👑' : '🦅'} ${choice.charAt(0).toUpperCase() + choice.slice(1)}**`
      )
      .addFields(
        { 
          name: won ? '💰 Winnings' : '💸 Lost', 
          value: `${won ? '+' : ''}${netChange.toLocaleString()} coins`, 
          inline: true 
        },
        { 
          name: '💵 Balance', 
          value: `${updatedData?.balance.toLocaleString() || 0} coins`, 
          inline: true 
        }
      )
      .setFooter({ text: won ? '🎉 Nice one!' : 'Better luck next time!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
