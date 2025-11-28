// ===========================================
// ASTRA BOT - Work Command
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

// Work scenarios with different payouts
const WORK_SCENARIOS = [
  { job: 'Software Developer', emoji: '💻', minPay: 150, maxPay: 400 },
  { job: 'Chef', emoji: '👨‍🍳', minPay: 100, maxPay: 300 },
  { job: 'Doctor', emoji: '👨‍⚕️', minPay: 200, maxPay: 500 },
  { job: 'Artist', emoji: '🎨', minPay: 80, maxPay: 350 },
  { job: 'Musician', emoji: '🎸', minPay: 100, maxPay: 400 },
  { job: 'Photographer', emoji: '📸', minPay: 120, maxPay: 350 },
  { job: 'Mechanic', emoji: '🔧', minPay: 130, maxPay: 320 },
  { job: 'Gardener', emoji: '🌱', minPay: 80, maxPay: 250 },
  { job: 'Teacher', emoji: '📚', minPay: 100, maxPay: 300 },
  { job: 'Delivery Driver', emoji: '🚗', minPay: 90, maxPay: 280 },
  { job: 'Streamer', emoji: '🎮', minPay: 50, maxPay: 500 },
  { job: 'Writer', emoji: '✍️', minPay: 100, maxPay: 350 },
  { job: 'Barista', emoji: '☕', minPay: 70, maxPay: 200 },
  { job: 'Fitness Trainer', emoji: '💪', minPay: 120, maxPay: 320 },
  { job: 'DJ', emoji: '🎧', minPay: 150, maxPay: 450 },
];

const WORK_MESSAGES = [
  'You worked hard as a {job} and earned',
  'After a productive shift as a {job}, you received',
  'Your dedication as a {job} paid off! You earned',
  'Great work today as a {job}! Your pay is',
  'You impressed everyone as a {job} and got',
];

const WORK_COOLDOWN_HOURS = 1; // 1 hour cooldown

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn some coins'),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Get or create economy data
    let economyData = await UserEconomy.findOne({ guildId, discordId: userId });
    
    if (!economyData) {
      economyData = await UserEconomy.create({
        guildId,
        discordId: userId,
        balance: 0,
        bank: 0,
      });
    }

    // Check cooldown
    const now = new Date();
    const lastWork = economyData.lastWork ? new Date(economyData.lastWork) : null;
    
    if (lastWork) {
      const hoursSince = (now.getTime() - lastWork.getTime()) / (1000 * 60 * 60);
      if (hoursSince < WORK_COOLDOWN_HOURS) {
        const minutesLeft = Math.ceil((WORK_COOLDOWN_HOURS - hoursSince) * 60);
        
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle('😴 You\'re tired!')
          .setDescription(`You need to rest before working again.\nCome back in **${minutesLeft}** minute${minutesLeft !== 1 ? 's' : ''}.`)
          .setFooter({ text: 'Work cooldown: 1 hour' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    // Select random job and calculate pay
    const scenario = WORK_SCENARIOS[Math.floor(Math.random() * WORK_SCENARIOS.length)];
    const earnings = Math.floor(Math.random() * (scenario.maxPay - scenario.minPay + 1)) + scenario.minPay;
    const message = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)].replace('{job}', scenario.job);

    // Update balance and lastWork
    await UserEconomy.updateOne(
      { guildId, discordId: userId },
      { 
        $inc: { balance: earnings },
        $set: { lastWork: now }
      }
    );

    // Get updated balance
    const updatedData = await UserEconomy.findOne({ guildId, discordId: userId });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle(`${scenario.emoji} Work Complete!`)
      .setDescription(`${message} **${earnings.toLocaleString()}** coins!`)
      .addFields(
        { 
          name: '💵 Earned', 
          value: `+${earnings.toLocaleString()} coins`, 
          inline: true 
        },
        { 
          name: '💰 New Balance', 
          value: `${updatedData?.balance.toLocaleString() || earnings} coins`, 
          inline: true 
        }
      )
      .setFooter({ text: `Work again in ${WORK_COOLDOWN_HOURS} hour` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
