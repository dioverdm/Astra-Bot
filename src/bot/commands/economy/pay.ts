// ===========================================
// ASTRA BOT - Pay/Transfer Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another user')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to send coins to')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount of coins to send')
        .setRequired(true)
        .setMinValue(1)
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
    const senderId = interaction.user.id;

    // Can't pay yourself
    if (target.id === senderId) {
      await interaction.reply({ embeds: [errorEmbed('You cannot send coins to yourself!')], ephemeral: true });
      return;
    }

    // Can't pay bots
    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot send coins to bots!')], ephemeral: true });
      return;
    }

    // Get sender's economy data
    const senderData = await UserEconomy.findOne({ guildId, discordId: senderId });
    
    if (!senderData || senderData.balance < amount) {
      await interaction.reply({ 
        embeds: [errorEmbed(`You don't have enough coins! You have **${senderData?.balance.toLocaleString() || 0}** coins.`)], 
        ephemeral: true 
      });
      return;
    }

    // Get or create receiver's economy data
    let receiverData = await UserEconomy.findOne({ guildId, discordId: target.id });
    if (!receiverData) {
      receiverData = await UserEconomy.create({
        guildId,
        discordId: target.id,
        balance: 0,
        bank: 0,
      });
    }

    // Perform transfer
    await UserEconomy.updateOne(
      { guildId, discordId: senderId },
      { $inc: { balance: -amount } }
    );

    await UserEconomy.updateOne(
      { guildId, discordId: target.id },
      { $inc: { balance: amount } }
    );

    // Get updated balances
    const updatedSender = await UserEconomy.findOne({ guildId, discordId: senderId });
    const updatedReceiver = await UserEconomy.findOne({ guildId, discordId: target.id });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle('💸 Transfer Successful!')
      .setDescription(`You sent **${amount.toLocaleString()}** coins to ${target}`)
      .addFields(
        { 
          name: '📤 Your Balance', 
          value: `${updatedSender?.balance.toLocaleString() || 0} coins`, 
          inline: true 
        },
        { 
          name: '📥 Their Balance', 
          value: `${updatedReceiver?.balance.toLocaleString() || 0} coins`, 
          inline: true 
        }
      )
      .setFooter({ text: `Sent by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
