// ===========================================
// ASTRA DASHBOARD - Role Rewards Settings
// ===========================================

import { useState, useEffect, memo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Save,
  Crown,
  Star,
  AlertCircle,
  GripVertical,
  TrendingUp,
  ExternalLink,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import RoleSelect from '../../components/RoleSelect';
import { useGuildRoles } from '../../hooks/useGuildData';

// ============================================
// Reusable Components
// ============================================

const ToggleSwitch = memo(({ 
  enabled, 
  onChange,
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative w-12 h-6 rounded-full transition-colors ${
      enabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
    }`}
  >
    <div
      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
));

interface RoleReward {
  id: string;
  level: number;
  roleId: string;
  roleName?: string;
  roleColor?: string;
}

export default function RoleRewardsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [rewards, setRewards] = useState<RoleReward[]>([]);
  const [newLevel, setNewLevel] = useState<number>(5);
  const [hasChanges, setHasChanges] = useState(false);
  const [stackRoles, setStackRoles] = useState(true);

  // Fetch roles for name display
  const { data: roles } = useGuildRoles(guildId);

  // Helper to get role name
  const getRoleName = useCallback((roleId: string) => {
    const role = roles?.find((r: { id: string; name: string }) => r.id === roleId);
    return role?.name || 'Unknown Role';
  }, [roles]);

  const getRoleColor = useCallback((roleId: string) => {
    const role = roles?.find((r: { id: string; color: number }) => r.id === roleId);
    return role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined;
  }, [roles]);

  // Fetch current role rewards
  const { data, isLoading } = useQuery({
    queryKey: ['role-rewards', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.leveling || {};
    },
    enabled: !!guildId,
  });

  // Update local state when data loads
  useEffect(() => {
    if (data) {
      const roleRewards = data.roleRewards || [];
      setRewards(roleRewards.map((r: any, i: number) => ({
        id: r.id || `reward-${i}`,
        level: r.level,
        roleId: r.roleId,
      })));
      setStackRoles(data.stackRoles !== false);
    }
  }, [data]);

  // Enrich rewards with role info
  const enrichedRewards = rewards.map(reward => ({
    ...reward,
    roleName: getRoleName(reward.roleId),
    roleColor: getRoleColor(reward.roleId),
  })).sort((a, b) => a.level - b.level);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newRewards: RoleReward[]) => {
      const res = await api.patch(`/guilds/${guildId}/modules/leveling`, {
        roleRewards: newRewards.map(r => ({
          level: r.level,
          roleId: r.roleId,
        })),
        stackRoles,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Role rewards saved!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['role-rewards', guildId] });
    },
    onError: () => {
      toast.error('Failed to save role rewards');
    },
  });

  const addReward = () => {
    if (rewards.some(r => r.level === newLevel)) {
      toast.error(`A reward for level ${newLevel} already exists`);
      return;
    }
    
    const newReward: RoleReward = {
      id: `reward-${Date.now()}`,
      level: newLevel,
      roleId: '',
    };
    
    setRewards([...rewards, newReward]);
    setNewLevel(prev => prev + 5);
    setHasChanges(true);
  };

  const updateReward = (id: string, updates: Partial<RoleReward>) => {
    setRewards(rewards.map(r => r.id === id ? { ...r, ...updates } : r));
    setHasChanges(true);
  };

  const removeReward = (id: string) => {
    setRewards(rewards.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const handleSave = () => {
    const validRewards = rewards.filter(r => r.roleId);
    if (validRewards.length !== rewards.length) {
      toast.error('Please select a role for all rewards');
      return;
    }
    saveMutation.mutate(rewards);
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Gift className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading role rewards...</p>
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Role Rewards</h1>
            <p className="text-[var(--color-text-muted)]">Assign roles when members reach levels</p>
          </div>
        </div>

        <button
          onClick={handleSave}
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
        <div className="card text-center">
          <Gift className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <div className="text-2xl font-bold">{rewards.length}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Total Rewards</div>
        </div>
        <div className="card text-center">
          <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold">{enrichedRewards[0]?.level || '-'}</div>
          <div className="text-xs text-[var(--color-text-muted)]">First Reward</div>
        </div>
        <div className="card text-center">
          <Crown className="w-6 h-6 mx-auto mb-2 text-amber-400" />
          <div className="text-2xl font-bold">{enrichedRewards[enrichedRewards.length - 1]?.level || '-'}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Highest Level</div>
        </div>
        <div className="card text-center">
          <Layers className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <div className="text-2xl font-bold">{stackRoles ? 'Stack' : 'Replace'}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Role Mode</div>
        </div>
      </motion.div>

      {/* Stack Roles Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Stack Role Rewards</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {stackRoles 
                  ? 'Members keep all earned roles when leveling up'
                  : 'Members only keep the highest level role'}
              </p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={stackRoles} 
            onChange={(v) => { setStackRoles(v); setHasChanges(true); }} 
          />
        </div>
      </motion.div>

      {/* Info Card */}
      <div className="card bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-400">How Role Rewards Work</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              When a member reaches the specified level, they will automatically receive the assigned role.
              Make sure the bot's role is higher than the reward roles in your server settings.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Reward */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add Role Reward</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Level Required</label>
            <input
              type="number"
              min={1}
              max={100}
              value={newLevel}
              onChange={(e) => setNewLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="input w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addReward}
              className="btn btn-secondary flex items-center gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              Add Reward
            </button>
          </div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Configured Rewards</h2>
          <span className="text-sm text-[var(--color-text-muted)]">
            {rewards.length} reward{rewards.length !== 1 ? 's' : ''}
          </span>
        </div>

        {enrichedRewards.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
            <h3 className="text-lg font-semibold mb-2">No Role Rewards</h3>
            <p className="text-[var(--color-text-muted)]">
              Add role rewards to automatically assign roles when members level up
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {enrichedRewards.map((reward, index) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] group"
                >
                  {/* Drag Handle (visual only for now) */}
                  <GripVertical className="w-5 h-5 text-[var(--color-text-muted)] cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Level Badge */}
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-text-muted)]">Level</div>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={reward.level}
                        onChange={(e) => updateReward(reward.id, { 
                          level: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) 
                        })}
                        className="w-16 bg-transparent border-none font-bold text-lg p-0 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-[var(--color-text-muted)]">→</div>

                  {/* Role Selector */}
                  <div className="flex-1">
                    <RoleSelect
                      guildId={guildId!}
                      value={reward.roleId}
                      onChange={(roleId) => updateReward(reward.id, { roleId })}
                      placeholder="Select a role..."
                    />
                  </div>

                  {/* Role Preview */}
                  {reward.roleId && reward.roleName && (
                    <div 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: reward.roleColor ? `${reward.roleColor}33` : 'var(--color-surface)',
                        color: reward.roleColor || 'var(--color-text)',
                      }}
                    >
                      @{reward.roleName}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => removeReward(reward.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Preview */}
      {enrichedRewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h2 className="text-lg font-semibold mb-4">Level Progression Preview</h2>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
            
            <div className="space-y-4">
              {enrichedRewards.map((reward) => (
                <div key={reward.id} className="flex items-center gap-4 pl-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-purple-500 border-2 border-[var(--color-background)] z-10" />
                  <div className="flex items-center gap-3">
                    <span className="font-bold">Level {reward.level}</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span 
                      className="px-2 py-0.5 rounded text-sm"
                      style={{
                        backgroundColor: reward.roleColor ? `${reward.roleColor}33` : 'var(--color-surface)',
                        color: reward.roleColor || 'var(--color-text)',
                      }}
                    >
                      @{reward.roleName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link
          to={`/dashboard/guild/${guildId}/settings/leveling`}
          className="card flex items-center gap-4 hover:border-[var(--color-accent)]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              Leveling Settings
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure XP rates, messages, and more
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
                onClick={handleSave}
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
