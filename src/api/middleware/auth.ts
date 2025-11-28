// ===========================================
// ASTRA BOT - Authentication Middleware
// ===========================================

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { DISCORD_API_BASE } from '../../shared/constants/index.js';
import type { DiscordGuild } from '../../shared/types/index.js';
import { DashboardRole, DashboardPermission, hasPermission, hasRole } from '../../shared/types/roles.js';
import { DashboardRoleModel } from '../../database/models/DashboardRole.js';

// Extend Express Request to include user and role
declare global {
  namespace Express {
    interface User {
      id: string;
      discordId: string;
      username: string;
      avatar: string | null;
      accessToken: string;
      refreshToken: string;
    }
    interface Request {
      dashboardRole?: DashboardRole;
      guild?: DiscordGuild;
    }
  }
}

// Check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ 
    success: false, 
    error: 'Unauthorized - Please log in' 
  });
}

// Check if user has permission to manage a guild
export async function canManageGuild(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guildId = req.params.guildId;
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    
    // Check if user is bot owner (bypass all checks)
    if (user.discordId === process.env.BOT_OWNER_ID) {
      (req as any).guild = { id: guildId, owner: true };
      return next();
    }
    
    // Fetch user's guilds from Discord
    let guilds: DiscordGuild[] = [];
    try {
      const response = await axios.get<DiscordGuild[]>(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
        timeout: 10000,
      });
      guilds = response.data;
    } catch (discordError: any) {
      // If Discord API fails (token expired, rate limited, etc.), log and return error
      console.error('Discord API error in canManageGuild:', discordError?.response?.status || discordError?.message);
      
      // If it's a 401, the token is invalid/expired
      if (discordError?.response?.status === 401) {
        res.status(401).json({ 
          success: false, 
          error: 'Session expired. Please log in again.' 
        });
        return;
      }
      
      // For other errors, return 500 with more info
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify guild permissions. Discord API may be unavailable.' 
      });
      return;
    }
    
    const guild = guilds.find(g => g.id === guildId);
    
    if (!guild) {
      res.status(403).json({ 
        success: false, 
        error: 'You are not a member of this guild' 
      });
      return;
    }
    
    // Check for MANAGE_GUILD permission (0x20)
    const permissions = BigInt(guild.permissions || '0');
    const MANAGE_GUILD = BigInt(0x20);
    const ADMINISTRATOR = BigInt(0x8);
    
    if ((permissions & MANAGE_GUILD) !== MANAGE_GUILD && (permissions & ADMINISTRATOR) !== ADMINISTRATOR && !guild.owner) {
      res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to manage this guild' 
      });
      return;
    }
    
    // Attach guild to request for later use
    (req as any).guild = guild;
    next();
  } catch (error: any) {
    console.error('Error in canManageGuild:', error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify guild permissions' 
    });
  }
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();
    
    const record = rateLimitMap.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      res.status(429).json({ 
        success: false, 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }
    
    record.count++;
    next();
  };
}

// ===========================================
// DASHBOARD ROLE MIDDLEWARE
// ===========================================

/**
 * Load user's dashboard role for a guild
 */
export async function loadDashboardRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guildId = req.params.guildId;
    const user = req.user;
    
    if (!user || !guildId) {
      req.dashboardRole = DashboardRole.USER;
      return next();
    }
    
    // Check if user is bot owner (global admin)
    if (user.discordId === process.env.BOT_OWNER_ID) {
      req.dashboardRole = DashboardRole.BOT_OWNER;
      return next();
    }
    
    // Check if user is guild owner
    if (req.guild?.owner) {
      req.dashboardRole = DashboardRole.OWNER;
      return next();
    }
    
    // Get role from database
    const roleDoc = await DashboardRoleModel.findOne({ 
      discordId: user.discordId, 
      guildId 
    });
    
    req.dashboardRole = roleDoc?.role ?? DashboardRole.USER;
    next();
  } catch (error) {
    req.dashboardRole = DashboardRole.USER;
    next();
  }
}

/**
 * Require a minimum dashboard role
 */
export function requireRole(minRole: DashboardRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.dashboardRole ?? DashboardRole.USER;
    
    if (!hasRole(userRole, minRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: minRole,
        current: userRole,
      });
      return;
    }
    
    next();
  };
}

/**
 * Require a specific permission
 */
export function requirePermission(permission: DashboardPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.dashboardRole ?? DashboardRole.USER;
    
    if (!hasPermission(userRole, permission)) {
      res.status(403).json({
        success: false,
        error: 'Missing required permission',
        required: permission,
      });
      return;
    }
    
    next();
  };
}
