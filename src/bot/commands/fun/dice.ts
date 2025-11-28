// ===========================================
// ASTRA BOT - Dice Command
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
import type { BotCommand } from '../../../shared/types/index.js';

const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll some dice')
    .addIntegerOption(opt =>
      opt
        .setName('count')
        .setDescription('Number of dice to roll (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addIntegerOption(opt =>
      opt
        .setName('sides')
        .setDescription('Number of sides per die (2-100)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100)
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const count = interaction.options.getInteger('count') || 1;
    const sides = interaction.options.getInteger('sides') || 6;

    const rolls = rollDice(count, sides);
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = createDiceEmbed(rolls, sides, total, interaction.user.tag);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dice_reroll')
          .setLabel('Roll Again')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎲')
      );

    const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === 'dice_reroll' && i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      const newRolls = rollDice(count, sides);
      const newTotal = newRolls.reduce((a, b) => a + b, 0);
      const newEmbed = createDiceEmbed(newRolls, sides, newTotal, interaction.user.tag);
      await i.update({ embeds: [newEmbed] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function createDiceEmbed(rolls: number[], sides: number, total: number, username: string): EmbedBuilder {
  const isStandardDice = sides === 6;
  
  const rollDisplay = rolls.map(r => {
    if (isStandardDice) {
      return `${DICE_EMOJIS[r - 1]} **${r}**`;
    }
    return `🎲 **${r}**`;
  }).join('  ');

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle('🎲 Dice Roll')
    .setDescription(rollDisplay);

  if (rolls.length > 1) {
    embed.addFields(
      { name: '📊 Total', value: `**${total}**`, inline: true },
      { name: '📈 Average', value: `**${(total / rolls.length).toFixed(1)}**`, inline: true },
      { name: '🎯 Range', value: `${Math.min(...rolls)} - ${Math.max(...rolls)}`, inline: true }
    );
  }

  embed.setFooter({ text: `${rolls.length}d${sides} • Rolled by ${username}` })
    .setTimestamp();

  return embed;
}

export default command;
