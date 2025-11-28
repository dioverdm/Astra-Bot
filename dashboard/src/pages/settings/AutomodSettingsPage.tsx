// ===========================================
// ASTRA DASHBOARD - Automod Settings Page
// ===========================================

import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Link2, 
  AtSign, 
  AlertTriangle,
  Save,
  Plus,
  X,
  Trash2,
  Zap,
  Hash,
  Users,
  Type,
  Repeat,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
import RoleSelect from '../../components/RoleSelect';
import { useGuildChannels, useGuildRoles } from '../../hooks/useGuildData';

// ============================================
// Reusable Components (defined outside to prevent re-renders)
// ============================================

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

type ActionType = 'delete' | 'warn' | 'mute' | 'kick' | 'ban';

// Action Select Component
const ActionSelect = memo(({ 
  value, 
  onChange,
  options = ['delete', 'warn', 'mute', 'kick', 'ban'],
}: { 
  value: ActionType; 
  onChange: (v: ActionType) => void;
  options?: ActionType[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as ActionType)}
    className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
  >
    {options.includes('delete') && <option value="delete">Delete Message</option>}
    {options.includes('warn') && <option value="warn">Warn User</option>}
    {options.includes('mute') && <option value="mute">Mute User</option>}
    {options.includes('kick') && <option value="kick">Kick User</option>}
    {options.includes('ban') && <option value="ban">Ban User</option>}
  </select>
));

// Protection Module Card Component
const ProtectionModule = memo(({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`card border-2 transition-colors ${enabled ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-border)]'}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-[var(--color-accent)]/20' : 'bg-[var(--color-border)]'}`}>
          <Icon className={`w-5 h-5 ${enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`} />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onToggle} />
    </div>
    
    <AnimatePresence>
      {enabled && children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-4 border-t border-[var(--color-border)] space-y-4"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
));

// Recent Violations Component
const RecentViolations = memo(({ guildId }: { guildId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['automod-violations', guildId],
    queryFn: async () => {
      try {
        const res = await api.get(`/stats/${guildId}/moderation?limit=5&automod=true`);
        return res.data.logs || [];
      } catch {
        return [];
      }
    },
    enabled: !!guildId,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[var(--color-border)] rounded w-1/3" />
          <div className="h-16 bg-[var(--color-border)] rounded" />
        </div>
      </motion.div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const formatTimeAgo = (date: string) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;
    
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'warn': return 'text-yellow-400 bg-yellow-500/20';
      case 'mute': return 'text-orange-400 bg-orange-500/20';
      case 'kick': return 'text-red-400 bg-red-500/20';
      case 'ban': return 'text-red-500 bg-red-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Recent Automod Actions</h3>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">Last 5</span>
      </div>

      <div className="space-y-2">
        {data.map((violation: any, index: number) => (
          <motion.div
            key={violation._id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
          >
            <div className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(violation.action)}`}>
              {violation.action?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{violation.targetTag || 'Unknown User'}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{violation.reason || 'Automod violation'}</p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
              {formatTimeAgo(violation.createdAt)}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

// ============================================
// Main Component
// ============================================

interface AutomodConfig {
  enabled: boolean;
  antiSpam: {
    enabled: boolean;
    maxMessages: number;
    interval: number;
    action: 'warn' | 'mute' | 'kick' | 'ban';
    muteDuration: number;
  };
  antiLinks: {
    enabled: boolean;
    allowedDomains: string[];
    action: 'delete' | 'warn' | 'mute';
  };
  antiInvites: {
    enabled: boolean;
    allowOwnServer: boolean;
    action: 'delete' | 'warn' | 'mute';
  };
  antiCaps: {
    enabled: boolean;
    minLength: number;
    maxPercentage: number;
  };
  antiMassMention: {
    enabled: boolean;
    maxMentions: number;
    action: 'delete' | 'warn' | 'mute' | 'kick';
  };
  badWords: string[];
  maxEmojis: number;
  ignoredChannels: string[];
  ignoredRoles: string[];
}

const defaultConfig: AutomodConfig = {
  enabled: false,
  antiSpam: {
    enabled: false,
    maxMessages: 5,
    interval: 5,
    action: 'warn',
    muteDuration: 300000,
  },
  antiLinks: {
    enabled: false,
    allowedDomains: [],
    action: 'delete',
  },
  antiInvites: {
    enabled: false,
    allowOwnServer: true,
    action: 'delete',
  },
  antiCaps: {
    enabled: false,
    minLength: 10,
    maxPercentage: 70,
  },
  antiMassMention: {
    enabled: false,
    maxMentions: 5,
    action: 'delete',
  },
  badWords: [],
  maxEmojis: 10,
  ignoredChannels: [],
  ignoredRoles: [],
};

export default function AutomodSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [newBadWord, setNewBadWord] = useState('');
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [config, setConfig] = useState<AutomodConfig>(defaultConfig);

  // Fetch channels and roles for name display
  const { data: channels } = useGuildChannels(guildId);
  const { data: roles } = useGuildRoles(guildId);

  // Helper functions to get names
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
    queryKey: ['guild-config', guildId, 'automod'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.moderation?.automod || {};
    },
    enabled: !!guildId,
  });

  // Update local state when data loads
  useEffect(() => {
    if (data) {
      setConfig(prev => ({ ...defaultConfig, ...prev, ...data }));
    }
  }, [data]);

  const updateConfig = useCallback((updates: Partial<AutomodConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: AutomodConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/moderation`, {
        automod: newConfig,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Automod settings saved!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const addBadWord = useCallback(() => {
    const badWordsArray = Array.isArray(config.badWords) ? config.badWords : [];
    if (newBadWord.trim() && !badWordsArray.includes(newBadWord.trim().toLowerCase())) {
      updateConfig({
        badWords: [...badWordsArray, newBadWord.trim().toLowerCase()],
      });
      setNewBadWord('');
    }
  }, [newBadWord, config.badWords, updateConfig]);

  const removeBadWord = useCallback((word: string) => {
    const badWordsArray = Array.isArray(config.badWords) ? config.badWords : [];
    updateConfig({
      badWords: badWordsArray.filter(w => w !== word),
    });
  }, [config.badWords, updateConfig]);

  const addAllowedDomain = useCallback(() => {
    const domains = config.antiLinks?.allowedDomains || [];
    if (newAllowedDomain.trim() && !domains.includes(newAllowedDomain.trim().toLowerCase())) {
      updateConfig({
        antiLinks: {
          ...config.antiLinks,
          allowedDomains: [...domains, newAllowedDomain.trim().toLowerCase()],
        },
      });
      setNewAllowedDomain('');
    }
  }, [newAllowedDomain, config.antiLinks, updateConfig]);

  const removeAllowedDomain = useCallback((domain: string) => {
    updateConfig({
      antiLinks: {
        ...config.antiLinks,
        allowedDomains: (config.antiLinks?.allowedDomains || []).filter(d => d !== domain),
      },
    });
  }, [config.antiLinks, updateConfig]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading automod settings...</p>
      </div>
    );
  }

  // Helper to safely get badWords array
  const getBadWordsArray = () => Array.isArray(config.badWords) ? config.badWords : [];

  // Count active modules
  const activeModules = [
    config.antiSpam?.enabled,
    config.antiLinks?.enabled,
    config.antiInvites?.enabled,
    config.antiCaps?.enabled,
    config.antiMassMention?.enabled,
    getBadWordsArray().length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">AutoMod</h1>
                <p className="text-[var(--color-text-muted)]">Automatic moderation rules</p>
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

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card ${config.enabled ? 'bg-green-500/10 border-green-500/30' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled ? 'bg-green-500/20' : 'bg-[var(--color-border)]'}`}>
              {config.enabled ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              )}
            </div>
            <div>
              <p className="font-bold">{config.enabled ? 'Active' : 'Disabled'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Status</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold">{activeModules}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Active Modules</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-bold">{getBadWordsArray().length}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Blocked Words</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-bold">{config.ignoredChannels?.length || 0}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Ignored Channels</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
              <h3 className="text-lg font-semibold">Enable AutoMod</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Turn on automatic moderation for this server
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

      {/* Protection Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--color-accent)]" />
          Protection Modules
        </h2>

        {/* Anti-Spam */}
        <ProtectionModule
          icon={Repeat}
          title="Anti-Spam"
          description="Detect and prevent spam messages"
          enabled={config.antiSpam?.enabled || false}
          onToggle={(v) => updateConfig({ antiSpam: { ...config.antiSpam, enabled: v } })}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Messages</label>
              <input
                type="number"
                min={2}
                max={20}
                value={config.antiSpam?.maxMessages || 5}
                onChange={(e) => updateConfig({ 
                  antiSpam: { ...config.antiSpam, maxMessages: parseInt(e.target.value) || 5 } 
                })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Messages before action</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time Window (seconds)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.antiSpam?.interval || 5}
                onChange={(e) => updateConfig({ 
                  antiSpam: { ...config.antiSpam, interval: parseInt(e.target.value) || 5 } 
                })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Detection window</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <ActionSelect
              value={config.antiSpam?.action || 'warn'}
              onChange={(v) => updateConfig({ antiSpam: { ...config.antiSpam, action: v as any } })}
              options={['warn', 'mute', 'kick', 'ban']}
            />
          </div>
        </ProtectionModule>

        {/* Anti-Links */}
        <ProtectionModule
          icon={Link2}
          title="Anti-Links"
          description="Block external links in messages"
          enabled={config.antiLinks?.enabled || false}
          onToggle={(v) => updateConfig({ antiLinks: { ...config.antiLinks, enabled: v } })}
        >
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <ActionSelect
              value={config.antiLinks?.action || 'delete'}
              onChange={(v) => updateConfig({ antiLinks: { ...config.antiLinks, action: v as any } })}
              options={['delete', 'warn', 'mute']}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Allowed Domains</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="example.com"
                value={newAllowedDomain}
                onChange={(e) => setNewAllowedDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAllowedDomain()}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
              <button
                onClick={addAllowedDomain}
                disabled={!newAllowedDomain.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {config.antiLinks?.allowedDomains?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.antiLinks.allowedDomains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm"
                  >
                    {domain}
                    <button onClick={() => removeAllowedDomain(domain)} className="hover:text-purple-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </ProtectionModule>

        {/* Anti-Invites */}
        <ProtectionModule
          icon={AtSign}
          title="Anti-Invites"
          description="Block Discord server invites"
          enabled={config.antiInvites?.enabled || false}
          onToggle={(v) => updateConfig({ antiInvites: { ...config.antiInvites, enabled: v } })}
        >
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
            <div>
              <p className="font-medium">Allow Own Server Invites</p>
              <p className="text-xs text-[var(--color-text-muted)]">Allow invites to this server</p>
            </div>
            <ToggleSwitch
              enabled={config.antiInvites?.allowOwnServer ?? true}
              onChange={(v) => updateConfig({ antiInvites: { ...config.antiInvites, allowOwnServer: v } })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <ActionSelect
              value={config.antiInvites?.action || 'delete'}
              onChange={(v) => updateConfig({ antiInvites: { ...config.antiInvites, action: v as any } })}
              options={['delete', 'warn', 'mute']}
            />
          </div>
        </ProtectionModule>

        {/* Anti-Caps */}
        <ProtectionModule
          icon={Type}
          title="Anti-Caps"
          description="Prevent excessive capital letters"
          enabled={config.antiCaps?.enabled || false}
          onToggle={(v) => updateConfig({ antiCaps: { ...config.antiCaps, enabled: v } })}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Message Length</label>
              <input
                type="number"
                min={5}
                max={50}
                value={config.antiCaps?.minLength || 10}
                onChange={(e) => updateConfig({ 
                  antiCaps: { ...config.antiCaps, minLength: parseInt(e.target.value) || 10 } 
                })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Characters before checking</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Caps Percentage</label>
              <input
                type="number"
                min={50}
                max={100}
                value={config.antiCaps?.maxPercentage || 70}
                onChange={(e) => updateConfig({ 
                  antiCaps: { ...config.antiCaps, maxPercentage: parseInt(e.target.value) || 70 } 
                })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">% of caps to trigger</p>
            </div>
          </div>
        </ProtectionModule>

        {/* Anti-Mass Mention */}
        <ProtectionModule
          icon={AtSign}
          title="Anti-Mass Mention"
          description="Prevent mass mentioning users or roles"
          enabled={config.antiMassMention?.enabled || false}
          onToggle={(v) => updateConfig({ antiMassMention: { ...config.antiMassMention, enabled: v } })}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Mentions</label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.antiMassMention?.maxMentions || 5}
                onChange={(e) => updateConfig({ 
                  antiMassMention: { ...config.antiMassMention, maxMentions: parseInt(e.target.value) || 5 } 
                })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <ActionSelect
                value={config.antiMassMention?.action || 'delete'}
                onChange={(v) => updateConfig({ antiMassMention: { ...config.antiMassMention, action: v as any } })}
                options={['delete', 'warn', 'mute', 'kick']}
              />
            </div>
          </div>
        </ProtectionModule>
      </div>

      {/* Blocked Words */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Blocked Words</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Messages containing these words will be deleted
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium">
            {getBadWordsArray().length} words
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a word to block..."
            value={newBadWord}
            onChange={(e) => setNewBadWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBadWord()}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
          />
          <button
            onClick={addBadWord}
            disabled={!newBadWord.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {getBadWordsArray().length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {getBadWordsArray().map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm"
              >
                {word}
                <button onClick={() => removeBadWord(word)} className="hover:text-red-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No blocked words configured</p>
          </div>
        )}

        {getBadWordsArray().length > 0 && (
          <button
            onClick={() => updateConfig({ badWords: [] })}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all words
          </button>
        )}
      </motion.div>

      {/* Ignored Channels & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Ignored Channels</h3>
              <p className="text-sm text-[var(--color-text-muted)]">AutoMod won't check these</p>
            </div>
          </div>
          <ChannelSelect
            guildId={guildId!}
            value=""
            onChange={(channelId) => {
              if (channelId && !config.ignoredChannels?.includes(channelId)) {
                updateConfig({ ignoredChannels: [...(config.ignoredChannels || []), channelId] });
              }
            }}
            placeholder="Add channel..."
          />
          {(config.ignoredChannels?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.ignoredChannels || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                  #{getChannelName(id)}
                  <button onClick={() => updateConfig({ ignoredChannels: (config.ignoredChannels || []).filter((c: string) => c !== id) })}>
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
          transition={{ delay: 0.05 }}
          className="card space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Ignored Roles</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Users with these roles are exempt</p>
            </div>
          </div>
          <RoleSelect
            guildId={guildId!}
            value=""
            onChange={(roleId) => {
              if (roleId && !config.ignoredRoles?.includes(roleId)) {
                updateConfig({ ignoredRoles: [...(config.ignoredRoles || []), roleId] });
              }
            }}
            placeholder="Add role..."
          />
          {(config.ignoredRoles?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {(config.ignoredRoles || []).map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
                  @{getRoleName(id)}
                  <button onClick={() => updateConfig({ ignoredRoles: (config.ignoredRoles || []).filter((r: string) => r !== id) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Automod Actions */}
      <RecentViolations guildId={guildId!} />

      {/* Quick Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          to={`/dashboard/guild/${guildId}/settings/moderation`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              Moderation Settings
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure manual moderation tools
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
