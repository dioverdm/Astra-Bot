// ===========================================
// ASTRA BOT - Avatar Command (Enhanced)
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

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar in various formats and sizes')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get the avatar of (defaults to yourself)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Which avatar to show')
        .setRequired(false)
        .addChoices(
          { name: '🌐 Global Avatar', value: 'global' },
          { name: '🏠 Server Avatar', value: 'server' }
        )
    )
    .addStringOption(option =>
      option
        .setName('format')
        .setDescription('Image format')
        .setRequired(false)
        .addChoices(
          { name: 'PNG', value: 'png' },
          { name: 'JPG', value: 'jpg' },
          { name: 'WebP', value: 'webp' },
          { name: 'GIF (if animated)', value: 'gif' }
        )
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const avatarType = interaction.options.getString('type') || 'global';
    const format = interaction.options.getString('format') as 'png' | 'jpg' | 'webp' | 'gif' | null;
    
    // Get member for server avatar
    let member = null;
    if (interaction.guild) {
      member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    }
    
    const hasServerAvatar = member && member.avatar !== null;
    const showServerAvatar = avatarType === 'server' && hasServerAvatar;
    
    // Get avatar hash to check if animated
    const avatarHash = showServerAvatar ? member?.avatar : targetUser.avatar;
    const isAnimated = avatarHash?.startsWith('a_');
    
    // Determine format (auto-detect GIF for animated)
    const imageFormat = format || (isAnimated ? 'gif' : 'webp');
    
    // Get avatar URL
    const avatarOptions = { 
      size: 4096 as const, 
      extension: imageFormat as 'png' | 'jpg' | 'webp' | 'gif',
      forceStatic: imageFormat !== 'gif'
    };
    
    const avatarUrl = showServerAvatar 
      ? member!.displayAvatarURL(avatarOptions)
      : targetUser.displayAvatarURL(avatarOptions);
    
    const globalAvatarUrl = targetUser.displayAvatarURL(avatarOptions);
    const serverAvatarUrl = hasServerAvatar ? member!.displayAvatarURL(avatarOptions) : null;
    
    // Build embed
    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || EMBED_COLORS.info)
      .setAuthor({ 
        name: `${targetUser.globalName || targetUser.username}'s Avatar`, 
        iconURL: targetUser.displayAvatarURL({ size: 64 }) 
      })
      .setImage(avatarUrl)
      .addFields({
        name: '📊 Details',
        value: [
          `**Type:** ${showServerAvatar ? '🏠 Server' : '🌐 Global'}`,
          `**Format:** ${imageFormat.toUpperCase()}`,
          `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
        ].join('\n'),
        inline: true
      })
      .setFooter({ 
        text: `User ID: ${targetUser.id}` 
      })
      .setTimestamp();
    
    // Size buttons row
    const sizeRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('64')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`avatar_size_64_${targetUser.id}_${showServerAvatar ? 'server' : 'global'}_${imageFormat}`),
        new ButtonBuilder()
          .setLabel('256')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`avatar_size_256_${targetUser.id}_${showServerAvatar ? 'server' : 'global'}_${imageFormat}`),
        new ButtonBuilder()
          .setLabel('512')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`avatar_size_512_${targetUser.id}_${showServerAvatar ? 'server' : 'global'}_${imageFormat}`),
        new ButtonBuilder()
          .setLabel('1024')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`avatar_size_1024_${targetUser.id}_${showServerAvatar ? 'server' : 'global'}_${imageFormat}`),
        new ButtonBuilder()
          .setLabel('4096')
          .setStyle(ButtonStyle.Success)
          .setCustomId(`avatar_size_4096_${targetUser.id}_${showServerAvatar ? 'server' : 'global'}_${imageFormat}`)
      );
    
    // Action buttons row
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open in Browser')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarUrl)
          .setEmoji('🔗')
      );
    
    // Add toggle button if user has server avatar
    if (hasServerAvatar) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel(showServerAvatar ? 'Show Global' : 'Show Server')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`avatar_toggle_${targetUser.id}_${showServerAvatar ? 'global' : 'server'}`)
          .setEmoji(showServerAvatar ? '🌐' : '🏠')
      );
    }
    
    const response = await interaction.reply({ 
      embeds: [embed], 
      components: [sizeRow, actionRow] 
    });
    
    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('avatar_'),
      time: 120000,
    });
    
    collector.on('collect', async (i) => {
      if (i.customId.startsWith('avatar_size_')) {
        // Handle size change
        const parts = i.customId.split('_');
        const newSize = parseInt(parts[2]) as 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
        const userId = parts[3];
        const type = parts[4];
        const fmt = parts[5] as 'png' | 'jpg' | 'webp' | 'gif';
        
        const newUrl = type === 'server' && member?.avatar
          ? member.displayAvatarURL({ size: newSize, extension: fmt })
          : targetUser.displayAvatarURL({ size: newSize, extension: fmt });
        
        const newEmbed = EmbedBuilder.from(embed)
          .setImage(newUrl)
          .setFields({
            name: '📊 Details',
            value: [
              `**Type:** ${type === 'server' ? '🏠 Server' : '🌐 Global'}`,
              `**Format:** ${fmt.toUpperCase()}`,
              `**Size:** ${newSize}px`,
              `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
            ].join('\n'),
            inline: true
          });
        
        // Update action row with new URL
        const newActionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Open in Browser')
              .setStyle(ButtonStyle.Link)
              .setURL(newUrl)
              .setEmoji('🔗')
          );
        
        if (hasServerAvatar) {
          newActionRow.addComponents(
            new ButtonBuilder()
              .setLabel(type === 'server' ? 'Show Global' : 'Show Server')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId(`avatar_toggle_${userId}_${type === 'server' ? 'global' : 'server'}`)
              .setEmoji(type === 'server' ? '🌐' : '🏠')
          );
        }
        
        await i.update({ embeds: [newEmbed], components: [sizeRow, newActionRow] });
        
      } else if (i.customId.startsWith('avatar_toggle_')) {
        // Handle toggle between global/server
        const parts = i.customId.split('_');
        const newType = parts[3];
        
        const newUrl = newType === 'server' && serverAvatarUrl
          ? serverAvatarUrl
          : globalAvatarUrl;
        
        const newEmbed = EmbedBuilder.from(embed)
          .setImage(newUrl)
          .setFields({
            name: '📊 Details',
            value: [
              `**Type:** ${newType === 'server' ? '🏠 Server' : '🌐 Global'}`,
              `**Format:** ${imageFormat.toUpperCase()}`,
              `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
            ].join('\n'),
            inline: true
          });
        
        const newSizeRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder().setLabel('64').setStyle(ButtonStyle.Secondary)
              .setCustomId(`avatar_size_64_${targetUser.id}_${newType}_${imageFormat}`),
            new ButtonBuilder().setLabel('256').setStyle(ButtonStyle.Secondary)
              .setCustomId(`avatar_size_256_${targetUser.id}_${newType}_${imageFormat}`),
            new ButtonBuilder().setLabel('512').setStyle(ButtonStyle.Primary)
              .setCustomId(`avatar_size_512_${targetUser.id}_${newType}_${imageFormat}`),
            new ButtonBuilder().setLabel('1024').setStyle(ButtonStyle.Secondary)
              .setCustomId(`avatar_size_1024_${targetUser.id}_${newType}_${imageFormat}`),
            new ButtonBuilder().setLabel('4096').setStyle(ButtonStyle.Success)
              .setCustomId(`avatar_size_4096_${targetUser.id}_${newType}_${imageFormat}`)
          );
        
        const newActionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Open in Browser')
              .setStyle(ButtonStyle.Link)
              .setURL(newUrl)
              .setEmoji('🔗'),
            new ButtonBuilder()
              .setLabel(newType === 'server' ? 'Show Global' : 'Show Server')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId(`avatar_toggle_${targetUser.id}_${newType === 'server' ? 'global' : 'server'}`)
              .setEmoji(newType === 'server' ? '🌐' : '🏠')
          );
        
        await i.update({ embeds: [newEmbed], components: [newSizeRow, newActionRow] });
      }
    });
    
    collector.on('end', async () => {
      const disabledSizeRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setLabel('64').setStyle(ButtonStyle.Secondary).setCustomId('d1').setDisabled(true),
          new ButtonBuilder().setLabel('256').setStyle(ButtonStyle.Secondary).setCustomId('d2').setDisabled(true),
          new ButtonBuilder().setLabel('512').setStyle(ButtonStyle.Primary).setCustomId('d3').setDisabled(true),
          new ButtonBuilder().setLabel('1024').setStyle(ButtonStyle.Secondary).setCustomId('d4').setDisabled(true),
          new ButtonBuilder().setLabel('4096').setStyle(ButtonStyle.Success).setCustomId('d5').setDisabled(true)
        );
      
      const disabledActionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Open in Browser')
            .setStyle(ButtonStyle.Link)
            .setURL(avatarUrl)
            .setEmoji('🔗')
        );
      
      await interaction.editReply({ components: [disabledSizeRow, disabledActionRow] }).catch(() => {});
    });
  },
};

export default command;
