// ===========================================
// ASTRA BOT - Bot Stats Routes
// ===========================================

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Store for command usage tracking
let commandsUsed = 0;
let botStartTime = Date.now();

// Increment command counter (called from bot)
export function incrementCommandCount(): void {
  commandsUsed++;
}

// Get bot statistics (authenticated)
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get bot client from global if available
    const client = (global as any).discordClient;
    
    // Calculate total users across all guilds
    let totalUsers = 0;
    if (client?.guilds?.cache) {
      client.guilds.cache.forEach((guild: any) => {
        totalUsers += guild.memberCount || 0;
      });
    }
    
    // Get command list
    const commandList = client?.commands 
      ? Array.from(client.commands.values()).map((cmd: any) => ({
          name: cmd.data.name,
          description: cmd.data.description,
          category: getCategoryFromCommand(cmd.data.name),
        }))
      : [];
    
    const stats = {
      guilds: client?.guilds?.cache?.size || 0,
      users: totalUsers,
      commands: client?.commands?.size || 0,
      commandsUsed,
      uptime: Date.now() - botStartTime,
      ping: client?.ws?.ping || 0,
      online: client?.isReady() || false,
      version: process.env.npm_package_version || '2.0.0',
      commandList,
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching bot stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bot statistics' 
    });
  }
});

// Public bot stats for landing page (no auth required)
router.get('/stats/public', async (req: Request, res: Response) => {
  try {
    const client = (global as any).discordClient;
    
    // Calculate total users across all guilds
    let totalUsers = 0;
    if (client?.guilds?.cache) {
      client.guilds.cache.forEach((guild: any) => {
        totalUsers += guild.memberCount || 0;
      });
    }
    
    // Get command list
    const commandList = client?.commands 
      ? Array.from(client.commands.values()).map((cmd: any) => ({
          name: cmd.data.name,
          description: cmd.data.description,
          category: getCategoryFromCommand(cmd.data.name),
        }))
      : [];
    
    res.json({
      guilds: client?.guilds?.cache?.size || 0,
      users: totalUsers,
      commands: client?.commands?.size || 0,
      uptime: Date.now() - botStartTime,
      ping: client?.ws?.ping || 0,
      online: client?.isReady() || false,
      version: '2.0.0',
      commandList,
    });
  } catch (error) {
    logger.error('Error fetching public bot stats:', error);
    res.status(500).json({ 
      guilds: 0,
      users: 0,
      commands: 11,
      uptime: 0,
      ping: 0,
      online: false,
      version: '2.0.0',
      commandList: [],
    });
  }
});

// Get bot status (public endpoint)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const client = (global as any).discordClient;
    
    res.json({
      success: true,
      data: {
        online: client?.isReady() || false,
        guilds: client?.guilds?.cache?.size || 0,
        ping: client?.ws?.ping || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bot status' 
    });
  }
});

// Helper function to determine command category
function getCategoryFromCommand(name: string): string {
  const categories: Record<string, string[]> = {
    moderation: ['ban', 'kick', 'timeout', 'warn', 'mute', 'unmute', 'clear', 'slowmode', 'lock', 'unlock'],
    utility: ['help', 'ping', 'userinfo', 'serverinfo', 'avatar', 'banner', 'roleinfo', 'channelinfo'],
    fun: ['anime', 'waifu', '8ball', 'meme', 'joke', 'quote'],
    leveling: ['rank', 'leaderboard', 'setlevel', 'setxp', 'level'],
    economy: ['balance', 'daily', 'work', 'pay', 'shop', 'buy', 'inventory', 'rob', 'slots'],
  };
  
  for (const [category, commands] of Object.entries(categories)) {
    if (commands.includes(name)) return category;
  }
  return 'utility';
}

export default router;
