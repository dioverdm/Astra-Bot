// ===========================================
// ASTRA BOT - User Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IUser } from '../../shared/types/index.js';

// ============================================
// Interface Definitions
// ============================================

export interface IUserDocument extends IUser, Document {
  // Instance methods
  updateProfile(data: Partial<IUser>): Promise<void>;
  updateTokens(accessToken: string, refreshToken: string): Promise<void>;
  addGuild(guildId: string): Promise<void>;
  removeGuild(guildId: string): Promise<void>;
  isInGuild(guildId: string): boolean;
  getAvatarUrl(size?: number): string | null;
  getBannerUrl(size?: number): string | null;
}

export interface IUserModel extends Model<IUserDocument> {
  // Static methods
  findByDiscordId(discordId: string): Promise<IUserDocument | null>;
  findOrCreate(discordId: string, data: Partial<IUser>): Promise<IUserDocument>;
  updateFromDiscord(discordId: string, data: Partial<IUser>): Promise<IUserDocument | null>;
  searchUsers(query: string, limit?: number): Promise<IUserDocument[]>;
  getActiveUsers(since: Date): Promise<IUserDocument[]>;
  cleanupInactiveUsers(olderThan: Date): Promise<number>;
}

// ============================================
// Schema Definition
// ============================================

const UserSchema = new Schema<IUserDocument>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    globalName: {
      type: String,
      default: null,
    },
    discriminator: {
      type: String,
      default: '0',
    },
    avatar: {
      type: String,
      default: null,
    },
    banner: {
      type: String,
      default: null,
    },
    accentColor: {
      type: Number,
      default: null,
    },
    
    // OAuth tokens (sensitive - excluded from default queries)
    accessToken: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
      select: false,
    },
    
    // Guild associations
    guilds: [{
      type: String,
    }],
    
    // User preferences
    preferences: {
      theme: { type: String, default: 'dark' },
      language: { type: String, default: 'en' },
      notifications: {
        email: { type: Boolean, default: false },
        discord: { type: Boolean, default: true },
      },
      privacy: {
        showOnLeaderboard: { type: Boolean, default: true },
        showProfile: { type: Boolean, default: true },
        allowDMs: { type: Boolean, default: true },
      },
    },
    
    // Premium/Subscription status
    premium: {
      active: { type: Boolean, default: false },
      tier: { type: Number, default: 0, min: 0, max: 3 },
      since: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      lifetimeSpent: { type: Number, default: 0, min: 0 },
    },
    
    // Global stats (across all guilds)
    globalStats: {
      totalMessages: { type: Number, default: 0, min: 0 },
      totalCommands: { type: Number, default: 0, min: 0 },
      totalGuilds: { type: Number, default: 0, min: 0 },
      firstSeen: { type: Date, default: Date.now },
      lastSeen: { type: Date, default: Date.now },
    },
    
    // Badges/Achievements
    badges: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String },
      icon: { type: String },
      earnedAt: { type: Date, default: Date.now },
      rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
    }],
    
    // Bot owner/staff flags
    flags: {
      isBotOwner: { type: Boolean, default: false },
      isStaff: { type: Boolean, default: false },
      isBetaTester: { type: Boolean, default: false },
      isBanned: { type: Boolean, default: false },
      banReason: { type: String, default: null },
      bannedAt: { type: Date, default: null },
    },
    
    // API rate limiting
    rateLimit: {
      requests: { type: Number, default: 0 },
      resetAt: { type: Date, default: null },
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

UserSchema.index({ username: 'text', globalName: 'text' });
UserSchema.index({ 'globalStats.lastSeen': -1 });
UserSchema.index({ 'premium.active': 1 });
UserSchema.index({ 'flags.isBanned': 1 });
UserSchema.index({ createdAt: -1 });

// ============================================
// Instance Methods
// ============================================

UserSchema.methods.updateProfile = async function(data: Partial<IUser>): Promise<void> {
  const allowedFields = ['username', 'globalName', 'avatar', 'banner', 'accentColor'];
  for (const field of allowedFields) {
    if (data[field as keyof IUser] !== undefined) {
      (this as any)[field] = data[field as keyof IUser];
    }
  }
  this.globalStats.lastSeen = new Date();
  await this.save();
};

UserSchema.methods.updateTokens = async function(
  accessToken: string, 
  refreshToken: string
): Promise<void> {
  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  this.tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await this.save();
};

UserSchema.methods.addGuild = async function(guildId: string): Promise<void> {
  if (!this.guilds.includes(guildId)) {
    this.guilds.push(guildId);
    this.globalStats.totalGuilds = this.guilds.length;
    await this.save();
  }
};

UserSchema.methods.removeGuild = async function(guildId: string): Promise<void> {
  const index = this.guilds.indexOf(guildId);
  if (index > -1) {
    this.guilds.splice(index, 1);
    this.globalStats.totalGuilds = this.guilds.length;
    await this.save();
  }
};

UserSchema.methods.isInGuild = function(guildId: string): boolean {
  return this.guilds.includes(guildId);
};

UserSchema.methods.getAvatarUrl = function(size: number = 256): string | null {
  if (!this.avatar) return null;
  const ext = this.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${this.discordId}/${this.avatar}.${ext}?size=${size}`;
};

UserSchema.methods.getBannerUrl = function(size: number = 600): string | null {
  if (!this.banner) return null;
  const ext = this.banner.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${this.discordId}/${this.banner}.${ext}?size=${size}`;
};

// ============================================
// Static Methods
// ============================================

UserSchema.statics.findByDiscordId = async function(
  discordId: string
): Promise<IUserDocument | null> {
  return this.findOne({ discordId });
};

UserSchema.statics.findOrCreate = async function(
  discordId: string, 
  data: Partial<IUser>
): Promise<IUserDocument> {
  let user = await this.findOne({ discordId });
  if (!user) {
    user = await this.create({ discordId, ...data });
  }
  return user;
};

UserSchema.statics.updateFromDiscord = async function(
  discordId: string, 
  data: Partial<IUser>
): Promise<IUserDocument | null> {
  return this.findOneAndUpdate(
    { discordId },
    { 
      $set: { 
        ...data, 
        'globalStats.lastSeen': new Date() 
      } 
    },
    { new: true, upsert: true }
  );
};

UserSchema.statics.searchUsers = async function(
  query: string, 
  limit: number = 20
): Promise<IUserDocument[]> {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

UserSchema.statics.getActiveUsers = async function(
  since: Date
): Promise<IUserDocument[]> {
  return this.find({ 'globalStats.lastSeen': { $gte: since } })
    .sort({ 'globalStats.lastSeen': -1 })
    .lean();
};

UserSchema.statics.cleanupInactiveUsers = async function(
  olderThan: Date
): Promise<number> {
  const result = await this.deleteMany({
    'globalStats.lastSeen': { $lt: olderThan },
    'premium.active': false,
    'flags.isStaff': false,
    'flags.isBotOwner': false,
  });
  return result.deletedCount;
};

// ============================================
// Pre-save Middleware
// ============================================

UserSchema.pre('save', function() {
  // Update lastSeen on every save
  if (this.globalStats) {
    this.globalStats.lastSeen = new Date();
  }
});

// ============================================
// Export Model
// ============================================

export const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
