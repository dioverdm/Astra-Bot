// ===========================================
// ASTRA BOT - Poll Command
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
import type { BotCommand } from '../../../shared/types/index.js';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(opt =>
      opt
        .setName('question')
        .setDescription('The poll question')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(opt =>
      opt
        .setName('options')
        .setDescription('Poll options separated by | (e.g., "Option 1 | Option 2 | Option 3")')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt
        .setName('duration')
        .setDescription('Poll duration in minutes (default: no limit)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1440) // Max 24 hours
    ),
    
  cooldown: 10,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const question = interaction.options.getString('question', true);
    const optionsStr = interaction.options.getString('options');
    const duration = interaction.options.getInteger('duration');

    // Parse options or default to Yes/No
    let options: string[];
    if (optionsStr) {
      options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);
      if (options.length < 2) {
        await interaction.reply({ 
          embeds: [errorEmbed('Please provide at least 2 options separated by |')], 
          ephemeral: true 
        });
        return;
      }
      if (options.length > 10) {
        await interaction.reply({ 
          embeds: [errorEmbed('Maximum 10 options allowed!')], 
          ephemeral: true 
        });
        return;
      }
    } else {
      options = ['Yes', 'No'];
    }

    // Build poll description
    const pollOptions = options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n');

    // Calculate end time if duration is set
    const endTime = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle('📊 ' + question)
      .setDescription(pollOptions)
      .setFooter({ 
        text: `Poll by ${interaction.user.tag}${endTime ? ` • Ends` : ''}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    if (endTime) {
      embed.addFields({
        name: '⏰ Ends',
        value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`
      });
    }

    // For Yes/No polls, add quick buttons
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (options.length === 2 && options[0] === 'Yes' && options[1] === 'No') {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('poll_yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('poll_no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );
      components.push(row);
    }

    const reply = await interaction.reply({ 
      embeds: [embed], 
      components,
      fetchReply: true 
    });

    // Add reactions for multi-option polls
    if (options.length > 2 || (options[0] !== 'Yes' || options[1] !== 'No')) {
      for (let i = 0; i < options.length; i++) {
        await reply.react(NUMBER_EMOJIS[i]).catch(() => {});
      }
    }

    // Handle button interactions for Yes/No polls
    if (components.length > 0) {
      const votes: Map<string, 'yes' | 'no'> = new Map();
      
      const collector = reply.createMessageComponentCollector({
        time: duration ? duration * 60 * 1000 : 86400000, // Default 24h
      });

      collector.on('collect', async (i) => {
        const vote = i.customId === 'poll_yes' ? 'yes' : 'no';
        const previousVote = votes.get(i.user.id);
        
        if (previousVote === vote) {
          await i.reply({ content: `You already voted **${vote}**!`, ephemeral: true });
          return;
        }

        votes.set(i.user.id, vote);
        
        // Count votes
        let yesCount = 0;
        let noCount = 0;
        votes.forEach(v => {
          if (v === 'yes') yesCount++;
          else noCount++;
        });

        // Update embed
        embed.setDescription(
          `1️⃣ Yes - **${yesCount}** vote${yesCount !== 1 ? 's' : ''}\n` +
          `2️⃣ No - **${noCount}** vote${noCount !== 1 ? 's' : ''}`
        );

        await i.update({ embeds: [embed] });
      });

      collector.on('end', async () => {
        // Disable buttons
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('poll_yes')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('poll_no')
              .setLabel('No')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
              .setDisabled(true)
          );

        embed.setColor(EMBED_COLORS.warning);
        embed.setFooter({ text: 'Poll ended', iconURL: interaction.user.displayAvatarURL() });
        
        await interaction.editReply({ embeds: [embed], components: [disabledRow] }).catch(() => {});
      });
    }
  },
};

export default command;
