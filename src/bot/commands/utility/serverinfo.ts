// ===========================================
// ASTRA BOT - Server Info Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get detailed information about the current server')
    .addStringOption(option =>
      option
        .setName('view')
        .setDescription('What information to view')
        .setRequired(false)
        .addChoices(
          { name: '📊 Overview', value: 'overview' },
          { name: '🔒 Security', value: 'security' },
          { name: '😀 Emotes', value: 'emotes' },
          { name: '🎭 Roles', value: 'roles' }
        )
    )
    .setDMPermission(false),
    
  guildOnly: true,
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const guild = interaction.guild!;
    const view = interaction.options.getString('view') || 'overview';
    
    await interaction.deferReply();
    
    // Fetch full guild data
    await guild.fetch();
    
    let embed: EmbedBuilder;
    
    switch (view) {
      case 'security':
        embed = createSecurityEmbed(guild);
        break;
      case 'emotes':
        embed = createEmotesEmbed(guild);
        break;
      case 'roles':
        embed = createRolesEmbed(guild);
        break;
      default:
        embed = createOverviewEmbed(guild);
    }
    
    // Navigation buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('serverinfo_overview')
          .setLabel('Overview')
          .setStyle(view === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('📊'),
        new ButtonBuilder()
          .setCustomId('serverinfo_security')
          .setLabel('Security')
          .setStyle(view === 'security' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('serverinfo_emotes')
          .setLabel('Emotes')
          .setStyle(view === 'emotes' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('😀'),
        new ButtonBuilder()
          .setCustomId('serverinfo_roles')
          .setLabel('Roles')
          .setStyle(view === 'roles' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🎭')
      );
    
    const response = await interaction.editReply({ embeds: [embed], components: [row] });
    
    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('serverinfo_') && i.user.id === interaction.user.id,
      time: 120000,
    });
    
    collector.on('collect', async (i) => {
      const newView = i.customId.replace('serverinfo_', '');
      
      let newEmbed: EmbedBuilder;
      switch (newView) {
        case 'security':
          newEmbed = createSecurityEmbed(guild);
          break;
        case 'emotes':
          newEmbed = createEmotesEmbed(guild);
          break;
        case 'roles':
          newEmbed = createRolesEmbed(guild);
          break;
        default:
          newEmbed = createOverviewEmbed(guild);
      }
      
      const newRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('serverinfo_overview')
            .setLabel('Overview')
            .setStyle(newView === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📊'),
          new ButtonBuilder()
            .setCustomId('serverinfo_security')
            .setLabel('Security')
            .setStyle(newView === 'security' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('serverinfo_emotes')
            .setLabel('Emotes')
            .setStyle(newView === 'emotes' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('😀'),
          new ButtonBuilder()
            .setCustomId('serverinfo_roles')
            .setLabel('Roles')
            .setStyle(newView === 'roles' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🎭')
        );
      
      await i.update({ embeds: [newEmbed], components: [newRow] });
    });
    
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId('d1').setLabel('Overview').setStyle(ButtonStyle.Secondary).setEmoji('📊').setDisabled(true),
          new ButtonBuilder().setCustomId('d2').setLabel('Security').setStyle(ButtonStyle.Secondary).setEmoji('🔒').setDisabled(true),
          new ButtonBuilder().setCustomId('d3').setLabel('Emotes').setStyle(ButtonStyle.Secondary).setEmoji('😀').setDisabled(true),
          new ButtonBuilder().setCustomId('d4').setLabel('Roles').setStyle(ButtonStyle.Secondary).setEmoji('🎭').setDisabled(true)
        );
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  },
};

function createOverviewEmbed(guild: any): EmbedBuilder {
  const channels = guild.channels.cache;
  const textChannels = channels.filter((c: any) => c.type === ChannelType.GuildText).size;
  const voiceChannels = channels.filter((c: any) => c.type === ChannelType.GuildVoice).size;
  const categories = channels.filter((c: any) => c.type === ChannelType.GuildCategory).size;
  const forumChannels = channels.filter((c: any) => c.type === ChannelType.GuildForum).size;
  const stageChannels = channels.filter((c: any) => c.type === ChannelType.GuildStageVoice).size;
  const threadChannels = channels.filter((c: any) => c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread).size;
  
  const members = guild.memberCount;
  const botCount = guild.members.cache.filter((m: any) => m.user.bot).size;
  const onlineMembers = guild.approximatePresenceCount || 0;
  
  const boostLevel = guild.premiumTier;
  const boostCount = guild.premiumSubscriptionCount || 0;
  const boostProgress = getBoostProgress(boostLevel, boostCount);
  
  const embed = new EmbedBuilder()
    .setColor(guild.members.me?.displayHexColor || EMBED_COLORS.info)
    .setAuthor({ 
      name: guild.name, 
      iconURL: guild.iconURL({ dynamic: true }) || undefined 
    })
    .setThumbnail(guild.iconURL({ size: 512, dynamic: true }) || null)
    .setDescription(guild.description || '*No server description*')
    .addFields(
      { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
      { 
        name: `👥 Members (${members.toLocaleString()})`, 
        value: [
          `👤 **Humans:** ${(members - botCount).toLocaleString()}`,
          `🤖 **Bots:** ${botCount.toLocaleString()}`,
          onlineMembers > 0 ? `🟢 **Online:** ~${onlineMembers.toLocaleString()}` : null
        ].filter(Boolean).join('\n'), 
        inline: true 
      },
      { 
        name: `📁 Channels (${channels.size})`, 
        value: [
          `💬 **Text:** ${textChannels}`,
          `🔊 **Voice:** ${voiceChannels}`,
          categories > 0 ? `📂 **Categories:** ${categories}` : null,
          forumChannels > 0 ? `📋 **Forums:** ${forumChannels}` : null,
          stageChannels > 0 ? `🎭 **Stages:** ${stageChannels}` : null,
          threadChannels > 0 ? `🧵 **Threads:** ${threadChannels}` : null
        ].filter(Boolean).join('\n'), 
        inline: true 
      },
      { 
        name: '📊 Stats', 
        value: [
          `🎭 **Roles:** ${guild.roles.cache.size}`,
          `😀 **Emojis:** ${guild.emojis.cache.size}`,
          `🎨 **Stickers:** ${guild.stickers.cache.size}`,
        ].join('\n'),
        inline: true 
      },
      { 
        name: `💎 Server Boost`, 
        value: [
          `**Level:** ${boostLevel} ${getBoostEmoji(boostLevel)}`,
          `**Boosts:** ${boostCount}`,
          boostProgress
        ].join('\n'),
        inline: true 
      }
    );
  
  // Add vanity URL if exists
  if (guild.vanityURLCode) {
    embed.addFields({
      name: '🔗 Vanity URL',
      value: `discord.gg/${guild.vanityURLCode}`,
      inline: true
    });
  }
  
  // Add banner if exists
  if (guild.banner) {
    embed.setImage(guild.bannerURL({ size: 1024 }) || null);
  }
  
  embed.setFooter({ text: `Shard ${guild.shardId}` });
  embed.setTimestamp();
  
  return embed;
}

function createSecurityEmbed(guild: any): EmbedBuilder {
  const verificationLevels: Record<number, string> = {
    0: '🔓 None - Unrestricted',
    1: '📧 Low - Email verified',
    2: '⏰ Medium - 5 min account age',
    3: '📱 High - 10 min member',
    4: '📞 Highest - Phone verified'
  };
  
  const contentFilters: Record<number, string> = {
    0: '❌ Disabled',
    1: '⚠️ Members without roles',
    2: '✅ All members'
  };
  
  const nsfwLevels: Record<number, string> = {
    0: '🔘 Default',
    1: '🔞 Explicit',
    2: '✅ Safe',
    3: '⚠️ Age Restricted'
  };
  
  const mfaLevels: Record<number, string> = {
    0: '❌ Not required',
    1: '✅ Required for moderation'
  };
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ 
      name: `${guild.name} - Security`, 
      iconURL: guild.iconURL({ dynamic: true }) || undefined 
    })
    .setThumbnail(guild.iconURL({ size: 256, dynamic: true }) || null)
    .addFields(
      { 
        name: '🔒 Verification Level', 
        value: verificationLevels[guild.verificationLevel] || 'Unknown', 
        inline: true 
      },
      { 
        name: '🛡️ Content Filter', 
        value: contentFilters[guild.explicitContentFilter] || 'Unknown', 
        inline: true 
      },
      { 
        name: '🔐 2FA Requirement', 
        value: mfaLevels[guild.mfaLevel] || 'Unknown', 
        inline: true 
      },
      { 
        name: '🔞 NSFW Level', 
        value: nsfwLevels[guild.nsfwLevel] || 'Unknown', 
        inline: true 
      },
      {
        name: '📝 System Channel',
        value: guild.systemChannelId ? `<#${guild.systemChannelId}>` : 'Not set',
        inline: true
      },
      {
        name: '📢 Rules Channel',
        value: guild.rulesChannelId ? `<#${guild.rulesChannelId}>` : 'Not set',
        inline: true
      }
    );
  
  // Security features
  const securityFeatures = [];
  if (guild.features.includes('COMMUNITY')) securityFeatures.push('✅ Community Server');
  if (guild.features.includes('VERIFIED')) securityFeatures.push('✅ Verified');
  if (guild.features.includes('PARTNERED')) securityFeatures.push('✅ Partnered');
  if (guild.features.includes('DISCOVERABLE')) securityFeatures.push('✅ Discoverable');
  if (guild.features.includes('WELCOME_SCREEN_ENABLED')) securityFeatures.push('✅ Welcome Screen');
  if (guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED')) securityFeatures.push('✅ Membership Screening');
  
  if (securityFeatures.length > 0) {
    embed.addFields({
      name: '✨ Security Features',
      value: securityFeatures.join('\n'),
      inline: false
    });
  }
  
  embed.setTimestamp();
  return embed;
}

function createEmotesEmbed(guild: any): EmbedBuilder {
  const emojis = guild.emojis.cache;
  const stickers = guild.stickers.cache;
  
  const staticEmojis = emojis.filter((e: any) => !e.animated);
  const animatedEmojis = emojis.filter((e: any) => e.animated);
  
  // Get boost limits
  const emojiLimits: Record<number, number> = { 0: 50, 1: 100, 2: 150, 3: 250 };
  const stickerLimits: Record<number, number> = { 0: 5, 1: 15, 2: 30, 3: 60 };
  const emojiLimit = emojiLimits[guild.premiumTier] || 50;
  const stickerLimit = stickerLimits[guild.premiumTier] || 5;
  
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setAuthor({ 
      name: `${guild.name} - Emotes & Stickers`, 
      iconURL: guild.iconURL({ dynamic: true }) || undefined 
    })
    .setThumbnail(guild.iconURL({ size: 256, dynamic: true }) || null)
    .addFields(
      {
        name: '😀 Emoji Stats',
        value: [
          `**Total:** ${emojis.size}/${emojiLimit * 2}`,
          `**Static:** ${staticEmojis.size}/${emojiLimit}`,
          `**Animated:** ${animatedEmojis.size}/${emojiLimit}`,
        ].join('\n'),
        inline: true
      },
      {
        name: '🎨 Sticker Stats',
        value: [
          `**Total:** ${stickers.size}/${stickerLimit}`,
          `**Slots Used:** ${Math.round((stickers.size / stickerLimit) * 100)}%`,
        ].join('\n'),
        inline: true
      }
    );
  
  // Show some emojis
  if (emojis.size > 0) {
    const sampleEmojis = emojis.first(15).map((e: any) => e.toString()).join(' ');
    embed.addFields({
      name: `📦 Sample Emojis (${Math.min(15, emojis.size)} of ${emojis.size})`,
      value: sampleEmojis || 'None',
      inline: false
    });
  }
  
  // Show stickers
  if (stickers.size > 0) {
    const stickerList = stickers.first(10).map((s: any) => `\`${s.name}\``).join(', ');
    embed.addFields({
      name: `🎨 Stickers (${Math.min(10, stickers.size)} of ${stickers.size})`,
      value: stickerList || 'None',
      inline: false
    });
  }
  
  embed.setTimestamp();
  return embed;
}

function createRolesEmbed(guild: any): EmbedBuilder {
  const roles = guild.roles.cache
    .filter((r: any) => r.id !== guild.id)
    .sort((a: any, b: any) => b.position - a.position);
  
  const adminRoles = roles.filter((r: any) => r.permissions.has('Administrator'));
  const modRoles = roles.filter((r: any) => 
    r.permissions.has('ModerateMembers') || 
    r.permissions.has('KickMembers') || 
    r.permissions.has('BanMembers')
  );
  const botRoles = roles.filter((r: any) => r.managed);
  const coloredRoles = roles.filter((r: any) => r.color !== 0);
  const hoistedRoles = roles.filter((r: any) => r.hoist);
  
  const embed = new EmbedBuilder()
    .setColor(0x99AAB5)
    .setAuthor({ 
      name: `${guild.name} - Roles`, 
      iconURL: guild.iconURL({ dynamic: true }) || undefined 
    })
    .setThumbnail(guild.iconURL({ size: 256, dynamic: true }) || null)
    .addFields(
      {
        name: '📊 Role Statistics',
        value: [
          `**Total Roles:** ${roles.size}`,
          `**Admin Roles:** ${adminRoles.size}`,
          `**Mod Roles:** ${modRoles.size}`,
          `**Bot Roles:** ${botRoles.size}`,
          `**Colored:** ${coloredRoles.size}`,
          `**Hoisted:** ${hoistedRoles.size}`,
        ].join('\n'),
        inline: true
      },
      {
        name: '👑 Top Roles',
        value: roles.first(5).map((r: any) => `${r}`).join('\n') || 'None',
        inline: true
      }
    );
  
  // Admin roles
  if (adminRoles.size > 0) {
    embed.addFields({
      name: '🔴 Admin Roles',
      value: adminRoles.first(8).map((r: any) => r.toString()).join(', '),
      inline: false
    });
  }
  
  // All roles (truncated)
  const allRoles = roles.first(30).map((r: any) => r.toString()).join(' ');
  embed.addFields({
    name: `🎭 All Roles (${Math.min(30, roles.size)} of ${roles.size})`,
    value: allRoles || 'No roles',
    inline: false
  });
  
  embed.setTimestamp();
  return embed;
}

function getBoostProgress(level: number, boosts: number): string {
  const nextLevel: Record<number, number> = { 0: 2, 1: 7, 2: 14, 3: Infinity };
  const next = nextLevel[level];
  if (next === Infinity) return '🎉 **Max Level!**';
  return `📈 ${boosts}/${next} to Level ${level + 1}`;
}

function getBoostEmoji(level: number): string {
  const emojis = ['', '🌸', '🌺', '💮'];
  return emojis[level] || '';
}

export default command;
