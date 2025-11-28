// ===========================================
// ASTRA BOT - Meme Command
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
import type { BotCommand } from '../../../shared/types/index.js';

const SUBREDDITS = ['memes', 'dankmemes', 'me_irl', 'wholesomememes', 'ProgrammerHumor'];

interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  ups: number;
  num_comments: number;
  author: string;
  subreddit: string;
  over_18: boolean;
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme')
    .addStringOption(opt =>
      opt
        .setName('subreddit')
        .setDescription('Specific subreddit')
        .setRequired(false)
        .addChoices(
          { name: 'r/memes', value: 'memes' },
          { name: 'r/dankmemes', value: 'dankmemes' },
          { name: 'r/me_irl', value: 'me_irl' },
          { name: 'r/wholesomememes', value: 'wholesomememes' },
          { name: 'r/ProgrammerHumor', value: 'ProgrammerHumor' }
        )
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const subreddit = interaction.options.getString('subreddit') || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    try {
      const meme = await fetchMeme(subreddit);
      
      if (!meme) {
        await interaction.editReply({ embeds: [errorEmbed('Failed to fetch meme. Try again!')] });
        return;
      }

      const embed = createMemeEmbed(meme);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('meme_next')
            .setLabel('Next Meme')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
          new ButtonBuilder()
            .setLabel('Open in Reddit')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://reddit.com${meme.permalink}`)
            .setEmoji('🔗')
        );

      const response = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = response.createMessageComponentCollector({
        filter: (i) => i.customId === 'meme_next' && i.user.id === interaction.user.id,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        const newSubreddit = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
        const newMeme = await fetchMeme(newSubreddit);
        
        if (newMeme) {
          const newEmbed = createMemeEmbed(newMeme);
          const newRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('meme_next')
                .setLabel('Next Meme')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄'),
              new ButtonBuilder()
                .setLabel('Open in Reddit')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://reddit.com${newMeme.permalink}`)
                .setEmoji('🔗')
            );
          await i.update({ embeds: [newEmbed], components: [newRow] });
        } else {
          await i.reply({ content: 'Failed to fetch next meme!', ephemeral: true });
        }
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });

    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Failed to fetch meme. API might be unavailable.')] });
    }
  },
};

async function fetchMeme(subreddit: string): Promise<RedditPost | null> {
  try {
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=100`, {
      timeout: 10000,
      headers: { 'User-Agent': 'AstraBot/1.0' }
    });

    const posts = response.data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => {
        // Filter for image posts only
        const isImage = post.url?.match(/\.(jpg|jpeg|png|gif)$/i) || 
                       post.url?.includes('i.redd.it') ||
                       post.url?.includes('i.imgur.com');
        return isImage && !post.over_18 && !post.stickied;
      });

    if (posts.length === 0) return null;

    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    
    return {
      title: randomPost.title,
      url: randomPost.url,
      permalink: randomPost.permalink,
      ups: randomPost.ups,
      num_comments: randomPost.num_comments,
      author: randomPost.author,
      subreddit: randomPost.subreddit,
      over_18: randomPost.over_18
    };
  } catch {
    return null;
  }
}

function createMemeEmbed(meme: RedditPost): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.primary)
    .setTitle(meme.title.length > 256 ? meme.title.slice(0, 253) + '...' : meme.title)
    .setImage(meme.url)
    .setFooter({ 
      text: `👍 ${formatNumber(meme.ups)} • 💬 ${formatNumber(meme.num_comments)} • r/${meme.subreddit} • u/${meme.author}` 
    })
    .setTimestamp();
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default command;
