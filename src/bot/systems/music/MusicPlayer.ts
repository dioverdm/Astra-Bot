// ===========================================
// ASTRA BOT - Advanced Music System
// Modern Music Player with Queue Management
// ===========================================

import { 
  Client, 
  EmbedBuilder, 
  TextChannel, 
  VoiceChannel,
  GuildMember,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { 
  Player, 
  Track, 
  GuildQueue,
  QueryType,
  QueueRepeatMode
} from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { EMBED_COLORS } from '../../../shared/constants/index.js';

// ============ Types ============

export interface NowPlayingInfo {
  track: Track;
  position: number;
  duration: number;
  volume: number;
  repeatMode: QueueRepeatMode;
  queueSize: number;
}

// ============ Music Player Manager ============

export class MusicPlayerManager {
  private static instance: MusicPlayerManager;
  private player: Player | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): MusicPlayerManager {
    if (!MusicPlayerManager.instance) {
      MusicPlayerManager.instance = new MusicPlayerManager();
    }
    return MusicPlayerManager.instance;
  }

  // Initialize the player with the Discord client
  async initialize(client: Client): Promise<void> {
    if (this.initialized) return;

    this.player = new Player(client as any);

    // Load default extractors (YouTube, Spotify, SoundCloud, etc.)
    await this.player.extractors.loadMulti(DefaultExtractors);

    // Setup event listeners
    this.setupEventListeners();

    this.initialized = true;
    console.log('🎵 Music Player initialized');
  }

  getPlayer(): Player {
    if (!this.player) {
      throw new Error('Music Player not initialized! Call initialize() first.');
    }
    return this.player;
  }

  // ============ Event Listeners ============

  private setupEventListeners(): void {
    if (!this.player) return;

    // Track start
    this.player.events.on('playerStart', (queue, track) => {
      const embed = this.createNowPlayingEmbed(track, queue);
      const channel = queue.metadata?.channel as TextChannel;
      if (channel) {
        channel.send({ embeds: [embed], components: [this.createPlayerButtons()] }).catch(() => {});
      }
    });

    // Track added to queue
    this.player.events.on('audioTrackAdd', (queue, track) => {
      if (queue.isPlaying()) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.music)
          .setDescription(`🎵 **Added to queue:** [${track.title}](${track.url})`)
          .setThumbnail(track.thumbnail)
          .addFields(
            { name: '⏱️ Duration', value: track.duration, inline: true },
            { name: '📋 Position', value: `#${queue.tracks.size}`, inline: true }
          );

        const channel = queue.metadata?.channel as TextChannel;
        if (channel) {
          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    });

    // Playlist added
    this.player.events.on('audioTracksAdd', (queue, tracks) => {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.music)
        .setDescription(`📋 **Added ${tracks.length} tracks** to the queue`)
        .addFields(
          { name: '🎵 First Track', value: tracks[0]?.title || 'Unknown', inline: true },
          { name: '📊 Total in Queue', value: queue.tracks.size.toString(), inline: true }
        );

      const channel = queue.metadata?.channel as TextChannel;
      if (channel) {
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    });

    // Queue empty
    this.player.events.on('emptyQueue', (queue) => {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setDescription('📭 **Queue finished!** Add more songs to keep the party going.');

      const channel = queue.metadata?.channel as TextChannel;
      if (channel) {
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    });

    // Empty channel (everyone left)
    this.player.events.on('emptyChannel', (queue) => {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.warning)
        .setDescription('👋 **Left the voice channel** - Nobody was listening.');

      const channel = queue.metadata?.channel as TextChannel;
      if (channel) {
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    });

    // Player error
    this.player.events.on('playerError', (queue, error) => {
      console.error('Player error:', error);
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.error)
        .setDescription(`❌ **Player Error:** ${error.message}`);

      const channel = queue.metadata?.channel as TextChannel;
      if (channel) {
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    });

    // Connection error
    this.player.events.on('error', (queue, error) => {
      console.error('Connection error:', error);
    });
  }

  // ============ Helper Methods ============

  createNowPlayingEmbed(track: Track, queue: GuildQueue): EmbedBuilder {
    const progressBar = this.createProgressBar(queue);
    
    return new EmbedBuilder()
      .setColor(EMBED_COLORS.music)
      .setAuthor({ name: '🎵 Now Playing', iconURL: track.requestedBy?.displayAvatarURL() })
      .setTitle(track.title)
      .setURL(track.url)
      .setThumbnail(track.thumbnail)
      .setDescription(progressBar)
      .addFields(
        { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
        { name: '⏱️ Duration', value: track.duration, inline: true },
        { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
        { name: '🔁 Loop', value: this.getRepeatModeName(queue.repeatMode), inline: true },
        { name: '📋 Queue', value: `${queue.tracks.size} tracks`, inline: true },
        { name: '🎧 Requested by', value: track.requestedBy?.toString() || 'Unknown', inline: true }
      )
      .setFooter({ text: `Source: ${track.source}` })
      .setTimestamp();
  }

  createProgressBar(queue: GuildQueue): string {
    const progress = queue.node.createProgressBar({
      length: 15,
      timecodes: true,
      indicator: '🔵',
      leftChar: '▬',
      rightChar: '▬'
    });
    return progress || '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 0:00 / 0:00';
  }

  createPlayerButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_previous')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setEmoji('⏯️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setEmoji('⏹️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('music_shuffle')
          .setEmoji('🔀')
          .setStyle(ButtonStyle.Secondary)
      );
  }

  getRepeatModeName(mode: QueueRepeatMode): string {
    switch (mode) {
      case QueueRepeatMode.OFF: return '❌ Off';
      case QueueRepeatMode.TRACK: return '🔂 Track';
      case QueueRepeatMode.QUEUE: return '🔁 Queue';
      case QueueRepeatMode.AUTOPLAY: return '📻 Autoplay';
      default: return '❌ Off';
    }
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const musicPlayer = MusicPlayerManager.getInstance();
