// ===========================================
// ASTRA DASHBOARD - Moderation Settings Page
// ===========================================

import { useState, useEffect, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Save, 
  Hash, 
  Users, 
  FileText, 
  Settings,
  AlertTriangle,
  Ban,
  UserMinus,
  ExternalLink,
  Info,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
import RoleSelect from '../../components/RoleSelect';

// Toggle Switch Component (defined outside to prevent re-renders)
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

interface ModerationConfig {
  enabled: boolean;
  logChannelId?: string;
  muteRoleId?: string;
  dmOnAction: boolean;
  deleteMessageDays: number;
  defaultReason: string;
}

export default function ModerationSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<ModerationConfig>({
    enabled: true,
    logChannelId: '',
    muteRoleId: '',
    dmOnAction: true,
    deleteMessageDays: 1,
    defaultReason: 'No reason provided',
  });

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'moderation'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.moderation || {};
    },
    enabled: !!guildId,
  });

  // Fetch moderation stats
  const { data: statsData } = useQuery({
    queryKey: ['moderation-stats', guildId],
    queryFn: async () => {
      const res = await api.get(`/stats/${guildId}/moderation?limit=1`);
      return res.data.stats;
    },
    enabled: !!guildId,
  });

  const stats = statsData || { total: 0, actionCounts: {} };

  useEffect(() => {
    if (data) {
      setConfig(prev => ({ ...prev, ...data }));
    }
  }, [data]);

  const updateConfig = (updates: Partial<ModerationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: ModerationConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/moderation`, newConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Moderation settings saved!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading moderation settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Moderation</h1>
                <p className="text-[var(--color-text-muted)]">Configure moderation tools and logging</p>
              </div>
            </div>

            <button
              onClick={() => saveMutation.mutate(config)}
              disabled={saveMutation.isPending || !hasChanges}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                hasChanges 
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg' 
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
            >
              <Save className="w-5 h-5" />
              {saveMutation.isPending ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Total Actions', value: stats.total || 0, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { icon: Ban, label: 'Bans', value: stats.actionCounts?.ban || 0, color: 'text-red-400', bg: 'bg-red-500/20' },
          { icon: UserMinus, label: 'Kicks', value: stats.actionCounts?.kick || 0, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { icon: AlertTriangle, label: 'Warns', value: stats.actionCounts?.warn || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              config.enabled ? 'bg-green-500/20' : 'bg-[var(--color-border)]'
            }`}>
              <Zap className={`w-6 h-6 ${config.enabled ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Enable Moderation Module</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Turn on moderation commands and logging
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

      {/* Log Channel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Log Channel</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              All moderation actions will be logged here
            </p>
          </div>
        </div>
        
        <ChannelSelect
          guildId={guildId!}
          value={config.logChannelId}
          onChange={(channelId) => updateConfig({ logChannelId: channelId })}
          placeholder="Select a log channel..."
        />

        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            The bot needs "Send Messages" and "Embed Links" permissions in the selected channel.
          </p>
        </div>
      </motion.div>

      {/* Mute Role */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Mute Role</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Role assigned to muted users (optional, uses timeout by default)
            </p>
          </div>
        </div>
        
        <RoleSelect
          guildId={guildId!}
          value={config.muteRoleId}
          onChange={(roleId) => updateConfig({ muteRoleId: roleId })}
          placeholder="Select a mute role (optional)..."
        />
      </motion.div>

      {/* Behavior Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Behavior Settings</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure how moderation actions behave
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* DM on Action */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <div>
              <h4 className="font-medium">DM Users on Action</h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                Send a DM to users when they are warned, muted, kicked, or banned
              </p>
            </div>
            <ToggleSwitch
              enabled={config.dmOnAction}
              onChange={(v) => updateConfig({ dmOnAction: v })}
            />
          </div>

          {/* Delete Message Days */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Delete Messages on Ban</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Delete messages from banned users (0-7 days)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={config.deleteMessageDays}
                  onChange={(e) => updateConfig({ deleteMessageDays: Math.min(7, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-20 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center"
                />
                <span className="text-sm text-[var(--color-text-muted)]">days</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[0, 1, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={() => updateConfig({ deleteMessageDays: days })}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    config.deleteMessageDays === days
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-surface)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {days === 0 ? 'None' : `${days}d`}
                </button>
              ))}
            </div>
          </div>

          {/* Default Reason */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <h4 className="font-medium mb-2">Default Reason</h4>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              Used when no reason is provided for an action
            </p>
            <input
              type="text"
              value={config.defaultReason}
              onChange={(e) => updateConfig({ defaultReason: e.target.value })}
              placeholder="No reason provided"
              className="w-full px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Link
          to={`/dashboard/guild/${guildId}/audit-log`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              View Audit Log
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              See all moderation actions
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
        </Link>

        <Link
          to={`/dashboard/guild/${guildId}/settings/automod`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              AutoMod Settings
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure automatic moderation
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
        </Link>
      </motion.div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-[var(--color-surface)] border border-amber-500/50 shadow-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm">You have unsaved changes</span>
            <button
              onClick={() => saveMutation.mutate(config)}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
