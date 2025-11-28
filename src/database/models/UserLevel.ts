// ===========================================
// ASTRA BOT - User Level Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IUserLevel } from '../../shared/types/index.js';
import { calculateXpForLevel } from '../../shared/constants/index.js';

// ============================================
// Interface Definitions
// ============================================

export interface IUserLevelDocument extends IUserLevel, Document {
  // Instance methods
  addXp(amount: number, multiplier?: number): Promise<{ leveledUp: boolean; newLevel: number; levelsGained: number }>;
  addVoiceXp(minutes: number, xpPerMinute: number): Promise<{ leveledUp: boolean; newLevel: number }>;
  setLevel(level: number): Promise<void>;
  resetProgress(): Promise<void>;
  getXpProgress(): { current: number; needed: number; percentage: number };
}

export interface IUserLevelModel extends Model<IUserLevelDocument> {
  // Static methods
  getOrCreate(discordId: string, guildId: string): Promise<IUserLevelDocument>;
  getLeaderboard(guildId: string, limit?: number, offset?: number): Promise<IUserLevelDocument[]>;
  getUserRank(discordId: string, guildId: string): Promise<number | null>;
  getGuildStats(guildId: string): Promise<{ totalUsers: number; totalXp: number; avgLevel: number }>;
  bulkAddXp(guildId: string, userIds: string[], amount: number): Promise<void>;
}

// ============================================
// Schema Definition
// ============================================

const UserLevelSchema = new Schema<IUserLevelDocument>(
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
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    totalXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    messages: {
      type: Number,
      default: 0,
      min: 0,
    },
    voiceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastXpGain: {
      type: Date,
      default: Date.now,
    },
    lastVoiceXpGain: {
      type: Date,
      default: null,
    },
    // Weekly/Monthly stats for tracking
    weeklyXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWeeklyReset: {
      type: Date,
      default: Date.now,
    },
    lastMonthlyReset: {
      type: Date,
      default: Date.now,
    },
    // Streak tracking
    dailyStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDailyActivity: {
      type: Date,
      default: null,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Card customization (per-user override)
    cardConfig: {
      backgroundColor: { type: String, default: null },
      progressColor: { type: String, default: null },
      textColor: { type: String, default: null },
      backgroundImage: { type: String, default: null },
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

UserLevelSchema.index({ guildId: 1, discordId: 1 }, { unique: true });
UserLevelSchema.index({ guildId: 1, totalXp: -1 }); // For leaderboards
UserLevelSchema.index({ guildId: 1, level: -1 }); // For level-based queries
UserLevelSchema.index({ guildId: 1, weeklyXp: -1 }); // For weekly leaderboards
UserLevelSchema.index({ guildId: 1, monthlyXp: -1 }); // For monthly leaderboards
UserLevelSchema.index({ lastXpGain: 1 }); // For cleanup/activity queries

// ============================================
// Instance Methods
// ============================================

UserLevelSchema.methods.addXp = async function(
  amount: number, 
  multiplier: number = 1
): Promise<{ leveledUp: boolean; newLevel: number; levelsGained: number }> {
  const xpToAdd = Math.floor(amount * multiplier);
  const oldLevel = this.level;
  
  this.xp += xpToAdd;
  this.totalXp += xpToAdd;
  this.weeklyXp += xpToAdd;
  this.monthlyXp += xpToAdd;
  this.messages += 1;
  this.lastXpGain = new Date();
  
  // Update daily streak
  const now = new Date();
  const lastActivity = this.lastDailyActivity;
  if (lastActivity) {
    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastActivity >= 24 && hoursSinceLastActivity < 48) {
      this.dailyStreak += 1;
      if (this.dailyStreak > this.longestStreak) {
        this.longestStreak = this.dailyStreak;
      }
    } else if (hoursSinceLastActivity >= 48) {
      this.dailyStreak = 1;
    }
  } else {
    this.dailyStreak = 1;
  }
  this.lastDailyActivity = now;
  
  // Check for level ups
  let leveledUp = false;
  let xpNeeded = calculateXpForLevel(this.level + 1);
  
  while (this.xp >= xpNeeded) {
    this.xp -= xpNeeded;
    this.level += 1;
    leveledUp = true;
    xpNeeded = calculateXpForLevel(this.level + 1);
  }
  
  await this.save();
  
  return {
    leveledUp,
    newLevel: this.level,
    levelsGained: this.level - oldLevel,
  };
};

UserLevelSchema.methods.addVoiceXp = async function(
  minutes: number,
  xpPerMinute: number
): Promise<{ leveledUp: boolean; newLevel: number }> {
  const xpToAdd = Math.floor(minutes * xpPerMinute);
  const oldLevel = this.level;
  
  this.xp += xpToAdd;
  this.totalXp += xpToAdd;
  this.weeklyXp += xpToAdd;
  this.monthlyXp += xpToAdd;
  this.voiceMinutes += minutes;
  this.lastVoiceXpGain = new Date();
  
  // Check for level ups
  let leveledUp = false;
  let xpNeeded = calculateXpForLevel(this.level + 1);
  
  while (this.xp >= xpNeeded) {
    this.xp -= xpNeeded;
    this.level += 1;
    leveledUp = true;
    xpNeeded = calculateXpForLevel(this.level + 1);
  }
  
  await this.save();
  
  return {
    leveledUp,
    newLevel: this.level,
  };
};

UserLevelSchema.methods.setLevel = async function(level: number): Promise<void> {
  this.level = Math.max(0, Math.min(1000, level));
  this.xp = 0;
  
  // Recalculate total XP
  let totalXp = 0;
  for (let i = 1; i <= this.level; i++) {
    totalXp += calculateXpForLevel(i);
  }
  this.totalXp = totalXp;
  
  await this.save();
};

UserLevelSchema.methods.resetProgress = async function(): Promise<void> {
  this.xp = 0;
  this.level = 0;
  this.totalXp = 0;
  this.messages = 0;
  this.voiceMinutes = 0;
  this.weeklyXp = 0;
  this.monthlyXp = 0;
  this.dailyStreak = 0;
  await this.save();
};

UserLevelSchema.methods.getXpProgress = function(): { current: number; needed: number; percentage: number } {
  const needed = calculateXpForLevel(this.level + 1);
  return {
    current: this.xp,
    needed,
    percentage: Math.min(100, Math.floor((this.xp / needed) * 100)),
  };
};

// ============================================
// Static Methods
// ============================================

UserLevelSchema.statics.getOrCreate = async function(
  discordId: string, 
  guildId: string
): Promise<IUserLevelDocument> {
  let userLevel = await this.findOne({ discordId, guildId });
  if (!userLevel) {
    userLevel = await this.create({ discordId, guildId });
  }
  return userLevel;
};

UserLevelSchema.statics.getLeaderboard = async function(
  guildId: string, 
  limit: number = 10,
  offset: number = 0
): Promise<IUserLevelDocument[]> {
  return this.find({ guildId })
    .sort({ totalXp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
};

UserLevelSchema.statics.getUserRank = async function(
  discordId: string, 
  guildId: string
): Promise<number | null> {
  const userLevel = await this.findOne({ discordId, guildId });
  if (!userLevel) return null;
  
  const rank = await this.countDocuments({
    guildId,
    totalXp: { $gt: userLevel.totalXp },
  });
  
  return rank + 1;
};

UserLevelSchema.statics.getGuildStats = async function(
  guildId: string
): Promise<{ totalUsers: number; totalXp: number; avgLevel: number }> {
  const result = await this.aggregate([
    { $match: { guildId } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalXp: { $sum: '$totalXp' },
        avgLevel: { $avg: '$level' },
      },
    },
  ]);
  
  if (result.length === 0) {
    return { totalUsers: 0, totalXp: 0, avgLevel: 0 };
  }
  
  return {
    totalUsers: result[0].totalUsers,
    totalXp: result[0].totalXp,
    avgLevel: Math.round(result[0].avgLevel * 100) / 100,
  };
};

UserLevelSchema.statics.bulkAddXp = async function(
  guildId: string,
  userIds: string[],
  amount: number
): Promise<void> {
  await this.updateMany(
    { guildId, discordId: { $in: userIds } },
    { 
      $inc: { xp: amount, totalXp: amount, weeklyXp: amount, monthlyXp: amount },
      $set: { lastXpGain: new Date() }
    }
  );
};

// ============================================
// Export Model
// ============================================

export const UserLevel = mongoose.model<IUserLevelDocument, IUserLevelModel>(
  'UserLevel', 
  UserLevelSchema
);
