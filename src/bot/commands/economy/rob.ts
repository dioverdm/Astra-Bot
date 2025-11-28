// ===========================================
// ASTRA BOT - Rob Command
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

const ROB_COOLDOWN_MINUTES = 30;
const MIN_TARGET_BALANCE = 500;
const SUCCESS_RATE = 0.4; // 40% success rate
const MAX_ROB_PERCENT = 0.3; // Max 30% of target's balance
const FINE_PERCENT = 0.2; // 20% fine on failure

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another user')
    .addUserOption(opt =>
      opt
        .setName('target')
        .setDescription('The user to rob')
        .setRequired(true)
    ),
    
  cooldown: 10,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('target', true);
    const guildId = interaction.guild.id;
    const robberId = interaction.user.id;

    // Can't rob yourself
    if (target.id === robberId) {
      await interaction.reply({ embeds: [errorEmbed('You can\'t rob yourself!')], ephemeral: true });
      return;
    }

    // Can't rob bots
    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('You can\'t rob bots!')], ephemeral: true });
      return;
    }

    // Get robber's economy data
    let robberData = await UserEconomy.findOne({ guildId, discordId: robberId });
    if (!robberData) {
      robberData = await UserEconomy.create({
        guildId,
        discordId: robberId,
        balance: 0,
        bank: 0,
      });
    }

    // Check cooldown
    const now = new Date();
    const lastRob = robberData.lastRob ? new Date(robberData.lastRob) : null;
    
    if (lastRob) {
      const minutesSince = (now.getTime() - lastRob.getTime()) / (1000 * 60);
      if (minutesSince < ROB_COOLDOWN_MINUTES) {
        const minutesLeft = Math.ceil(ROB_COOLDOWN_MINUTES - minutesSince);
        await interaction.reply({ 
          embeds: [errorEmbed(`You must wait **${minutesLeft}** minute(s) before robbing again!`)], 
          ephemeral: true 
        });
        return;
      }
    }

    // Check robber has minimum balance to pay potential fine
    if (robberData.balance < 100) {
      await interaction.reply({ 
        embeds: [errorEmbed('You need at least **100** coins in your wallet to attempt a robbery!')], 
        ephemeral: true 
      });
      return;
    }

    // Get target's economy data
    const targetData = await UserEconomy.findOne({ guildId, discordId: target.id });
    
    if (!targetData || targetData.balance < MIN_TARGET_BALANCE) {
      await interaction.reply({ 
        embeds: [errorEmbed(`${target} doesn't have enough coins to rob! (min: ${MIN_TARGET_BALANCE})`)], 
        ephemeral: true 
      });
      return;
    }

    // Update cooldown
    await UserEconomy.updateOne(
      { guildId, discordId: robberId },
      { $set: { lastRob: now } }
    );

    // Attempt robbery
    const success = Math.random() < SUCCESS_RATE;

    if (success) {
      // Calculate stolen amount (10-30% of target's balance)
      const maxSteal = Math.floor(targetData.balance * MAX_ROB_PERCENT);
      const minSteal = Math.floor(targetData.balance * 0.1);
      const stolen = Math.floor(Math.random() * (maxSteal - minSteal + 1)) + minSteal;

      // Transfer coins
      await UserEconomy.updateOne(
        { guildId, discordId: robberId },
        { $inc: { balance: stolen } }
      );
      await UserEconomy.updateOne(
        { guildId, discordId: target.id },
        { $inc: { balance: -stolen } }
      );

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.success)
        .setTitle('💰 Robbery Successful!')
        .setDescription(`You successfully robbed **${stolen.toLocaleString()}** coins from ${target}!`)
        .addFields(
          { name: '💵 Your Balance', value: `${(robberData.balance + stolen).toLocaleString()} coins`, inline: true }
        )
        .setFooter({ text: '🕵️ You got away clean!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      // Calculate fine
      const fine = Math.floor(robberData.balance * FINE_PERCENT);

      // Pay fine
      await UserEconomy.updateOne(
        { guildId, discordId: robberId },
        { $inc: { balance: -fine } }
      );

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.error)
        .setTitle('🚔 Robbery Failed!')
        .setDescription(`You were caught trying to rob ${target}!\nYou paid a fine of **${fine.toLocaleString()}** coins.`)
        .addFields(
          { name: '💵 Your Balance', value: `${(robberData.balance - fine).toLocaleString()} coins`, inline: true }
        )
        .setFooter({ text: '👮 Better luck next time!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default command;
