// ===========================================
// ASTRA BOT - Ticket Model
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ITicket } from '../../shared/types/index.js';

// ============================================
// Types
// ============================================

export type TicketStatus = 'open' | 'claimed' | 'on_hold' | 'closed' | 'archived';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// ============================================
// Interface Definitions
// ============================================

export interface ITicketDocument extends ITicket, Document {
  // Instance methods
  claim(staffId: string): Promise<void>;
  unclaim(): Promise<void>;
  close(closedBy: string, reason?: string): Promise<void>;
  reopen(reopenedBy: string): Promise<void>;
  archive(): Promise<void>;
  addParticipant(userId: string): Promise<void>;
  removeParticipant(userId: string): Promise<void>;
  setPriority(priority: TicketPriority): Promise<void>;
  addNote(authorId: string, content: string): Promise<void>;
  setTranscript(transcript: string): Promise<void>;
  addTag(tag: string): Promise<void>;
  removeTag(tag: string): Promise<void>;
  updateLastActivity(): Promise<void>;
}

export interface ITicketModel extends Model<ITicketDocument> {
  // Static methods
  countUserOpenTickets(guildId: string, userId: string): Promise<number>;
  getUserTickets(guildId: string, userId: string, limit?: number): Promise<ITicketDocument[]>;
  getOpenTickets(guildId: string): Promise<ITicketDocument[]>;
  getTicketByChannel(channelId: string): Promise<ITicketDocument | null>;
  getNextTicketNumber(guildId: string): Promise<number>;
  createTicket(data: Partial<ITicketDocument>): Promise<ITicketDocument>;
  getGuildStats(guildId: string): Promise<{
    total: number;
    open: number;
    claimed: number;
    closed: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  }>;
  getStaffStats(guildId: string, staffId: string): Promise<{
    claimed: number;
    closed: number;
    avgResolutionTime: number;
  }>;
  getInactiveTickets(guildId: string, inactiveForMs: number): Promise<ITicketDocument[]>;
  bulkClose(guildId: string, ticketIds: string[], closedBy: string, reason?: string): Promise<number>;
}

// ============================================
// Sub-schemas
// ============================================

const TicketNoteSchema = new Schema({
  authorId: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  isInternal: { type: Boolean, default: true }, // Staff-only notes
}, { _id: true });

const TicketMessageSchema = new Schema({
  messageId: { type: String, required: true },
  authorId: { type: String, required: true },
  content: { type: String, maxlength: 4000 },
  attachments: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const TicketLogSchema = new Schema({
  action: { 
    type: String, 
    enum: ['created', 'claimed', 'unclaimed', 'closed', 'reopened', 'archived', 'priority_changed', 'participant_added', 'participant_removed', 'note_added', 'tag_added', 'tag_removed'],
    required: true 
  },
  performedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const FeedbackSchema = new Schema({
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
  submittedAt: { type: Date, default: Date.now },
}, { _id: false });

// ============================================
// Schema Definition
// ============================================

const TicketSchema = new Schema<ITicketDocument>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    
    // Ticket identification
    ticketNumber: {
      type: Number,
      required: true,
    },
    
    // Category and status
    category: {
      type: String,
      default: 'general',
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'on_hold', 'closed', 'archived'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    
    // Subject/Title
    subject: {
      type: String,
      default: null,
      maxlength: 200,
    },
    
    // Tags for organization
    tags: [{
      type: String,
      maxlength: 50,
    }],
    
    // Staff assignment
    claimedBy: {
      type: String,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    
    // Participants (users who can see the ticket)
    participants: [{
      type: String,
    }],
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: String,
      default: null,
    },
    closeReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    
    // Transcript
    transcript: {
      type: String,
      default: null,
    },
    transcriptUrl: {
      type: String,
      default: null,
    },
    
    // Message cache (last N messages for quick access)
    recentMessages: {
      type: [TicketMessageSchema],
      default: [],
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Internal notes (staff only)
    notes: {
      type: [TicketNoteSchema],
      default: [],
    },
    
    // Activity log
    logs: {
      type: [TicketLogSchema],
      default: [],
    },
    
    // Feedback after closure
    feedback: {
      type: FeedbackSchema,
      default: null,
    },
    
    // Auto-close tracking
    autoCloseWarned: {
      type: Boolean,
      default: false,
    },
    autoCloseWarnedAt: {
      type: Date,
      default: null,
    },
    
    // Panel message reference
    panelMessageId: {
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

TicketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });
TicketSchema.index({ guildId: 1, status: 1 });
TicketSchema.index({ guildId: 1, userId: 1, status: 1 });
TicketSchema.index({ guildId: 1, claimedBy: 1 });
TicketSchema.index({ guildId: 1, category: 1 });
TicketSchema.index({ guildId: 1, priority: 1 });
TicketSchema.index({ lastActivityAt: 1 }); // For auto-close
TicketSchema.index({ createdAt: -1 });

// ============================================
// Instance Methods
// ============================================

TicketSchema.methods.claim = async function(staffId: string): Promise<void> {
  this.claimedBy = staffId;
  this.claimedAt = new Date();
  this.status = 'claimed';
  this.logs.push({
    action: 'claimed',
    performedBy: staffId,
    timestamp: new Date(),
  });
  await this.save();
};

TicketSchema.methods.unclaim = async function(): Promise<void> {
  const previousClaimer = this.claimedBy;
  this.claimedBy = null;
  this.claimedAt = null;
  this.status = 'open';
  this.logs.push({
    action: 'unclaimed',
    performedBy: previousClaimer || 'system',
    timestamp: new Date(),
  });
  await this.save();
};

TicketSchema.methods.close = async function(closedBy: string, reason?: string): Promise<void> {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = closedBy;
  this.closeReason = reason || null;
  this.logs.push({
    action: 'closed',
    performedBy: closedBy,
    timestamp: new Date(),
    details: { reason },
  });
  await this.save();
};

TicketSchema.methods.reopen = async function(reopenedBy: string): Promise<void> {
  this.status = this.claimedBy ? 'claimed' : 'open';
  this.closedAt = null;
  this.closedBy = null;
  this.closeReason = null;
  this.logs.push({
    action: 'reopened',
    performedBy: reopenedBy,
    timestamp: new Date(),
  });
  await this.save();
};

TicketSchema.methods.archive = async function(): Promise<void> {
  this.status = 'archived';
  this.logs.push({
    action: 'archived',
    performedBy: 'system',
    timestamp: new Date(),
  });
  await this.save();
};

TicketSchema.methods.addParticipant = async function(userId: string): Promise<void> {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.logs.push({
      action: 'participant_added',
      performedBy: 'system',
      timestamp: new Date(),
      details: { userId },
    });
    await this.save();
  }
};

TicketSchema.methods.removeParticipant = async function(userId: string): Promise<void> {
  const index = this.participants.indexOf(userId);
  if (index > -1) {
    this.participants.splice(index, 1);
    this.logs.push({
      action: 'participant_removed',
      performedBy: 'system',
      timestamp: new Date(),
      details: { userId },
    });
    await this.save();
  }
};

TicketSchema.methods.setPriority = async function(priority: TicketPriority): Promise<void> {
  const oldPriority = this.priority;
  this.priority = priority;
  this.logs.push({
    action: 'priority_changed',
    performedBy: 'system',
    timestamp: new Date(),
    details: { from: oldPriority, to: priority },
  });
  await this.save();
};

TicketSchema.methods.addNote = async function(authorId: string, content: string): Promise<void> {
  this.notes.push({
    authorId,
    content,
    createdAt: new Date(),
    isInternal: true,
  });
  this.logs.push({
    action: 'note_added',
    performedBy: authorId,
    timestamp: new Date(),
  });
  await this.save();
};

TicketSchema.methods.setTranscript = async function(transcript: string): Promise<void> {
  this.transcript = transcript;
  await this.save();
};

TicketSchema.methods.addTag = async function(tag: string): Promise<void> {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    this.logs.push({
      action: 'tag_added',
      performedBy: 'system',
      timestamp: new Date(),
      details: { tag },
    });
    await this.save();
  }
};

TicketSchema.methods.removeTag = async function(tag: string): Promise<void> {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    this.logs.push({
      action: 'tag_removed',
      performedBy: 'system',
      timestamp: new Date(),
      details: { tag },
    });
    await this.save();
  }
};

TicketSchema.methods.updateLastActivity = async function(): Promise<void> {
  this.lastActivityAt = new Date();
  this.autoCloseWarned = false;
  this.autoCloseWarnedAt = null;
  await this.save();
};

// ============================================
// Static Methods
// ============================================

TicketSchema.statics.countUserOpenTickets = async function(
  guildId: string,
  userId: string
): Promise<number> {
  return this.countDocuments({ 
    guildId, 
    userId, 
    status: { $in: ['open', 'claimed', 'on_hold'] } 
  });
};

TicketSchema.statics.getUserTickets = async function(
  guildId: string,
  userId: string,
  limit: number = 10
): Promise<ITicketDocument[]> {
  return this.find({ guildId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

TicketSchema.statics.getOpenTickets = async function(
  guildId: string
): Promise<ITicketDocument[]> {
  return this.find({ guildId, status: { $in: ['open', 'claimed', 'on_hold'] } })
    .sort({ priority: -1, createdAt: 1 })
    .lean();
};

TicketSchema.statics.getTicketByChannel = async function(
  channelId: string
): Promise<ITicketDocument | null> {
  return this.findOne({ channelId });
};

TicketSchema.statics.getNextTicketNumber = async function(
  guildId: string
): Promise<number> {
  const lastTicket = await this.findOne({ guildId }).sort({ ticketNumber: -1 }).lean();
  return lastTicket ? (lastTicket as any).ticketNumber + 1 : 1;
};

TicketSchema.statics.createTicket = async function(
  data: Partial<ITicketDocument>
): Promise<ITicketDocument> {
  // Get next ticket number inline
  const lastTicket = await this.findOne({ guildId: data.guildId }).sort({ ticketNumber: -1 }).lean();
  const ticketNumber = lastTicket ? (lastTicket as any).ticketNumber + 1 : 1;
  
  const ticket = await this.create({
    ...data,
    ticketNumber,
    logs: [{
      action: 'created',
      performedBy: data.userId,
      timestamp: new Date(),
    }],
  });
  return ticket as ITicketDocument;
};

TicketSchema.statics.getGuildStats = async function(
  guildId: string
): Promise<{
  total: number;
  open: number;
  claimed: number;
  closed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}> {
  const [counts, responseTimes] = await Promise.all([
    this.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      { $match: { guildId, firstResponseAt: { $ne: null } } },
      {
        $project: {
          responseTime: { $subtract: ['$firstResponseAt', '$createdAt'] },
          resolutionTime: {
            $cond: {
              if: { $ne: ['$closedAt', null] },
              then: { $subtract: ['$closedAt', '$createdAt'] },
              else: null,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          avgResolutionTime: { $avg: '$resolutionTime' },
        },
      },
    ]),
  ]);
  
  const statusCounts: Record<string, number> = {};
  counts.forEach((c: { _id: string; count: number }) => {
    statusCounts[c._id] = c.count;
  });
  
  const times = responseTimes[0] || { avgResponseTime: 0, avgResolutionTime: 0 };
  
  return {
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    open: (statusCounts['open'] || 0) + (statusCounts['on_hold'] || 0),
    claimed: statusCounts['claimed'] || 0,
    closed: (statusCounts['closed'] || 0) + (statusCounts['archived'] || 0),
    avgResponseTime: Math.round(times.avgResponseTime || 0),
    avgResolutionTime: Math.round(times.avgResolutionTime || 0),
  };
};

TicketSchema.statics.getStaffStats = async function(
  guildId: string,
  staffId: string
): Promise<{
  claimed: number;
  closed: number;
  avgResolutionTime: number;
}> {
  const [claimed, closedStats] = await Promise.all([
    this.countDocuments({ guildId, claimedBy: staffId }),
    this.aggregate([
      { $match: { guildId, closedBy: staffId } },
      {
        $project: {
          resolutionTime: { $subtract: ['$closedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgResolutionTime: { $avg: '$resolutionTime' },
        },
      },
    ]),
  ]);
  
  const stats = closedStats[0] || { count: 0, avgResolutionTime: 0 };
  
  return {
    claimed,
    closed: stats.count,
    avgResolutionTime: Math.round(stats.avgResolutionTime || 0),
  };
};

TicketSchema.statics.getInactiveTickets = async function(
  guildId: string,
  inactiveForMs: number
): Promise<ITicketDocument[]> {
  const cutoff = new Date(Date.now() - inactiveForMs);
  return this.find({
    guildId,
    status: { $in: ['open', 'claimed'] },
    lastActivityAt: { $lt: cutoff },
  }).lean();
};

TicketSchema.statics.bulkClose = async function(
  guildId: string,
  ticketIds: string[],
  closedBy: string,
  reason?: string
): Promise<number> {
  const result = await this.updateMany(
    { guildId, _id: { $in: ticketIds }, status: { $ne: 'closed' } },
    {
      $set: {
        status: 'closed',
        closedAt: new Date(),
        closedBy,
        closeReason: reason || 'Bulk closed',
      },
      $push: {
        logs: {
          action: 'closed',
          performedBy: closedBy,
          timestamp: new Date(),
          details: { reason: reason || 'Bulk closed', bulk: true },
        },
      },
    }
  );
  return result.modifiedCount;
};

// ============================================
// Export Model
// ============================================

export const Ticket = mongoose.model<ITicketDocument, ITicketModel>('Ticket', TicketSchema);
