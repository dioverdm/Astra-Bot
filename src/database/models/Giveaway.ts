// ===========================================
// ASTRA BOT - Giveaway Model
// ===========================================

import mongoose, { Schema, Document } from 'mongoose';

export interface IGiveaway {
  guildId: string;
  channelId: string;
  messageId: string;
  hostId: string;
  prize: string;
  description?: string;
  winnerCount: number;
  winners: string[];
  participants: string[];
  endsAt: Date;
  ended: boolean;
  
  // Requirements
  requirements: {
    roles?: string[];           // Required roles (any of these)
    minLevel?: number;          // Minimum level required
    minMessages?: number;       // Minimum messages required
    minAccountAge?: number;     // Minimum account age in days
    minServerAge?: number;      // Minimum time in server in days
  };
  
  // Bonus entries
  bonusEntries: {
    roleId: string;
    entries: number;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IGiveawayDocument extends IGiveaway, Document {}

const GiveawaySchema = new Schema<IGiveawayDocument>(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    hostId: { type: String, required: true },
    prize: { type: String, required: true },
    description: { type: String },
    winnerCount: { type: Number, required: true, default: 1 },
    winners: [{ type: String }],
    participants: [{ type: String }],
    endsAt: { type: Date, required: true, index: true },
    ended: { type: Boolean, default: false, index: true },
    
    requirements: {
      roles: [{ type: String }],
      minLevel: { type: Number },
      minMessages: { type: Number },
      minAccountAge: { type: Number },
      minServerAge: { type: Number },
    },
    
    bonusEntries: [{
      roleId: { type: String },
      entries: { type: Number, default: 1 }
    }],
  },
  { timestamps: true }
);

// Index for finding active giveaways
GiveawaySchema.index({ ended: 1, endsAt: 1 });

export const Giveaway = mongoose.model<IGiveawayDocument>('Giveaway', GiveawaySchema);
