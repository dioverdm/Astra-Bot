// ===========================================
// ASTRA BOT - Rock Paper Scissors Command
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

type Choice = 'rock' | 'paper' | 'scissors';

const CHOICES: Record<Choice, { emoji: string; beats: Choice }> = {
  rock: { emoji: '🪨', beats: 'scissors' },
  paper: { emoji: '📄', beats: 'rock' },
  scissors: { emoji: '✂️', beats: 'paper' },
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors')
    .addUserOption(opt =>
      opt
        .setName('opponent')
        .setDescription('Challenge another user (or play against bot)')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const opponent = interaction.options.getUser('opponent');

    // If no opponent or opponent is bot, play against bot
    if (!opponent || opponent.bot) {
      await playAgainstBot(interaction);
      return;
    }

    // Can't play against yourself
    if (opponent.id === interaction.user.id) {
      await playAgainstBot(interaction);
      return;
    }

    // Challenge another player
    await playAgainstPlayer(interaction, opponent);
  },
};

async function playAgainstBot(interaction: ChatInputCommandInteraction) {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('Rock')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🪨'),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('Paper')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📄'),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('Scissors')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✂️')
    );

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle('🎮 Rock Paper Scissors')
    .setDescription('Choose your move!')
    .setFooter({ text: `Playing against Astra` });

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 30000,
    max: 1
  });

  collector.on('collect', async (i) => {
    const playerChoice = i.customId.replace('rps_', '') as Choice;
    const botChoice = (['rock', 'paper', 'scissors'] as Choice[])[Math.floor(Math.random() * 3)];
    
    const result = getResult(playerChoice, botChoice);
    const resultEmbed = createResultEmbed(
      interaction.user.username, 
      'Astra', 
      playerChoice, 
      botChoice, 
      result
    );

    await i.update({ embeds: [resultEmbed], components: [] });
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      embed.setDescription('⏰ Time\'s up! No choice was made.');
      embed.setColor(EMBED_COLORS.warning);
      await interaction.editReply({ embeds: [embed], components: [] });
    }
  });
}

async function playAgainstPlayer(interaction: ChatInputCommandInteraction, opponent: any) {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('Rock')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🪨'),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('Paper')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📄'),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('Scissors')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✂️')
    );

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle('🎮 Rock Paper Scissors')
    .setDescription(`${interaction.user} challenged ${opponent}!\n\nBoth players, make your choice!`)
    .addFields(
      { name: `${interaction.user.username}`, value: '❓ Waiting...', inline: true },
      { name: `${opponent.username}`, value: '❓ Waiting...', inline: true }
    );

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const choices: Map<string, Choice> = new Map();

  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id || i.user.id === opponent.id,
    time: 60000,
  });

  collector.on('collect', async (i) => {
    const choice = i.customId.replace('rps_', '') as Choice;
    
    if (choices.has(i.user.id)) {
      await i.reply({ content: 'You already made your choice!', ephemeral: true });
      return;
    }

    choices.set(i.user.id, choice);
    await i.reply({ content: `You chose **${CHOICES[choice].emoji} ${choice}**!`, ephemeral: true });

    // Update embed
    const p1Choice = choices.get(interaction.user.id);
    const p2Choice = choices.get(opponent.id);

    embed.spliceFields(0, 2,
      { name: `${interaction.user.username}`, value: p1Choice ? '✅ Ready!' : '❓ Waiting...', inline: true },
      { name: `${opponent.username}`, value: p2Choice ? '✅ Ready!' : '❓ Waiting...', inline: true }
    );

    await interaction.editReply({ embeds: [embed] });

    // Both players chose
    if (p1Choice && p2Choice) {
      collector.stop('complete');
      const result = getResult(p1Choice, p2Choice);
      const winner = result === 'win' ? interaction.user.username : result === 'lose' ? opponent.username : null;
      
      const resultEmbed = createResultEmbed(
        interaction.user.username,
        opponent.username,
        p1Choice,
        p2Choice,
        result,
        winner
      );

      await interaction.editReply({ embeds: [resultEmbed], components: [] });
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'complete') {
      embed.setDescription('⏰ Time\'s up! Game cancelled.');
      embed.setColor(EMBED_COLORS.warning);
      await interaction.editReply({ embeds: [embed], components: [] });
    }
  });
}

function getResult(player: Choice, opponent: Choice): 'win' | 'lose' | 'tie' {
  if (player === opponent) return 'tie';
  return CHOICES[player].beats === opponent ? 'win' : 'lose';
}

function createResultEmbed(
  p1Name: string, 
  p2Name: string, 
  p1Choice: Choice, 
  p2Choice: Choice, 
  result: 'win' | 'lose' | 'tie',
  winner?: string | null
): EmbedBuilder {
  const resultText = result === 'tie' 
    ? "🤝 It's a tie!" 
    : winner 
      ? `🎉 **${winner}** wins!` 
      : result === 'win' ? `🎉 **${p1Name}** wins!` : `🎉 **${p2Name}** wins!`;

  const color = result === 'tie' ? EMBED_COLORS.warning : result === 'win' ? EMBED_COLORS.success : EMBED_COLORS.error;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('🎮 Rock Paper Scissors - Results')
    .setDescription(resultText)
    .addFields(
      { name: p1Name, value: `${CHOICES[p1Choice].emoji} ${p1Choice}`, inline: true },
      { name: 'VS', value: '⚔️', inline: true },
      { name: p2Name, value: `${CHOICES[p2Choice].emoji} ${p2Choice}`, inline: true }
    )
    .setTimestamp();
}

export default command;
