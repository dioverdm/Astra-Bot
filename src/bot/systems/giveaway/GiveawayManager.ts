// ===========================================
// ASTRA BOT - Advanced Giveaway Manager
// ===========================================

import { 
  Client, 
  EmbedBuilder, 
  TextChannel, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
  GuildMember,
  Message
} from 'discord.js';
import { Giveaway, IGiveaway, IGiveawayDocument } from '../../../database/models/Giveaway.js';
import { UserLevel } from '../../../database/models/UserLevel.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';

// ============ Giveaway Manager ============

export class GiveawayManager {
  private static instance: GiveawayManager;
  private client: Client | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): GiveawayManager {
    if (!GiveawayManager.instance) {
      GiveawayManager.instance = new GiveawayManager();
    }
    return GiveawayManager.instance;
  }

  initialize(client: Client): void {
    this.client = client;
    
    // Check for ended giveaways every 10 seconds
    this.checkInterval = setInterval(() => this.checkGiveaways(), 10000);
    
    console.log('🎉 Giveaway Manager initialized');
  }

  // ============ Create Giveaway ============

  async create(options: {
    guildId: string;
    channelId: string;
    hostId: string;
    prize: string;
    description?: string;
    duration: number; // in milliseconds
    winnerCount: number;
    requirements?: IGiveaway['requirements'];
    bonusEntries?: IGiveaway['bonusEntries'];
  }): Promise<IGiveawayDocument | null> {
    if (!this.client) return null;

    const channel = await this.client.channels.fetch(options.channelId) as TextChannel;
    if (!channel) return null;

    const endsAt = new Date(Date.now() + options.duration);

    // Create embed
    const embed = this.createGiveawayEmbed({
      prize: options.prize,
      description: options.description,
      hostId: options.hostId,
      endsAt,
      winnerCount: options.winnerCount,
      requirements: options.requirements,
      participantCount: 0,
      ended: false
    });

    // Create button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('🎉 Enter Giveaway')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('giveaway_participants')
          .setLabel('👥 0')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

    // Send message
    const message = await channel.send({ embeds: [embed], components: [row] });

    // Save to database
    const giveaway = await Giveaway.create({
      guildId: options.guildId,
      channelId: options.channelId,
      messageId: message.id,
      hostId: options.hostId,
      prize: options.prize,
      description: options.description,
      winnerCount: options.winnerCount,
      endsAt,
      requirements: options.requirements || {},
      bonusEntries: options.bonusEntries || [],
      participants: [],
      winners: [],
      ended: false
    });

    return giveaway;
  }

  // ============ Enter Giveaway ============

  async enter(messageId: string, userId: string, member: GuildMember): Promise<{ 
    success: boolean; 
    message: string;
    entries?: number;
  }> {
    const giveaway = await Giveaway.findOne({ messageId, ended: false });
    
    if (!giveaway) {
      return { success: false, message: 'This giveaway has ended or does not exist.' };
    }

    // Check if already entered
    if (giveaway.participants.includes(userId)) {
      return { success: false, message: 'You have already entered this giveaway!' };
    }

    // Check requirements
    const requirementCheck = await this.checkRequirements(giveaway, member);
    if (!requirementCheck.passed) {
      return { success: false, message: requirementCheck.reason! };
    }

    // Add participant
    giveaway.participants.push(userId);
    await giveaway.save();

    // Calculate bonus entries
    let totalEntries = 1;
    for (const bonus of giveaway.bonusEntries) {
      if (member.roles.cache.has(bonus.roleId)) {
        totalEntries += bonus.entries;
      }
    }

    // Update message
    await this.updateGiveawayMessage(giveaway);

    return { 
      success: true, 
      message: `You have entered the giveaway!${totalEntries > 1 ? ` (${totalEntries} entries)` : ''}`,
      entries: totalEntries
    };
  }

  // ============ Check Requirements ============

  private async checkRequirements(giveaway: IGiveawayDocument, member: GuildMember): Promise<{
    passed: boolean;
    reason?: string;
  }> {
    const req = giveaway.requirements;
    if (!req) return { passed: true };

    // Check required roles
    if (req.roles && req.roles.length > 0) {
      const hasRole = req.roles.some(roleId => member.roles.cache.has(roleId));
      if (!hasRole) {
        const roleNames = req.roles
          .map(id => member.guild.roles.cache.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        return { passed: false, reason: `You need one of these roles: ${roleNames}` };
      }
    }

    // Check minimum level
    if (req.minLevel) {
      const userLevel = await UserLevel.findOne({ 
        guildId: giveaway.guildId, 
        odiscordId: member.id 
      });
      const level = userLevel?.level || 0;
      if (level < req.minLevel) {
        return { passed: false, reason: `You need to be at least level ${req.minLevel}. (Current: ${level})` };
      }
    }

    // Check account age
    if (req.minAccountAge) {
      const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (accountAge < req.minAccountAge) {
        return { passed: false, reason: `Your account must be at least ${req.minAccountAge} days old.` };
      }
    }

    // Check server membership age
    if (req.minServerAge && member.joinedTimestamp) {
      const serverAge = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
      if (serverAge < req.minServerAge) {
        return { passed: false, reason: `You must be in the server for at least ${req.minServerAge} days.` };
      }
    }

    return { passed: true };
  }

  // ============ End Giveaway ============

  async end(messageId: string, force: boolean = false): Promise<{
    success: boolean;
    winners?: string[];
    message?: string;
  }> {
    const giveaway = await Giveaway.findOne({ messageId });
    
    if (!giveaway) {
      return { success: false, message: 'Giveaway not found.' };
    }

    if (giveaway.ended && !force) {
      return { success: false, message: 'This giveaway has already ended.' };
    }

    // Select winners
    const winners = await this.selectWinners(giveaway);
    
    giveaway.winners = winners;
    giveaway.ended = true;
    await giveaway.save();

    // Update message
    await this.updateGiveawayMessage(giveaway, true);

    // Announce winners
    await this.announceWinners(giveaway, winners);

    return { success: true, winners };
  }

  // ============ Reroll Winners ============

  async reroll(messageId: string, count: number = 1): Promise<{
    success: boolean;
    winners?: string[];
    message?: string;
  }> {
    const giveaway = await Giveaway.findOne({ messageId });
    
    if (!giveaway) {
      return { success: false, message: 'Giveaway not found.' };
    }

    if (!giveaway.ended) {
      return { success: false, message: 'This giveaway has not ended yet.' };
    }

    // Get eligible participants (exclude previous winners)
    const eligibleParticipants = giveaway.participants.filter(
      p => !giveaway.winners.includes(p)
    );

    if (eligibleParticipants.length === 0) {
      return { success: false, message: 'No eligible participants for reroll.' };
    }

    // Select new winners
    const newWinners: string[] = [];
    const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      newWinners.push(shuffled[i]);
    }

    // Update winners list
    giveaway.winners.push(...newWinners);
    await giveaway.save();

    // Announce new winners
    await this.announceWinners(giveaway, newWinners, true);

    return { success: true, winners: newWinners };
  }

  // ============ Select Winners ============

  private async selectWinners(giveaway: IGiveawayDocument): Promise<string[]> {
    if (giveaway.participants.length === 0) return [];

    // Build weighted entries array
    const entries: string[] = [];
    
    if (!this.client) return [];
    
    const guild = await this.client.guilds.fetch(giveaway.guildId).catch(() => null);
    
    for (const odiscordId of giveaway.participants) {
      let entryCount = 1;
      
      // Add bonus entries
      if (guild && giveaway.bonusEntries.length > 0) {
        const member = await guild.members.fetch(odiscordId).catch(() => null);
        if (member) {
          for (const bonus of giveaway.bonusEntries) {
            if (member.roles.cache.has(bonus.roleId)) {
              entryCount += bonus.entries;
            }
          }
        }
      }
      
      for (let i = 0; i < entryCount; i++) {
        entries.push(odiscordId);
      }
    }

    // Shuffle and select unique winners
    const shuffled = entries.sort(() => Math.random() - 0.5);
    const winners: string[] = [];
    
    for (const entry of shuffled) {
      if (!winners.includes(entry)) {
        winners.push(entry);
        if (winners.length >= giveaway.winnerCount) break;
      }
    }

    return winners;
  }

  // ============ Update Message ============

  private async updateGiveawayMessage(giveaway: IGiveawayDocument, ended: boolean = false): Promise<void> {
    if (!this.client) return;

    try {
      const channel = await this.client.channels.fetch(giveaway.channelId) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.messageId);
      if (!message) return;

      const embed = this.createGiveawayEmbed({
        prize: giveaway.prize,
        description: giveaway.description,
        hostId: giveaway.hostId,
        endsAt: giveaway.endsAt,
        winnerCount: giveaway.winnerCount,
        requirements: giveaway.requirements,
        participantCount: giveaway.participants.length,
        ended,
        winners: giveaway.winners
      });

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel(ended ? '🎉 Giveaway Ended' : '🎉 Enter Giveaway')
            .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setDisabled(ended),
          new ButtonBuilder()
            .setCustomId('giveaway_participants')
            .setLabel(`👥 ${giveaway.participants.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

      await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Failed to update giveaway message:', error);
    }
  }

  // ============ Announce Winners ============

  private async announceWinners(giveaway: IGiveawayDocument, winners: string[], reroll: boolean = false): Promise<void> {
    if (!this.client) return;

    try {
      const channel = await this.client.channels.fetch(giveaway.channelId) as TextChannel;
      if (!channel) return;

      if (winners.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle('🎉 Giveaway Ended')
          .setDescription(`No valid entries for **${giveaway.prize}**`)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        return;
      }

      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.success)
        .setTitle(reroll ? '🎲 Giveaway Rerolled!' : '🎉 Giveaway Ended!')
        .setDescription(
          `**Prize:** ${giveaway.prize}\n\n` +
          `🏆 **Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\n` +
          `Congratulations! 🎊`
        )
        .setFooter({ text: `${giveaway.participants.length} total entries` })
        .setTimestamp();

      await channel.send({ 
        content: winnerMentions,
        embeds: [embed] 
      });
    } catch (error) {
      console.error('Failed to announce winners:', error);
    }
  }

  // ============ Create Embed ============

  private createGiveawayEmbed(options: {
    prize: string;
    description?: string;
    hostId: string;
    endsAt: Date;
    winnerCount: number;
    requirements?: IGiveaway['requirements'];
    participantCount: number;
    ended: boolean;
    winners?: string[];
  }): EmbedBuilder {
    const { prize, description, hostId, endsAt, winnerCount, requirements, participantCount, ended, winners } = options;

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${prize}`)
      .setColor(ended ? EMBED_COLORS.warning : EMBED_COLORS.primary)
      .setTimestamp();

    // Description
    let desc = description ? `${description}\n\n` : '';
    
    if (ended && winners && winners.length > 0) {
      desc += `🏆 **Winner${winners.length > 1 ? 's' : ''}:** ${winners.map(id => `<@${id}>`).join(', ')}\n\n`;
    }
    
    desc += `👤 **Hosted by:** <@${hostId}>\n`;
    desc += `🎫 **Winners:** ${winnerCount}\n`;
    desc += `👥 **Entries:** ${participantCount}\n`;
    
    if (!ended) {
      desc += `⏰ **Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n`;
    } else {
      desc += `✅ **Ended:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n`;
    }

    embed.setDescription(desc);

    // Requirements
    if (requirements && !ended) {
      const reqs: string[] = [];
      if (requirements.roles?.length) {
        reqs.push(`• Role: ${requirements.roles.map(r => `<@&${r}>`).join(' or ')}`);
      }
      if (requirements.minLevel) {
        reqs.push(`• Level ${requirements.minLevel}+`);
      }
      if (requirements.minAccountAge) {
        reqs.push(`• Account ${requirements.minAccountAge}+ days old`);
      }
      if (requirements.minServerAge) {
        reqs.push(`• Server member for ${requirements.minServerAge}+ days`);
      }

      if (reqs.length > 0) {
        embed.addFields({
          name: '📋 Requirements',
          value: reqs.join('\n')
        });
      }
    }

    if (!ended) {
      embed.setFooter({ text: 'Click the button below to enter!' });
    }

    return embed;
  }

  // ============ Check Giveaways ============

  private async checkGiveaways(): Promise<void> {
    try {
      const expiredGiveaways = await Giveaway.find({
        ended: false,
        endsAt: { $lte: new Date() }
      });

      for (const giveaway of expiredGiveaways) {
        await this.end(giveaway.messageId);
      }
    } catch (error) {
      console.error('Error checking giveaways:', error);
    }
  }

  // ============ Get Active Giveaways ============

  async getActiveGiveaways(guildId: string): Promise<IGiveawayDocument[]> {
    return Giveaway.find({ guildId, ended: false }).sort({ endsAt: 1 });
  }

  // ============ Delete Giveaway ============

  async delete(messageId: string): Promise<boolean> {
    const giveaway = await Giveaway.findOne({ messageId });
    if (!giveaway) return false;

    // Try to delete the message
    if (this.client) {
      try {
        const channel = await this.client.channels.fetch(giveaway.channelId) as TextChannel;
        const message = await channel.messages.fetch(giveaway.messageId);
        await message.delete();
      } catch {}
    }

    await Giveaway.deleteOne({ messageId });
    return true;
  }
}

// Export singleton
export const giveawayManager = GiveawayManager.getInstance();
