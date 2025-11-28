// ===========================================
// ASTRA BOT - Guild Routes
// ===========================================

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { isAuthenticated, canManageGuild } from '../middleware/auth.js';
import { GuildConfig, ModerationLog, UserLevel, UserEconomy } from '../../database/models/index.js';
import { DISCORD_API_BASE } from '../../shared/constants/index.js';
import { logger } from '../../shared/utils/logger.js';
import type { DiscordGuild } from '../../shared/types/index.js';

const router = Router();

// Get user's guilds (with bot presence check)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    // Fetch user's guilds from Discord
    const response = await axios.get<DiscordGuild[]>(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    
    const guilds = response.data;
    
    // Filter guilds where user has MANAGE_GUILD permission
    const MANAGE_GUILD = BigInt(0x20);
    const ADMINISTRATOR = BigInt(0x8);
    
    const manageableGuilds = guilds.filter(guild => {
      const permissions = BigInt(guild.permissions);
      return guild.owner || 
             (permissions & MANAGE_GUILD) === MANAGE_GUILD || 
             (permissions & ADMINISTRATOR) === ADMINISTRATOR;
    });
    
    // Check which guilds have the bot
    const guildConfigs = await GuildConfig.find({
      guildId: { $in: manageableGuilds.map(g => g.id) },
    }).lean();
    
    const configuredGuildIds = new Set(guildConfigs.map(c => c.guildId));
    
    // Format response
    const formattedGuilds = manageableGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null,
      owner: guild.owner,
      hasBot: configuredGuildIds.has(guild.id),
    }));
    
    res.json({
      success: true,
      data: formattedGuilds,
    });
  } catch (error) {
    logger.error('Error fetching guilds:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch guilds' 
    });
  }
});

// Get guild configuration
router.get('/:guildId', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    let config = await GuildConfig.findOne({ guildId });
    
    if (!config) {
      // Return default config structure
      res.json({
        success: true,
        data: {
          guildId,
          configured: false,
          modules: {
            moderation: true,
            leveling: true,
            economy: true,
            welcome: false,
            tickets: false,
            music: true,
            fun: true,
          },
        },
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        ...config.toObject(),
        configured: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching guild config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch guild configuration' 
    });
  }
});

// Update guild configuration
router.patch('/:guildId', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;
    
    // Remove protected fields
    delete updates._id;
    delete updates.guildId;
    delete updates.createdAt;
    
    // Get guild name from cache
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    const guildName = cachedGuild?.name || (req as any).guild?.name || 'Unknown';
    
    // Use findOneAndUpdate with $set to handle legacy boolean data
    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      { 
        $set: { 
          ...updates,
          guildName,
        }
      },
      { 
        new: true, 
        upsert: true,
        runValidators: false,
      }
    );
    
    res.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    logger.error('Error updating guild config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update guild configuration' 
    });
  }
});

// Update specific module settings
router.patch('/:guildId/modules/:module', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, module } = req.params;
    const moduleSettings = req.body;
    
    const validModules = ['moderation', 'leveling', 'economy', 'welcome', 'tickets', 'automod', 'music', 'giveaway', 'logging'];
    if (!validModules.includes(module)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid module name' 
      });
      return;
    }
    
    // Use findOneAndUpdate to avoid loading issues with legacy boolean data
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    const guildName = cachedGuild?.name || (req as any).guild?.name || 'Unknown';
    
    try {
      const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { 
          $set: { 
            [module]: moduleSettings,
            guildName,
          }
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true,
        }
      );
      
      if (!config) {
        res.status(500).json({ success: false, error: 'Failed to update config' });
        return;
      }
      
      res.json({
        success: true,
        data: (config as any)[module],
        message: `${module} settings updated successfully`,
      });
    } catch (saveError: any) {
      if (saveError?.name === 'ValidationError') {
        const errorMessages = Object.entries(saveError?.errors || {})
          .map(([field, err]: [string, any]) => `${field}: ${err?.message}`)
          .join(', ');
        res.status(400).json({ 
          success: false, 
          error: `Validation error: ${errorMessages || saveError?.message}` 
        });
        return;
      }
      throw saveError;
    }
  } catch (error: any) {
    logger.error('Error updating module settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update module settings' 
    });
  }
});

// Get guild info from Discord (for dashboard header)
router.get('/:guildId/info', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  
  // Default placeholder data
  const placeholderData = {
    id: guildId,
    name: 'Server',
    icon: null,
    banner: null,
    memberCount: 0,
    onlineCount: 0,
    channelCount: 0,
    roleCount: 0,
    emojiCount: 0,
    boostCount: 0,
    boostTier: 0,
    ownerId: null,
    createdAt: null,
    description: null,
    vanityUrl: null,
    features: [],
  };
  
  try {
    // Try to get from bot cache first
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    
    if (cachedGuild && cachedGuild.available) {
      // Count online members if presence intent is available
      let onlineCount = 0;
      try {
        onlineCount = cachedGuild.members?.cache?.filter((m: any) => 
          m.presence?.status && m.presence.status !== 'offline'
        )?.size || 0;
      } catch {
        onlineCount = 0;
      }
      
      res.json({
        success: true,
        data: {
          id: cachedGuild.id,
          name: cachedGuild.name,
          icon: cachedGuild.icon,
          banner: cachedGuild.banner,
          memberCount: cachedGuild.memberCount || 0,
          onlineCount,
          channelCount: cachedGuild.channels?.cache?.size || 0,
          roleCount: cachedGuild.roles?.cache?.size || 0,
          emojiCount: cachedGuild.emojis?.cache?.size || 0,
          boostCount: cachedGuild.premiumSubscriptionCount || 0,
          boostTier: cachedGuild.premiumTier || 0,
          ownerId: cachedGuild.ownerId,
          createdAt: cachedGuild.createdAt?.toISOString(),
          description: cachedGuild.description,
          vanityUrl: cachedGuild.vanityURLCode,
          features: cachedGuild.features || [],
        },
      });
      return;
    }
    
    // Fallback to Discord API
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      res.json({ success: true, data: placeholderData });
      return;
    }
    
    const headers = { Authorization: `Bot ${token}` };
    
    const [guildRes, channelsRes, rolesRes] = await Promise.allSettled([
      axios.get(`${DISCORD_API_BASE}/guilds/${guildId}?with_counts=true`, { headers }),
      axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, { headers }),
      axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, { headers }),
    ]);
    
    if (guildRes.status === 'rejected') {
      res.json({ success: true, data: placeholderData });
      return;
    }
    
    const guild = guildRes.value.data;
    const channels = channelsRes.status === 'fulfilled' ? channelsRes.value.data : [];
    const roles = rolesRes.status === 'fulfilled' ? rolesRes.value.data : [];
    
    res.json({
      success: true,
      data: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        banner: guild.banner,
        memberCount: guild.approximate_member_count || 0,
        onlineCount: guild.approximate_presence_count || 0,
        channelCount: channels.length,
        roleCount: roles.length,
        emojiCount: guild.emojis?.length || 0,
        boostCount: guild.premium_subscription_count || 0,
        boostTier: guild.premium_tier || 0,
        ownerId: guild.owner_id,
        createdAt: guild.id ? new Date(Number(BigInt(guild.id) >> BigInt(22)) + 1420070400000).toISOString() : null,
        description: guild.description,
        vanityUrl: guild.vanity_url_code,
        features: guild.features || [],
      },
    });
  } catch (error: any) {
    logger.error('Error fetching guild info:', error?.message || error);
    res.json({ success: true, data: placeholderData });
  }
});

// Get guild channels
router.get('/:guildId/channels', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Try to get from bot cache first
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    
    if (cachedGuild?.channels?.cache) {
      const channels = Array.from(cachedGuild.channels.cache.values())
        .filter((c: any) => [0, 2, 4, 5, 15].includes(c.type))
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId || c.parent_id || null,
          position: c.position || 0,
        }))
        .sort((a: any, b: any) => a.position - b.position);
      
      res.json({ success: true, data: channels });
      return;
    }
    
    // Fallback to Discord API using bot token
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      res.json({ success: true, data: [] });
      return;
    }
    
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    
    // Format and filter channels
    const channels = response.data
      .filter((c: any) => [0, 2, 4, 5, 15].includes(c.type)) // Text, Voice, Category, Announcement, Forum
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id,
        position: c.position,
      }))
      .sort((a: any, b: any) => a.position - b.position);
    
    res.json({
      success: true,
      data: channels,
    });
  } catch (error: any) {
    logger.error('Error fetching guild channels:', error?.message || error);
    // Return empty array on error instead of 500
    res.json({ success: true, data: [] });
  }
});

// Get guild roles
router.get('/:guildId/discord-roles', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Try to get from bot cache first
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    
    if (cachedGuild?.roles?.cache) {
      const roles = Array.from(cachedGuild.roles.cache.values())
        .filter((r: any) => r.id !== guildId)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          position: r.position,
          managed: r.managed,
          memberCount: r.members?.size || 0,
        }))
        .sort((a: any, b: any) => b.position - a.position);
      
      res.json({ success: true, data: roles });
      return;
    }
    
    // Fallback to Discord API
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      // Return empty array if no token
      res.json({ success: true, data: [] });
      return;
    }
    
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });
    
    // Format roles (exclude @everyone)
    const roles = response.data
      .filter((r: any) => r.id !== guildId)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        managed: r.managed,
      }))
      .sort((a: any, b: any) => b.position - a.position);
    
    res.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    logger.error('Error fetching guild roles:', error?.message || error);
    // Return empty array on error instead of 500
    res.json({ success: true, data: [] });
  }
});

// Get guild emojis
router.get('/:guildId/discord-emojis', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Try to get from bot cache first
    const client = (global as any).discordClient;
    const cachedGuild = client?.guilds?.cache?.get(guildId);
    
    if (cachedGuild?.emojis?.cache) {
      const emojis = Array.from(cachedGuild.emojis.cache.values())
        .filter((e: any) => e.available !== false)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          animated: e.animated || false,
          available: e.available !== false,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      res.json({ success: true, data: emojis });
      return;
    }
    
    // Fallback to Discord API
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      res.json({ success: true, data: [] });
      return;
    }
    
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${token}` },
    });
    
    const emojis = response.data
      .filter((e: any) => e.available !== false)
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        animated: e.animated || false,
        available: e.available !== false,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      data: emojis,
    });
  } catch (error: any) {
    logger.error('Error fetching guild emojis:', error?.message || error);
    // Return empty array on error instead of 500
    res.json({ success: true, data: [] });
  }
});

// Get guild members with level/economy data
router.get('/:guildId/members', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const user = req.user!;
    
    // Fetch members from Discord API
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/members?limit=1000`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      },
    });
    
    const members = response.data.map((member: any) => ({
      id: member.user.id,
      odiscordId: member.user.id,
      username: member.user.username,
      avatar: member.user.avatar,
      roles: member.roles,
      joinedAt: member.joined_at,
      isOwner: false, // Would need guild owner check
      isAdmin: member.roles.some((r: string) => r === guildId), // Simplified
    }));
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    logger.error('Error fetching guild members:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch members' 
    });
  }
});

// Toggle module enabled/disabled
router.post('/:guildId/modules/:module/toggle', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, module } = req.params;
    const { enabled } = req.body;
    
    const validModules = ['moderation', 'leveling', 'economy', 'welcome', 'tickets', 'music', 'fun', 'logging', 'starboard', 'giveaways'];
    if (!validModules.includes(module)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid module name' 
      });
      return;
    }
    
    let config = await GuildConfig.findOne({ guildId });
    
    if (!config) {
      const guild = (req as any).guild;
      config = await GuildConfig.create({
        guildId,
        guildName: guild?.name || 'Unknown',
      });
    }
    
    config.modules[module as keyof typeof config.modules] = enabled;
    await config.save();
    
    res.json({
      success: true,
      data: { module, enabled },
      message: `${module} ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Error toggling module:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle module' 
    });
  }
});

// ==========================================
// MEMBER PROFILE ENDPOINT
// ==========================================

// Get detailed member profile
router.get('/:guildId/members/:memberId/profile', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    // Fetch member from Discord
    let member;
    try {
      member = await guild.members.fetch(memberId);
    } catch {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    // Fetch full user data (includes banner)
    let fullUser;
    try {
      fullUser = await client.users.fetch(memberId, { force: true });
    } catch {
      fullUser = member.user;
    }
    
    // Get level data
    const levelData = await UserLevel.findOne({ guildId, discordId: memberId });
    const xpNeeded = levelData ? Math.floor(100 * Math.pow(1.5, levelData.level)) : 100;
    
    // Get rank
    let rank = null;
    if (levelData) {
      rank = await UserLevel.countDocuments({
        guildId,
        $or: [
          { level: { $gt: levelData.level } },
          { level: levelData.level, xp: { $gt: levelData.xp } },
        ],
      }) + 1;
    }
    
    // Get economy data
    const economyData = await UserEconomy.findOne({ guildId, discordId: memberId });
    
    // Get moderation history
    const modHistory = await ModerationLog.find({ guildId, targetId: memberId })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
    
    // Format roles
    const roles = Array.from(member.roles.cache.values())
      .filter((r: any) => r.id !== guildId)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
      }))
      .sort((a: any, b: any) => b.color - a.color);
    
    // Check if owner/admin
    const isOwner = guild.ownerId === memberId;
    const isAdmin = member.permissions.has('Administrator');
    
    // Build profile
    const profile = {
      id: member.id,
      odiscordId: fullUser.id,
      username: fullUser.username,
      globalName: fullUser.globalName,
      avatar: fullUser.avatar,
      banner: fullUser.banner,
      accentColor: fullUser.accentColor,
      roles,
      joinedAt: member.joinedAt?.toISOString(),
      createdAt: fullUser.createdAt?.toISOString(),
      level: levelData?.level || 0,
      xp: levelData?.xp || 0,
      totalXp: levelData?.totalXp || 0,
      xpNeeded,
      rank,
      messages: levelData?.messages || 0,
      balance: economyData?.balance || 0,
      bank: economyData?.bank || 0,
      isOwner,
      isAdmin,
      isMuted: member.voice?.mute || false,
      isDeafened: member.voice?.deaf || false,
      modHistory: modHistory.map((m: any) => ({
        action: m.action,
        reason: m.reason,
        moderator: m.moderatorId || 'System',
        createdAt: m.timestamp || m.createdAt,
        duration: m.duration,
      })),
      warnings: modHistory.filter((m: any) => m.action === 'warn').map((w: any) => ({
        id: w._id,
        reason: w.reason,
        moderator: w.moderatorId || 'System',
        createdAt: w.timestamp || w.createdAt,
      })),
    };
    
    res.json({ success: true, data: profile });
  } catch (error: any) {
    logger.error('Error fetching member profile:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch member profile' });
  }
});

// ==========================================
// MEMBER ACTION ENDPOINTS
// ==========================================

// Timeout member
router.post('/:guildId/members/:memberId/timeout', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    const { duration, reason } = req.body;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    const member = await guild.members.fetch(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    await member.timeout(duration * 1000, reason || 'No reason provided');
    
    // Log to moderation log
    const caseId = await (ModerationLog as any).getNextCaseId(guildId);
    await ModerationLog.create({
      guildId,
      caseId,
      targetId: memberId,
      moderatorId: req.user!.discordId,
      action: 'timeout',
      reason: reason || 'No reason provided',
      duration,
    });
    
    res.json({ success: true, message: 'Member timed out' });
  } catch (error: any) {
    logger.error('Error timing out member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to timeout member' });
  }
});

// Kick member
router.post('/:guildId/members/:memberId/kick', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    const { reason } = req.body;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    const member = await guild.members.fetch(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    await member.kick(reason || 'No reason provided');
    
    const caseId = await (ModerationLog as any).getNextCaseId(guildId);
    await ModerationLog.create({
      guildId,
      caseId,
      targetId: memberId,
      moderatorId: req.user!.discordId,
      action: 'kick',
      reason: reason || 'No reason provided',
    });
    
    res.json({ success: true, message: 'Member kicked' });
  } catch (error: any) {
    logger.error('Error kicking member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to kick member' });
  }
});

// Ban member
router.post('/:guildId/members/:memberId/ban', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    const { reason, deleteMessageDays } = req.body;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    await guild.members.ban(memberId, {
      reason: reason || 'No reason provided',
      deleteMessageSeconds: (deleteMessageDays || 0) * 86400,
    });
    
    const caseId = await (ModerationLog as any).getNextCaseId(guildId);
    await ModerationLog.create({
      guildId,
      caseId,
      targetId: memberId,
      moderatorId: req.user!.discordId,
      action: 'ban',
      reason: reason || 'No reason provided',
    });
    
    res.json({ success: true, message: 'Member banned' });
  } catch (error: any) {
    logger.error('Error banning member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to ban member' });
  }
});

// Warn member
router.post('/:guildId/members/:memberId/warn', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    const { reason } = req.body;
    
    const caseId = await (ModerationLog as any).getNextCaseId(guildId);
    await ModerationLog.create({
      guildId,
      caseId,
      targetId: memberId,
      moderatorId: req.user!.discordId,
      action: 'warn',
      reason: reason || 'No reason provided',
    });
    
    res.json({ success: true, message: 'Member warned' });
  } catch (error: any) {
    logger.error('Error warning member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to warn member' });
  }
});

// Change nickname
router.post('/:guildId/members/:memberId/nickname', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    const { nickname } = req.body;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    const member = await guild.members.fetch(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    await member.setNickname(nickname || null);
    
    res.json({ success: true, message: 'Nickname updated' });
  } catch (error: any) {
    logger.error('Error changing nickname:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to change nickname' });
  }
});

// Server mute
router.post('/:guildId/members/:memberId/mute', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    const member = await guild.members.fetch(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    await member.voice.setMute(!member.voice.mute);
    
    res.json({ success: true, message: member.voice.mute ? 'Member muted' : 'Member unmuted' });
  } catch (error: any) {
    logger.error('Error muting member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to mute member' });
  }
});

// Server deafen
router.post('/:guildId/members/:memberId/deafen', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) {
      res.status(404).json({ success: false, error: 'Guild not found' });
      return;
    }
    
    const member = await guild.members.fetch(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    
    await member.voice.setDeaf(!member.voice.deaf);
    
    res.json({ success: true, message: member.voice.deaf ? 'Member deafened' : 'Member undeafened' });
  } catch (error: any) {
    logger.error('Error deafening member:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to deafen member' });
  }
});

// Reset XP/Level
router.post('/:guildId/members/:memberId/reset-xp', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    
    await UserLevel.findOneAndUpdate(
      { guildId, discordId: memberId },
      { $set: { level: 0, xp: 0, totalXp: 0, messages: 0 } }
    );
    
    res.json({ success: true, message: 'XP and level reset' });
  } catch (error: any) {
    logger.error('Error resetting XP:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to reset XP' });
  }
});

// Reset Balance
router.post('/:guildId/members/:memberId/reset-balance', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId, memberId } = req.params;
    
    await UserEconomy.findOneAndUpdate(
      { guildId, discordId: memberId },
      { $set: { balance: 0, bank: 0 } }
    );
    
    res.json({ success: true, message: 'Balance reset' });
  } catch (error: any) {
    logger.error('Error resetting balance:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to reset balance' });
  }
});

// ===========================================
// Giveaway Endpoints
// ===========================================

// Get active giveaways
router.get('/:guildId/giveaways', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Import Giveaway model dynamically to avoid circular dependency
    const { Giveaway } = await import('../../database/models/index.js');
    
    const activeGiveaways = await Giveaway.find({ 
      guildId, 
      ended: false,
      endsAt: { $gt: new Date() }
    }).sort({ endsAt: 1 }).lean();
    
    const totalGiveaways = await Giveaway.countDocuments({ guildId });
    const totalEntries = await Giveaway.aggregate([
      { $match: { guildId } },
      { $project: { participantCount: { $size: '$participants' } } },
      { $group: { _id: null, total: { $sum: '$participantCount' } } }
    ]);
    
    // Try to get channel names from cache
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    
    const giveawaysWithChannelNames = activeGiveaways.map(g => ({
      ...g,
      channelName: guild?.channels?.cache?.get(g.channelId)?.name || null,
    }));
    
    res.json({
      success: true,
      active: activeGiveaways.length,
      total: totalGiveaways,
      totalEntries: totalEntries[0]?.total || 0,
      giveaways: giveawaysWithChannelNames,
    });
  } catch (error: any) {
    logger.error('Error fetching giveaways:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch giveaways' });
  }
});

// Create giveaway from dashboard
router.post('/:guildId/giveaways/create', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { channelId, prize, winnerCount, duration, requiredRoleId, requiredLevel, bonusRoleId, bonusEntries } = req.body;
    
    if (!channelId || !prize) {
      res.status(400).json({ success: false, error: 'Channel and prize are required' });
      return;
    }
    
    const { giveawayManager } = await import('../../bot/systems/giveaway/index.js');
    const client = (global as any).discordClient;
    
    if (!client) {
      res.status(500).json({ success: false, error: 'Bot not connected' });
      return;
    }
    
    // Get the host user from the session
    const hostId = (req as any).user?.discordId || client.user?.id;
    
    // Parse duration string to milliseconds
    const parseDuration = (dur: string): number => {
      const match = dur.match(/^(\d+)([mhd])$/);
      if (!match) return 24 * 60 * 60 * 1000; // Default 1 day
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 24 * 60 * 60 * 1000;
      }
    };
    
    // Build requirements object
    const requirements: { roles?: string[]; minLevel?: number } = {};
    if (requiredRoleId) requirements.roles = [requiredRoleId];
    if (requiredLevel && requiredLevel > 0) requirements.minLevel = requiredLevel;
    
    // Build bonus entries array
    const bonusEntriesArray = bonusRoleId && bonusEntries 
      ? [{ roleId: bonusRoleId, entries: bonusEntries }]
      : [];
    
    // Create the giveaway
    const giveaway = await giveawayManager.create({
      guildId,
      channelId,
      hostId,
      prize,
      winnerCount: winnerCount || 1,
      duration: parseDuration(duration || '1d'),
      requirements: Object.keys(requirements).length > 0 ? requirements : undefined,
      bonusEntries: bonusEntriesArray.length > 0 ? bonusEntriesArray : undefined,
    });
    
    if (!giveaway) {
      res.status(400).json({ success: false, error: 'Failed to create giveaway' });
      return;
    }
    
    res.json({ success: true, message: 'Giveaway created', giveaway });
  } catch (error: any) {
    logger.error('Error creating giveaway:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create giveaway' });
  }
});

// Giveaway action (end, reroll, delete)
router.post('/:guildId/giveaways/:messageId/:action', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { messageId, action } = req.params;
    
    if (!['end', 'reroll', 'delete'].includes(action)) {
      res.status(400).json({ success: false, error: 'Invalid action' });
      return;
    }
    
    const { giveawayManager } = await import('../../bot/systems/giveaway/index.js');
    
    let success = false;
    let errorMessage = '';
    
    if (action === 'end') {
      const result = await giveawayManager.end(messageId, true) as any;
      success = result?.success !== false;
      if (result?.message) errorMessage = result.message;
    } else if (action === 'reroll') {
      const result = await giveawayManager.reroll(messageId) as any;
      success = result?.success !== false;
      if (result?.message) errorMessage = result.message;
    } else if (action === 'delete') {
      const result = await giveawayManager.delete(messageId) as any;
      success = result?.success !== false;
      if (result?.message) errorMessage = result.message;
    }
    
    if (!success) {
      res.status(400).json({ success: false, error: errorMessage || `Failed to ${action} giveaway` });
      return;
    }
    
    res.json({ success: true, message: `Giveaway ${action} successful` });
  } catch (error: any) {
    logger.error(`Error ${req.params.action}ing giveaway:`, error);
    res.status(500).json({ success: false, error: error?.message || `Failed to ${req.params.action} giveaway` });
  }
});

// ===========================================
// Music Endpoints
// ===========================================

// Get now playing
router.get('/:guildId/music/nowplaying', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    const { musicPlayer } = await import('../../bot/systems/music/index.js');
    
    let player;
    try {
      player = musicPlayer.getPlayer();
    } catch {
      res.json({ success: true, data: null });
      return;
    }
    
    if (!player) {
      res.json({ success: true, data: null });
      return;
    }
    
    const queue = player.queues.get(guildId);
    
    if (!queue || !queue.currentTrack) {
      res.json({ success: true, data: null });
      return;
    }
    
    const track = queue.currentTrack;
    const progress = queue.node.getTimestamp();
    
    // Get queue tracks for display
    const queueTracks = queue.tracks.toArray().slice(0, 10).map(t => ({
      title: t.title,
      author: t.author,
      duration: t.durationMS,
    }));
    
    // Determine source
    let source = 'YouTube';
    if (track.url?.includes('spotify')) source = 'Spotify';
    else if (track.url?.includes('soundcloud')) source = 'SoundCloud';
    
    res.json({
      success: true,
      data: {
        title: track.title,
        author: track.author,
        thumbnail: track.thumbnail,
        url: track.url,
        duration: track.durationMS,
        position: progress?.current?.value || 0,
        volume: queue.node.volume,
        paused: queue.node.isPaused(),
        repeatMode: queue.repeatMode,
        queueSize: queue.tracks.size,
        voiceChannel: queue.channel?.name || null,
        source,
        requestedBy: track.requestedBy?.username || 'Unknown',
        queue: queueTracks,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching now playing:', error);
    res.json({ success: true, data: null });
  }
});

// Music action (pause, resume, skip, stop, shuffle, loop)
router.post('/:guildId/music/action', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { action } = req.body;
    
    if (!['pause', 'resume', 'skip', 'stop', 'shuffle', 'loop', 'previous'].includes(action)) {
      res.status(400).json({ success: false, error: 'Invalid action' });
      return;
    }
    
    const { musicPlayer } = await import('../../bot/systems/music/index.js');
    const player = musicPlayer.getPlayer();
    
    if (!player) {
      res.status(400).json({ success: false, error: 'Music player not initialized' });
      return;
    }
    
    const queue = player.queues.get(guildId);
    
    if (!queue) {
      res.status(400).json({ success: false, error: 'No queue for this guild' });
      return;
    }
    
    switch (action) {
      case 'pause':
        queue.node.pause();
        break;
      case 'resume':
        queue.node.resume();
        break;
      case 'skip':
        queue.node.skip();
        break;
      case 'stop':
        queue.delete();
        break;
      case 'shuffle':
        queue.tracks.shuffle();
        break;
      case 'loop': {
        // Cycle through loop modes: 0 -> 1 -> 2 -> 0
        const nextMode = ((queue.repeatMode as number) + 1) % 3;
        queue.setRepeatMode(nextMode as any);
        break;
      }
      case 'previous':
        await queue.history.previous();
        break;
    }
    
    res.json({ success: true, message: `Action ${action} executed` });
  } catch (error: any) {
    logger.error('Error executing music action:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to execute action' });
  }
});

export default router;
