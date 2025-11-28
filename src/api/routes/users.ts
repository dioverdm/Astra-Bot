// ===========================================
// ASTRA BOT - User Routes
// ===========================================

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { User, UserLevel, UserEconomy } from '../../database/models/index.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get user profile
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    const dbUser = await User.findOne({ discordId: user.discordId });
    
    res.json({
      success: true,
      data: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        avatarUrl: user.avatar 
          ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`,
        createdAt: dbUser?.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user profile' 
    });
  }
});

// Get user's level data for a guild
router.get('/level/:guildId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { guildId } = req.params;
    
    const levelData = await UserLevel.findOne({
      discordId: user.discordId,
      guildId,
    });
    
    if (!levelData) {
      res.json({
        success: true,
        data: {
          level: 0,
          xp: 0,
          totalXp: 0,
          messages: 0,
          rank: null,
        },
      });
      return;
    }
    
    // Get user's rank
    const rank = await UserLevel.countDocuments({
      guildId,
      totalXp: { $gt: levelData.totalXp },
    }) + 1;
    
    res.json({
      success: true,
      data: {
        level: levelData.level,
        xp: levelData.xp,
        totalXp: levelData.totalXp,
        messages: levelData.messages,
        rank,
      },
    });
  } catch (error) {
    logger.error('Error fetching user level:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch level data' 
    });
  }
});

// Get user's economy data for a guild
router.get('/economy/:guildId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { guildId } = req.params;
    
    const economyData = await UserEconomy.findOne({
      discordId: user.discordId,
      guildId,
    });
    
    if (!economyData) {
      res.json({
        success: true,
        data: {
          balance: 0,
          bank: 0,
          totalEarned: 0,
          inventory: [],
          rank: null,
        },
      });
      return;
    }
    
    // Get user's rank (by balance)
    const rank = await UserEconomy.countDocuments({
      guildId,
      balance: { $gt: economyData.balance },
    }) + 1;
    
    res.json({
      success: true,
      data: {
        balance: economyData.balance,
        bank: economyData.bank,
        totalEarned: economyData.totalEarned,
        inventory: economyData.inventory,
        transactions: economyData.transactions.slice(0, 10),
        rank,
      },
    });
  } catch (error) {
    logger.error('Error fetching user economy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch economy data' 
    });
  }
});

export default router;
