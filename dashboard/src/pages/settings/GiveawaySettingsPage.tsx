// ===========================================
// ASTRA DASHBOARD - Giveaway Settings Page
// Enhanced with Create, Edit, Delete from Dashboard
// ===========================================

import { useState, useEffect, memo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Save, 
  Users,
  Trophy,
  Settings,
  Shield,
  Star,
  Sparkles,
  PartyPopper,
  Timer,
  RefreshCw,
  Shuffle,
  Hash,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Zap,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
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

interface GiveawayConfig {
  enabled: boolean;
  managerRoleId?: string;
  defaultDuration: string;
  maxDuration: number; // in days
  maxWinners: number;
  allowRequirements: boolean;
  allowBonusEntries: boolean;
  dmWinners: boolean;
  pingOnEnd: boolean;
  pingRoleId?: string;
  logChannelId?: string;
  embedColor: string;
}

const defaultConfig: GiveawayConfig = {
  enabled: true,
  managerRoleId: '',
  defaultDuration: '1d',
  maxDuration: 30,
  maxWinners: 10,
  allowRequirements: true,
  allowBonusEntries: true,
  dmWinners: true,
  pingOnEnd: false,
  pingRoleId: '',
  logChannelId: '',
  embedColor: '#5865F2',
};

// Active Giveaway Interface
interface ActiveGiveaway {
  _id: string;
  messageId: string;
  prize: string;
  channelId: string;
  channelName?: string;
  hostId: string;
  hostTag: string;
  winnerCount: number;
  participants: string[];
  endsAt: string;
  ended: boolean;
  requiredRoleId?: string;
  requiredLevel?: number;
}

// New Giveaway Form Interface
interface NewGiveaway {
  channelId: string;
  prize: string;
  winnerCount: number;
  duration: string;
  requiredRoleId?: string;
  requiredLevel?: number;
  bonusRoleId?: string;
  bonusEntries?: number;
}

const defaultNewGiveaway: NewGiveaway = {
  channelId: '',
  prize: '',
  winnerCount: 1,
  duration: '1d',
  requiredRoleId: '',
  requiredLevel: 0,
  bonusRoleId: '',
  bonusEntries: 1,
};

// Create Giveaway Modal Component
const CreateGiveawayModal = memo(({
  isOpen,
  onClose,
  guildId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState<NewGiveaway>(defaultNewGiveaway);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: NewGiveaway) => {
      return api.post(`/guilds/${guildId}/giveaways/create`, data);
    },
    onSuccess: () => {
      toast.success('Giveaway created successfully!');
      setForm(defaultNewGiveaway);
      onSuccess();
      onClose();
    },
    onError: () => {
      toast.error('Failed to create giveaway');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId || !form.prize.trim()) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(form);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                <Gift className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Create Giveaway</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Start a new giveaway</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Channel <span className="text-red-400">*</span>
              </label>
              <ChannelSelect
                guildId={guildId}
                value={form.channelId}
                onChange={(v) => setForm({ ...form, channelId: v })}
                placeholder="Select channel..."
              />
            </div>

            {/* Prize */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Prize <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.prize}
                onChange={(e) => setForm({ ...form, prize: e.target.value })}
                placeholder="e.g., Discord Nitro, Steam Key..."
                className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                maxLength={200}
              />
            </div>

            {/* Duration & Winners */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Duration
                </label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] focus:border-pink-500 outline-none"
                >
                  <option value="10m">10 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="12h">12 Hours</option>
                  <option value="1d">1 Day</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="14d">14 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Winners
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.winnerCount}
                  onChange={(e) => setForm({ ...form, winnerCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            {/* Advanced Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
            >
              <Zap className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {/* Advanced Options */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Required Role */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Required Role (Optional)
                    </label>
                    <RoleSelect
                      guildId={guildId}
                      value={form.requiredRoleId || ''}
                      onChange={(v) => setForm({ ...form, requiredRoleId: v })}
                      placeholder="No requirement..."
                    />
                  </div>

                  {/* Required Level */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Required Level (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={form.requiredLevel || ''}
                      onChange={(e) => setForm({ ...form, requiredLevel: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] focus:border-pink-500 outline-none"
                    />
                  </div>

                  {/* Bonus Entries */}
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-400">Bonus Entries</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <RoleSelect
                        guildId={guildId}
                        value={form.bonusRoleId || ''}
                        onChange={(v) => setForm({ ...form, bonusRoleId: v })}
                        placeholder="Bonus role..."
                      />
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={form.bonusEntries || 1}
                        onChange={(e) => setForm({ ...form, bonusEntries: parseInt(e.target.value) || 1 })}
                        placeholder="Extra entries"
                        className="px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !form.channelId || !form.prize.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PartyPopper className="w-4 h-4" />
                    Start Giveaway
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

// Active Giveaways List Component
const ActiveGiveawaysList = memo(({ 
  giveaways, 
  onAction,
  isLoading,
  onCreateClick,
}: { 
  giveaways: ActiveGiveaway[];
  onAction: (action: string, giveawayId: string) => void;
  isLoading: boolean;
  onCreateClick: () => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatTimeLeft = (endsAt: string) => {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const handleDelete = (giveawayId: string) => {
    if (confirmDelete === giveawayId) {
      onAction('delete', giveawayId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(giveawayId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--color-border)] rounded w-1/3" />
          <div className="h-20 bg-[var(--color-border)] rounded" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-2xl p-6 border border-pink-500/30"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/20">
            <PartyPopper className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">
              Active Giveaways
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {giveaways.length} running
            </p>
          </div>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Giveaway
        </button>
      </div>

      {(!giveaways || giveaways.length === 0) ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-[var(--color-text-secondary)]" />
          </div>
          <h4 className="font-medium text-[var(--color-text)] mb-1">No Active Giveaways</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Start your first giveaway to engage your community!
          </p>
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Giveaway
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {giveaways.map((giveaway, index) => (
              <motion.div
                key={giveaway._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[var(--color-card)] rounded-xl p-4 border border-[var(--color-border)] hover:border-pink-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      <h4 className="font-semibold text-[var(--color-text)] truncate">
                        {giveaway.prize}
                      </h4>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-background)] text-xs text-[var(--color-text-secondary)]">
                        <Hash className="w-3 h-3" />
                        {giveaway.channelName || giveaway.channelId}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-xs text-blue-400">
                        <Users className="w-3 h-3" />
                        {giveaway.participants.length} entries
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-xs text-purple-400">
                        <Trophy className="w-3 h-3" />
                        {giveaway.winnerCount} winner{giveaway.winnerCount > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/20 text-xs text-yellow-400">
                        <Timer className="w-3 h-3" />
                        {formatTimeLeft(giveaway.endsAt)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                      Hosted by <span className="text-[var(--color-text)]">{giveaway.hostTag}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onAction('reroll', giveaway.messageId)}
                      className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors"
                      title="Reroll Winners"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onAction('end', giveaway.messageId)}
                      className="p-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                      title="End Now"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(giveaway.messageId)}
                      className={`p-2 rounded-lg transition-colors ${
                        confirmDelete === giveaway.messageId
                          ? 'bg-red-500 text-white'
                          : 'hover:bg-red-500/20 text-red-400'
                      }`}
                      title={confirmDelete === giveaway.messageId ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
});

export default function GiveawaySettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<GiveawayConfig>(defaultConfig);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'giveaway'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.giveaway || {};
    },
    enabled: !!guildId,
  });

  // Fetch active giveaways count and list
  const { data: giveawaysData, isLoading: giveawaysLoading } = useQuery({
    queryKey: ['giveaways', guildId],
    queryFn: async () => {
      try {
        const res = await api.get(`/guilds/${guildId}/giveaways`);
        return res.data;
      } catch {
        return { active: 0, total: 0, giveaways: [] };
      }
    },
    enabled: !!guildId,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Giveaway action mutation
  const giveawayActionMutation = useMutation({
    mutationFn: async ({ action, giveawayId }: { action: string; giveawayId: string }) => {
      return api.post(`/guilds/${guildId}/giveaways/${giveawayId}/${action}`);
    },
    onSuccess: (_: unknown, variables: { action: string; giveawayId: string }) => {
      toast.success(`Giveaway ${variables.action} successful!`);
      queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] });
    },
    onError: () => {
      toast.error('Failed to perform action');
    },
  });

  const handleGiveawayAction = (action: string, giveawayId: string) => {
    giveawayActionMutation.mutate({ action, giveawayId });
  };

  useEffect(() => {
    if (data) {
      setConfig({ ...defaultConfig, ...data });
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: GiveawayConfig) => {
      return api.patch(`/guilds/${guildId}`, { giveaway: newConfig });
    },
    onSuccess: () => {
      toast.success('Giveaway settings saved!');
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const updateConfig = (key: keyof GiveawayConfig, value: any) => {
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
          <div className="p-3 rounded-xl bg-pink-500/20">
            <Gift className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Giveaway Settings</h1>
            <p className="text-[var(--color-text-secondary)]">Configure the giveaway system</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-card)] rounded-xl p-4 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <PartyPopper className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {giveawaysData?.active || 0}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">Active Giveaways</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color-card)] rounded-xl p-4 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {giveawaysData?.total || 0}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">Total Giveaways</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color-card)] rounded-xl p-4 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {giveawaysData?.totalEntries || 0}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">Total Entries</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Giveaways List */}
      <ActiveGiveawaysList
        giveaways={giveawaysData?.giveaways || []}
        onAction={handleGiveawayAction}
        isLoading={giveawaysLoading}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {/* Enable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-medium text-[var(--color-text)]">Enable Giveaway System</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Allow users to create and participate in giveaways
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
          transition={{ delay: 0.4 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">General Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Manager Role */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Giveaway Manager Role
              </label>
              <RoleSelect
                guildId={guildId!}
                value={config.managerRoleId || ''}
                onChange={(v) => updateConfig('managerRoleId', v)}
                placeholder="Select manager role..."
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Users with this role can create giveaways
              </p>
            </div>

            {/* Default Duration */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Default Duration
              </label>
              <select
                value={config.defaultDuration}
                onChange={(e) => updateConfig('defaultDuration', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              >
                <option value="1h">1 Hour</option>
                <option value="6h">6 Hours</option>
                <option value="12h">12 Hours</option>
                <option value="1d">1 Day</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
              </select>
            </div>

            {/* Max Duration */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Max Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.maxDuration}
                onChange={(e) => updateConfig('maxDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              />
            </div>

            {/* Max Winners */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Max Winners
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.maxWinners}
                onChange={(e) => updateConfig('maxWinners', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              />
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Features</h2>
          </div>

          <div className="space-y-4">
            {/* Allow Requirements */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Allow Requirements</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Role/level requirements for entries
                </p>
              </div>
              <ToggleSwitch
                enabled={config.allowRequirements}
                onChange={(v) => updateConfig('allowRequirements', v)}
              />
            </div>

            {/* Allow Bonus Entries */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Allow Bonus Entries</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Extra entries for specific roles
                </p>
              </div>
              <ToggleSwitch
                enabled={config.allowBonusEntries}
                onChange={(v) => updateConfig('allowBonusEntries', v)}
              />
            </div>

            {/* DM Winners */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">DM Winners</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Send DM to winners when they win
                </p>
              </div>
              <ToggleSwitch
                enabled={config.dmWinners}
                onChange={(v) => updateConfig('dmWinners', v)}
              />
            </div>

            {/* Ping on End */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">Ping Role on End</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Ping a role when giveaway ends
                </p>
              </div>
              <ToggleSwitch
                enabled={config.pingOnEnd}
                onChange={(v) => updateConfig('pingOnEnd', v)}
              />
            </div>

            {config.pingOnEnd && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Ping Role
                </label>
                <RoleSelect
                  guildId={guildId!}
                  value={config.pingRoleId || ''}
                  onChange={(v) => updateConfig('pingRoleId', v)}
                  placeholder="Select role to ping..."
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Logging */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[var(--color-card)] rounded-xl p-6 border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Logging</h2>
          </div>

          <div className="space-y-4">
            {/* Log Channel */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Log Channel
              </label>
              <ChannelSelect
                guildId={guildId!}
                value={config.logChannelId || ''}
                onChange={(v) => updateConfig('logChannelId', v)}
                placeholder="Select log channel..."
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Channel for giveaway creation/end logs
              </p>
            </div>

            {/* Embed Color */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Embed Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.embedColor}
                  onChange={(e) => updateConfig('embedColor', e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-[var(--color-border)]"
                />
                <input
                  type="text"
                  value={config.embedColor}
                  onChange={(e) => updateConfig('embedColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4"
      >
        <div className="flex gap-3">
          <Gift className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-pink-400">Giveaway Commands</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              /giveaway start, /giveaway end, /giveaway reroll, /giveaway list, /giveaway delete
            </p>
          </div>
        </div>
      </motion.div>

      {/* Create Giveaway Modal */}
      <CreateGiveawayModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        guildId={guildId!}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['giveaways', guildId] })}
      />
    </div>
  );
}
