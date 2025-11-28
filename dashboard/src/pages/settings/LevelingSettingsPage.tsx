import { useState, useEffect, memo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Save, 
  Zap,
  Users,
  Hash,
  Gift,
  Palette,
  MessageSquare,
  Star,
  X,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
import RoleSelect from '../../components/RoleSelect';
import MessageTypeSelector, { type MessageType } from '../../components/MessageTypeSelector';
import EmbedBuilder, { type EmbedData } from '../../components/EmbedBuilder';
import { useGuildChannels, useGuildRoles } from '../../hooks/useGuildData';

// ============================================
// Reusable Components
// ============================================

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

// ============================================
// Types & Constants
// ============================================

interface LevelingConfig {
  enabled: boolean;
  xpPerMessage: number;
  xpCooldown: number;
  xpMultiplier: number;
  levelUpChannelId?: string;
  levelUpMessageType: MessageType;
  levelUpMessage: string;
  levelUpEmbed: EmbedData;
  noXpRoles: string[];
  noXpChannels: string[];
  doubleXpRoles: string[];
  doubleXpChannels: string[];
  announceOnlyOnReward: boolean;
}

const DEFAULT_LEVEL_EMBED: EmbedData = {
  title: '🎉 Level Up!',
  description: 'Congratulations {user}!\n\nYou have reached **Level {level}**!',
  color: '#5865F2',
  thumbnail: '{avatar}',
  fields: [],
  timestamp: true,
};

const defaultConfig: LevelingConfig = {
  enabled: true,
  xpPerMessage: 15,
  xpCooldown: 60,
  xpMultiplier: 1,
  levelUpChannelId: '',
  levelUpMessageType: 'embed',
  levelUpMessage: '🎉 Congratulations {user}! You reached level {level}!',
  levelUpEmbed: { ...DEFAULT_LEVEL_EMBED },
  noXpRoles: [],
  noXpChannels: [],
  doubleXpRoles: [],
  doubleXpChannels: [],
  announceOnlyOnReward: false,
};

const LEVEL_VARIABLES = [
  { key: '{user}', description: 'Mentions the user' },
  { key: '{username}', description: 'User display name' },
  { key: '{level}', description: 'New level' },
  { key: '{xp}', description: 'Total XP' },
  { key: '{server}', description: 'Server name' },
  { key: '{avatar}', description: 'User avatar URL' },
  { key: '{nextLevel}', description: 'XP needed for next level' },
];

const XP_PRESETS = [
  { label: 'Slow', xp: 10, cooldown: 120, description: 'Slower progression' },
  { label: 'Normal', xp: 15, cooldown: 60, description: 'Balanced experience' },
  { label: 'Fast', xp: 25, cooldown: 30, description: 'Quick leveling' },
  { label: 'Turbo', xp: 50, cooldown: 15, description: 'Very fast progression' },
];

// ============================================
// Main Component
// ============================================

export default function LevelingSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<LevelingConfig>(defaultConfig);

  // Fetch channels and roles for name display
  const { data: channels } = useGuildChannels(guildId);
  const { data: roles } = useGuildRoles(guildId);

  // Helper functions
  const getChannelName = useCallback((channelId: string) => {
    const channel = channels?.find((c: { id: string; name: string }) => c.id === channelId);
    return channel?.name || channelId.slice(-4);
  }, [channels]);

  const getRoleName = useCallback((roleId: string) => {
    const role = roles?.find((r: { id: string; name: string }) => r.id === roleId);
    return role?.name || roleId.slice(-4);
  }, [roles]);

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'leveling'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.leveling || {};
    },
    enabled: !!guildId,
  });

  // Fetch leveling stats
  const { data: stats } = useQuery({
    queryKey: ['leveling-stats', guildId],
    queryFn: async () => {
      try {
        const res = await api.get(`/stats/${guildId}/leveling`);
        return res.data.data || { totalUsers: 0, totalXp: 0, averageLevel: 0 };
      } catch {
        // Return default stats on error
        return { totalUsers: 0, totalXp: 0, averageLevel: 0 };
      }
    },
    enabled: !!guildId,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setConfig(prev => ({ ...defaultConfig, ...prev, ...data }));
    }
  }, [data]);

  const updateConfig = useCallback((updates: Partial<LevelingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: LevelingConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/leveling`, newConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leveling settings saved!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const applyPreset = (preset: typeof XP_PRESETS[0]) => {
    updateConfig({
      xpPerMessage: preset.xp,
      xpCooldown: preset.cooldown,
    });
    toast.success(`Applied ${preset.label} preset`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading leveling settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Leveling System</h1>
            <p className="text-[var(--color-text-muted)]">Configure XP, levels, and rewards</p>
          </div>
        </div>
        <button
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending}
          className="btn gradient-bg text-white flex items-center gap-2 shadow-lg"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'blue' },
          { label: 'Total XP', value: stats?.totalXp?.toLocaleString() || '0', icon: Zap, color: 'yellow' },
          { label: 'Avg Level', value: stats?.averageLevel?.toFixed(1) || '0', icon: Star, color: 'purple' },
          { label: 'XP Rate', value: `${config.xpPerMessage}/msg`, icon: TrendingUp, color: 'green' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="card text-center"
          >
            <stat.icon className={`w-6 h-6 mx-auto mb-2 text-${stat.color}-400`} />
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`card border-2 transition-colors ${
          config.enabled ? 'border-green-500/30 bg-green-500/5' : 'border-[var(--color-border)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              config.enabled ? 'bg-green-500/20' : 'bg-[var(--color-border)]'
            }`}>
              <Zap className={`w-6 h-6 ${config.enabled ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Enable Leveling System</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Members earn XP by chatting and level up over time
              </p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={config.enabled} 
            onChange={(v) => updateConfig({ enabled: v })} 
            size="large"
          />
        </div>
      </motion.div>

      {/* XP Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">XP Settings</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure how members earn experience points
            </p>
          </div>
        </div>

        {/* XP Presets */}
        <div>
          <label className="block text-sm font-medium mb-3">Quick Presets</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {XP_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all hover:border-[var(--color-accent)]/50 ${
                  config.xpPerMessage === preset.xp && config.xpCooldown === preset.cooldown
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">XP per Message</label>
            <input
              type="number"
              min={1}
              max={100}
              value={config.xpPerMessage}
              onChange={(e) => updateConfig({ xpPerMessage: parseInt(e.target.value) || 15 })}
              className="input w-full"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Base XP (±5 random)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
            <input
              type="number"
              min={0}
              max={300}
              value={config.xpCooldown}
              onChange={(e) => updateConfig({ xpCooldown: parseInt(e.target.value) || 60 })}
              className="input w-full"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Time between XP gains</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">XP Multiplier</label>
            <select
              value={config.xpMultiplier}
              onChange={(e) => updateConfig({ xpMultiplier: parseFloat(e.target.value) })}
              className="input w-full"
            >
              <option value={0.5}>0.5x (Half)</option>
              <option value={1}>1x (Normal)</option>
              <option value={1.5}>1.5x (Boosted)</option>
              <option value={2}>2x (Double)</option>
              <option value={3}>3x (Triple)</option>
            </select>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Global multiplier</p>
          </div>
        </div>
      </motion.div>

      {/* Level Up Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Level Up Notifications</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure how level ups are announced
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Announcement Channel</label>
            <ChannelSelect
              guildId={guildId!}
              value={config.levelUpChannelId}
              onChange={(channelId) => updateConfig({ levelUpChannelId: channelId })}
              placeholder="Same channel as message"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Leave empty for same channel
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message Format</label>
            <MessageTypeSelector
              value={config.levelUpMessageType}
              onChange={(levelUpMessageType) => updateConfig({ levelUpMessageType })}
            />
          </div>
        </div>

        {/* Only announce on reward */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)]">
          <div>
            <p className="font-medium">Only Announce on Role Reward</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Only send level up messages when a role reward is earned
            </p>
          </div>
          <ToggleSwitch
            enabled={config.announceOnlyOnReward}
            onChange={(v) => updateConfig({ announceOnlyOnReward: v })}
          />
        </div>
      </motion.div>

      {/* Text Message */}
      <AnimatePresence>
        {(config.levelUpMessageType === 'message' || config.levelUpMessageType === 'both') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card space-y-4"
          >
            <h2 className="text-lg font-semibold">Level Up Text Message</h2>
            <div className="p-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
              <p className="text-sm font-medium mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {LEVEL_VARIABLES.map(v => (
                  <code key={v.key} className="px-2 py-1 rounded bg-[var(--color-background)] text-xs cursor-help" title={v.description}>
                    {v.key}
                  </code>
                ))}
              </div>
            </div>
            <textarea
              value={config.levelUpMessage}
              onChange={(e) => updateConfig({ levelUpMessage: e.target.value })}
              className="input w-full h-24 resize-none"
              placeholder="🎉 Congratulations {user}! You reached level {level}!"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Embed */}
      <AnimatePresence>
        {(config.levelUpMessageType === 'embed' || config.levelUpMessageType === 'both') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card space-y-4"
          >
            <h2 className="text-lg font-semibold">Level Up Embed</h2>
            <EmbedBuilder
              value={config.levelUpEmbed}
              onChange={(levelUpEmbed) => updateConfig({ levelUpEmbed })}
              variables={LEVEL_VARIABLES}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* No XP Channels & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">No XP Channels</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Messages in these channels won't earn XP
              </p>
            </div>
          </div>
          <ChannelSelect
            guildId={guildId!}
            value=""
            onChange={(channelId) => {
              if (channelId && !(config.noXpChannels || []).includes(channelId)) {
                updateConfig({ noXpChannels: [...(config.noXpChannels || []), channelId] });
              }
            }}
            placeholder="Add channel..."
          />
          {(config.noXpChannels?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.noXpChannels || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  #{getChannelName(id)}
                  <button onClick={() => updateConfig({ noXpChannels: (config.noXpChannels || []).filter((c: string) => c !== id) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">No XP Roles</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Users with these roles won't earn XP
              </p>
            </div>
          </div>
          <RoleSelect
            guildId={guildId!}
            value=""
            onChange={(roleId) => {
              if (roleId && !(config.noXpRoles || []).includes(roleId)) {
                updateConfig({ noXpRoles: [...(config.noXpRoles || []), roleId] });
              }
            }}
            placeholder="Add role..."
          />
          {(config.noXpRoles?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.noXpRoles || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  @{getRoleName(id)}
                  <button onClick={() => updateConfig({ noXpRoles: (config.noXpRoles || []).filter((r: string) => r !== id) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Double XP Channels & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">2x XP Channels</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Messages in these channels earn double XP
              </p>
            </div>
          </div>
          <ChannelSelect
            guildId={guildId!}
            value=""
            onChange={(channelId) => {
              if (channelId && !(config.doubleXpChannels || []).includes(channelId)) {
                updateConfig({ doubleXpChannels: [...(config.doubleXpChannels || []), channelId] });
              }
            }}
            placeholder="Add channel..."
          />
          {(config.doubleXpChannels?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.doubleXpChannels || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm">
                  #{getChannelName(id)}
                  <button onClick={() => updateConfig({ doubleXpChannels: (config.doubleXpChannels || []).filter((c: string) => c !== id) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">2x XP Roles</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Users with these roles earn double XP
              </p>
            </div>
          </div>
          <RoleSelect
            guildId={guildId!}
            value=""
            onChange={(roleId) => {
              if (roleId && !(config.doubleXpRoles || []).includes(roleId)) {
                updateConfig({ doubleXpRoles: [...(config.doubleXpRoles || []), roleId] });
              }
            }}
            placeholder="Add role..."
          />
          {(config.doubleXpRoles?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.doubleXpRoles || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm">
                  @{getRoleName(id)}
                  <button onClick={() => updateConfig({ doubleXpRoles: (config.doubleXpRoles || []).filter((r: string) => r !== id) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Link
          to={`/dashboard/guild/${guildId}/settings/role-rewards`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              Role Rewards
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Assign roles when members reach levels
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
        </Link>

        <Link
          to={`/dashboard/guild/${guildId}/level-card`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              Level Card Designer
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Customize rank card appearance
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
        </Link>
      </motion.div>

      {/* Unsaved Changes Warning */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">You have unsaved changes</span>
              <button
                onClick={() => saveMutation.mutate(config)}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Now'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
