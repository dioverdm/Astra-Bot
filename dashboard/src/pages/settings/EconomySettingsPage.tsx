import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Save, 
  Wallet,
  Clock,
  TrendingUp,
  Percent,
  Shield,
  Skull,
  Banknote,
  Gift,
  Briefcase,
  Dices,
  AlertTriangle,
  Info,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface EconomyConfig {
  enabled: boolean;
  currencyName: string;
  currencySymbol: string;
  
  // Starting & Limits
  startingBalance: number;
  maxBalance: number;
  maxBank: number;
  
  // Daily rewards
  dailyReward: number;
  dailyStreakBonus: number;
  dailyStreakMax: number;
  
  // Work settings
  workMinReward: number;
  workMaxReward: number;
  workCooldown: number;
  
  // Crime settings
  crimeMinReward: number;
  crimeMaxReward: number;
  crimeCooldown: number;
  crimeSuccessRate: number;
  crimeFinePercent: number;
  
  // Gambling settings
  gamblingEnabled: boolean;
  gamblingMinBet: number;
  gamblingMaxBet: number;
  gamblingCooldown: number;
  
  // Bank settings
  bankEnabled: boolean;
  bankInterestRate: number;
  bankInterestInterval: number;
  
  // Robbery settings
  robberyEnabled: boolean;
  robberyMinBalance: number;
  robberySuccessRate: number;
  robberyMaxPercent: number;
  robberyCooldown: number;
  robberyJailTime: number;
}

const DEFAULT_CONFIG: EconomyConfig = {
  enabled: true,
  currencyName: 'Astra Coins',
  currencySymbol: '✨',
  startingBalance: 0,
  maxBalance: 1000000000,
  maxBank: 1000000000,
  dailyReward: 100,
  dailyStreakBonus: 10,
  dailyStreakMax: 7,
  workMinReward: 50,
  workMaxReward: 200,
  workCooldown: 3600,
  crimeMinReward: 100,
  crimeMaxReward: 500,
  crimeCooldown: 7200,
  crimeSuccessRate: 50,
  crimeFinePercent: 25,
  gamblingEnabled: true,
  gamblingMinBet: 10,
  gamblingMaxBet: 10000,
  gamblingCooldown: 30,
  bankEnabled: true,
  bankInterestRate: 1,
  bankInterestInterval: 86400,
  robberyEnabled: false,
  robberyMinBalance: 1000,
  robberySuccessRate: 40,
  robberyMaxPercent: 20,
  robberyCooldown: 7200,
  robberyJailTime: 600,
};

// Helper to format time
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function EconomySettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<EconomyConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'general' | 'rewards' | 'gambling' | 'robbery'>('general');

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'economy'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.economy || {};
    },
    enabled: !!guildId,
  });

  useEffect(() => {
    if (data) {
      setConfig(prev => ({ ...prev, ...data }));
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: EconomyConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/economy`, newConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Economy settings saved!');
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    toast.success('Reset to defaults (save to apply)');
  };

  // Tab configuration
  const tabs = [
    { id: 'general', label: 'General', icon: Coins },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'gambling', label: 'Gambling', icon: Dices },
    { id: 'robbery', label: 'Robbery', icon: Skull },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Economy Settings</h1>
            <p className="text-[var(--color-text-muted)]">Configure currency, rewards, and gambling</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => saveMutation.mutate(config)}
            disabled={saveMutation.isPending}
            className="btn gradient-bg text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Enable Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              config.enabled ? 'bg-green-500/20' : 'bg-[var(--color-surface)]'
            }`}>
              <Wallet className={`w-5 h-5 ${config.enabled ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Enable Economy System</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Virtual currency for your server</p>
            </div>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              config.enabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
              config.enabled ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Currency Settings */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Currency</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency Name</label>
                <input
                  type="text"
                  value={config.currencyName}
                  onChange={(e) => setConfig(prev => ({ ...prev, currencyName: e.target.value }))}
                  className="input w-full"
                  placeholder="Astra Coins"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Currency Symbol</label>
                <input
                  type="text"
                  value={config.currencySymbol}
                  onChange={(e) => setConfig(prev => ({ ...prev, currencySymbol: e.target.value }))}
                  className="input w-full"
                  placeholder="✨"
                  maxLength={5}
                />
              </div>
            </div>
            
            {/* Preview */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">Preview:</p>
              <p className="text-lg font-bold text-yellow-400">
                {config.currencySymbol} 1,000 {config.currencyName}
              </p>
            </div>
          </div>

          {/* Limits */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Limits</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Starting Balance</label>
                <input
                  type="number"
                  min={0}
                  value={config.startingBalance}
                  onChange={(e) => setConfig(prev => ({ ...prev, startingBalance: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">For new members</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Wallet Balance</label>
                <input
                  type="number"
                  min={0}
                  value={config.maxBalance}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxBalance: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">0 = unlimited</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Bank Balance</label>
                <input
                  type="number"
                  min={0}
                  value={config.maxBank}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxBank: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">0 = unlimited</p>
              </div>
            </div>
          </div>

          {/* Bank Settings */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold">Bank</h2>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, bankEnabled: !prev.bankEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.bankEnabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.bankEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            {config.bankEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-green-400" />
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={config.bankInterestRate}
                    onChange={(e) => setConfig(prev => ({ ...prev, bankInterestRate: parseFloat(e.target.value) || 0 }))}
                    className="input w-full"
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Daily interest on bank balance</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Interest Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={config.bankInterestInterval}
                    onChange={(e) => setConfig(prev => ({ ...prev, bankInterestInterval: parseInt(e.target.value) || 0 }))}
                    className="input w-full"
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.bankInterestInterval)}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Daily Rewards */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Daily Rewards</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base Reward</label>
                <input
                  type="number"
                  min={0}
                  value={config.dailyReward}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyReward: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Streak Bonus (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.dailyStreakBonus}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyStreakBonus: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Per day streak</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Streak Days</label>
                <input
                  type="number"
                  min={1}
                  value={config.dailyStreakMax}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyStreakMax: parseInt(e.target.value) || 1 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Max bonus: {config.dailyStreakBonus * config.dailyStreakMax}%
                </p>
              </div>
            </div>
          </div>

          {/* Work */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Work Command</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Reward</label>
                <input
                  type="number"
                  min={0}
                  value={config.workMinReward}
                  onChange={(e) => setConfig(prev => ({ ...prev, workMinReward: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Reward</label>
                <input
                  type="number"
                  min={0}
                  value={config.workMaxReward}
                  onChange={(e) => setConfig(prev => ({ ...prev, workMaxReward: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
                <input
                  type="number"
                  min={0}
                  value={config.workCooldown}
                  onChange={(e) => setConfig(prev => ({ ...prev, workCooldown: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.workCooldown)}</p>
              </div>
            </div>
          </div>

          {/* Crime */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold">Crime Command</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Reward</label>
                <input
                  type="number"
                  min={0}
                  value={config.crimeMinReward}
                  onChange={(e) => setConfig(prev => ({ ...prev, crimeMinReward: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Reward</label>
                <input
                  type="number"
                  min={0}
                  value={config.crimeMaxReward}
                  onChange={(e) => setConfig(prev => ({ ...prev, crimeMaxReward: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
                <input
                  type="number"
                  min={0}
                  value={config.crimeCooldown}
                  onChange={(e) => setConfig(prev => ({ ...prev, crimeCooldown: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.crimeCooldown)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Success Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.crimeSuccessRate}
                  onChange={(e) => setConfig(prev => ({ ...prev, crimeSuccessRate: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fine on Failure (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.crimeFinePercent}
                  onChange={(e) => setConfig(prev => ({ ...prev, crimeFinePercent: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">% of wallet lost</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Gambling Tab */}
      {activeTab === 'gambling' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">Gambling</h2>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, gamblingEnabled: !prev.gamblingEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.gamblingEnabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.gamblingEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {config.gamblingEnabled && (
              <>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-200">
                    Gambling commands include slots, coinflip, blackjack, and dice. Users can win or lose currency.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Bet</label>
                    <input
                      type="number"
                      min={1}
                      value={config.gamblingMinBet}
                      onChange={(e) => setConfig(prev => ({ ...prev, gamblingMinBet: parseInt(e.target.value) || 1 }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Maximum Bet</label>
                    <input
                      type="number"
                      min={1}
                      value={config.gamblingMaxBet}
                      onChange={(e) => setConfig(prev => ({ ...prev, gamblingMaxBet: parseInt(e.target.value) || 1 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">0 = unlimited</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.gamblingCooldown}
                      onChange={(e) => setConfig(prev => ({ ...prev, gamblingCooldown: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.gamblingCooldown)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Robbery Tab */}
      {activeTab === 'robbery' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-semibold">Robbery System</h2>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, robberyEnabled: !prev.robberyEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.robberyEnabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.robberyEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {config.robberyEnabled && (
              <>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">
                    Users can rob other members. Failed robberies result in jail time. Use with caution!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Target Balance</label>
                    <input
                      type="number"
                      min={0}
                      value={config.robberyMinBalance}
                      onChange={(e) => setConfig(prev => ({ ...prev, robberyMinBalance: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Target must have this much</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Success Rate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.robberySuccessRate}
                      onChange={(e) => setConfig(prev => ({ ...prev, robberySuccessRate: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Steal (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.robberyMaxPercent}
                      onChange={(e) => setConfig(prev => ({ ...prev, robberyMaxPercent: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">% of target's wallet</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.robberyCooldown}
                      onChange={(e) => setConfig(prev => ({ ...prev, robberyCooldown: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.robberyCooldown)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      Jail Time (seconds)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.robberyJailTime}
                      onChange={(e) => setConfig(prev => ({ ...prev, robberyJailTime: parseInt(e.target.value) || 0 }))}
                      className="input w-full"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatTime(config.robberyJailTime)} on failure</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
