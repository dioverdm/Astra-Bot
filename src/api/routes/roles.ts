// ===========================================
// ASTRA BOT - Dashboard Roles API Routes
// ===========================================

import { Router, Request, Response } from 'express';
import { 
  isAuthenticated, 
  canManageGuild, 
  loadDashboardRole, 
  requireRole 
} from '../middleware/auth.js';
import { DashboardRoleModel } from '../../database/models/DashboardRole.js';
import { 
  DashboardRole, 
  ROLE_NAMES, 
  ROLE_COLORS,
  ROLE_PERMISSIONS,
  getRolePermissions 
} from '../../shared/types/roles.js';

const router = Router();

// Get all available roles info
router.get('/info', (req: Request, res: Response) => {
  const roles = Object.entries(ROLE_NAMES)
    .filter(([key]) => !isNaN(Number(key)))
    .map(([key, name]) => ({
      id: Number(key),
      name,
      color: ROLE_COLORS[Number(key) as DashboardRole],
      permissions: getRolePermissions(Number(key) as DashboardRole),
    }));
  
  res.json({
    success: true,
    data: roles,
  });
});

// Get all role assignments for a guild
router.get(
  '/guild/:guildId',
  isAuthenticated,
  canManageGuild,
  loadDashboardRole,
  requireRole(DashboardRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const roles = await DashboardRoleModel.find({ guildId })
        .sort({ role: -1 })
        .lean();
      
      const rolesWithInfo = roles.map(r => ({
        ...r,
        roleName: ROLE_NAMES[r.role as DashboardRole],
        roleColor: ROLE_COLORS[r.role as DashboardRole],
      }));
      
      res.json({
        success: true,
        data: rolesWithInfo,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
      });
    }
  }
);

// Get a user's role in a guild
router.get(
  '/guild/:guildId/user/:userId',
  isAuthenticated,
  canManageGuild,
  loadDashboardRole,
  async (req: Request, res: Response) => {
    try {
      const { guildId, userId } = req.params;
      
      const roleDoc = await DashboardRoleModel.findOne({ 
        guildId, 
        discordId: userId 
      });
      
      const role = roleDoc?.role ?? DashboardRole.USER;
      
      res.json({
        success: true,
        data: {
          discordId: userId,
          guildId,
          role,
          roleName: ROLE_NAMES[role],
          roleColor: ROLE_COLORS[role],
          permissions: getRolePermissions(role),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user role',
      });
    }
  }
);

// Set a user's role in a guild
router.put(
  '/guild/:guildId/user/:userId',
  isAuthenticated,
  canManageGuild,
  loadDashboardRole,
  requireRole(DashboardRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { guildId, userId } = req.params;
      const { role } = req.body;
      const user = req.user!;
      const assignerRole = req.dashboardRole ?? DashboardRole.USER;
      
      // Validate role
      if (typeof role !== 'number' || !Object.values(DashboardRole).includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role',
        });
        return;
      }
      
      // Can't assign role higher than own (except bot owner)
      if (role >= assignerRole && assignerRole !== DashboardRole.BOT_OWNER) {
        res.status(403).json({
          success: false,
          error: 'Cannot assign role equal to or higher than your own',
        });
        return;
      }
      
      // Can't modify users with higher role
      const targetRoleDoc = await DashboardRoleModel.findOne({ 
        guildId, 
        discordId: userId 
      });
      const targetRole = targetRoleDoc?.role ?? DashboardRole.USER;
      
      if (targetRole >= assignerRole && assignerRole !== DashboardRole.BOT_OWNER) {
        res.status(403).json({
          success: false,
          error: 'Cannot modify user with equal or higher role',
        });
        return;
      }
      
      // Update or create role
      const updatedRole = await DashboardRoleModel.findOneAndUpdate(
        { guildId, discordId: userId },
        { 
          role, 
          assignedBy: user.discordId,
          assignedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      
      res.json({
        success: true,
        data: {
          ...updatedRole.toObject(),
          roleName: ROLE_NAMES[role as DashboardRole],
          roleColor: ROLE_COLORS[role as DashboardRole],
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
      });
    }
  }
);

// Remove a user's role (reset to USER)
router.delete(
  '/guild/:guildId/user/:userId',
  isAuthenticated,
  canManageGuild,
  loadDashboardRole,
  requireRole(DashboardRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { guildId, userId } = req.params;
      const assignerRole = req.dashboardRole ?? DashboardRole.USER;
      
      // Check target's current role
      const targetRoleDoc = await DashboardRoleModel.findOne({ 
        guildId, 
        discordId: userId 
      });
      const targetRole = targetRoleDoc?.role ?? DashboardRole.USER;
      
      if (targetRole >= assignerRole && assignerRole !== DashboardRole.BOT_OWNER) {
        res.status(403).json({
          success: false,
          error: 'Cannot remove role from user with equal or higher role',
        });
        return;
      }
      
      await DashboardRoleModel.deleteOne({ guildId, discordId: userId });
      
      res.json({
        success: true,
        message: 'Role removed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove user role',
      });
    }
  }
);

// Get current user's role and permissions for a guild
router.get(
  '/guild/:guildId/me',
  isAuthenticated,
  canManageGuild,
  loadDashboardRole,
  (req: Request, res: Response) => {
    const role = req.dashboardRole ?? DashboardRole.USER;
    
    res.json({
      success: true,
      data: {
        role,
        roleName: ROLE_NAMES[role],
        roleColor: ROLE_COLORS[role],
        permissions: getRolePermissions(role),
      },
    });
  }
);

export default router;
