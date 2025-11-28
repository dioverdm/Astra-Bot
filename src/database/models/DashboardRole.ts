// ===========================================
// ASTRA BOT - Dashboard Role Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import { DashboardRole } from '../../shared/types/roles.js';

// ============================================
// Interface Definitions
// ============================================

export interface IDashboardRoleDoc extends Document {
  discordId: string;
  guildId: string;
  role: DashboardRole;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  reason?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDashboardRoleModel extends Model<IDashboardRoleDoc> {
  // Static methods
  getUserRole(discordId: string, guildId: string): Promise<DashboardRole>;
  setUserRole(discordId: string, guildId: string, role: DashboardRole, assignedBy: string, options?: { expiresAt?: Date; reason?: string }): Promise<IDashboardRoleDoc>;
  getGuildRoles(guildId: string): Promise<IDashboardRoleDoc[]>;
  removeUserRole(discordId: string, guildId: string): Promise<boolean>;
  getUserPermissions(discordId: string, guildId: string): Promise<string[]>;
  hasPermission(discordId: string, guildId: string, permission: string): Promise<boolean>;
  getAdmins(guildId: string): Promise<IDashboardRoleDoc[]>;
  getModerators(guildId: string): Promise<IDashboardRoleDoc[]>;
  bulkSetRole(guildId: string, discordIds: string[], role: DashboardRole, assignedBy: string): Promise<number>;
  cleanupExpiredRoles(): Promise<number>;
}

// ============================================
// Permission Definitions
// ============================================

// Import from shared types for consistency
import { ROLE_PERMISSIONS as SHARED_ROLE_PERMISSIONS } from '../../shared/types/roles.js';

// Re-export for convenience - use the shared permissions
export const ROLE_PERMISSIONS = SHARED_ROLE_PERMISSIONS;

// ============================================
// Schema Definition
// ============================================

const DashboardRoleSchema = new Schema<IDashboardRoleDoc>(
  {
    discordId: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: Number,
      required: true,
      default: DashboardRole.USER,
      enum: Object.values(DashboardRole).filter(v => typeof v === 'number'),
    },
    assignedBy: {
      type: String,
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    // Custom permissions (override defaults)
    permissions: [{
      type: String,
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================
// Indexes
// ============================================

DashboardRoleSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
DashboardRoleSchema.index({ guildId: 1, role: -1 });
DashboardRoleSchema.index({ expiresAt: 1 }, { sparse: true });

// ============================================
// Static Methods
// ============================================

DashboardRoleSchema.statics.getUserRole = async function(
  discordId: string,
  guildId: string
): Promise<DashboardRole> {
  const roleDoc = await this.findOne({ discordId, guildId });
  
  // Check if role has expired
  if (roleDoc?.expiresAt && roleDoc.expiresAt < new Date()) {
    await this.deleteOne({ discordId, guildId });
    return DashboardRole.USER;
  }
  
  return roleDoc?.role ?? DashboardRole.USER;
};

DashboardRoleSchema.statics.setUserRole = async function(
  discordId: string,
  guildId: string,
  role: DashboardRole,
  assignedBy: string,
  options?: { expiresAt?: Date; reason?: string }
): Promise<IDashboardRoleDoc> {
  return this.findOneAndUpdate(
    { discordId, guildId },
    { 
      role, 
      assignedBy, 
      assignedAt: new Date(),
      expiresAt: options?.expiresAt || null,
      reason: options?.reason || null,
    },
    { upsert: true, new: true }
  );
};

DashboardRoleSchema.statics.getGuildRoles = async function(
  guildId: string
): Promise<IDashboardRoleDoc[]> {
  return this.find({ 
    guildId,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ role: -1 });
};

DashboardRoleSchema.statics.removeUserRole = async function(
  discordId: string,
  guildId: string
): Promise<boolean> {
  const result = await this.deleteOne({ discordId, guildId });
  return result.deletedCount > 0;
};

DashboardRoleSchema.statics.getUserPermissions = async function(
  discordId: string,
  guildId: string
): Promise<string[]> {
  const roleDoc = await this.findOne({ discordId, guildId });
  
  // Check if role has expired
  let role = DashboardRole.USER;
  if (roleDoc) {
    if (roleDoc.expiresAt && roleDoc.expiresAt < new Date()) {
      await this.deleteOne({ discordId, guildId });
    } else {
      role = roleDoc.role;
    }
  }
  
  // Get base permissions for role
  const basePermissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[DashboardRole.USER];
  
  // If owner or bot owner, return all permissions indicator
  if (role === DashboardRole.OWNER || role === DashboardRole.BOT_OWNER) {
    return ['*'];
  }
  
  // Merge with custom permissions
  const customPermissions = roleDoc?.permissions || [];
  return [...new Set([...basePermissions.map(p => p.toString()), ...customPermissions])];
};

DashboardRoleSchema.statics.hasPermission = async function(
  discordId: string,
  guildId: string,
  permission: string
): Promise<boolean> {
  const roleDoc = await this.findOne({ discordId, guildId });
  
  // Check if role has expired
  let role = DashboardRole.USER;
  if (roleDoc) {
    if (roleDoc.expiresAt && roleDoc.expiresAt < new Date()) {
      await this.deleteOne({ discordId, guildId });
    } else {
      role = roleDoc.role;
    }
  }
  
  // Owner and bot owner have all permissions
  if (role === DashboardRole.OWNER || role === DashboardRole.BOT_OWNER) {
    return true;
  }
  
  const basePermissions = ROLE_PERMISSIONS[role] || [];
  const customPermissions = roleDoc?.permissions || [];
  const allPermissions = [...basePermissions.map(p => p.toString()), ...customPermissions];
  
  return allPermissions.includes(permission);
};

DashboardRoleSchema.statics.getAdmins = async function(
  guildId: string
): Promise<IDashboardRoleDoc[]> {
  return this.find({ 
    guildId, 
    role: { $gte: DashboardRole.ADMIN },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ role: -1 });
};

DashboardRoleSchema.statics.getModerators = async function(
  guildId: string
): Promise<IDashboardRoleDoc[]> {
  return this.find({ 
    guildId, 
    role: { $gte: DashboardRole.MODERATOR },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ role: -1 });
};

DashboardRoleSchema.statics.bulkSetRole = async function(
  guildId: string,
  discordIds: string[],
  role: DashboardRole,
  assignedBy: string
): Promise<number> {
  const operations = discordIds.map(discordId => ({
    updateOne: {
      filter: { discordId, guildId },
      update: {
        $set: {
          role,
          assignedBy,
          assignedAt: new Date(),
        }
      },
      upsert: true,
    }
  }));
  
  const result = await this.bulkWrite(operations);
  return result.upsertedCount + result.modifiedCount;
};

DashboardRoleSchema.statics.cleanupExpiredRoles = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// ============================================
// Export Model
// ============================================

export const DashboardRoleModel = mongoose.model<IDashboardRoleDoc, IDashboardRoleModel>(
  'DashboardRole', 
  DashboardRoleSchema
);
