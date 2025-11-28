// ===========================================
// ASTRA BOT - Shared Type Definitions
// ===========================================

import type { 
  ChatInputCommandInteraction, 
  AutocompleteInteraction,
  SlashCommandBuilder, 
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  PermissionResolvable,
  Client
} from 'discord.js';

// ============ Bot Types ============

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number; // in seconds
  permissions?: PermissionResolvable[];
  ownerOnly?: boolean;
  guildOnly?: boolean;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => Promise<void> | void;
}

export interface BotModule {
  name: string;
  description: string;
  commands: BotCommand[];
  events?: BotEvent[];
  initialize?: (client: Client) => Promise<void>;
}

// ============ Database Types ============

export interface IUser {
  discordId: string;
  username: string;
  globalName?: string;
  discriminator: string;
  avatar?: string;
  banner?: string;
  accentColor?: number;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  guilds?: string[];
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: {
      email?: boolean;
      discord?: boolean;
    };
    privacy?: {
      showOnLeaderboard?: boolean;
      showProfile?: boolean;
      allowDMs?: boolean;
    };
  };
  premium?: {
    active?: boolean;
    tier?: number;
    since?: Date;
    expiresAt?: Date;
    lifetimeSpent?: number;
  };
  globalStats?: {
    totalMessages?: number;
    totalCommands?: number;
    totalGuilds?: number;
    firstSeen?: Date;
    lastSeen?: Date;
  };
  badges?: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    earnedAt?: Date;
    rarity?: string;
  }>;
  flags?: {
    isBotOwner?: boolean;
    isStaff?: boolean;
    isBetaTester?: boolean;
    isBanned?: boolean;
    banReason?: string;
    bannedAt?: Date;
  };
  rateLimit?: {
    requests?: number;
    resetAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IGuildConfig {
  guildId: string;
  guildName: string;
  guildIcon?: string;
  prefix?: string;
  language?: string;
  timezone?: string;
  
  // Module toggles
  modules: {
    moderation: boolean;
    leveling: boolean;
    economy: boolean;
    welcome: boolean;
    tickets: boolean;
    music: boolean;
    fun: boolean;
    logging?: boolean;
    starboard?: boolean;
    giveaways?: boolean;
  };
  
  // Moderation settings
  moderation: IModerationConfig;
  
  // Leveling settings
  leveling: ILevelingConfig;
  
  // Economy settings
  economy: IEconomyConfig;
  
  // Welcome settings
  welcome: IWelcomeConfig;
  
  // Ticket settings
  tickets: ITicketConfig;
  
  // Logging settings
  logging?: ILoggingConfig;
  
  // Music settings
  music?: IMusicConfig;
  
  // Giveaway settings
  giveaway?: IGiveawayConfig;
  
  // Premium features
  premium?: {
    enabled: boolean;
    tier: number;
    expiresAt?: Date;
    features: string[];
  };
  
  // Custom commands
  customCommands?: Array<{
    name: string;
    response: string;
    enabled: boolean;
  }>;
  
  // Disabled commands/channels
  disabledCommands?: string[];
  disabledChannels?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IModerationConfig {
  enabled: boolean;
  logChannelId?: string;
  modRoles: string[];
  automod: {
    enabled: boolean;
    antiSpam: boolean;
    antiLinks: boolean;
    antiInvites: boolean;
    badWords: string[];
    maxMentions: number;
    maxEmojis: number;
  };
  mutedRoleId?: string;
}

export interface ILevelingConfig {
  enabled: boolean;
  xpPerMessage: number;
  xpCooldown: number; // seconds
  levelUpChannelId?: string;
  levelUpMessage: string;
  roleRewards: Array<{
    level: number;
    roleId: string;
  }>;
  ignoredChannels: string[];
  ignoredRoles: string[];
  multipliers: Array<{
    roleId: string;
    multiplier: number;
  }>;
}

export interface IEconomyConfig {
  enabled: boolean;
  currencyName: string;
  currencySymbol: string;
  dailyReward: number;
  workReward: { min: number; max: number };
  workCooldown: number; // seconds
  shopItems: IShopItem[];
}

export interface IShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'role' | 'item' | 'collectible';
  roleId?: string;
  emoji?: string;
  limited?: boolean;
  stock?: number;
}

export interface IWelcomeConfig {
  enabled: boolean;
  channelId?: string;
  message: string;
  embedEnabled: boolean;
  embedColor: string;
  embedTitle: string;
  embedDescription: string;
  embedThumbnail: boolean;
  embedImage?: string;
  dmEnabled: boolean;
  dmMessage: string;
  autoRoles: string[];
}

export interface ITicketConfig {
  enabled: boolean;
  categoryId?: string;
  logChannelId?: string;
  supportRoles: string[];
  ticketMessage?: string;
  openMessage?: string;
  closeMessage?: string;
  closeConfirmation: boolean;
  transcriptEnabled: boolean;
  transcriptChannelId?: string;
  maxTicketsPerUser: number;
  autoCloseInactive?: number;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    emoji?: string;
    staffRoles?: string[];
    priority?: number;
  }>;
  panelChannelId?: string;
  panelMessageId?: string;
  feedbackEnabled?: boolean;
  feedbackChannelId?: string;
}

export interface ILoggingConfig {
  enabled: boolean;
  channels: {
    moderation?: string;
    messages?: string;
    members?: string;
    server?: string;
    voice?: string;
  };
  events: {
    messageDelete?: boolean;
    messageEdit?: boolean;
    messageBulkDelete?: boolean;
    memberJoin?: boolean;
    memberLeave?: boolean;
    memberUpdate?: boolean;
    memberBan?: boolean;
    memberUnban?: boolean;
    roleCreate?: boolean;
    roleDelete?: boolean;
    roleUpdate?: boolean;
    channelCreate?: boolean;
    channelDelete?: boolean;
    channelUpdate?: boolean;
    voiceJoin?: boolean;
    voiceLeave?: boolean;
    voiceMove?: boolean;
  };
  ignoredChannels?: string[];
  ignoredRoles?: string[];
}

export interface IMusicConfig {
  enabled: boolean;
  djRoleId?: string;
  defaultVolume: number;
  maxQueueSize: number;
  maxSongDuration: number;
  allowFilters: boolean;
  leaveOnEmpty: boolean;
  leaveOnEmptyCooldown: number;
  leaveOnEnd: boolean;
  leaveOnEndCooldown: number;
  announceNowPlaying: boolean;
  nowPlayingChannelId?: string;
  allowPlaylists: boolean;
  maxPlaylistSize: number;
  voteSkipEnabled: boolean;
  voteSkipPercentage: number;
  restrictToVoiceChannel: boolean;
}

export interface IGiveawayConfig {
  enabled: boolean;
  managerRoleId?: string;
  defaultDuration: string;
  maxDuration: number;
  maxWinners: number;
  allowRequirements: boolean;
  allowBonusEntries: boolean;
  dmWinners: boolean;
  pingOnEnd: boolean;
  pingRoleId?: string;
  logChannelId?: string;
  embedColor: string;
}

// ============ User Data Types ============

export interface IUserLevel {
  discordId: string;
  guildId: string;
  xp: number;
  level: number;
  totalXp: number;
  messages: number;
  voiceMinutes?: number;
  lastXpGain: Date;
  lastVoiceXpGain?: Date;
  weeklyXp?: number;
  monthlyXp?: number;
  lastWeeklyReset?: Date;
  lastMonthlyReset?: Date;
  dailyStreak?: number;
  lastDailyActivity?: Date;
  longestStreak?: number;
  cardConfig?: {
    backgroundColor?: string;
    progressColor?: string;
    textColor?: string;
    backgroundImage?: string;
  };
}

export interface IUserEconomy {
  discordId: string;
  guildId: string;
  balance: number;
  bank: number;
  bankLimit?: number;
  totalEarned: number;
  totalSpent?: number;
  totalGambled?: number;
  totalWon?: number;
  totalLost?: number;
  inventory: Array<{
    itemId: string;
    quantity: number;
    acquiredAt: Date;
    expiresAt?: Date;
    metadata?: any;
  }>;
  activeBoosts?: Array<{
    type: string;
    multiplier: number;
    expiresAt: Date;
    source?: string;
  }>;
  lastDaily?: Date;
  dailyStreak?: number;
  longestDailyStreak?: number;
  lastWork?: Date;
  lastGamble?: Date;
  lastRob?: Date;
  lastCrime?: Date;
  robberyProtection?: {
    enabled?: boolean;
    expiresAt?: Date;
  };
  inJail?: boolean;
  jailExpiresAt?: Date;
  transactions: ITransaction[];
  gamblingStats?: {
    totalGames?: number;
    wins?: number;
    losses?: number;
    biggestWin?: number;
    biggestLoss?: number;
    currentWinStreak?: number;
    longestWinStreak?: number;
  };
  robberyStats?: {
    successfulRobs?: number;
    failedRobs?: number;
    timesRobbed?: number;
    totalStolen?: number;
    totalLostToRobbery?: number;
  };
}

export interface ITransaction {
  type: 'earn' | 'spend' | 'transfer' | 'transfer_in' | 'transfer_out' | 'daily' | 'work' | 'gamble' | 'gamble_win' | 'gamble_lose' | 'shop_purchase' | 'shop_sell' | 'bank_deposit' | 'bank_withdraw' | 'bank_interest' | 'robbery_gain' | 'robbery_loss' | 'fine' | 'reward' | 'admin';
  amount: number;
  description: string;
  timestamp: Date;
  balanceAfter: number;
  relatedUserId?: string;
  metadata?: any;
}

// ============ Moderation Types ============

export interface IModerationLog {
  guildId: string;
  moderatorId: string;
  targetId: string;
  action: 'warn' | 'mute' | 'unmute' | 'kick' | 'ban' | 'unban' | 'timeout' | 'untimeout' | 'softban' | 'note' | 'purge';
  reason: string;
  duration?: number;
  expiresAt?: Date;
  timestamp: Date;
  caseId: number;
  messageId?: string;
  channelId?: string;
  messagesDeleted?: number;
  revoked?: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  edited?: boolean;
  editHistory?: Array<{
    reason: string;
    editedBy: string;
    editedAt: Date;
  }>;
  relatedCaseId?: number;
  automod?: boolean;
  automodRule?: string;
}

export interface ITicket {
  guildId: string;
  userId: string;
  channelId: string;
  ticketNumber?: number;
  category: string;
  status: 'open' | 'claimed' | 'on_hold' | 'closed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  subject?: string;
  tags?: string[];
  claimedBy?: string;
  claimedAt?: Date;
  participants: string[];
  createdAt: Date;
  firstResponseAt?: Date;
  lastActivityAt?: Date;
  closedAt?: Date;
  closedBy?: string;
  closeReason?: string;
  transcript?: string;
  transcriptUrl?: string;
  messageCount?: number;
  feedback?: {
    rating?: number;
    comment?: string;
    submittedAt?: Date;
  };
  recentMessages?: Array<{
    messageId: string;
    authorId: string;
    content?: string;
    attachments?: string[];
    timestamp?: Date;
  }>;
  notes?: Array<{
    authorId: string;
    content: string;
    createdAt?: Date;
    isInternal?: boolean;
  }>;
  logs?: Array<{
    action: string;
    performedBy: string;
    timestamp?: Date;
    details?: any;
  }>;
  autoCloseWarned?: boolean;
  autoCloseWarnedAt?: Date;
  panelMessageId?: string;
}

// ============ API Types ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalCommands: number;
  totalMessages: number;
  topCommands: Array<{ name: string; count: number }>;
  recentActions: IModerationLog[];
}

// ============ Theme Types ============

export type ThemePreset = 'light' | 'dark' | 'royal-purple' | 'midnight' | 'sunset' | 'sakura' | 'ocean';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
}

// ============ Discord OAuth Types ============

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
  flags?: number;
  banner?: string | null;
  accent_color?: number | null;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface SessionUser {
  id: string;
  odiscordId: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  refreshToken: string;
}
