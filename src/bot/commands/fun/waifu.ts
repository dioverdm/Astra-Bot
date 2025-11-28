// ===========================================
// ASTRA BOT - Waifu Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import axios from 'axios';
import { errorEmbed } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Extended waifu types with emojis and colors
const WAIFU_TYPES: Record<string, { emoji: string; color: number; description: string }> = {
  waifu: { emoji: '👧', color: 0xFF69B4, description: 'Classic anime waifu' },
  neko: { emoji: '😺', color: 0xFFB6C1, description: 'Cat girl (neko)' },
  shinobu: { emoji: '🦋', color: 0xFFD700, description: 'Shinobu Oshino' },
  megumin: { emoji: '💥', color: 0xFF4500, description: 'Megumin explosion!' },
  awoo: { emoji: '🐺', color: 0x8B4513, description: 'Wolf girl awoo' },
  happy: { emoji: '😊', color: 0xFFEB3B, description: 'Happy expressions' },
  smile: { emoji: '😄', color: 0xFFC107, description: 'Smiling faces' },
  blush: { emoji: '😳', color: 0xFF6B6B, description: 'Blushing expressions' },
  smug: { emoji: '😏', color: 0x9C27B0, description: 'Smug faces' }
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('waifu')
    .setDescription('Get random waifu & anime character images')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of image')
        .setRequired(false)
        .addChoices(
          { name: '👧 Waifu', value: 'waifu' },
          { name: '😺 Neko (Cat girl)', value: 'neko' },
          { name: '🦋 Shinobu', value: 'shinobu' },
          { name: '💥 Megumin', value: 'megumin' },
          { name: '🐺 Awoo (Wolf)', value: 'awoo' },
          { name: '😊 Happy', value: 'happy' },
          { name: '😄 Smile', value: 'smile' },
          { name: '😳 Blush', value: 'blush' },
          { name: '😏 Smug', value: 'smug' }
        )
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    let currentType = interaction.options.getString('type') || 'waifu';
    
    await interaction.deferReply();
    
    try {
      // Fetch waifu image from API
      const response = await axios.get(`https://api.waifu.pics/sfw/${currentType}`);
      let imageUrl = response.data.url;
      let imageCount = 1;
      
      const createEmbed = (url: string, type: string, count: number) => {
        const info = WAIFU_TYPES[type] || WAIFU_TYPES.waifu;
        return new EmbedBuilder()
          .setColor(info.color)
          .setAuthor({ 
            name: `${info.emoji} Random ${capitalize(type)}`, 
            iconURL: interaction.user.displayAvatarURL() 
          })
          .setDescription(`*${info.description}*`)
          .setImage(url)
          .setFooter({ text: `Images viewed: ${count} • Type: ${type}` })
          .setTimestamp();
      };
      
      const createButtons = (url: string, type: string) => {
        return new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`waifu_refresh_${type}`)
              .setLabel('Another!')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄'),
            new ButtonBuilder()
              .setCustomId('waifu_random')
              .setLabel('Random Type')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🎲'),
            new ButtonBuilder()
              .setLabel('Open Image')
              .setStyle(ButtonStyle.Link)
              .setURL(url)
              .setEmoji('🔗')
          );
      };
      
      const createSelectMenu = (currentType: string) => {
        return new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('waifu_type_select')
              .setPlaceholder('🔽 Change type...')
              .addOptions(
                Object.entries(WAIFU_TYPES).map(([key, value]) => ({
                  label: capitalize(key),
                  value: key,
                  emoji: value.emoji,
                  description: value.description,
                  default: key === currentType
                }))
              )
          );
      };
      
      const message = await interaction.editReply({ 
        embeds: [createEmbed(imageUrl, currentType, imageCount)], 
        components: [createButtons(imageUrl, currentType), createSelectMenu(currentType)]
      });
      
      // Create collector for interactions
      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 180000, // 3 minutes
      });
      
      collector.on('collect', async (i) => {
        try {
          let newType = currentType;
          
          // Handle type selection
          if (i.isStringSelectMenu() && i.customId === 'waifu_type_select') {
            newType = i.values[0];
            currentType = newType;
          }
          
          // Handle random type
          if (i.isButton() && i.customId === 'waifu_random') {
            const types = Object.keys(WAIFU_TYPES);
            newType = types[Math.floor(Math.random() * types.length)];
            currentType = newType;
          }
          
          // Handle refresh
          if (i.isButton() && i.customId.startsWith('waifu_refresh_')) {
            newType = currentType;
          }
          
          // Fetch new image
          const newResponse = await axios.get(`https://api.waifu.pics/sfw/${newType}`);
          imageUrl = newResponse.data.url;
          imageCount++;
          
          await i.update({ 
            embeds: [createEmbed(imageUrl, newType, imageCount)], 
            components: [createButtons(imageUrl, newType), createSelectMenu(newType)]
          });
        } catch (error) {
          logger.error('Error fetching new waifu image:', error);
          await i.reply({ content: '❌ Failed to fetch image', ephemeral: true }).catch(() => {});
        }
      });
      
      collector.on('end', async () => {
        const disabledButtons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('disabled1')
              .setLabel('Expired')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⏰')
              .setDisabled(true),
            new ButtonBuilder()
              .setLabel('Open Image')
              .setStyle(ButtonStyle.Link)
              .setURL(imageUrl)
              .setEmoji('🔗')
          );
        
        await interaction.editReply({ components: [disabledButtons] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error('Error in waifu command:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Failed to fetch waifu image. Please try again later.')],
      });
    }
  },
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default command;
