// ===========================================
// ASTRA BOT - Guild Configuration Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IGuildConfig } from '../../shared/types/index.js';

// ============================================
// Interface Definitions
// ============================================

export interface IGuildConfigDocument extends IGuildConfig, Document {
  // Instance methods
  enableModule(module: string): Promise<void>;
  disableModule(module: string): Promise<void>;
  isModuleEnabled(module: string): boolean;
}

export interface IGuildConfigModel extends Model<IGuildConfigDocument> {
  // Static methods
  getOrCreate(guildId: string, guildName: string): Promise<IGuildConfigDocument>;
  getByGuildId(guildId: string): Promise<IGuildConfigDocument | null>;
  updateModuleSettings(guildId: string, module: string, settings: Record<string, any>): Promise<IGuildConfigDocument | null>;
}

// ============================================
// Sub-schemas for Automod
// ============================================

const AutomodActionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['warn', 'mute', 'kick', 'ban', 'delete', 'timeout'],
    default: 'delete' 
  },
  duration: { type: Number, default: null }, // For mute/timeout in seconds
  notify: { type: Boolean, default: true },
}, { _id: false });

const AutomodSchema = new Schema({
  enabled: { type: Boolean, default: false },
  
  // Anti-Spam
  antiSpam: { 
    enabled: { type: Boolean, default: false },
    maxMessages: { type: Number, default: 5, min: 2, max: 20 },
    interval: { type: Number, default: 5, min: 1, max: 60 }, // seconds
    action: { type: String, enum: ['warn', 'mute', 'kick', 'ban'], default: 'warn' },
    muteDuration: { type: Number, default: 300000 }, // ms
  },
  
  // Anti-Links
  antiLinks: {
    enabled: { type: Boolean, default: false },
    allowedDomains: [{ type: String }],
    action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' },
  },
  
  // Anti-Invites
  antiInvites: {
    enabled: { type: Boolean, default: false },
    allowOwnServer: { type: Boolean, default: true },
    action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' },
  },
  
  // Caps Lock
  antiCaps: {
    enabled: { type: Boolean, default: false },
    minLength: { type: Number, default: 10, min: 5, max: 100 },
    maxPercentage: { type: Number, default: 70, min: 50, max: 100 },
  },
  
  // Mass Mentions
  antiMassMention: {
    enabled: { type: Boolean, default: false },
    maxMentions: { type: Number, default: 5, min: 1, max: 50 },
    action: { type: String, enum: ['delete', 'warn', 'mute', 'kick'], default: 'delete' },
  },
  
  // Bad Words
  badWords: [{ type: String }],
  
  // Max Emojis
  maxEmojis: { type: Number, default: 10, min: 1, max: 100 },
  
  // Ignored channels and roles
  ignoredChannels: [{ type: String }],
  ignoredRoles: [{ type: String }],
}, { _id: false });

// ============================================
// Sub-schemas for Moderation
// ============================================

const ModerationConfigSchema = new Schema({
  enabled: { type: Boolean, default: true },
  logChannelId: { type: String, default: null },
  modRoles: [{ type: String }],
  automod: { type: AutomodSchema, default: () => ({}) },
  mutedRoleId: { type: String, default: null },
  
  // Default durations (in seconds)
  defaultMuteDuration: { type: Number, default: 3600 }, // 1 hour
  defaultTimeoutDuration: { type: Number, default: 600 }, // 10 minutes
  
  // Auto-punishment escalation
  autoPunishment: {
    enabled: { type: Boolean, default: false },
    warnThreshold: { type: Number, default: 3 },
    warnAction: { type: String, enum: ['mute', 'kick', 'ban', 'timeout'], default: 'mute' },
  },
  
  // DM on action
  dmOnAction: { type: Boolean, default: true },
  
  // Appeal settings
  appealEnabled: { type: Boolean, default: false },
  appealChannelId: { type: String, default: null },
}, { _id: false });

// ============================================
// Sub-schemas for Leveling
// ============================================

const RoleRewardSchema = new Schema({
  level: { type: Number, required: true, min: 1, max: 1000 },
  roleId: { type: String, required: true },
}, { _id: false });

const MultiplierSchema = new Schema({
  roleId: { type: String, required: true },
  multiplier: { type: Number, required: true, min: 0.1, max: 10 },
}, { _id: false });

const LevelCardConfigSchema = new Schema({
  style: { type: String, enum: ['modern', 'classic', 'minimal', 'neon', 'glass', 'gradient'], default: 'modern' },
  backgroundColor: { type: String, default: '#1a1a2e' },
  progressColor: { type: String, default: '#8b5cf6' },
  textColor: { type: String, default: '#ffffff' },
  accentColor: { type: String, default: '#a78bfa' },
  showAvatar: { type: Boolean, default: true },
  showRank: { type: Boolean, default: true },
  roundedCorners: { type: Boolean, default: true },
  showProgressText: { type: Boolean, default: true },
  backgroundImage: { type: String, default: null },
}, { _id: false });

const LevelUpEmbedSchema = new Schema({
  title: { type: String, default: '🎉 Level Up!' },
  description: { type: String, default: 'Congratulations {user}!\n\nYou have reached **Level {level}**!' },
  color: { type: String, default: '#5865F2' },
  thumbnail: { type: String, default: '{avatar}' },
  image: { type: String, default: null },
  footer: { type: String, default: null },
  timestamp: { type: Boolean, default: true },
}, { _id: false });

const LevelingConfigSchema = new Schema({
  enabled: { type: Boolean, default: true },
  xpPerMessage: { type: Number, default: 15, min: 1, max: 100 },
  xpCooldown: { type: Number, default: 60, min: 0, max: 300 },
  xpMultiplier: { type: Number, default: 1, min: 0.1, max: 10 },
  
  // Level up notifications
  levelUpChannelId: { type: String, default: null },
  levelUpMessageType: { type: String, enum: ['message', 'embed', 'both', 'none'], default: 'embed' },
  levelUpMessage: { 
    type: String, 
    default: '🎉 Congratulations {user}! You reached level **{level}**!' 
  },
  levelUpEmbed: { type: LevelUpEmbedSchema, default: () => ({}) },
  announceOnlyOnReward: { type: Boolean, default: false },
  
  // Role rewards
  roleRewards: [RoleRewardSchema],
  stackRoles: { type: Boolean, default: true }, // Keep all earned roles or only highest
  
  // XP exclusions
  noXpChannels: [{ type: String }],
  noXpRoles: [{ type: String }],
  
  // XP boosts
  doubleXpChannels: [{ type: String }],
  doubleXpRoles: [{ type: String }],
  multipliers: [MultiplierSchema],
  
  // Card customization
  cardConfig: { type: LevelCardConfigSchema, default: () => ({}) },
  
  // Voice XP
  voiceXpEnabled: { type: Boolean, default: false },
  voiceXpPerMinute: { type: Number, default: 5, min: 1, max: 50 },
  voiceXpCooldown: { type: Number, default: 60, min: 0, max: 300 },
}, { _id: false });

// ============================================
// Sub-schemas for Economy
// ============================================

const ShopItemSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  price: { type: Number, required: true, min: 0, max: 1000000000 },
  type: { type: String, enum: ['role', 'item', 'collectible', 'boost', 'lootbox', 'badge'], default: 'item' },
  roleId: { type: String, default: null },
  emoji: { type: String, default: '📦' },
  enabled: { type: Boolean, default: true },
  limited: { type: Boolean, default: false },
  stock: { type: Number, default: null },
  maxPerUser: { type: Number, default: null },
  requiredLevel: { type: Number, default: null },
  requiredRole: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  // New fields
  category: { type: String, default: 'general', maxlength: 50 },
  featured: { type: Boolean, default: false },
  salePrice: { type: Number, default: null },
  saleEnds: { type: Date, default: null },
  duration: { type: Number, default: null }, // For temporary items (seconds)
  boostMultiplier: { type: Number, default: null },
  boostType: { type: String, enum: ['xp', 'coins', 'both', null, ''], default: null },
}, { _id: false });

const EconomyConfigSchema = new Schema({
  enabled: { type: Boolean, default: true },
  currencyName: { type: String, default: 'Astra Coins', maxlength: 50 },
  currencySymbol: { type: String, default: '✨', maxlength: 10 },
  
  // Starting & Limits
  startingBalance: { type: Number, default: 0, min: 0 },
  maxBalance: { type: Number, default: 1000000000, min: 0 },
  maxBank: { type: Number, default: 1000000000, min: 0 },
  
  // Daily rewards
  dailyReward: { type: Number, default: 100, min: 0, max: 1000000 },
  dailyStreakBonus: { type: Number, default: 10, min: 0, max: 100 }, // % per day
  dailyStreakMax: { type: Number, default: 7, min: 0, max: 30 },
  dailyStreak: {
    enabled: { type: Boolean, default: true },
    bonusPerDay: { type: Number, default: 10, min: 0, max: 1000 },
    maxBonus: { type: Number, default: 100, min: 0, max: 10000 },
  },
  
  // Work command
  workMinReward: { type: Number, default: 50, min: 0 },
  workMaxReward: { type: Number, default: 200, min: 0 },
  workReward: {
    min: { type: Number, default: 50, min: 0 },
    max: { type: Number, default: 150, min: 0 },
  },
  workCooldown: { type: Number, default: 3600, min: 0, max: 86400 }, // seconds
  
  // Crime command
  crimeMinReward: { type: Number, default: 100, min: 0 },
  crimeMaxReward: { type: Number, default: 500, min: 0 },
  crimeCooldown: { type: Number, default: 7200, min: 0, max: 86400 },
  crimeSuccessRate: { type: Number, default: 50, min: 0, max: 100 },
  crimeFinePercent: { type: Number, default: 25, min: 0, max: 100 },
  
  // Gambling
  gamblingEnabled: { type: Boolean, default: true },
  gamblingMinBet: { type: Number, default: 10, min: 0 },
  gamblingMaxBet: { type: Number, default: 10000, min: 0 },
  gamblingCooldown: { type: Number, default: 30, min: 0 },
  gambling: {
    enabled: { type: Boolean, default: true },
    minBet: { type: Number, default: 10, min: 0 },
    maxBet: { type: Number, default: 10000, min: 0 },
    cooldown: { type: Number, default: 30, min: 0 }, // seconds
  },
  
  // Bank
  bankEnabled: { type: Boolean, default: true },
  bankInterestRate: { type: Number, default: 1, min: 0, max: 100 }, // percentage
  bankInterestInterval: { type: Number, default: 86400, min: 0 }, // daily
  
  // Shop
  shopItems: [ShopItemSchema],
  
  // Robbery
  robberyEnabled: { type: Boolean, default: false },
  robberyMinBalance: { type: Number, default: 1000, min: 0 },
  robberySuccessRate: { type: Number, default: 40, min: 0, max: 100 },
  robberyMaxPercent: { type: Number, default: 20, min: 0, max: 100 },
  robberyCooldown: { type: Number, default: 7200, min: 0 },
  robberyJailTime: { type: Number, default: 600, min: 0 },
  robbery: {
    enabled: { type: Boolean, default: false },
    successRate: { type: Number, default: 40, min: 0, max: 100 },
    maxSteal: { type: Number, default: 500, min: 0 },
    cooldown: { type: Number, default: 7200, min: 0 }, // 2 hours
    jailTime: { type: Number, default: 1800, min: 0 }, // 30 minutes on fail
  },
}, { _id: false });

// ============================================
// Sub-schemas for Welcome
// ============================================

const WelcomeEmbedSchema = new Schema({
  enabled: { type: Boolean, default: true },
  color: { type: String, default: '#9B59B6' },
  title: { type: String, default: 'Welcome!' },
  description: { type: String, default: 'Welcome to the server, {user}! 🎉' },
  thumbnail: { type: Boolean, default: true },
  image: { type: String, default: null },
  footer: { type: String, default: null },
  timestamp: { type: Boolean, default: true },
}, { _id: false });

const WelcomeConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  
  // Join message
  join: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Welcome {user} to **{server}**!' },
    embed: { type: WelcomeEmbedSchema, default: () => ({}) },
    useEmbed: { type: Boolean, default: true },
  },
  
  // Leave message
  leave: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: '{username} has left the server. Goodbye! 👋' },
    useEmbed: { type: Boolean, default: false },
  },
  
  // DM welcome
  dm: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'Welcome to **{server}**!' },
    useEmbed: { type: Boolean, default: false },
  },
  
  // Auto roles
  autoRoles: [{ type: String }],
  
  // Verification
  verification: {
    enabled: { type: Boolean, default: false },
    roleId: { type: String, default: null },
    channelId: { type: String, default: null },
    type: { type: String, enum: ['button', 'reaction', 'captcha'], default: 'button' },
  },
}, { _id: false });

// ============================================
// Sub-schemas for Tickets
// ============================================

const TicketCategorySchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  emoji: { type: String, default: '🎫' },
  staffRoles: [{ type: String }],
  priority: { type: Number, default: 0 },
}, { _id: false });

const TicketConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  categoryId: { type: String, default: null }, // Discord category for ticket channels
  logChannelId: { type: String, default: null },
  supportRoles: [{ type: String }],
  
  // Messages
  openMessage: { type: String, default: 'Thank you for creating a ticket! Support will be with you shortly.' },
  closeMessage: { type: String, default: 'This ticket has been closed. Thank you for contacting support!' },
  
  // Settings
  closeConfirmation: { type: Boolean, default: true },
  transcriptEnabled: { type: Boolean, default: true },
  transcriptChannelId: { type: String, default: null },
  maxTicketsPerUser: { type: Number, default: 3, min: 1, max: 10 },
  autoCloseInactive: { type: Number, default: null, min: 3600 }, // seconds, null = disabled
  
  // Categories
  categories: [TicketCategorySchema],
  
  // Ticket panel
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  
  // Feedback
  feedbackEnabled: { type: Boolean, default: false },
  feedbackChannelId: { type: String, default: null },
}, { _id: false });

// ============================================
// Sub-schemas for Music
// ============================================

const MusicConfigSchema = new Schema({
  enabled: { type: Boolean, default: true },
  djRoleId: { type: String, default: null },
  defaultVolume: { type: Number, default: 50, min: 1, max: 100 },
  maxQueueSize: { type: Number, default: 100, min: 10, max: 500 },
  maxSongDuration: { type: Number, default: 60, min: 1, max: 180 }, // minutes
  allowFilters: { type: Boolean, default: true },
  leaveOnEmpty: { type: Boolean, default: true },
  leaveOnEmptyCooldown: { type: Number, default: 60, min: 10, max: 300 }, // seconds
  leaveOnEnd: { type: Boolean, default: false },
  leaveOnEndCooldown: { type: Number, default: 60, min: 10, max: 300 },
  announceNowPlaying: { type: Boolean, default: true },
  nowPlayingChannelId: { type: String, default: null },
  allowPlaylists: { type: Boolean, default: true },
  maxPlaylistSize: { type: Number, default: 50, min: 5, max: 200 },
  voteSkipEnabled: { type: Boolean, default: false },
  voteSkipPercentage: { type: Number, default: 50, min: 10, max: 100 },
  restrictToVoiceChannel: { type: Boolean, default: true },
}, { _id: false });

// ============================================
// Sub-schemas for Giveaways
// ============================================

const GiveawayConfigSchema = new Schema({
  enabled: { type: Boolean, default: true },
  managerRoleId: { type: String, default: null },
  defaultDuration: { type: String, default: '1d' },
  maxDuration: { type: Number, default: 30, min: 1, max: 30 }, // days
  maxWinners: { type: Number, default: 10, min: 1, max: 20 },
  allowRequirements: { type: Boolean, default: true },
  allowBonusEntries: { type: Boolean, default: true },
  dmWinners: { type: Boolean, default: true },
  pingOnEnd: { type: Boolean, default: false },
  pingRoleId: { type: String, default: null },
  logChannelId: { type: String, default: null },
  embedColor: { type: String, default: '#5865F2' },
}, { _id: false });

// ============================================
// Sub-schemas for Logging
// ============================================

const LoggingConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  
  // Channel assignments
  channels: {
    moderation: { type: String, default: null },
    messages: { type: String, default: null },
    members: { type: String, default: null },
    server: { type: String, default: null },
    voice: { type: String, default: null },
  },
  
  // Event toggles
  events: {
    messageDelete: { type: Boolean, default: true },
    messageEdit: { type: Boolean, default: true },
    messageBulkDelete: { type: Boolean, default: true },
    memberJoin: { type: Boolean, default: true },
    memberLeave: { type: Boolean, default: true },
    memberUpdate: { type: Boolean, default: true },
    memberBan: { type: Boolean, default: true },
    memberUnban: { type: Boolean, default: true },
    roleCreate: { type: Boolean, default: true },
    roleDelete: { type: Boolean, default: true },
    roleUpdate: { type: Boolean, default: true },
    channelCreate: { type: Boolean, default: true },
    channelDelete: { type: Boolean, default: true },
    channelUpdate: { type: Boolean, default: true },
    voiceJoin: { type: Boolean, default: true },
    voiceLeave: { type: Boolean, default: true },
    voiceMove: { type: Boolean, default: true },
  },
  
  // Ignored channels/roles
  ignoredChannels: [{ type: String }],
  ignoredRoles: [{ type: String }],
}, { _id: false });

// ============================================
// Main Guild Config Schema
// ============================================

const GuildConfigSchema = new Schema<IGuildConfigDocument>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    guildName: {
      type: String,
      required: true,
    },
    guildIcon: {
      type: String,
      default: null,
    },
    prefix: {
      type: String,
      default: '!',
      maxlength: 10,
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'de', 'es', 'fr', 'pt', 'ru', 'ja', 'ko', 'zh'],
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    
    // Module toggles
    modules: {
      moderation: { type: Boolean, default: true },
      leveling: { type: Boolean, default: true },
      economy: { type: Boolean, default: true },
      welcome: { type: Boolean, default: false },
      tickets: { type: Boolean, default: false },
      music: { type: Boolean, default: true },
      fun: { type: Boolean, default: true },
      logging: { type: Boolean, default: false },
      starboard: { type: Boolean, default: false },
      giveaways: { type: Boolean, default: false },
    },
    
    // Module configurations
    moderation: { type: ModerationConfigSchema, default: () => ({}) },
    leveling: { type: LevelingConfigSchema, default: () => ({}) },
    economy: { type: EconomyConfigSchema, default: () => ({}) },
    welcome: { type: WelcomeConfigSchema, default: () => ({}) },
    tickets: { type: TicketConfigSchema, default: () => ({}) },
    logging: { type: LoggingConfigSchema, default: () => ({}) },
    music: { type: MusicConfigSchema, default: () => ({}) },
    giveaway: { type: GiveawayConfigSchema, default: () => ({}) },
    
    // Premium features
    premium: {
      enabled: { type: Boolean, default: false },
      tier: { type: Number, default: 0, min: 0, max: 3 },
      expiresAt: { type: Date, default: null },
      features: [{ type: String }],
    },
    
    // Custom commands (simple)
    customCommands: [{
      name: { type: String, required: true },
      response: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    }],
    
    // Disabled commands
    disabledCommands: [{ type: String }],
    disabledChannels: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================
// Indexes
// ============================================

GuildConfigSchema.index({ 'premium.enabled': 1 });
GuildConfigSchema.index({ createdAt: -1 });

// ============================================
// Instance Methods
// ============================================

GuildConfigSchema.methods.enableModule = async function(module: string): Promise<void> {
  if (this.modules && module in this.modules) {
    this.modules[module] = true;
    await this.save();
  }
};

GuildConfigSchema.methods.disableModule = async function(module: string): Promise<void> {
  if (this.modules && module in this.modules) {
    this.modules[module] = false;
    await this.save();
  }
};

GuildConfigSchema.methods.isModuleEnabled = function(module: string): boolean {
  return this.modules?.[module] ?? false;
};

// ============================================
// Static Methods
// ============================================

GuildConfigSchema.statics.getOrCreate = async function(
  guildId: string, 
  guildName: string
): Promise<IGuildConfigDocument> {
  let config = await this.findOne({ guildId });
  if (!config) {
    const newConfig = new this({ guildId, guildName });
    config = await newConfig.save();
  }
  return config;
};

GuildConfigSchema.statics.getByGuildId = async function(
  guildId: string
): Promise<IGuildConfigDocument | null> {
  return this.findOne({ guildId });
};

GuildConfigSchema.statics.updateModuleSettings = async function(
  guildId: string,
  module: string,
  settings: Record<string, any>
): Promise<IGuildConfigDocument | null> {
  const updatePath = module === 'modules' ? 'modules' : module;
  const update = Object.entries(settings).reduce((acc, [key, value]) => {
    acc[`${updatePath}.${key}`] = value;
    return acc;
  }, {} as Record<string, any>);
  
  return this.findOneAndUpdate(
    { guildId },
    { $set: update },
    { new: true, upsert: false }
  );
};

// ============================================
// Export Model
// ============================================

export const GuildConfig = mongoose.model<IGuildConfigDocument, IGuildConfigModel>(
  'GuildConfig', 
  GuildConfigSchema
);
