// ===========================================
// ASTRA BOT - Banner Command (Enhanced)
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

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get a user\'s or server\'s banner')
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Get a user\'s profile banner')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('The user to get the banner of (defaults to yourself)')
            .setRequired(false)
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
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('server')
        .setDescription('Get the current server\'s banner')
    ),
    
  cooldown: 3,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    
    await interaction.deferReply();
    
    if (subcommand === 'server') {
      await handleServerBanner(interaction);
    } else {
      await handleUserBanner(interaction);
    }
  },
};

async function handleUserBanner(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const format = interaction.options.getString('format') as 'png' | 'jpg' | 'webp' | 'gif' | null;
  
  // Fetch full user data to get banner
  const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true });
  
  if (!fullUser.banner) {
    await interaction.editReply({
      embeds: [errorEmbed(`**${targetUser.username}** doesn't have a profile banner set.\n\n💡 *Banners are a Discord Nitro feature.*`)]
    });
    return;
  }
  
  const isAnimated = fullUser.banner.startsWith('a_');
  const imageFormat = format || (isAnimated ? 'gif' : 'png');
  const bannerUrl = `https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}.${imageFormat}?size=4096`;
  
  const embed = new EmbedBuilder()
    .setColor(fullUser.accentColor || EMBED_COLORS.info)
    .setAuthor({ 
      name: `${fullUser.globalName || fullUser.username}'s Banner`, 
      iconURL: fullUser.displayAvatarURL({ size: 64 }) 
    })
    .setImage(bannerUrl)
    .addFields({
      name: '📊 Details',
      value: [
        `**Format:** ${imageFormat.toUpperCase()}`,
        `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
        fullUser.accentColor ? `**Accent:** #${fullUser.accentColor.toString(16).padStart(6, '0').toUpperCase()}` : null
      ].filter(Boolean).join('\n'),
      inline: true
    })
    .setFooter({ text: `User ID: ${fullUser.id}` })
    .setTimestamp();
  
  // Size selector buttons
  const sizeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('300')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`banner_size_300_${fullUser.id}_${imageFormat}`),
      new ButtonBuilder()
        .setLabel('600')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`banner_size_600_${fullUser.id}_${imageFormat}`),
      new ButtonBuilder()
        .setLabel('1024')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`banner_size_1024_${fullUser.id}_${imageFormat}`),
      new ButtonBuilder()
        .setLabel('2048')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`banner_size_2048_${fullUser.id}_${imageFormat}`),
      new ButtonBuilder()
        .setLabel('4096')
        .setStyle(ButtonStyle.Success)
        .setCustomId(`banner_size_4096_${fullUser.id}_${imageFormat}`)
    );
  
  // Action buttons
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Open in Browser')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setLabel('Discord Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/users/${fullUser.id}`)
        .setEmoji('👤')
    );
  
  // Add dashboard profile link if in a guild
  if (interaction.guild) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://astra.novaplex.xyz/dashboard/guild/${interaction.guild.id}/member/${fullUser.id}`)
        .setEmoji('📊')
    );
  }
  
  const response = await interaction.editReply({ embeds: [embed], components: [sizeRow, actionRow] });
  
  // Handle size changes
  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('banner_size_'),
    time: 120000,
  });
  
  collector.on('collect', async (i) => {
    const parts = i.customId.split('_');
    const newSize = parts[2];
    const userId = parts[3];
    const fmt = parts[4];
    
    const newUrl = `https://cdn.discordapp.com/banners/${userId}/${fullUser.banner}.${fmt}?size=${newSize}`;
    
    const newEmbed = EmbedBuilder.from(embed)
      .setImage(newUrl)
      .setFields({
        name: '📊 Details',
        value: [
          `**Format:** ${fmt.toUpperCase()}`,
          `**Size:** ${newSize}px`,
          `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
          fullUser.accentColor ? `**Accent:** #${fullUser.accentColor.toString(16).padStart(6, '0').toUpperCase()}` : null
        ].filter(Boolean).join('\n'),
        inline: true
      });
    
    const newActionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open in Browser')
          .setStyle(ButtonStyle.Link)
          .setURL(newUrl)
          .setEmoji('🔗'),
        new ButtonBuilder()
          .setLabel('View Profile')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${fullUser.id}`)
          .setEmoji('👤')
      );
    
    await i.update({ embeds: [newEmbed], components: [sizeRow, newActionRow] });
  });
  
  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setLabel('300').setStyle(ButtonStyle.Secondary).setCustomId('d1').setDisabled(true),
        new ButtonBuilder().setLabel('600').setStyle(ButtonStyle.Secondary).setCustomId('d2').setDisabled(true),
        new ButtonBuilder().setLabel('1024').setStyle(ButtonStyle.Primary).setCustomId('d3').setDisabled(true),
        new ButtonBuilder().setLabel('2048').setStyle(ButtonStyle.Secondary).setCustomId('d4').setDisabled(true),
        new ButtonBuilder().setLabel('4096').setStyle(ButtonStyle.Success).setCustomId('d5').setDisabled(true)
      );
    await interaction.editReply({ components: [disabledRow, actionRow] }).catch(() => {});
  });
}

async function handleServerBanner(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;
  
  if (!guild) {
    await interaction.editReply({
      embeds: [errorEmbed('This command can only be used in a server.')]
    });
    return;
  }
  
  // Fetch fresh guild data
  await guild.fetch();
  
  if (!guild.banner) {
    await interaction.editReply({
      embeds: [errorEmbed(`**${guild.name}** doesn't have a server banner set.\n\n💡 *Server banners require Boost Level 2 or higher.*`)]
    });
    return;
  }
  
  const isAnimated = guild.banner.startsWith('a_');
  const bannerUrl = guild.bannerURL({ size: 4096 }) || '';
  
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.info)
    .setAuthor({ 
      name: `${guild.name}'s Banner`, 
      iconURL: guild.iconURL({ size: 64 }) || undefined
    })
    .setImage(bannerUrl)
    .addFields(
      {
        name: '📊 Server Info',
        value: [
          `**Boost Level:** ${guild.premiumTier}`,
          `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
          `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `Server ID: ${guild.id}` })
    .setTimestamp();
  
  // Size buttons
  const sizeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('480')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('sb_480'),
      new ButtonBuilder()
        .setLabel('1024')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('sb_1024'),
      new ButtonBuilder()
        .setLabel('2048')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('sb_2048'),
      new ButtonBuilder()
        .setLabel('4096')
        .setStyle(ButtonStyle.Success)
        .setCustomId('sb_4096')
    );
  
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Open in Browser')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl)
        .setEmoji('🔗')
    );
  
  // Add splash button if exists
  if (guild.splash) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setLabel('Invite Splash')
        .setStyle(ButtonStyle.Link)
        .setURL(guild.splashURL({ size: 4096 }) || '')
        .setEmoji('🎨')
    );
  }
  
  const response = await interaction.editReply({ embeds: [embed], components: [sizeRow, actionRow] });
  
  // Handle size changes
  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('sb_'),
    time: 120000,
  });
  
  collector.on('collect', async (i) => {
    const size = parseInt(i.customId.replace('sb_', '')) as 128 | 256 | 512 | 1024 | 2048 | 4096;
    const newUrl = guild.bannerURL({ size }) || '';
    
    const newEmbed = EmbedBuilder.from(embed)
      .setImage(newUrl)
      .setFields({
        name: '📊 Server Info',
        value: [
          `**Boost Level:** ${guild.premiumTier}`,
          `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
          `**Size:** ${size}px`,
          `**Animated:** ${isAnimated ? '✅ Yes' : '❌ No'}`,
        ].join('\n'),
        inline: true
      });
    
    const newActionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open in Browser')
          .setStyle(ButtonStyle.Link)
          .setURL(newUrl)
          .setEmoji('🔗')
      );
    
    if (guild.splash) {
      newActionRow.addComponents(
        new ButtonBuilder()
          .setLabel('Invite Splash')
          .setStyle(ButtonStyle.Link)
          .setURL(guild.splashURL({ size: 4096 }) || '')
          .setEmoji('🎨')
      );
    }
    
    await i.update({ embeds: [newEmbed], components: [sizeRow, newActionRow] });
  });
  
  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setLabel('480').setStyle(ButtonStyle.Secondary).setCustomId('d1').setDisabled(true),
        new ButtonBuilder().setLabel('1024').setStyle(ButtonStyle.Primary).setCustomId('d2').setDisabled(true),
        new ButtonBuilder().setLabel('2048').setStyle(ButtonStyle.Secondary).setCustomId('d3').setDisabled(true),
        new ButtonBuilder().setLabel('4096').setStyle(ButtonStyle.Success).setCustomId('d4').setDisabled(true)
      );
    await interaction.editReply({ components: [disabledRow, actionRow] }).catch(() => {});
  });
}

export default command;
