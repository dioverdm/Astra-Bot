// ===========================================
// ASTRA BOT - Moderation Log Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IModerationLog } from '../../shared/types/index.js';

// ============================================
// Types
// ============================================

export type ModerationAction = 
  | 'warn' 
  | 'mute' 
  | 'unmute' 
  | 'kick' 
  | 'ban' 
  | 'unban' 
  | 'timeout' 
  | 'untimeout'
  | 'softban'
  | 'note'
  | 'purge';

// ============================================
// Interface Definitions
// ============================================

export interface IModerationLogDocument extends IModerationLog, Document {
  // Instance methods
  updateReason(reason: string, updatedBy: string): Promise<void>;
  revoke(revokedBy: string, revokeReason?: string): Promise<void>;
}

export interface IModerationLogModel extends Model<IModerationLogDocument> {
  // Static methods
  getNextCaseId(guildId: string): Promise<number>;
  getUserHistory(guildId: string, targetId: string, limit?: number): Promise<IModerationLogDocument[]>;
  getRecentLogs(guildId: string, limit?: number): Promise<IModerationLogDocument[]>;
  getModeratorStats(guildId: string, moderatorId: string): Promise<Record<string, number>>;
  getUserWarnings(guildId: string, targetId: string): Promise<number>;
  createLog(data: Partial<IModerationLogDocument>): Promise<IModerationLogDocument>;
}

// ============================================
// Schema Definition
// ============================================

const ModerationLogSchema = new Schema<IModerationLogDocument>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    moderatorId: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['warn', 'mute', 'unmute', 'kick', 'ban', 'unban', 'timeout', 'untimeout', 'softban', 'note', 'purge'],
      required: true,
    },
    reason: {
      type: String,
      default: 'No reason provided',
      maxlength: 1000,
    },
    duration: {
      type: Number,
      default: null,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    caseId: {
      type: Number,
      required: true,
    },
    // Additional context
    messageId: {
      type: String,
      default: null, // For linking to mod log message
    },
    channelId: {
      type: String,
      default: null, // For purge actions
    },
    messagesDeleted: {
      type: Number,
      default: null, // For purge actions
    },
    // Revocation
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: String,
      default: null,
    },
    revokeReason: {
      type: String,
      default: null,
    },
    // Edit history
    edited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      reason: { type: String },
      editedBy: { type: String },
      editedAt: { type: Date, default: Date.now },
    }],
    // Reference to related case (e.g., unmute references original mute)
    relatedCaseId: {
      type: Number,
      default: null,
    },
    // Auto-mod flag
    automod: {
      type: Boolean,
      default: false,
    },
    automodRule: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================
// Indexes
// ============================================

ModerationLogSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
ModerationLogSchema.index({ guildId: 1, targetId: 1, timestamp: -1 });
ModerationLogSchema.index({ guildId: 1, moderatorId: 1, timestamp: -1 });
ModerationLogSchema.index({ guildId: 1, timestamp: -1 });
ModerationLogSchema.index({ guildId: 1, action: 1 });
ModerationLogSchema.index({ expiresAt: 1 }, { sparse: true }); // For expiring punishments
ModerationLogSchema.index({ guildId: 1, targetId: 1, action: 1, revoked: 1 }); // For counting active warnings

// ============================================
// Instance Methods
// ============================================

ModerationLogSchema.methods.updateReason = async function(
  reason: string, 
  updatedBy: string
): Promise<void> {
  // Store old reason in history
  this.editHistory.push({
    reason: this.reason,
    editedBy: updatedBy,
    editedAt: new Date(),
  });
  
  this.reason = reason;
  this.edited = true;
  await this.save();
};

ModerationLogSchema.methods.revoke = async function(
  revokedBy: string, 
  revokeReason?: string
): Promise<void> {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokeReason = revokeReason || null;
  await this.save();
};

// ============================================
// Static Methods
// ============================================

ModerationLogSchema.statics.getNextCaseId = async function(
  guildId: string
): Promise<number> {
  const lastCase = await this.findOne({ guildId }).sort({ caseId: -1 }).lean();
  return lastCase ? (lastCase as any).caseId + 1 : 1;
};

ModerationLogSchema.statics.getUserHistory = async function(
  guildId: string,
  targetId: string,
  limit: number = 10
): Promise<IModerationLogDocument[]> {
  return this.find({ guildId, targetId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

ModerationLogSchema.statics.getRecentLogs = async function(
  guildId: string,
  limit: number = 20
): Promise<IModerationLogDocument[]> {
  return this.find({ guildId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

ModerationLogSchema.statics.getModeratorStats = async function(
  guildId: string,
  moderatorId: string
): Promise<Record<string, number>> {
  const stats = await this.aggregate([
    { $match: { guildId, moderatorId } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
  ]);
  
  return stats.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

ModerationLogSchema.statics.getUserWarnings = async function(
  guildId: string,
  targetId: string
): Promise<number> {
  return this.countDocuments({ 
    guildId, 
    targetId, 
    action: 'warn',
    revoked: false,
  });
};

ModerationLogSchema.statics.createLog = async function(
  data: Partial<IModerationLogDocument>
): Promise<IModerationLogDocument> {
  const lastCase = await this.findOne({ guildId: data.guildId }).sort({ caseId: -1 }).lean();
  const caseId = lastCase ? (lastCase as any).caseId + 1 : 1;
  return this.create({ ...data, caseId }) as Promise<IModerationLogDocument>;
};

// ============================================
// Export Model
// ============================================

export const ModerationLog = mongoose.model<IModerationLogDocument, IModerationLogModel>(
  'ModerationLog', 
  ModerationLogSchema
);
