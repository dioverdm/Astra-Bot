// ===========================================
// ASTRA DASHBOARD - Music Settings Page
// ===========================================

import { useState, useEffect, memo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Music, 
  Save, 
  ListMusic,
  SkipForward,
  Repeat,
  Settings,
  Clock,
  Play,
  Pause,
  SkipBack,
  Radio,
  Disc3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import RoleSelect from '../../components/RoleSelect';

// Toggle Switch Component
const ToggleSwitch = memo(({ 
  enabled, 
  onChange,
  size = 'default',
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void;
  size?: 'default' | 'large';
}) => {
  const isLarge = size === 'large';
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
      } ${isLarge ? 'w-14 h-7' : 'w-12 h-6'}`}
    >
      <div
        className={`absolute top-1 rounded-full bg-white transition-transform ${
          isLarge ? 'w-5 h-5' : 'w-4 h-4'
        } ${enabled ? (isLarge ? 'translate-x-8' : 'translate-x-7') : 'translate-x-1'}`}
      />
    </button>
  );
});

interface MusicConfig {
  enabled: boolean;
  djRoleId?: string;
  defaultVolume: number;
  maxQueueSize: number;
  maxSongDuration: number; // in minutes
  allowFilters: boolean;
  leaveOnEmpty: boolean;
  leaveOnEmptyCooldown: number; // in seconds
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

const defaultConfig: MusicConfig = {
  enabled: true,
  djRoleId: '',
  defaultVolume: 50,
  maxQueueSize: 100,
  maxSongDuration: 60,
  allowFilters: true,
  leaveOnEmpty: true,
  leaveOnEmptyCooldown: 60,
  leaveOnEnd: false,
  leaveOnEndCooldown: 60,
  announceNowPlaying: true,
  nowPlayingChannelId: '',
  allowPlaylists: true,
  maxPlaylistSize: 50,
  voteSkipEnabled: false,
  voteSkipPercentage: 50,
  restrictToVoiceChannel: true,
};

// Now Playing Interface
interface NowPlaying {
  title: string;
  author: string;
  thumbnail?: string;
  url?: string;
  duration: number;
  position: number;
  volume: number;
  paused: boolean;
  repeatMode: number;
  queueSize: number;
  voiceChannel?: string;
  source?: string;
  requestedBy?: string;
  queue?: Array<{
    title: string;
    author: string;
    duration: number;
  }>;
}

// Audio Filters
const AUDIO_FILTERS = [
  { id: 'bassboost', name: 'Bassboost', icon: '🔊' },
  { id: '8d', name: '8D', icon: '🎧' },
  { id: 'vaporwave', name: 'Vaporwave', icon: '🌊' },
  { id: 'nightcore', name: 'Nightcore', icon: '🌙' },
  { id: 'lofi', name: 'Lofi', icon: '☕' },
  { id: 'reverse', name: 'Reverse', icon: '⏪' },
  { id: 'treble', name: 'Treble', icon: '🎵' },
  { id: 'karaoke', name: 'Karaoke', icon: '🎤' },
  { id: 'earrape', name: 'Earrape', icon: '💀' },
];

// Audio Filters Panel Component
const AudioFiltersPanel = memo(({
  activeFilters,
  onToggleFilter,
  allowFilters,
}: {
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  allowFilters: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">Audio Filters</h3>
            <p className="text-xs text-yellow-400">Experimental Feature</p>
          </div>
        </div>
      </div>
      
      {/* Filter List */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <span className="text-[var(--color-text-secondary)]">#</span>
          <span className="text-[var(--color-text-secondary)]">Filter</span>
          <span className="text-[var(--color-text-secondary)] text-right">Status</span>
        </div>
        <div className="space-y-2">
          {AUDIO_FILTERS.map((filter, index) => (
            <div 
              key={filter.id}
              className="grid grid-cols-3 gap-2 items-center py-2 border-b border-[var(--color-border)]/50 last:border-0"
            >
              <span className="text-sm text-[var(--color-text-secondary)]">{index + 1}</span>
              <span className="text-sm text-[var(--color-text)] flex items-center gap-2">
                <span>{filter.icon}</span>
                {filter.name}
              </span>
              <span className={`text-sm text-right ${
                activeFilters.includes(filter.id) ? 'text-green-400' : 'text-red-400'
              }`}>
                {activeFilters.includes(filter.id) ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Filter Buttons */}
      {allowFilters && (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/50">
          <div className="flex flex-wrap gap-2">
            {AUDIO_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onToggleFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFilters.includes(filter.id)
                    ? 'bg-purple-500 text-white'
                    : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-purple-500'
                }`}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
});

// Queue Panel Component
const QueuePanel = memo(({
  nowPlaying,
  queue,
}: {
  nowPlaying: NowPlaying | null;
  queue: Array<{ title: string; author: string; duration: number }>;
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalQueueTime = queue.reduce((acc, track) => acc + track.duration, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-[var(--color-text)]">Queue</h3>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
            {queue.length} tracks
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <ListMusic className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* Queue Stats */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/30">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Time remaining: <span className="text-[var(--color-text)] font-medium">{formatTime(totalQueueTime)}</span>
        </p>
        {nowPlaying && (
          <div className="mt-2">
            <p className="text-xs text-[var(--color-text-secondary)]">Current Track:</p>
            <p className="text-sm text-[var(--color-text)] font-medium truncate">{nowPlaying.title}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">by {nowPlaying.author}</p>
          </div>
        )}
      </div>

      {/* Queue List */}
      <div className="p-4 max-h-[250px] overflow-y-auto">
        {queue.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-secondary)] py-4">
            Queue is empty
          </p>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Up Next:</p>
            <div className="space-y-2">
              {queue.slice(0, 5).map((track, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[var(--color-text-secondary)] w-4">{index + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--color-text)] truncate">{track.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">by {track.author} - {formatTime(track.duration)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {queue.length > 5 && (
              <p className="text-xs text-[var(--color-text-secondary)] text-center mt-3">
                +{queue.length - 5} more tracks
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
});

// Source Info Card Component
const SourceInfoCard = memo(({
  nowPlaying,
  onAction,
}: {
  nowPlaying: NowPlaying | null;
  onAction: (action: string) => void;
}) => {
  if (!nowPlaying) return null;
  
  const getSourceIcon = () => {
    if (nowPlaying.source?.includes('youtube')) return '🎬';
    if (nowPlaying.source?.includes('spotify')) return '🎵';
    if (nowPlaying.source?.includes('soundcloud')) return '☁️';
    return '🎶';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      {/* Source Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getSourceIcon()}</span>
          <span className="text-sm font-medium text-[var(--color-text)]">
            {nowPlaying.source || 'YouTube'}
          </span>
        </div>
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Disc3 className="w-6 h-6 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Track Info */}
      <div className="px-4 pb-2">
        <h3 className="font-semibold text-[var(--color-text)] truncate">{nowPlaying.title}</h3>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex items-center gap-6 text-sm">
        <div>
          <p className="text-[var(--color-text-secondary)]">Requested by</p>
          <p className="text-blue-400">{nowPlaying.requestedBy || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-[var(--color-text-secondary)]">Duration</p>
          <p className="text-[var(--color-text)]">{formatTime(nowPlaying.duration)}</p>
        </div>
        <div>
          <p className="text-[var(--color-text-secondary)]">Tracks in queue</p>
          <p className="text-[var(--color-text)]">{nowPlaying.queueSize}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/30 flex items-center justify-center gap-3">
        <button
          onClick={() => onAction('previous')}
          className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-purple-500 transition-colors"
          title="Previous"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={() => onAction(nowPlaying.paused ? 'resume' : 'pause')}
          className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-purple-500 transition-colors"
          title={nowPlaying.paused ? 'Resume' : 'Pause'}
        >
          {nowPlaying.paused ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={() => onAction('skip')}
          className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-purple-500 transition-colors"
          title="Skip"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        <button
          onClick={() => onAction('loop')}
          className={`p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-purple-500 transition-colors ${
            nowPlaying.repeatMode > 0 ? 'text-purple-400 border-purple-500' : ''
          }`}
          title="Loop"
        >
          <Repeat className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
});

// Now Playing Card Component (Compact style like in image)
const NowPlayingCard = memo(({
  nowPlaying,
}: {
  nowPlaying: NowPlaying | null;
}) => {
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    if (nowPlaying) {
      setCurrentPosition(nowPlaying.position);
      const interval = setInterval(() => {
        if (!nowPlaying.paused) {
          setCurrentPosition(prev => Math.min(prev + 1000, nowPlaying.duration));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nowPlaying]);

  if (!nowPlaying) return null;

  const progress = nowPlaying.duration > 0 
    ? (currentPosition / nowPlaying.duration) * 100 
    : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-border)] flex-shrink-0">
          {nowPlaying.thumbnail ? (
            <img 
              src={nowPlaying.thumbnail} 
              alt={nowPlaying.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Music className="w-8 h-8 text-purple-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Now Playing</span>
          <h3 className="font-bold text-[var(--color-text)] truncate mt-1">{nowPlaying.title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{nowPlaying.author}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400 font-medium">{formatTime(currentPosition)}</span>
          <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">{formatTime(nowPlaying.duration)}</span>
        </div>
      </div>
    </motion.div>
  );
});

// Live Player Card Component (No music state)
const LivePlayerCard = memo(({ 
  nowPlaying, 
  isLoading,
}: { 
  guildId: string;
  nowPlaying: NowPlaying | null;
  onAction: (action: string) => void;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)]"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-[var(--color-border)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[var(--color-border)] rounded animate-pulse w-2/3" />
            <div className="h-4 bg-[var(--color-border)] rounded animate-pulse w-1/3" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (!nowPlaying) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-card)] rounded-2xl p-8 border border-[var(--color-border)]"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Radio className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text)]">No Music Playing</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Use <code className="px-2 py-0.5 rounded bg-[var(--color-border)] text-purple-400">/play</code> in Discord to start playing music
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null; // Use SourceInfoCard and NowPlayingCard instead when music is playing
});

export default function MusicSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<MusicConfig>(defaultConfig);

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'music'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.music || {};
    },
    enabled: !!guildId,
  });

  // Fetch now playing status (poll every 5 seconds)
  const { data: nowPlayingData, isLoading: nowPlayingLoading } = useQuery<NowPlaying | null>({
    queryKey: ['music-nowplaying', guildId],
    queryFn: async () => {
      try {
        const res = await api.get(`/guilds/${guildId}/music/nowplaying`);
        return res.data.data as NowPlaying | null;
      } catch {
        return null;
      }
    },
    enabled: !!guildId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Music action mutation
  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      return api.post(`/guilds/${guildId}/music/action`, { action });
    },
    onSuccess: (_: unknown, action: string) => {
      toast.success(`Action "${action}" executed!`);
      queryClient.invalidateQueries({ queryKey: ['music-nowplaying', guildId] });
    },
    onError: () => {
      toast.error('Failed to execute action');
    },
  });

  const handleMusicAction = (action: string) => {
    actionMutation.mutate(action);
  };

  useEffect(() => {
    if (data) {
      setConfig({ ...defaultConfig, ...data });
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: MusicConfig) => {
      return api.patch(`/guilds/${guildId}`, { music: newConfig });
    },
    onSuccess: () => {
      toast.success('Music settings saved!');
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const updateConfig = (key: keyof MusicConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/20">
            <Music className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Music Settings</h1>
            <p className="text-[var(--color-text-secondary)]">Configure the music player</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
              : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Live Player Section */}
      {nowPlayingLoading ? (
        <LivePlayerCard
          guildId={guildId!}
          nowPlaying={null}
          onAction={handleMusicAction}
          isLoading={true}
        />
      ) : nowPlayingData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Source Info & Now Playing */}
          <div className="space-y-6">
            <SourceInfoCard
              nowPlaying={nowPlayingData}
              onAction={handleMusicAction}
            />
            <NowPlayingCard
              nowPlaying={nowPlayingData}
            />
          </div>

          {/* Right Column - Filters & Queue */}
          <div className="space-y-6">
            <AudioFiltersPanel
              activeFilters={[]}
              onToggleFilter={(filterId) => {
                actionMutation.mutate(`filter_${filterId}`);
              }}
              allowFilters={config.allowFilters}
            />
            <QueuePanel
              nowPlaying={nowPlayingData}
              queue={nowPlayingData.queue || []}
            />
          </div>
        </div>
      ) : (
        <LivePlayerCard
          guildId={guildId!}
          nowPlaying={null}
          onAction={handleMusicAction}
          isLoading={false}
        />
      )}

      {/* Enable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="font-medium text-[var(--color-text)]">Enable Music System</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Allow users to play music in voice channels
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={config.enabled}
            onChange={(v) => updateConfig('enabled', v)}
            size="large"
          />
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">General Settings</h2>
          </div>

          <div className="space-y-4">
            {/* DJ Role */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                DJ Role (Optional)
              </label>
              <RoleSelect
                guildId={guildId!}
                value={config.djRoleId || ''}
                onChange={(v) => updateConfig('djRoleId', v)}
                placeholder="Select DJ role..."
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Only users with this role can use DJ commands (skip, stop, etc.)
              </p>
            </div>

            {/* Default Volume */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Default Volume: {config.defaultVolume}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={config.defaultVolume}
                onChange={(e) => updateConfig('defaultVolume', parseInt(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            {/* Max Queue Size */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Max Queue Size
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={config.maxQueueSize}
                onChange={(e) => updateConfig('maxQueueSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              />
            </div>

            {/* Max Song Duration */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Max Song Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={config.maxSongDuration}
                onChange={(e) => updateConfig('maxSongDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              />
            </div>
          </div>
        </motion.div>

        {/* Behavior Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Behavior</h2>
          </div>

          <div className="space-y-4">
            {/* Leave on Empty */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Leave on Empty</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Leave voice channel when everyone leaves
                </p>
              </div>
              <ToggleSwitch
                enabled={config.leaveOnEmpty}
                onChange={(v) => updateConfig('leaveOnEmpty', v)}
              />
            </div>

            {config.leaveOnEmpty && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Leave Delay (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={config.leaveOnEmptyCooldown}
                  onChange={(e) => updateConfig('leaveOnEmptyCooldown', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
                />
              </div>
            )}

            {/* Leave on End */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Leave on Queue End</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Leave when queue is finished
                </p>
              </div>
              <ToggleSwitch
                enabled={config.leaveOnEnd}
                onChange={(v) => updateConfig('leaveOnEnd', v)}
              />
            </div>

            {/* Announce Now Playing */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Announce Now Playing</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Send message when new song starts
                </p>
              </div>
              <ToggleSwitch
                enabled={config.announceNowPlaying}
                onChange={(v) => updateConfig('announceNowPlaying', v)}
              />
            </div>

            {/* Restrict to Voice Channel */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Require Voice Channel</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Users must be in voice to use commands
                </p>
              </div>
              <ToggleSwitch
                enabled={config.restrictToVoiceChannel}
                onChange={(v) => updateConfig('restrictToVoiceChannel', v)}
              />
            </div>
          </div>
        </motion.div>

        {/* Playlist Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <ListMusic className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Playlists</h2>
          </div>

          <div className="space-y-4">
            {/* Allow Playlists */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Allow Playlists</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Allow users to add entire playlists
                </p>
              </div>
              <ToggleSwitch
                enabled={config.allowPlaylists}
                onChange={(v) => updateConfig('allowPlaylists', v)}
              />
            </div>

            {config.allowPlaylists && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Max Playlist Size
                </label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={config.maxPlaylistSize}
                  onChange={(e) => updateConfig('maxPlaylistSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
                />
              </div>
            )}

            {/* Allow Filters */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Allow Audio Filters</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Allow bass boost, nightcore, etc.
                </p>
              </div>
              <ToggleSwitch
                enabled={config.allowFilters}
                onChange={(v) => updateConfig('allowFilters', v)}
              />
            </div>
          </div>
        </motion.div>

        {/* Vote Skip Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <SkipForward className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Vote Skip</h2>
          </div>

          <div className="space-y-4">
            {/* Vote Skip Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Enable Vote Skip</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Require votes to skip songs
                </p>
              </div>
              <ToggleSwitch
                enabled={config.voteSkipEnabled}
                onChange={(v) => updateConfig('voteSkipEnabled', v)}
              />
            </div>

            {config.voteSkipEnabled && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Vote Threshold: {config.voteSkipPercentage}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={config.voteSkipPercentage}
                  onChange={(e) => updateConfig('voteSkipPercentage', parseInt(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Percentage of listeners needed to skip
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4"
      >
        <div className="flex gap-3">
          <Music className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-400">Music Commands</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Available commands: /play, /skip, /stop, /queue, /nowplaying, /volume, /loop, /shuffle, /seek, /pause, /remove, /clearqueue
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
