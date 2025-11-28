// ===========================================
// ASTRA BOT - 8Ball Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Responses categorized by type
const POSITIVE_RESPONSES = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes - definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  'Absolutely!',
  '100% yes!',
  'The stars align in your favor.',
];

const NEUTRAL_RESPONSES = [
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  'The answer is unclear.',
  'Maybe...',
  'It could go either way.',
];

const NEGATIVE_RESPONSES = [
  'Don\'t count on it.',
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
  'Definitely not.',
  'No way!',
  'Not a chance.',
  'The odds are against you.',
  'I wouldn\'t bet on it.',
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(opt =>
      opt
        .setName('question')
        .setDescription('Your question for the magic 8-ball')
        .setRequired(true)
        .setMaxLength(500)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const question = interaction.options.getString('question', true);
    
    // Determine response type randomly with weighted probability
    // 40% positive, 30% neutral, 30% negative
    const rand = Math.random();
    let response: string;
    let color: number;
    let emoji: string;
    
    if (rand < 0.4) {
      // Positive
      response = POSITIVE_RESPONSES[Math.floor(Math.random() * POSITIVE_RESPONSES.length)];
      color = EMBED_COLORS.success;
      emoji = '✅';
    } else if (rand < 0.7) {
      // Neutral
      response = NEUTRAL_RESPONSES[Math.floor(Math.random() * NEUTRAL_RESPONSES.length)];
      color = EMBED_COLORS.warning;
      emoji = '🤔';
    } else {
      // Negative
      response = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
      color = EMBED_COLORS.error;
      emoji = '❌';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ 
        name: 'Magic 8-Ball', 
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890.png' 
      })
      .setTitle('🎱 The 8-Ball has spoken!')
      .addFields(
        { name: '❓ Question', value: question },
        { name: `${emoji} Answer`, value: `**${response}**` }
      )
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
