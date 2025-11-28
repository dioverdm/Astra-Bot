// ===========================================
// ASTRA DASHBOARD - Level Card Customization
// ===========================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Save,
  RotateCcw,
  Eye,
  Sparkles,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import LevelCard, { DEFAULT_CARD_CONFIG, type LevelCardConfig } from '../../components/LevelCard';

// ============================================
// Constants
// ============================================

const PRESET_THEMES = [
  { name: 'Purple Dream', bg: '#1a1a2e', progress: '#8b5cf6', text: '#ffffff', accent: '#a78bfa', gradient: 'from-purple-600 to-violet-600' },
  { name: 'Ocean Blue', bg: '#0c1929', progress: '#0ea5e9', text: '#ffffff', accent: '#38bdf8', gradient: 'from-blue-600 to-cyan-600' },
  { name: 'Emerald', bg: '#0f1f1a', progress: '#10b981', text: '#ffffff', accent: '#34d399', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Sunset', bg: '#1f1315', progress: '#f97316', text: '#ffffff', accent: '#fb923c', gradient: 'from-orange-600 to-amber-600' },
  { name: 'Rose', bg: '#1f1520', progress: '#ec4899', text: '#ffffff', accent: '#f472b6', gradient: 'from-pink-600 to-rose-600' },
  { name: 'Dark Minimal', bg: '#18181b', progress: '#71717a', text: '#ffffff', accent: '#a1a1aa', gradient: 'from-zinc-600 to-neutral-600' },
  { name: 'Cyber Yellow', bg: '#1a1a0f', progress: '#eab308', text: '#ffffff', accent: '#facc15', gradient: 'from-yellow-600 to-amber-600' },
  { name: 'Blood Red', bg: '#1a0f0f', progress: '#dc2626', text: '#ffffff', accent: '#f87171', gradient: 'from-red-600 to-rose-600' },
  { name: 'Discord', bg: '#36393f', progress: '#5865F2', text: '#ffffff', accent: '#7289da', gradient: 'from-indigo-600 to-blue-600' },
  { name: 'Midnight', bg: '#0f0f23', progress: '#6366f1', text: '#ffffff', accent: '#818cf8', gradient: 'from-indigo-700 to-purple-700' },
  { name: 'Forest', bg: '#1a2e1a', progress: '#22c55e', text: '#ffffff', accent: '#4ade80', gradient: 'from-green-600 to-emerald-600' },
  { name: 'Lavender', bg: '#2d1f3d', progress: '#a855f7', text: '#ffffff', accent: '#c084fc', gradient: 'from-purple-600 to-fuchsia-600' },
];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Modern', description: 'Clean with blur effects', icon: '✨' },
  { value: 'classic', label: 'Classic', description: 'Traditional card design', icon: '🎨' },
  { value: 'minimal', label: 'Minimal', description: 'Simple and clean', icon: '◽' },
  { value: 'neon', label: 'Neon', description: 'Glowing borders', icon: '💫' },
  { value: 'glass', label: 'Glass', description: 'Frosted glass effect', icon: '🔮' },
  { value: 'gradient', label: 'Gradient', description: 'Colorful gradients', icon: '🌈' },
];

const PROGRESS_STYLES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'pill', label: 'Pill' },
];

export default function LevelCardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<LevelCardConfig>(DEFAULT_CARD_CONFIG);
  const [previewData, setPreviewData] = useState({
    username: user?.username || 'Username',
    avatar: user?.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.webp` : undefined,
    level: 15,
    xp: 2450,
    xpNeeded: 3000,
    rank: 5,
  });

  // Fetch user's level data
  const { data: levelData } = useQuery({
    queryKey: ['user-level', guildId, user?.discordId],
    queryFn: async () => {
      const res = await api.get(`/stats/${guildId}/user/${user?.discordId}/level`);
      return res.data.data;
    },
    enabled: !!guildId && !!user?.discordId,
  });

  // Fetch saved card config
  const { data: savedConfig } = useQuery({
    queryKey: ['level-card-config', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.leveling?.cardConfig || DEFAULT_CARD_CONFIG;
    },
    enabled: !!guildId,
  });

  // Update preview data when level data loads
  useEffect(() => {
    if (levelData) {
      setPreviewData(prev => ({
        ...prev,
        level: levelData.level || 1,
        xp: levelData.xp || 0,
        xpNeeded: levelData.xpNeeded || 100,
        rank: levelData.rank || 1,
      }));
    }
  }, [levelData]);

  // Update config when saved data loads
  useEffect(() => {
    if (savedConfig) {
      setConfig(prev => ({ ...prev, ...savedConfig }));
    }
  }, [savedConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: LevelCardConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/leveling`, {
        cardConfig: newConfig,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Card design saved!');
      queryClient.invalidateQueries({ queryKey: ['level-card-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save card design');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CARD_CONFIG);
    toast.success('Reset to default');
  };

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setConfig(prev => ({
      ...prev,
      backgroundColor: preset.bg,
      progressColor: preset.progress,
      textColor: preset.text,
      accentColor: preset.accent,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <Palette className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Level Card Designer</h1>
            <p className="text-[var(--color-text-muted)]">Customize your rank card appearance</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn gradient-bg text-white flex items-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card sticky top-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[var(--color-accent)]" />
              <h2 className="text-lg font-semibold">Live Preview</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              Real-time
            </span>
          </div>
          
          <div className="flex justify-center py-8 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)]">
            <LevelCard
              username={previewData.username}
              avatar={previewData.avatar}
              level={previewData.level}
              xp={previewData.xp}
              xpNeeded={previewData.xpNeeded}
              rank={previewData.rank}
              config={config}
            />
          </div>

          {/* Your Stats */}
          {levelData && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="font-medium">Your Stats</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[var(--color-accent)]">{previewData.level}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{previewData.xp.toLocaleString()}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">XP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">#{previewData.rank}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Rank</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Customization Options */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Preset Themes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold">Preset Themes</h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{PRESET_THEMES.length} themes</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PRESET_THEMES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group relative p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:scale-105 transition-all"
                  style={{ backgroundColor: preset.bg }}
                >
                  <div 
                    className="w-full h-2 rounded-full mb-2"
                    style={{ backgroundColor: preset.progress }}
                  />
                  <span className="text-xs font-medium truncate block" style={{ color: preset.text }}>
                    {preset.name}
                  </span>
                  {config.backgroundColor === preset.bg && config.progressColor === preset.progress && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Card Style</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setConfig(prev => ({ ...prev, style: style.value as LevelCardConfig['style'] }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.style === style.value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{style.icon}</span>
                    <span className="font-medium">{style.label}</span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{style.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Customization */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Background</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="input flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Progress Bar</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.progressColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, progressColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={config.progressColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, progressColor: e.target.value }))}
                    className="input flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
                    className="input flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="input flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Display Options</h2>
            <div className="space-y-3">
              {[
                { key: 'showAvatar', label: 'Show Avatar' },
                { key: 'showRank', label: 'Show Rank' },
                { key: 'roundedCorners', label: 'Rounded Corners' },
                { key: 'showProgressText', label: 'Show XP Text' },
              ].map((option) => (
                <label key={option.key} className="flex items-center justify-between cursor-pointer">
                  <span>{option.label}</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, [option.key]: !prev[option.key as keyof LevelCardConfig] }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config[option.key as keyof LevelCardConfig] ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        config[option.key as keyof LevelCardConfig] ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
