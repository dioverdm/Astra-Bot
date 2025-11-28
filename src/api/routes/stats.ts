// ===========================================
// ASTRA BOT - Stats Routes
// ===========================================

import { Router, Request, Response } from 'express';
import { isAuthenticated, canManageGuild } from '../middleware/auth.js';
import { ModerationLog, UserLevel, UserEconomy, GuildConfig } from '../../database/models/index.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// ================================================
// PUBLIC STATUS ENDPOINT (No authentication)
// ================================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    const client = (global as any).discordClient;
    const mongoose = (await import('mongoose')).default;
    
    // Measure database latency
    let dbLatency = 0;
    let dbOnline = false;
    try {
      const dbStart = Date.now();
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.admin().ping();
        dbLatency = Date.now() - dbStart;
        dbOnline = true;
      }
    } catch {
      dbOnline = false;
    }
    
    // Bot status
    const botOnline = client?.isReady() || false;
    const botPing = client?.ws?.ping || 0;
    const botUptime = client?.uptime || 0;
    const guildCount = client?.guilds?.cache?.size || 0;
    const userCount = client?.users?.cache?.size || 0;
    const channelCount = client?.channels?.cache?.size || 0;
    
    // Get command count
    const commands = client?.commands?.size || 0;
    
    // Determine overall status
    let status: 'operational' | 'degraded' | 'down' = 'operational';
    if (!botOnline || !dbOnline) {
      status = 'down';
    } else if (botPing > 500 || dbLatency > 200) {
      status = 'degraded';
    }
    
    res.json({
      success: true,
      data: {
        status,
        bot: {
          online: botOnline,
          ping: botPing,
          uptime: botUptime,
          guilds: guildCount,
          users: userCount,
          channels: channelCount,
          commands,
          shards: client?.ws?.shards?.size || 1,
        },
        database: {
          online: dbOnline,
          responseTime: dbLatency,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      data: {
        status: 'down',
        bot: { online: false, ping: 0, uptime: 0, guilds: 0, users: 0, channels: 0, commands: 0, shards: 0 },
        database: { online: false, responseTime: 0 },
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Get guild statistics
router.get('/:guildId', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Get various statistics
    const [
      totalLevelUsers,
      totalEconomyUsers,
      recentModActions,
      topLevelUsers,
      topEconomyUsers,
    ] = await Promise.all([
      UserLevel.countDocuments({ guildId }),
      UserEconomy.countDocuments({ guildId }),
      ModerationLog.find({ guildId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      UserLevel.find({ guildId })
        .sort({ totalXp: -1 })
        .limit(5)
        .lean(),
      UserEconomy.find({ guildId })
        .sort({ balance: -1 })
        .limit(5)
        .lean(),
    ]);
    
    // Get moderation action counts
    const modActionCounts = await ModerationLog.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]);
    
    const actionCountsMap: Record<string, number> = {};
    modActionCounts.forEach((item: { _id: string; count: number }) => {
      actionCountsMap[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: {
        overview: {
          totalLevelUsers,
          totalEconomyUsers,
          totalModActions: Object.values(actionCountsMap).reduce((a, b) => a + b, 0),
        },
        moderation: {
          actionCounts: actionCountsMap,
          recentActions: recentModActions,
        },
        leaderboards: {
          levels: topLevelUsers.map((u, i) => ({
            rank: i + 1,
            odiscordId: u.discordId,
            level: u.level,
            totalXp: u.totalXp,
          })),
          economy: topEconomyUsers.map((u, i) => ({
            rank: i + 1,
            odiscordId: u.discordId,
            balance: u.balance,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching guild stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch guild statistics' 
    });
  }
});

// Get moderation logs with pagination and filtering
router.get('/:guildId/moderation', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const action = req.query.action as string;
    const search = req.query.search as string;
    const moderatorId = req.query.moderatorId as string;
    const targetId = req.query.targetId as string;
    
    // Build query
    const query: any = { guildId };
    if (action && action !== 'all') {
      query.action = action;
    }
    if (moderatorId) {
      query.moderatorId = moderatorId;
    }
    if (targetId) {
      query.targetId = targetId;
    }
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { targetId: { $regex: search, $options: 'i' } },
        { moderatorId: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Get Discord client for user info
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    
    // Helper to get user info
    const getUserInfo = async (odiscordId: string) => {
      try {
        if (guild) {
          const member = guild.members?.cache?.get(odiscordId);
          if (member) {
            return {
              username: member.user.globalName || member.user.username,
              avatar: member.user.avatar,
              discriminator: member.user.discriminator,
            };
          }
          try {
            const fetchedMember = await guild.members.fetch(odiscordId);
            if (fetchedMember) {
              return {
                username: fetchedMember.user.globalName || fetchedMember.user.username,
                avatar: fetchedMember.user.avatar,
                discriminator: fetchedMember.user.discriminator,
              };
            }
          } catch {
            // Member not found
          }
        }
        const user = client?.users?.cache?.get(odiscordId);
        if (user) {
          return {
            username: user.globalName || user.username,
            avatar: user.avatar,
            discriminator: user.discriminator,
          };
        }
        try {
          const fetchedUser = await client?.users?.fetch(odiscordId);
          if (fetchedUser) {
            return {
              username: fetchedUser.globalName || fetchedUser.username,
              avatar: fetchedUser.avatar,
              discriminator: fetchedUser.discriminator,
            };
          }
        } catch {
          // User not found
        }
        return { username: null, avatar: null, discriminator: null };
      } catch {
        return { username: null, avatar: null, discriminator: null };
      }
    };
    
    const [logs, total, actionCounts] = await Promise.all([
      ModerationLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ModerationLog.countDocuments(query),
      ModerationLog.aggregate([
        { $match: { guildId } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]),
    ]);
    
    // Enrich logs with user info
    const enrichedLogs = await Promise.all(
      logs.map(async (log: any) => {
        const [targetInfo, moderatorInfo] = await Promise.all([
          getUserInfo(log.targetId),
          getUserInfo(log.moderatorId),
        ]);
        
        return {
          _id: log._id,
          caseId: log.caseId || log._id,
          guildId: log.guildId,
          action: log.action,
          targetId: log.targetId,
          targetUsername: targetInfo.username || `User ${log.targetId?.slice(-4)}`,
          targetAvatar: targetInfo.avatar,
          moderatorId: log.moderatorId,
          moderatorUsername: moderatorInfo.username || `Mod ${log.moderatorId?.slice(-4)}`,
          moderatorAvatar: moderatorInfo.avatar,
          reason: log.reason || 'No reason provided',
          duration: log.duration,
          createdAt: log.timestamp || log.createdAt,
        };
      })
    );
    
    // Build action counts map
    const actionCountsMap: Record<string, number> = {};
    actionCounts.forEach((item: any) => {
      actionCountsMap[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: await ModerationLog.countDocuments({ guildId }),
        actionCounts: actionCountsMap,
      },
    });
  } catch (error) {
    logger.error('Error fetching moderation logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch moderation logs' 
    });
  }
});

// Get leaderboard
router.get('/:guildId/leaderboard/:type', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { guildId, type } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    // Get Discord client for user info
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    
    // Helper function to get user info from Discord
    const getUserInfo = async (odiscordId: string) => {
      try {
        // Try to get from guild members cache first
        if (guild) {
          const member = guild.members?.cache?.get(odiscordId);
          if (member) {
            return {
              username: member.user.globalName || member.user.username,
              avatar: member.user.avatar,
            };
          }
          
          // Try to fetch member
          try {
            const fetchedMember = await guild.members.fetch(odiscordId);
            if (fetchedMember) {
              return {
                username: fetchedMember.user.globalName || fetchedMember.user.username,
                avatar: fetchedMember.user.avatar,
              };
            }
          } catch {
            // Member not in guild or fetch failed
          }
        }
        
        // Try to get from client users cache
        const user = client?.users?.cache?.get(odiscordId);
        if (user) {
          return {
            username: user.globalName || user.username,
            avatar: user.avatar,
          };
        }
        
        // Try to fetch user directly
        try {
          const fetchedUser = await client?.users?.fetch(odiscordId);
          if (fetchedUser) {
            return {
              username: fetchedUser.globalName || fetchedUser.username,
              avatar: fetchedUser.avatar,
            };
          }
        } catch {
          // User fetch failed
        }
        
        return { username: null, avatar: null };
      } catch {
        return { username: null, avatar: null };
      }
    };
    
    if (type === 'levels') {
      const leaderboard = await UserLevel.find({ guildId })
        .sort({ totalXp: -1 })
        .limit(limit)
        .lean();
      
      // Fetch user info for all users in parallel
      const usersWithInfo = await Promise.all(
        leaderboard.map(async (u: any, i: number) => {
          const userInfo = await getUserInfo(u.discordId);
          return {
            rank: i + 1,
            odiscordId: u.discordId,
            username: userInfo.username,
            avatar: userInfo.avatar,
            level: u.level || 1,
            xp: u.xp || 0,
            totalXp: u.totalXp || 0,
            messages: u.messages || 0,
          };
        })
      );
      
      res.json({
        success: true,
        data: usersWithInfo,
      });
    } else if (type === 'economy') {
      const leaderboard = await UserEconomy.find({ guildId })
        .sort({ balance: -1 })
        .limit(limit)
        .lean();
      
      // Fetch user info for all users in parallel
      const usersWithInfo = await Promise.all(
        leaderboard.map(async (u: any, i: number) => {
          const userInfo = await getUserInfo(u.discordId);
          return {
            rank: i + 1,
            odiscordId: u.discordId,
            username: userInfo.username,
            avatar: userInfo.avatar,
            balance: u.balance || 0,
            bank: u.bank || 0,
            totalEarned: u.totalEarned || 0,
          };
        })
      );
      
      res.json({
        success: true,
        data: usersWithInfo,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid leaderboard type. Use "levels" or "economy".' 
      });
    }
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard' 
    });
  }
});

// Get analytics data for dashboard
router.get('/:guildId/analytics', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const range = (req.query.range as string) || '7d';
    
    // Calculate date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Previous period for comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);
    
    // Get Discord client for guild info
    const client = (global as any).discordClient;
    const guild = client?.guilds?.cache?.get(guildId);
    
    // Get command usage from bot (if tracked)
    const commandStats = (global as any).commandStats || {};
    const guildCommandStats = commandStats[guildId] || {};
    
    // Calculate command usage from tracked data
    const topCommands = Object.entries(guildCommandStats)
      .map(([name, data]: [string, any]) => ({
        name: `/${name}`,
        uses: data.uses || 0,
        trend: data.trend || 'stable',
        change: data.change || 0,
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);
    
    // Get moderation stats for current and previous period
    const [modActionsCount, previousModActionsCount] = await Promise.all([
      ModerationLog.countDocuments({
        guildId,
        timestamp: { $gte: startDate },
      }),
      ModerationLog.countDocuments({
        guildId,
        timestamp: { $gte: previousStartDate, $lt: startDate },
      }),
    ]);
    
    // Get moderation breakdown by action type
    const modActionBreakdown = await ModerationLog.aggregate([
      { $match: { guildId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    // Get level activity - users who were active in the period
    const [activeLevelUsers, totalLevelUsers] = await Promise.all([
      UserLevel.countDocuments({
        guildId,
        lastMessageAt: { $gte: startDate },
      }),
      UserLevel.countDocuments({ guildId }),
    ]);
    
    // Get total messages from all users
    const totalMessagesResult = await UserLevel.aggregate([
      { $match: { guildId } },
      { $group: { _id: null, total: { $sum: '$messages' } } },
    ]);
    const totalMessages = totalMessagesResult[0]?.total || 0;
    
    // Get total XP earned
    const totalXpResult = await UserLevel.aggregate([
      { $match: { guildId } },
      { $group: { _id: null, total: { $sum: '$totalXp' } } },
    ]);
    const totalXp = totalXpResult[0]?.total || 0;
    
    // Get economy stats
    const economyStats = await UserEconomy.aggregate([
      { $match: { guildId } },
      { $group: { 
        _id: null, 
        totalBalance: { $sum: '$balance' },
        totalBank: { $sum: '$bank' },
        totalUsers: { $sum: 1 },
      }},
    ]);
    
    // Get top level users
    const topLevelUsers = await UserLevel.find({ guildId })
      .sort({ totalXp: -1 })
      .limit(5)
      .lean();
    
    // Get top economy users
    const topEconomyUsers = await UserEconomy.find({ guildId })
      .sort({ balance: -1 })
      .limit(5)
      .lean();
    
    // Get recent moderation actions
    const recentModActions = await ModerationLog.find({ guildId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    // Generate daily stats from actual moderation data
    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Count moderation actions for the day
      const actionsForDay = await ModerationLog.countDocuments({
        guildId,
        timestamp: { $gte: dayStart, $lte: dayEnd },
      });
      
      // Count active users for the day
      const activeUsersForDay = await UserLevel.countDocuments({
        guildId,
        lastMessageAt: { $gte: dayStart, $lte: dayEnd },
      });
      
      dailyStats.push({
        date: dateStr,
        modActions: actionsForDay,
        activeUsers: activeUsersForDay,
        members: guild?.memberCount || 0,
      });
    }
    
    // Calculate trends
    const currentPeriodActions = dailyStats.reduce((acc, d) => acc + d.modActions, 0);
    const currentPeriodActiveUsers = dailyStats.reduce((acc, d) => acc + d.activeUsers, 0);
    
    const modActionsTrend = previousModActionsCount > 0 
      ? Math.round(((currentPeriodActions - previousModActionsCount) / previousModActionsCount) * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalMessages,
          totalXp,
          totalLevelUsers,
          activeLevelUsers,
          modActionsCount,
          modActionsTrend,
          memberCount: guild?.memberCount || 0,
          onlineCount: guild?.members?.cache?.filter((m: any) => m.presence?.status !== 'offline')?.size || 0,
        },
        economy: {
          totalBalance: economyStats[0]?.totalBalance || 0,
          totalBank: economyStats[0]?.totalBank || 0,
          totalUsers: economyStats[0]?.totalUsers || 0,
        },
        moderation: {
          total: modActionsCount,
          breakdown: modActionBreakdown.map((item: any) => ({
            action: item._id,
            count: item.count,
          })),
          recent: recentModActions.map((action: any) => ({
            id: action._id,
            action: action.action,
            targetId: action.targetId,
            moderatorId: action.moderatorId,
            reason: action.reason,
            timestamp: action.timestamp,
          })),
        },
        leaderboards: {
          levels: topLevelUsers.map((u: any, i: number) => ({
            rank: i + 1,
            odiscordId: u.discordId,
            level: u.level,
            xp: u.xp,
            totalXp: u.totalXp,
            messages: u.messages,
          })),
          economy: topEconomyUsers.map((u: any, i: number) => ({
            rank: i + 1,
            odiscordId: u.discordId,
            balance: u.balance,
            bank: u.bank,
          })),
        },
        topCommands,
        dailyStats,
        timeRange: { days, startDate: startDate.toISOString() },
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics data' 
    });
  }
});

// Get user's level data for a specific guild
router.get('/:guildId/user/:odiscordId/level', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { guildId, odiscordId } = req.params;
    
    // Find user's level data
    const userLevel = await UserLevel.findOne({ guildId, odiscordId });
    
    if (!userLevel) {
      // Return default data for new users
      res.json({
        success: true,
        data: {
          level: 1,
          xp: 0,
          xpNeeded: 100,
          totalXp: 0,
          messages: 0,
          rank: null,
        },
      });
      return;
    }
    
    // Calculate XP needed for next level
    const xpNeeded = Math.floor(100 * Math.pow(1.5, userLevel.level));
    
    // Get rank
    const rank = await UserLevel.countDocuments({
      guildId,
      $or: [
        { level: { $gt: userLevel.level } },
        { level: userLevel.level, xp: { $gt: userLevel.xp } },
      ],
    }) + 1;
    
    res.json({
      success: true,
      data: {
        level: userLevel.level,
        xp: userLevel.xp,
        xpNeeded,
        totalXp: userLevel.totalXp || 0,
        messages: userLevel.messages || 0,
        rank,
      },
    });
  } catch (error) {
    logger.error('Error fetching user level:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user level' 
    });
  }
});

// Get leveling statistics for a guild
router.get('/:guildId/leveling', isAuthenticated, canManageGuild, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    
    // Get leveling stats
    const [totalUsers, totalXpResult, levelDistribution] = await Promise.all([
      UserLevel.countDocuments({ guildId }),
      UserLevel.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, totalXp: { $sum: '$totalXp' }, avgLevel: { $avg: '$level' } } },
      ]),
      UserLevel.aggregate([
        { $match: { guildId } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 20 },
      ]),
    ]);
    
    const stats = totalXpResult[0] || { totalXp: 0, avgLevel: 0 };
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalXp: stats.totalXp || 0,
        averageLevel: stats.avgLevel || 0,
        levelDistribution: levelDistribution.map((l: { _id: number; count: number }) => ({
          level: l._id,
          count: l.count,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching leveling stats:', error?.message || error);
    // Return default data on error instead of 500
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalXp: 0,
        averageLevel: 0,
        levelDistribution: [],
      },
    });
  }
});

export default router;
