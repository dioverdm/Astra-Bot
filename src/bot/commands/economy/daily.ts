// ===========================================
// ASTRA BOT - Daily Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
// Note: EmbedBuilder and EMBED_COLORS kept for "not ready" embed
import { UserEconomy } from '../../../database/models/UserEconomy.js';
import { generateDailyCard } from '../../utils/cardGenerator.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
    
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
        dailyStreak: 0,
      });
    }

    const now = new Date();
    const lastDaily = economyData.lastDaily ? new Date(economyData.lastDaily) : null;

    // Check if daily is available
    if (lastDaily) {
      const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        const minutesLeft = Math.ceil((24 - hoursSince) * 60) % 60;
        
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle('⏰ Daily Reward Not Ready')
          .setDescription(`You've already claimed your daily reward!\nCome back in **${hoursLeft}h ${minutesLeft}m**`)
          .addFields(
            { name: '🔥 Current Streak', value: `${economyData.dailyStreak || 0} days`, inline: true },
            { name: '💵 Current Balance', value: `${economyData.balance.toLocaleString()} coins`, inline: true }
          )
          .setFooter({ text: 'Daily rewards reset every 24 hours' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
      }
    }

    // Calculate streak
    let newStreak = 1;
    let streakBroken = false;
    
    if (lastDaily) {
      const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        // Continue streak
        newStreak = (economyData.dailyStreak || 0) + 1;
      } else {
        // Streak broken
        streakBroken = true;
        newStreak = 1;
      }
    }

    // Calculate rewards
    const baseReward = 500;
    const streakBonus = Math.min((newStreak - 1) * 50, 500); // Max 500 bonus at 11+ days
    const weeklyBonus = newStreak % 7 === 0 ? 1000 : 0; // Bonus every 7 days
    const totalReward = baseReward + streakBonus + weeklyBonus;

    // Update database
    await UserEconomy.updateOne(
      { guildId, discordId: userId },
      { 
        $inc: { balance: totalReward },
        $set: { lastDaily: now, dailyStreak: newStreak }
      }
    );

    // Get updated balance
    const updatedData = await UserEconomy.findOne({ guildId, discordId: userId });
    const newBalance = updatedData?.balance || totalReward;

    // Generate daily reward card
    const cardBuffer = await generateDailyCard({
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
      reward: baseReward,
      streakBonus,
      weeklyBonus,
      totalReward,
      newStreak,
      newBalance,
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'daily.png' });

    // Add streak lost message if applicable
    let content = '';
    if (streakBroken && economyData.dailyStreak && economyData.dailyStreak > 1) {
      content = `💔 Your ${economyData.dailyStreak}-day streak was reset! Come back daily to build it up again.`;
    }

    // Add milestone info
    const nextMilestone = Math.ceil(newStreak / 7) * 7;
    const daysToMilestone = nextMilestone - newStreak;
    if (daysToMilestone > 0 && daysToMilestone <= 3) {
      content += content ? '\n' : '';
      content += `🎯 ${daysToMilestone} more day${daysToMilestone !== 1 ? 's' : ''} until your weekly bonus!`;
    }

    await interaction.reply({ 
      content: content || undefined,
      files: [attachment] 
    });
  },
};

export default command;
