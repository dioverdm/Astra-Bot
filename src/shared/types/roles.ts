// ===========================================
// ASTRA BOT - Dashboard Role System
// ===========================================

/**
 * Dashboard access roles with hierarchical permissions
 * Higher number = more permissions
 */
export enum DashboardRole {
  USER = 0,        // Basic access - view only
  SUPPORT = 1,     // Can view tickets, basic moderation logs
  MODERATOR = 2,   // Can view/manage moderation, users
  DEVELOPER = 3,   // Can access developer tools, logs, debug
  ADMIN = 4,       // Full guild management
  OWNER = 5,       // Guild owner - all permissions
  BOT_OWNER = 99,  // Bot owner - global access
}

export const ROLE_NAMES: Record<DashboardRole, string> = {
  [DashboardRole.USER]: 'User',
  [DashboardRole.SUPPORT]: 'Support',
  [DashboardRole.MODERATOR]: 'Moderator',
  [DashboardRole.DEVELOPER]: 'Developer',
  [DashboardRole.ADMIN]: 'Admin',
  [DashboardRole.OWNER]: 'Owner',
  [DashboardRole.BOT_OWNER]: 'Bot Owner',
};

export const ROLE_COLORS: Record<DashboardRole, string> = {
  [DashboardRole.USER]: '#6B7280',      // Gray
  [DashboardRole.SUPPORT]: '#10B981',   // Green
  [DashboardRole.MODERATOR]: '#3B82F6', // Blue
  [DashboardRole.DEVELOPER]: '#8B5CF6', // Purple
  [DashboardRole.ADMIN]: '#F59E0B',     // Amber
  [DashboardRole.OWNER]: '#EF4444',     // Red
  [DashboardRole.BOT_OWNER]: '#EC4899', // Pink
};

/**
 * Permission flags for dashboard features
 */
export enum DashboardPermission {
  // View permissions
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_STATS = 'view_stats',
  VIEW_MODERATION_LOGS = 'view_moderation_logs',
  VIEW_TICKETS = 'view_tickets',
  VIEW_SETTINGS = 'view_settings',
  
  // Manage permissions
  MANAGE_MODERATION = 'manage_moderation',
  MANAGE_LEVELING = 'manage_leveling',
  MANAGE_ECONOMY = 'manage_economy',
  MANAGE_WELCOME = 'manage_welcome',
  MANAGE_TICKETS = 'manage_tickets',
  MANAGE_AUTOMOD = 'manage_automod',
  
  // Admin permissions
  MANAGE_ROLES = 'manage_roles',
  MANAGE_SETTINGS = 'manage_settings',
  MANAGE_MODULES = 'manage_modules',
  
  // Developer permissions
  VIEW_LOGS = 'view_logs',
  VIEW_DEBUG = 'view_debug',
  MANAGE_COMMANDS = 'manage_commands',
  
  // Owner permissions
  DELETE_DATA = 'delete_data',
  TRANSFER_OWNERSHIP = 'transfer_ownership',
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<DashboardRole, DashboardPermission[]> = {
  [DashboardRole.USER]: [
    DashboardPermission.VIEW_DASHBOARD,
  ],
  
  [DashboardRole.SUPPORT]: [
    DashboardPermission.VIEW_DASHBOARD,
    DashboardPermission.VIEW_STATS,
    DashboardPermission.VIEW_TICKETS,
    DashboardPermission.VIEW_MODERATION_LOGS,
  ],
  
  [DashboardRole.MODERATOR]: [
    DashboardPermission.VIEW_DASHBOARD,
    DashboardPermission.VIEW_STATS,
    DashboardPermission.VIEW_TICKETS,
    DashboardPermission.VIEW_MODERATION_LOGS,
    DashboardPermission.VIEW_SETTINGS,
    DashboardPermission.MANAGE_MODERATION,
    DashboardPermission.MANAGE_TICKETS,
  ],
  
  [DashboardRole.DEVELOPER]: [
    DashboardPermission.VIEW_DASHBOARD,
    DashboardPermission.VIEW_STATS,
    DashboardPermission.VIEW_TICKETS,
    DashboardPermission.VIEW_MODERATION_LOGS,
    DashboardPermission.VIEW_SETTINGS,
    DashboardPermission.VIEW_LOGS,
    DashboardPermission.VIEW_DEBUG,
    DashboardPermission.MANAGE_MODERATION,
    DashboardPermission.MANAGE_TICKETS,
    DashboardPermission.MANAGE_COMMANDS,
  ],
  
  [DashboardRole.ADMIN]: [
    DashboardPermission.VIEW_DASHBOARD,
    DashboardPermission.VIEW_STATS,
    DashboardPermission.VIEW_TICKETS,
    DashboardPermission.VIEW_MODERATION_LOGS,
    DashboardPermission.VIEW_SETTINGS,
    DashboardPermission.VIEW_LOGS,
    DashboardPermission.VIEW_DEBUG,
    DashboardPermission.MANAGE_MODERATION,
    DashboardPermission.MANAGE_LEVELING,
    DashboardPermission.MANAGE_ECONOMY,
    DashboardPermission.MANAGE_WELCOME,
    DashboardPermission.MANAGE_TICKETS,
    DashboardPermission.MANAGE_AUTOMOD,
    DashboardPermission.MANAGE_ROLES,
    DashboardPermission.MANAGE_SETTINGS,
    DashboardPermission.MANAGE_MODULES,
    DashboardPermission.MANAGE_COMMANDS,
  ],
  
  [DashboardRole.OWNER]: [
    // All permissions
    ...Object.values(DashboardPermission),
  ],
  
  [DashboardRole.BOT_OWNER]: [
    // All permissions (global access)
    ...Object.values(DashboardPermission),
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: DashboardRole, permission: DashboardPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has at least the required role level
 */
export function hasRole(userRole: DashboardRole, requiredRole: DashboardRole): boolean {
  return userRole >= requiredRole;
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getRolePermissions(role: DashboardRole): DashboardPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Dashboard user role assignment for a guild
 */
export interface GuildDashboardRole {
  odiscordId: string;
  guildId: string;
  role: DashboardRole;
  assignedBy: string;
  assignedAt: Date;
}
