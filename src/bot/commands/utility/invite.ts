// ===========================================
// ASTRA BOT - Invite Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { EMBED_COLORS, BOT_LINKS, generateBotInviteUrl } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link and other useful links'),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const client = interaction.client;
    const clientId = client.user?.id || '';
    
    // Generate invite URL with recommended permissions
    const inviteUrl = generateBotInviteUrl(clientId);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle('🔗 Invite Astra')
      .setDescription(
        'Thank you for your interest in Astra! Use the buttons below to add the bot to your server or join our support community.'
      )
      .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) || '')
      .addFields(
        { 
          name: '✨ Features', 
          value: 
            '• Leveling & Economy system\n' +
            '• Moderation tools\n' +
            '• Welcome messages\n' +
            '• Custom commands\n' +
            '• Web Dashboard\n' +
            '• And much more!'
        }
      )
      .setFooter({ text: `Currently serving ${client.guilds.cache.size} servers` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Add to Server')
          .setStyle(ButtonStyle.Link)
          .setURL(inviteUrl)
          .setEmoji('🤖'),
        new ButtonBuilder()
          .setLabel('Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL(BOT_LINKS.supportServer)
          .setEmoji('💬'),
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(BOT_LINKS.website)
          .setEmoji('🌐')
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
