// ===========================================
// ASTRA BOT - Modern Music Embed Builder
// Card-style embeds for music commands
// ===========================================

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GuildQueue, Track } from 'discord-player';

// Colors for different states
const MUSIC_COLORS = {
  playing: 0x1DB954,    // Spotify green
  paused: 0xFFA500,     // Orange
  queued: 0x5865F2,     // Discord blurple
  stopped: 0xED4245,    // Red
  info: 0x2F3136,       // Dark gray
  youtube: 0xFF0000,    // YouTube red
  spotify: 0x1DB954,    // Spotify green
  soundcloud: 0xFF5500, // SoundCloud orange
} as const;

// Get source icon and color
export function getSourceInfo(url?: string): { icon: string; name: string; color: number } {
  if (!url) return { icon: '🎵', name: 'Unknown', color: MUSIC_COLORS.info };
  if (url.includes('youtube') || url.includes('youtu.be')) {
    return { icon: '🔴', name: 'YouTube', color: MUSIC_COLORS.youtube };
  }
  if (url.includes('spotify')) {
    return { icon: '🟢', name: 'Spotify', color: MUSIC_COLORS.spotify };
  }
  if (url.includes('soundcloud')) {
    return { icon: '🟠', name: 'SoundCloud', color: MUSIC_COLORS.soundcloud };
  }
  return { icon: '🎵', name: 'Music', color: MUSIC_COLORS.info };
}

// Format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Create modern progress bar
export function createProgressBar(current: number, total: number, length: number = 15): string {
  const progress = Math.round((current / total) * length);
  const empty = length - progress;
  
  const filled = '━'.repeat(Math.max(0, progress));
  const dot = '●';
  const unfilled = '━'.repeat(Math.max(0, empty));
  
  return `${filled}${dot}${unfilled}`;
}

// Get loop mode display
export function getLoopMode(mode: number): { icon: string; name: string } {
  switch (mode) {
    case 1: return { icon: '🔂', name: 'Track' };
    case 2: return { icon: '🔁', name: 'Queue' };
    case 3: return { icon: '📻', name: 'Autoplay' };
    default: return { icon: '➡️', name: 'Off' };
  }
}

// ============================================
// NOW PLAYING EMBED - Modern Card Style
// ============================================
export function createNowPlayingEmbed(queue: GuildQueue, detailed: boolean = true): EmbedBuilder {
  const track = queue.currentTrack!;
  const source = getSourceInfo(track.url);
  const timestamp = queue.node.getTimestamp();
  const current = timestamp?.current?.value || 0;
  const total = track.durationMS;
  
  const progressBar = createProgressBar(current, total);
  const currentTime = formatDuration(current);
  const totalTime = track.duration;
  
  const embed = new EmbedBuilder()
    .setColor(queue.node.isPaused() ? MUSIC_COLORS.paused : MUSIC_COLORS.playing);

  if (detailed) {
    // Detailed Now Playing Card
    embed
      .setAuthor({
        name: `${source.icon} ${source.name}`,
        iconURL: track.requestedBy?.displayAvatarURL()
      })
      .setTitle(track.title)
      .setURL(track.url)
      .setThumbnail(track.thumbnail)
      .setDescription([
        '',
        `**Requested by** [@${track.requestedBy?.username || 'Unknown'}](https://discord.com)`,
        '',
        `\`${currentTime}\` ${progressBar} \`${totalTime}\``,
        '',
      ].join('\n'))
      .addFields(
        { 
          name: '👤 Artist', 
          value: `\`${track.author || 'Unknown'}\``, 
          inline: true 
        },
        { 
          name: '⏱️ Duration', 
          value: `\`${track.duration}\``, 
          inline: true 
        },
        { 
          name: '📋 In Queue', 
          value: `\`${queue.tracks.size} tracks\``, 
          inline: true 
        }
      )
      .setFooter({
        text: `🔊 ${queue.node.volume}% • ${getLoopMode(queue.repeatMode).icon} ${getLoopMode(queue.repeatMode).name} • Astra Music`,
      });
  } else {
    // Compact Now Playing Card
    embed
      .setAuthor({ name: '🎵 Now Playing' })
      .setDescription([
        `**${track.title}**`,
        `${track.author}`,
        '',
        `\`${currentTime}\` ${progressBar} \`${totalTime}\``,
      ].join('\n'))
      .setThumbnail(track.thumbnail);
  }

  return embed;
}

// ============================================
// ADDED TO QUEUE EMBED
// ============================================
export function createQueuedEmbed(track: Track, position: number): EmbedBuilder {
  const source = getSourceInfo(track.url);
  
  return new EmbedBuilder()
    .setColor(MUSIC_COLORS.queued)
    .setAuthor({ 
      name: `${source.icon} Added to Queue`,
    })
    .setDescription([
      `**[${track.title}](${track.url})**`,
      `by ${track.author}`,
    ].join('\n'))
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: '⏱️ Duration', value: `\`${track.duration}\``, inline: true },
      { name: '📋 Position', value: `\`#${position}\``, inline: true },
      { name: '👤 Requested', value: `<@${track.requestedBy?.id}>`, inline: true }
    )
    .setFooter({ text: 'Astra Music' })
    .setTimestamp();
}

// ============================================
// QUEUE EMBED - Modern Card Style
// ============================================
export function createQueueEmbed(
  queue: GuildQueue, 
  page: number, 
  totalPages: number
): EmbedBuilder {
  const tracks = queue.tracks.toArray();
  const currentTrack = queue.currentTrack!;
  const source = getSourceInfo(currentTrack.url);
  
  const TRACKS_PER_PAGE = 8;
  const start = (page - 1) * TRACKS_PER_PAGE;
  const pageTracks = tracks.slice(start, start + TRACKS_PER_PAGE);
  
  // Calculate total duration
  const totalDuration = tracks.reduce((acc, t) => acc + t.durationMS, currentTrack.durationMS);
  const totalFormatted = formatDuration(totalDuration);
  
  const embed = new EmbedBuilder()
    .setColor(MUSIC_COLORS.info)
    .setAuthor({ 
      name: '📋 Music Queue',
      iconURL: queue.guild.iconURL() || undefined
    })
    .setThumbnail(currentTrack.thumbnail);

  // Now Playing Section
  const timestamp = queue.node.getTimestamp();
  const current = timestamp?.current?.value || 0;
  const progressBar = createProgressBar(current, currentTrack.durationMS, 12);
  
  embed.addFields({
    name: `${source.icon} Now Playing`,
    value: [
      `**[${currentTrack.title}](${currentTrack.url})**`,
      `${currentTrack.author} • \`${currentTrack.duration}\``,
      `${progressBar}`,
    ].join('\n'),
    inline: false
  });

  // Queue Section
  if (pageTracks.length > 0) {
    const queueList = pageTracks.map((track, i) => {
      const pos = start + i + 1;
      const title = track.title.length > 35 ? track.title.slice(0, 35) + '...' : track.title;
      return `\`${pos}.\` **${title}**\n└ ${track.author} • \`${track.duration}\``;
    }).join('\n');

    embed.addFields({
      name: `📜 Up Next (${tracks.length} tracks)`,
      value: queueList,
      inline: false
    });
  } else if (tracks.length === 0) {
    embed.addFields({
      name: '📜 Up Next',
      value: '*Queue is empty - Use /play to add more!*',
      inline: false
    });
  }

  // Stats Footer
  embed.addFields({
    name: '📊 Queue Info',
    value: [
      `**Total:** \`${tracks.length + 1}\` tracks`,
      `**Duration:** \`${totalFormatted}\``,
      `**Loop:** ${getLoopMode(queue.repeatMode).icon} ${getLoopMode(queue.repeatMode).name}`,
      `**Volume:** \`${queue.node.volume}%\``,
    ].join(' • '),
    inline: false
  });

  embed.setFooter({ 
    text: `Page ${page}/${totalPages} • Astra Music` 
  });

  return embed;
}

// ============================================
// CONTROL BUTTONS - Modern Style
// ============================================
export function createPlayerButtons(isPaused: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_prev')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_playpause')
        .setEmoji(isPaused ? '▶️' : '⏸️')
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
        .setCustomId('music_loop')
        .setEmoji('🔁')
        .setStyle(ButtonStyle.Secondary)
    );
}

// Secondary row with more options
export function createPlayerButtonsRow2(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_voldown')
        .setEmoji('🔉')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_volup')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_lyrics')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Secondary)
    );
}

// ============================================
// FILTERS EMBED
// ============================================
export const AUDIO_FILTERS = [
  { id: 'bassboost', name: 'Bassboost', emoji: '🔊' },
  { id: '8D', name: '8D', emoji: '🎧' },
  { id: 'vaporwave', name: 'Vaporwave', emoji: '🌊' },
  { id: 'nightcore', name: 'Nightcore', emoji: '🌙' },
  { id: 'lofi', name: 'Lofi', emoji: '☕' },
  { id: 'reverse', name: 'Reverse', emoji: '⏪' },
  { id: 'treble', name: 'Treble', emoji: '🎵' },
  { id: 'karaoke', name: 'Karaoke', emoji: '🎤' },
  { id: 'earrape', name: 'Earrape', emoji: '💀' },
];

export function createFiltersEmbed(enabledFilters: string[]): EmbedBuilder {
  const filterList = AUDIO_FILTERS.map((f, i) => {
    const enabled = enabledFilters.includes(f.id);
    const status = enabled ? '`✅ Enabled`' : '`❌ Disabled`';
    return `\`${i + 1}.\` ${f.emoji} **${f.name}** — ${status}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(0x2F3136)
    .setTitle('🎛️ Audio Filters')
    .setDescription([
      '> *⚠️ This feature is experimental!*',
      '',
      filterList,
    ].join('\n'))
    .setFooter({ text: 'Use the buttons below to toggle filters • Astra Music' });
}

export function createFilterButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId('filter_bassboost').setLabel('Bassboost').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_8D').setLabel('8D').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_vaporwave').setLabel('Vaporwave').setStyle(ButtonStyle.Secondary),
    );
  
  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId('filter_nightcore').setLabel('Nightcore').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_lofi').setLabel('Lofi').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_reverse').setLabel('Reverse').setStyle(ButtonStyle.Secondary),
    );

  const row3 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId('filter_treble').setLabel('Treble').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_karaoke').setLabel('Karaoke').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('filter_earrape').setLabel('Earrape').setStyle(ButtonStyle.Secondary),
    );

  return [row1, row2, row3];
}

// ============================================
// SUCCESS/ERROR EMBEDS
// ============================================
export function musicSuccess(message: string, emoji: string = '✅'): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MUSIC_COLORS.playing)
    .setDescription(`${emoji} ${message}`);
}

export function musicError(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MUSIC_COLORS.stopped)
    .setDescription(`❌ ${message}`);
}

export function musicInfo(message: string, emoji: string = 'ℹ️'): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MUSIC_COLORS.info)
    .setDescription(`${emoji} ${message}`);
}
