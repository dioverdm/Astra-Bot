// ===========================================
// ASTRA BOT - Database Models Export
// ===========================================

// User Models
export { User, type IUserDocument, type IUserModel } from './User.js';
export { UserLevel, type IUserLevelDocument, type IUserLevelModel } from './UserLevel.js';
export { UserEconomy, type IUserEconomyDocument, type IUserEconomyModel, type TransactionType } from './UserEconomy.js';

// Guild Models
export { GuildConfig, type IGuildConfigDocument, type IGuildConfigModel } from './GuildConfig.js';

// Moderation Models
export { 
  ModerationLog, 
  type IModerationLogDocument, 
  type IModerationLogModel,
  type ModerationAction,
} from './ModerationLog.js';

// Ticket Models
export { 
  Ticket, 
  type ITicketDocument, 
  type ITicketModel,
  type TicketStatus,
  type TicketPriority,
} from './Ticket.js';

// Dashboard Models
export { 
  DashboardRoleModel, 
  type IDashboardRoleDoc, 
  type IDashboardRoleModel,
  ROLE_PERMISSIONS,
} from './DashboardRole.js';

// Giveaway Models
export {
  Giveaway,
  type IGiveaway,
  type IGiveawayDocument,
} from './Giveaway.js';
