// ===========================================
// ASTRA BOT - User Economy Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IUserEconomy, ITransaction } from '../../shared/types/index.js';

// ============================================
// Types
// ============================================

export type TransactionType = 
  | 'earn' 
  | 'spend' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'daily' 
  | 'work' 
  | 'gamble_win' 
  | 'gamble_lose'
  | 'shop_purchase'
  | 'shop_sell'
  | 'bank_deposit'
  | 'bank_withdraw'
  | 'bank_interest'
  | 'robbery_gain'
  | 'robbery_loss'
  | 'fine'
  | 'reward'
  | 'admin';

// ============================================
// Interface Definitions
// ============================================

export interface IUserEconomyDocument extends IUserEconomy, Document {
  // Instance methods
  addBalance(amount: number, type: TransactionType, description: string): Promise<void>;
  removeBalance(amount: number, type: TransactionType, description: string): Promise<boolean>;
  deposit(amount: number): Promise<boolean>;
  withdraw(amount: number): Promise<boolean>;
  transfer(toUser: IUserEconomyDocument, amount: number): Promise<boolean>;
  addItem(itemId: string, quantity?: number): Promise<void>;
  removeItem(itemId: string, quantity?: number): Promise<boolean>;
  hasItem(itemId: string, quantity?: number): boolean;
  getItemCount(itemId: string): number;
  canClaimDaily(): boolean;
  canWork(): boolean;
  canGamble(): boolean;
  canRob(): boolean;
  getNetWorth(): number;
  resetEconomy(): Promise<void>;
}

export interface IUserEconomyModel extends Model<IUserEconomyDocument> {
  // Static methods
  getOrCreate(discordId: string, guildId: string): Promise<IUserEconomyDocument>;
  getRichList(guildId: string, limit?: number, includeBank?: boolean): Promise<IUserEconomyDocument[]>;
  getGuildStats(guildId: string): Promise<{ totalBalance: number; totalBank: number; totalUsers: number; avgBalance: number }>;
  transferBetweenUsers(fromDiscordId: string, toDiscordId: string, guildId: string, amount: number): Promise<boolean>;
  applyBankInterest(guildId: string, rate: number): Promise<number>;
  resetAllBalances(guildId: string): Promise<number>;
}

// ============================================
// Sub-schemas
// ============================================

const TransactionSchema = new Schema({
  type: {
    type: String,
    enum: [
      'earn', 'spend', 'transfer_in', 'transfer_out', 'daily', 'work',
      'gamble_win', 'gamble_lose', 'shop_purchase', 'shop_sell',
      'bank_deposit', 'bank_withdraw', 'bank_interest',
      'robbery_gain', 'robbery_loss', 'fine', 'reward', 'admin'
    ],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true, maxlength: 200 },
  timestamp: { type: Date, default: Date.now },
  balanceAfter: { type: Number, required: true },
  relatedUserId: { type: String, default: null }, // For transfers
  metadata: { type: Schema.Types.Mixed, default: null }, // Extra data
}, { _id: false });

const InventoryItemSchema = new Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 0 },
  acquiredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }, // For temporary items
  metadata: { type: Schema.Types.Mixed, default: null }, // Item-specific data
}, { _id: false });

const ActiveBoostSchema = new Schema({
  type: { type: String, required: true }, // 'xp_boost', 'coin_boost', etc.
  multiplier: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },
  source: { type: String, default: 'shop' }, // 'shop', 'reward', 'event'
}, { _id: false });

// ============================================
// Schema Definition
// ============================================

const UserEconomySchema = new Schema<IUserEconomyDocument>(
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
    
    // Balances
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    bank: {
      type: Number,
      default: 0,
      min: 0,
    },
    bankLimit: {
      type: Number,
      default: 10000,
      min: 0,
    },
    
    // Statistics
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGambled: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLost: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Inventory
    inventory: [InventoryItemSchema],
    
    // Active boosts
    activeBoosts: [ActiveBoostSchema],
    
    // Cooldowns
    lastDaily: {
      type: Date,
      default: null,
    },
    dailyStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestDailyStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWork: {
      type: Date,
      default: null,
    },
    lastGamble: {
      type: Date,
      default: null,
    },
    lastRob: {
      type: Date,
      default: null,
    },
    lastCrime: {
      type: Date,
      default: null,
    },
    
    // Robbery protection
    robberyProtection: {
      enabled: { type: Boolean, default: false },
      expiresAt: { type: Date, default: null },
    },
    
    // Jail status
    inJail: {
      type: Boolean,
      default: false,
    },
    jailExpiresAt: {
      type: Date,
      default: null,
    },
    
    // Transaction history
    transactions: {
      type: [TransactionSchema],
      default: [],
    },
    
    // Gambling stats
    gamblingStats: {
      totalGames: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      biggestWin: { type: Number, default: 0 },
      biggestLoss: { type: Number, default: 0 },
      currentWinStreak: { type: Number, default: 0 },
      longestWinStreak: { type: Number, default: 0 },
    },
    
    // Robbery stats
    robberyStats: {
      successfulRobs: { type: Number, default: 0 },
      failedRobs: { type: Number, default: 0 },
      timesRobbed: { type: Number, default: 0 },
      totalStolen: { type: Number, default: 0 },
      totalLostToRobbery: { type: Number, default: 0 },
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

UserEconomySchema.index({ guildId: 1, discordId: 1 }, { unique: true });
UserEconomySchema.index({ guildId: 1, balance: -1 }); // For rich list (wallet)
UserEconomySchema.index({ guildId: 1, bank: -1 }); // For rich list (bank)
UserEconomySchema.index({ guildId: 1, totalEarned: -1 }); // For top earners
UserEconomySchema.index({ 'activeBoosts.expiresAt': 1 }, { sparse: true }); // For boost cleanup
UserEconomySchema.index({ jailExpiresAt: 1 }, { sparse: true }); // For jail release

// ============================================
// Instance Methods
// ============================================

UserEconomySchema.methods.addBalance = async function(
  amount: number,
  type: TransactionType,
  description: string
): Promise<void> {
  this.balance += amount;
  if (amount > 0) {
    this.totalEarned += amount;
  }
  
  // Add transaction
  this.transactions.unshift({
    type,
    amount,
    description,
    timestamp: new Date(),
    balanceAfter: this.balance,
  });
  
  // Keep only last 100 transactions
  if (this.transactions.length > 100) {
    this.transactions = this.transactions.slice(0, 100);
  }
  
  await this.save();
};

UserEconomySchema.methods.removeBalance = async function(
  amount: number,
  type: TransactionType,
  description: string
): Promise<boolean> {
  if (this.balance < amount) return false;
  
  this.balance -= amount;
  this.totalSpent += amount;
  
  this.transactions.unshift({
    type,
    amount: -amount,
    description,
    timestamp: new Date(),
    balanceAfter: this.balance,
  });
  
  if (this.transactions.length > 100) {
    this.transactions = this.transactions.slice(0, 100);
  }
  
  await this.save();
  return true;
};

UserEconomySchema.methods.deposit = async function(amount: number): Promise<boolean> {
  if (this.balance < amount) return false;
  
  const spaceInBank = this.bankLimit - this.bank;
  const actualDeposit = Math.min(amount, spaceInBank);
  
  if (actualDeposit <= 0) return false;
  
  this.balance -= actualDeposit;
  this.bank += actualDeposit;
  
  this.transactions.unshift({
    type: 'bank_deposit',
    amount: -actualDeposit,
    description: `Deposited to bank`,
    timestamp: new Date(),
    balanceAfter: this.balance,
  });
  
  if (this.transactions.length > 100) {
    this.transactions = this.transactions.slice(0, 100);
  }
  
  await this.save();
  return true;
};

UserEconomySchema.methods.withdraw = async function(amount: number): Promise<boolean> {
  if (this.bank < amount) return false;
  
  this.bank -= amount;
  this.balance += amount;
  
  this.transactions.unshift({
    type: 'bank_withdraw',
    amount: amount,
    description: `Withdrew from bank`,
    timestamp: new Date(),
    balanceAfter: this.balance,
  });
  
  if (this.transactions.length > 100) {
    this.transactions = this.transactions.slice(0, 100);
  }
  
  await this.save();
  return true;
};

UserEconomySchema.methods.transfer = async function(
  toUser: IUserEconomyDocument, 
  amount: number
): Promise<boolean> {
  if (this.balance < amount) return false;
  
  this.balance -= amount;
  toUser.balance += amount;
  
  // Add transaction to sender
  this.transactions.unshift({
    type: 'transfer_out',
    amount: -amount,
    description: `Transfer to user`,
    timestamp: new Date(),
    balanceAfter: this.balance,
    relatedUserId: toUser.discordId,
  });
  
  // Add transaction to receiver
  toUser.transactions.unshift({
    type: 'transfer_in',
    amount: amount,
    description: `Transfer from user`,
    timestamp: new Date(),
    balanceAfter: toUser.balance,
    relatedUserId: this.discordId,
  });
  
  // Trim transactions
  if (this.transactions.length > 100) {
    this.transactions = this.transactions.slice(0, 100);
  }
  if (toUser.transactions.length > 100) {
    toUser.transactions = toUser.transactions.slice(0, 100);
  }
  
  await Promise.all([this.save(), toUser.save()]);
  return true;
};

UserEconomySchema.methods.addItem = async function(
  itemId: string, 
  quantity: number = 1
): Promise<void> {
  const existingItem = this.inventory.find((i: any) => i.itemId === itemId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.inventory.push({ itemId, quantity, acquiredAt: new Date() });
  }
  await this.save();
};

UserEconomySchema.methods.removeItem = async function(
  itemId: string, 
  quantity: number = 1
): Promise<boolean> {
  const existingItem = this.inventory.find((i: any) => i.itemId === itemId);
  if (!existingItem || existingItem.quantity < quantity) return false;
  
  existingItem.quantity -= quantity;
  if (existingItem.quantity <= 0) {
    this.inventory = this.inventory.filter((i: any) => i.itemId !== itemId);
  }
  
  await this.save();
  return true;
};

UserEconomySchema.methods.hasItem = function(itemId: string, quantity: number = 1): boolean {
  const item = this.inventory.find((i: any) => i.itemId === itemId);
  return item ? item.quantity >= quantity : false;
};

UserEconomySchema.methods.getItemCount = function(itemId: string): number {
  const item = this.inventory.find((i: any) => i.itemId === itemId);
  return item ? item.quantity : 0;
};

UserEconomySchema.methods.canClaimDaily = function(): boolean {
  if (!this.lastDaily) return true;
  const now = new Date();
  const lastClaim = new Date(this.lastDaily);
  // Reset at midnight UTC
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastClaimMidnight = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
  return todayMidnight > lastClaimMidnight;
};

UserEconomySchema.methods.canWork = function(): boolean {
  if (!this.lastWork) return true;
  const cooldown = 60 * 60 * 1000; // 1 hour default
  return Date.now() - this.lastWork.getTime() >= cooldown;
};

UserEconomySchema.methods.canGamble = function(): boolean {
  if (!this.lastGamble) return true;
  const cooldown = 30 * 1000; // 30 seconds default
  return Date.now() - this.lastGamble.getTime() >= cooldown;
};

UserEconomySchema.methods.canRob = function(): boolean {
  if (this.inJail) return false;
  if (!this.lastRob) return true;
  const cooldown = 2 * 60 * 60 * 1000; // 2 hours default
  return Date.now() - this.lastRob.getTime() >= cooldown;
};

UserEconomySchema.methods.getNetWorth = function(): number {
  return this.balance + this.bank;
};

UserEconomySchema.methods.resetEconomy = async function(): Promise<void> {
  this.balance = 0;
  this.bank = 0;
  this.totalEarned = 0;
  this.totalSpent = 0;
  this.totalGambled = 0;
  this.totalWon = 0;
  this.totalLost = 0;
  this.inventory = [];
  this.activeBoosts = [];
  this.dailyStreak = 0;
  this.transactions = [];
  this.gamblingStats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    biggestWin: 0,
    biggestLoss: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
  };
  this.robberyStats = {
    successfulRobs: 0,
    failedRobs: 0,
    timesRobbed: 0,
    totalStolen: 0,
    totalLostToRobbery: 0,
  };
  await this.save();
};

// ============================================
// Static Methods
// ============================================

UserEconomySchema.statics.getOrCreate = async function(
  discordId: string, 
  guildId: string
): Promise<IUserEconomyDocument> {
  let userEconomy = await this.findOne({ discordId, guildId });
  if (!userEconomy) {
    userEconomy = await this.create({ discordId, guildId });
  }
  return userEconomy;
};

UserEconomySchema.statics.getRichList = async function(
  guildId: string, 
  limit: number = 10,
  includeBank: boolean = true
): Promise<IUserEconomyDocument[]> {
  if (includeBank) {
    return this.aggregate([
      { $match: { guildId } },
      { $addFields: { netWorth: { $add: ['$balance', '$bank'] } } },
      { $sort: { netWorth: -1 } },
      { $limit: limit },
    ]);
  }
  return this.find({ guildId })
    .sort({ balance: -1 })
    .limit(limit)
    .lean();
};

UserEconomySchema.statics.getGuildStats = async function(
  guildId: string
): Promise<{ totalBalance: number; totalBank: number; totalUsers: number; avgBalance: number }> {
  const result = await this.aggregate([
    { $match: { guildId } },
    {
      $group: {
        _id: null,
        totalBalance: { $sum: '$balance' },
        totalBank: { $sum: '$bank' },
        totalUsers: { $sum: 1 },
        avgBalance: { $avg: '$balance' },
      },
    },
  ]);
  
  if (result.length === 0) {
    return { totalBalance: 0, totalBank: 0, totalUsers: 0, avgBalance: 0 };
  }
  
  return {
    totalBalance: result[0].totalBalance,
    totalBank: result[0].totalBank,
    totalUsers: result[0].totalUsers,
    avgBalance: Math.round(result[0].avgBalance),
  };
};

UserEconomySchema.statics.transferBetweenUsers = async function(
  fromDiscordId: string,
  toDiscordId: string,
  guildId: string,
  amount: number
): Promise<boolean> {
  const [fromUser, toUser] = await Promise.all([
    this.findOne({ discordId: fromDiscordId, guildId }),
    this.findOne({ discordId: toDiscordId, guildId }),
  ]);
  
  if (!fromUser || !toUser || fromUser.balance < amount) {
    return false;
  }
  
  return fromUser.transfer(toUser, amount);
};

UserEconomySchema.statics.applyBankInterest = async function(
  guildId: string,
  rate: number
): Promise<number> {
  const result = await this.updateMany(
    { guildId, bank: { $gt: 0 } },
    [
      {
        $set: {
          bank: {
            $min: [
              { $add: ['$bank', { $multiply: ['$bank', rate] }] },
              '$bankLimit'
            ]
          }
        }
      }
    ]
  );
  return result.modifiedCount;
};

UserEconomySchema.statics.resetAllBalances = async function(
  guildId: string
): Promise<number> {
  const result = await this.updateMany(
    { guildId },
    {
      $set: {
        balance: 0,
        bank: 0,
        totalEarned: 0,
        totalSpent: 0,
        inventory: [],
        transactions: [],
      }
    }
  );
  return result.modifiedCount;
};

// ============================================
// Export Model
// ============================================

export const UserEconomy = mongoose.model<IUserEconomyDocument, IUserEconomyModel>(
  'UserEconomy', 
  UserEconomySchema
);
