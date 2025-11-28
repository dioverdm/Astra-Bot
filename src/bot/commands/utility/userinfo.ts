// ===========================================
// ASTRA BOT - User Info Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PresenceStatus
} from 'discord.js';
import { EMBED_COLORS, EMOJIS } from '../../../shared/constants/index.js';
import { UserLevel, UserEconomy } from '../../../database/models/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Badge emojis with better icons
const BADGE_EMOJIS: Record<string, { emoji: string; name: string }> = {
  'Staff': { emoji: '<:staff:1234567890>', name: '⚡ Discord Staff' },
  'Partner': { emoji: '<:partner:1234567890>', name: '🤝 Partnered Server Owner' },
  'Hypesquad': { emoji: '🎉', name: 'HypeSquad Events' },
  'BugHunterLevel1': { emoji: '🐛', name: 'Bug Hunter Level 1' },
  'BugHunterLevel2': { emoji: '🐛🐛', name: 'Bug Hunter Level 2' },
  'HypeSquadOnlineHouse1': { emoji: '🏠', name: 'HypeSquad Bravery' },
  'HypeSquadOnlineHouse2': { emoji: '💎', name: 'HypeSquad Brilliance' },
  'HypeSquadOnlineHouse3': { emoji: '⚖️', name: 'HypeSquad Balance' },
  'PremiumEarlySupporter': { emoji: '👑', name: 'Early Supporter' },
  'VerifiedDeveloper': { emoji: '🔧', name: 'Early Verified Bot Developer' },
  'CertifiedModerator': { emoji: '🛡️', name: 'Discord Certified Moderator' },
  'ActiveDeveloper': { emoji: '💻', name: 'Active Developer' },
  'VerifiedBot': { emoji: '✅', name: 'Verified Bot' },
  'BotHTTPInteractions': { emoji: '🔗', name: 'HTTP Interactions' },
  'Nitro': { emoji: '💜', name: 'Nitro Subscriber' },
  'Quarantined': { emoji: '⚠️', name: 'Quarantined' },
};

// Status emojis
const STATUS_EMOJIS: Record<PresenceStatus | string, string> = {
  'online': '🟢',
  'idle': '🌙',
  'dnd': '⛔',
  'offline': '⚫',
  'invisible': '⚫',
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get detailed information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get info about (defaults to yourself)')
        .setRequired(false)
    ),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    await interaction.deferReply();
    
    // Fetch full user data for banner
    const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true });
    
    // Get member data if in guild
    let member: GuildMember | null = null;
    if (interaction.guild) {
      member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    }
    
    // Get level and economy data
    let levelData = null;
    let economyData = null;
    if (interaction.guild) {
      levelData = await UserLevel.findOne({ 
        guildId: interaction.guild.id, 
        odiscordId: targetUser.id 
      });
      economyData = await UserEconomy.findOne({ 
        guildId: interaction.guild.id, 
        odiscordId: targetUser.id 
      });
    }
    
    // Build badges
    const badges: string[] = [];
    const flags = fullUser.flags?.toArray() || [];
    
    flags.forEach(flag => {
      const badge = BADGE_EMOJIS[flag];
      if (badge) badges.push(badge.emoji);
    });
    
    // Add bot badge
    if (fullUser.bot) badges.unshift('🤖');
    
    // Add nitro badge if has animated avatar or banner
    if ((fullUser.avatar?.startsWith('a_') || fullUser.banner) && !fullUser.bot) {
      badges.push('💜');
    }
    
    // Determine user type with hierarchy
    let userType = '👤 User';
    let userTypeColor = EMBED_COLORS.info;
    
    if (fullUser.bot) {
      userType = '🤖 Bot';
      userTypeColor = 0x5865F2;
    }
    if (member) {
      if (interaction.guild?.ownerId === targetUser.id) {
        userType = '👑 Server Owner';
        userTypeColor = 0xF1C40F;
      } else if (member.permissions.has('Administrator')) {
        userType = '⚙️ Administrator';
        userTypeColor = 0xED4245;
      } else if (member.permissions.has('ModerateMembers') || member.permissions.has('KickMembers')) {
        userType = '🛡️ Moderator';
        userTypeColor = 0xE67E22;
      }
    }
    
    // Get presence/status
    const presence = member?.presence;
    const status = presence?.status || 'offline';
    const statusEmoji = STATUS_EMOJIS[status] || '⚫';
    const activities = presence?.activities || [];
    
    // Build embed
    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || fullUser.accentColor || userTypeColor)
      .setAuthor({ 
        name: `${fullUser.globalName || fullUser.username}`, 
        iconURL: fullUser.displayAvatarURL({ size: 128 }) 
      })
      .setThumbnail(member?.displayAvatarURL({ size: 512 }) || fullUser.displayAvatarURL({ size: 512 }))
      .setDescription([
        badges.length > 0 ? badges.join(' ') : null,
        member?.nickname ? `**Nickname:** ${member.nickname}` : null
      ].filter(Boolean).join('\n') || null)
      .addFields(
        { name: '👤 Username', value: `\`${fullUser.username}\``, inline: true },
        { name: '🆔 User ID', value: `\`${fullUser.id}\``, inline: true },
        { name: '📋 Type', value: userType, inline: true },
        { 
          name: '📅 Account Created', 
          value: `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:D>\n<t:${Math.floor(fullUser.createdTimestamp / 1000)}:R>`, 
          inline: true 
        }
      );
    
    // Add member-specific fields
    if (member) {
      embed.addFields(
        { 
          name: '📥 Joined Server', 
          value: member.joinedTimestamp 
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` 
            : 'Unknown', 
          inline: true 
        },
        { 
          name: `${statusEmoji} Status`, 
          value: status.charAt(0).toUpperCase() + status.slice(1), 
          inline: true 
        }
      );
      
      // Roles
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild?.id)
        .sort((a, b) => b.position - a.position);
      
      if (roles.size > 0) {
        const roleList = roles.size > 10 
          ? `${roles.first(10)?.map(r => r.toString()).join(' ')} +${roles.size - 10} more`
          : roles.map(r => r.toString()).join(' ');
        
        embed.addFields({
          name: `🎭 Roles (${roles.size})`,
          value: roleList,
          inline: false
        });
      }
      
      // Voice state
      if (member.voice.channel) {
        const voice = member.voice;
        const voiceStatus = [];
        if (voice.selfMute) voiceStatus.push('🔇 Muted');
        if (voice.selfDeaf) voiceStatus.push('🔕 Deafened');
        if (voice.streaming) voiceStatus.push('📺 Streaming');
        if (voice.selfVideo) voiceStatus.push('📹 Video');
        
        embed.addFields({
          name: '🔊 Voice',
          value: [
            `**Channel:** ${voice.channel}`,
            voiceStatus.length > 0 ? voiceStatus.join(' • ') : null
          ].filter(Boolean).join('\n'),
          inline: false
        });
      }
      
      // Activity/Playing
      if (activities.length > 0) {
        const mainActivity = activities[0];
        const activityTypes: Record<number, string> = {
          0: '🎮 Playing',
          1: '📡 Streaming',
          2: '🎧 Listening to',
          3: '📺 Watching',
          4: '✏️ Custom',
          5: '🏆 Competing in'
        };
        
        const activityType = activityTypes[mainActivity.type] || '🎮';
        const activityName = mainActivity.type === 4 
          ? mainActivity.state || 'Custom Status'
          : mainActivity.name;
        
        embed.addFields({
          name: activityType,
          value: activityName + (mainActivity.details ? `\n${mainActivity.details}` : ''),
          inline: true
        });
      }
      
      // Timeout status
      if (member.communicationDisabledUntil) {
        const timeoutUntil = member.communicationDisabledUntil;
        if (timeoutUntil > new Date()) {
          embed.addFields({
            name: '⏰ Timed Out',
            value: `Until <t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`,
            inline: true
          });
        }
      }
      
      // Boosting
      if (member.premiumSince) {
        embed.addFields({
          name: '💎 Boosting Since',
          value: `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`,
          inline: true
        });
      }
    }
    
    // Add Astra stats
    if (levelData || economyData) {
      const statsLine = [];
      
      if (levelData) {
        statsLine.push(`📊 **Level ${levelData.level}** • ${levelData.xp?.toLocaleString() || 0} XP`);
      }
      
      if (economyData) {
        const total = (economyData.balance || 0) + (economyData.bank || 0);
        statsLine.push(`${EMOJIS.coin} **${total.toLocaleString()}** coins`);
      }
      
      if (statsLine.length > 0) {
        embed.addFields({
          name: '⭐ Astra Stats',
          value: statsLine.join(' • '),
          inline: false
        });
      }
    }
    
    // Add banner if exists
    if (fullUser.banner) {
      const bannerUrl = `https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}${fullUser.banner.startsWith('a_') ? '.gif' : '.png'}?size=512`;
      embed.setImage(bannerUrl);
    }
    
    embed.setFooter({ text: `Requested by ${interaction.user.username}` });
    embed.setTimestamp();
    
    // Action buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(fullUser.displayAvatarURL({ size: 4096 }))
          .setEmoji('🖼️'),
        new ButtonBuilder()
          .setLabel('Discord Profile')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${fullUser.id}`)
          .setEmoji('👤')
      );
    
    // Add dashboard profile link if in a guild
    if (interaction.guild) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://astra.novaplex.xyz/dashboard/guild/${interaction.guild.id}/member/${fullUser.id}`)
          .setEmoji('📊')
      );
    }
    
    // Add banner button if exists
    if (fullUser.banner) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Banner')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}${fullUser.banner.startsWith('a_') ? '.gif' : '.png'}?size=4096`)
          .setEmoji('🎨')
      );
    }
    
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
