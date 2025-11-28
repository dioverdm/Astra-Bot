// ===========================================
// ASTRA BOT - Anime Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import axios from 'axios';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Category emojis
const CATEGORY_EMOJIS: Record<string, string> = {
  waifu: '👧', neko: '😺', shinobu: '🦋', megumin: '💥',
  happy: '😊', smile: '😄', blush: '😳', smug: '😏',
  hug: '🤗', kiss: '💋', pat: '✋', cuddle: '🥰',
  cry: '😢', wave: '👋', bonk: '🔨', bite: '😬',
  slap: '👋', kick: '🦶', highfive: '🙏', handhold: '🤝',
  poke: '👆', dance: '💃', cringe: '😬', nom: '😋'
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Get random anime content - images, GIFs, reactions & quotes')
    .addSubcommand(sub =>
      sub
        .setName('image')
        .setDescription('Get a random anime image')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Image category')
            .setRequired(false)
            .addChoices(
              { name: '👧 Waifu', value: 'waifu' },
              { name: '😺 Neko', value: 'neko' },
              { name: '🦋 Shinobu', value: 'shinobu' },
              { name: '💥 Megumin', value: 'megumin' },
              { name: '😊 Happy', value: 'happy' },
              { name: '😄 Smile', value: 'smile' },
              { name: '😳 Blush', value: 'blush' },
              { name: '😏 Smug', value: 'smug' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reaction')
        .setDescription('React to someone with an anime GIF')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Reaction type')
            .setRequired(true)
            .addChoices(
              { name: '🤗 Hug', value: 'hug' },
              { name: '💋 Kiss', value: 'kiss' },
              { name: '✋ Pat', value: 'pat' },
              { name: '🥰 Cuddle', value: 'cuddle' },
              { name: '👋 Slap', value: 'slap' },
              { name: '🔨 Bonk', value: 'bonk' },
              { name: '👆 Poke', value: 'poke' },
              { name: '😬 Bite', value: 'bite' },
              { name: '🦶 Kick', value: 'kick' },
              { name: '🙏 Highfive', value: 'highfive' },
              { name: '🤝 Handhold', value: 'handhold' },
              { name: '💃 Dance', value: 'dance' }
            )
        )
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to react to')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('gif')
        .setDescription('Get a random anime GIF')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('GIF type')
            .setRequired(false)
            .addChoices(
              { name: '😢 Cry', value: 'cry' },
              { name: '👋 Wave', value: 'wave' },
              { name: '😊 Happy', value: 'happy' },
              { name: '💃 Dance', value: 'dance' },
              { name: '😬 Cringe', value: 'cringe' },
              { name: '😋 Nom', value: 'nom' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('quote')
        .setDescription('Get a random anime quote')
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    
    await interaction.deferReply();
    
    try {
      switch (subcommand) {
        case 'image':
          await handleImage(interaction);
          break;
        case 'reaction':
          await handleReaction(interaction);
          break;
        case 'gif':
          await handleGif(interaction);
          break;
        case 'quote':
          await handleQuote(interaction);
          break;
      }
    } catch (error) {
      logger.error('Error in anime command:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Failed to fetch anime content. Please try again later.')],
      });
    }
  },
};

async function handleImage(interaction: ChatInputCommandInteraction): Promise<void> {
  const category = interaction.options.getString('category') || 'waifu';
  const emoji = CATEGORY_EMOJIS[category] || '✨';
  
  const response = await axios.get(`https://api.waifu.pics/sfw/${category}`);
  const imageUrl = response.data.url;
  
  const embed = new EmbedBuilder()
    .setColor(0xFF69B4)
    .setAuthor({ 
      name: `${emoji} Random ${capitalize(category)}`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setImage(imageUrl)
    .setFooter({ text: `Category: ${category} • Click 🔄 for another` })
    .setTimestamp();
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`anime_refresh_${category}`)
        .setLabel('Another!')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setLabel('Open Image')
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl)
        .setEmoji('🔗')
    );
  
  const response2 = await interaction.editReply({ embeds: [embed], components: [row] });
  
  // Handle refresh button
  const collector = response2.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith('anime_refresh_') && i.user.id === interaction.user.id,
    time: 120000,
  });
  
  collector.on('collect', async (i) => {
    const cat = i.customId.replace('anime_refresh_', '');
    
    try {
      const newResponse = await axios.get(`https://api.waifu.pics/sfw/${cat}`);
      const newUrl = newResponse.data.url;
      
      const newEmbed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setAuthor({ 
          name: `${CATEGORY_EMOJIS[cat] || '✨'} Random ${capitalize(cat)}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setImage(newUrl)
        .setFooter({ text: `Category: ${cat} • Click 🔄 for another` })
        .setTimestamp();
      
      const newRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`anime_refresh_${cat}`)
            .setLabel('Another!')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
          new ButtonBuilder()
            .setLabel('Open Image')
            .setStyle(ButtonStyle.Link)
            .setURL(newUrl)
            .setEmoji('🔗')
        );
      
      await i.update({ embeds: [newEmbed], components: [newRow] });
    } catch {
      await i.reply({ content: '❌ Failed to fetch new image', ephemeral: true });
    }
  });
  
  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('disabled')
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
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleReaction(interaction: ChatInputCommandInteraction): Promise<void> {
  const action = interaction.options.getString('action', true);
  const targetUser = interaction.options.getUser('user');
  const emoji = CATEGORY_EMOJIS[action] || '💫';
  
  const response = await axios.get(`https://api.waifu.pics/sfw/${action}`);
  const gifUrl = response.data.url;
  
  // Build description based on action
  let description: string;
  if (targetUser && targetUser.id !== interaction.user.id) {
    const actionVerbs: Record<string, string> = {
      hug: 'hugs', kiss: 'kisses', pat: 'pats', cuddle: 'cuddles with',
      slap: 'slaps', bonk: 'bonks', poke: 'pokes', bite: 'bites',
      kick: 'kicks', highfive: 'high-fives', handhold: 'holds hands with', dance: 'dances with'
    };
    description = `**${interaction.user}** ${actionVerbs[action] || action + 's'} **${targetUser}**! ${emoji}`;
  } else {
    description = `**${interaction.user}** ${action}s! ${emoji}`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xFFB6C1)
    .setDescription(description)
    .setImage(gifUrl)
    .setFooter({ text: `Action: ${action}` })
    .setTimestamp();
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`react_back_${action}_${interaction.user.id}`)
        .setLabel(`${capitalize(action)} Back!`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(emoji)
    );
  
  // Only show "react back" button if there's a target
  if (targetUser && targetUser.id !== interaction.user.id) {
    const response2 = await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = response2.createMessageComponentCollector({
      filter: (i) => i.customId === `react_back_${action}_${interaction.user.id}` && i.user.id === targetUser.id,
      time: 60000,
      max: 1
    });
    
    collector.on('collect', async (i) => {
      try {
        const newResponse = await axios.get(`https://api.waifu.pics/sfw/${action}`);
        const newUrl = newResponse.data.url;
        
        const replyEmbed = new EmbedBuilder()
          .setColor(0xFFB6C1)
          .setDescription(`**${i.user}** ${action}s **${interaction.user}** back! ${emoji}`)
          .setImage(newUrl)
          .setTimestamp();
        
        await i.reply({ embeds: [replyEmbed] });
      } catch {
        await i.reply({ content: '❌ Failed to react back', ephemeral: true });
      }
    });
    
    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  } else {
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleGif(interaction: ChatInputCommandInteraction): Promise<void> {
  const type = interaction.options.getString('type') || 'happy';
  const emoji = CATEGORY_EMOJIS[type] || '✨';
  
  const response = await axios.get(`https://api.waifu.pics/sfw/${type}`);
  const gifUrl = response.data.url;
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setAuthor({ 
      name: `${emoji} ${capitalize(type)}!`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setImage(gifUrl)
    .setFooter({ text: `Type: ${type}` })
    .setTimestamp();
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`gif_refresh_${type}`)
        .setLabel('Another!')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );
  
  const response2 = await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = response2.createMessageComponentCollector({
    filter: (i) => i.customId === `gif_refresh_${type}` && i.user.id === interaction.user.id,
    time: 120000,
  });
  
  collector.on('collect', async (i) => {
    try {
      const newResponse = await axios.get(`https://api.waifu.pics/sfw/${type}`);
      const newUrl = newResponse.data.url;
      
      const newEmbed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setAuthor({ 
          name: `${emoji} ${capitalize(type)}!`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setImage(newUrl)
        .setFooter({ text: `Type: ${type}` })
        .setTimestamp();
      
      await i.update({ embeds: [newEmbed] });
    } catch {
      await i.reply({ content: '❌ Failed to fetch new GIF', ephemeral: true });
    }
  });
  
  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('disabled')
          .setLabel('Expired')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

// Fallback anime quotes
const FALLBACK_QUOTES = [
  { content: "People's lives don't end when they die. It ends when they lose faith.", character: "Itachi Uchiha", anime: "Naruto" },
  { content: "The world isn't perfect. But it's there for us, doing the best it can. That's what makes it so damn beautiful.", character: "Roy Mustang", anime: "Fullmetal Alchemist" },
  { content: "If you don't take risks, you can't create a future.", character: "Monkey D. Luffy", anime: "One Piece" },
  { content: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", character: "Kenshin Himura", anime: "Rurouni Kenshin" },
  { content: "The only ones who should kill are those who are prepared to be killed.", character: "Lelouch vi Britannia", anime: "Code Geass" },
  { content: "Fear is not evil. It tells you what your weakness is. And once you know your weakness, you can become stronger.", character: "Gildarts Clive", anime: "Fairy Tail" },
  { content: "Being alone is more painful than getting hurt.", character: "Monkey D. Luffy", anime: "One Piece" },
  { content: "A lesson without pain is meaningless. That's because no one can gain without sacrificing something.", character: "Edward Elric", anime: "Fullmetal Alchemist" },
  { content: "If you don't like the hand that fate's dealt you, fight for a new one.", character: "Naruto Uzumaki", anime: "Naruto" },
  { content: "The world is not beautiful, therefore it is.", character: "Kino", anime: "Kino's Journey" },
  { content: "Hard work is worthless for those that don't believe in themselves.", character: "Naruto Uzumaki", anime: "Naruto" },
  { content: "Power comes in response to a need, not a desire.", character: "Goku", anime: "Dragon Ball Z" },
  { content: "I'll leave tomorrow's problems to tomorrow's me.", character: "Saitama", anime: "One Punch Man" },
  { content: "Simplicity is the easiest path to true beauty.", character: "Seishuu Handa", anime: "Barakamon" },
  { content: "Life is not a game of luck. If you wanna win, work hard.", character: "Sora", anime: "No Game No Life" }
];

async function fetchAnimeQuote(): Promise<{ content: string; character: string; anime: string }> {
  try {
    // Using animechan.io API v1
    const response = await axios.get('https://api.animechan.io/v1/quotes/random', { timeout: 5000 });
    if (response.data.status === 'success' && response.data.data) {
      return {
        content: response.data.data.content,
        character: response.data.data.character?.name || 'Unknown',
        anime: response.data.data.anime?.name || 'Unknown'
      };
    }
    throw new Error('Invalid response');
  } catch {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
}

async function handleQuote(interaction: ChatInputCommandInteraction): Promise<void> {
  const quote = await fetchAnimeQuote();
  
  const embed = new EmbedBuilder()
    .setColor(0xE91E63)
    .setAuthor({ name: '📜 Anime Quote', iconURL: interaction.user.displayAvatarURL() })
    .setDescription(`>>> *"${quote.content}"*`)
    .addFields(
      { name: '🎭 Character', value: quote.character || 'Unknown', inline: true },
      { name: '📺 Anime', value: quote.anime || 'Unknown', inline: true }
    )
    .setFooter({ text: 'Click 🔄 for another quote' })
    .setTimestamp();
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('quote_refresh')
        .setLabel('Another Quote')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );
  
  const response2 = await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = response2.createMessageComponentCollector({
    filter: (i) => i.customId === 'quote_refresh' && i.user.id === interaction.user.id,
    time: 120000,
  });
  
  collector.on('collect', async (i) => {
    try {
      const newQuote = await fetchAnimeQuote();
      
      const newEmbed = new EmbedBuilder()
        .setColor(0xE91E63)
        .setAuthor({ name: '📜 Anime Quote', iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`>>> *"${newQuote.content}"*`)
        .addFields(
          { name: '🎭 Character', value: newQuote.character || 'Unknown', inline: true },
          { name: '📺 Anime', value: newQuote.anime || 'Unknown', inline: true }
        )
        .setFooter({ text: 'Click 🔄 for another quote' })
        .setTimestamp();
      
      await i.update({ embeds: [newEmbed] });
    } catch {
      await i.reply({ content: '❌ Failed to fetch new quote', ephemeral: true });
    }
  });
  
  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('disabled')
          .setLabel('Expired')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default command;
