import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Shield, 
  TrendingUp, 
  Coins, 
  UserPlus, 
  Ticket,
  Users,
  Hash,
  Crown,
  Activity,
  BarChart3,
  Settings,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  Calendar,
  Globe,
  Smile,
  Zap,
  RefreshCw,
  ExternalLink,
  Music,
  Gamepad2,
  Bot,
  MessageSquare,
  Star,
} from 'lucide-react';
import { api } from '../lib/api';

// Module configuration with dynamic data
const moduleConfig = [
  { id: 'moderation', name: 'Moderation', icon: Shield, gradient: 'from-red-500 to-orange-500', description: 'Manage moderation and automod settings' },
  { id: 'leveling', name: 'Leveling', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500', description: 'Configure XP rates and level rewards' },
  { id: 'economy', name: 'Economy', icon: Coins, gradient: 'from-yellow-500 to-amber-500', description: 'Set up currency and shop items' },
  { id: 'welcome', name: 'Welcome', icon: UserPlus, gradient: 'from-green-500 to-emerald-500', description: 'Customize welcome messages' },
  { id: 'tickets', name: 'Tickets', icon: Ticket, gradient: 'from-purple-500 to-pink-500', description: 'Configure support ticket system' },
  { id: 'music', name: 'Music', icon: Music, gradient: 'from-pink-500 to-rose-500', description: 'Music player settings' },
  { id: 'fun', name: 'Fun', icon: Gamepad2, gradient: 'from-indigo-500 to-violet-500', description: 'Fun commands and games' },
];

// Quick action links
const quickActions = [
  { name: 'Analytics', href: 'analytics', icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { name: 'Members', href: 'members', icon: Users, color: 'text-green-400', bg: 'bg-green-500/20' },
  { name: 'Leaderboard', href: 'leaderboard', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { name: 'Audit Log', href: 'audit-log', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/20' },
  { name: 'Automod', href: 'automod', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { name: 'Commands', href: 'commands', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
];

// Boost tier names
const boostTierNames: Record<number, string> = {
  0: 'No Level',
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
};

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  memberCount: number;
  onlineCount: number;
  channelCount: number;
  roleCount: number;
  emojiCount: number;
  boostCount: number;
  boostTier: number;
  ownerId: string | null;
  createdAt: string | null;
  description: string | null;
  vanityUrl: string | null;
  features: string[];
}

interface GuildConfig {
  guildId: string;
  configured: boolean;
  modules: Record<string, boolean>;
  moderation?: { enabled: boolean };
  leveling?: { enabled: boolean };
  economy?: { enabled: boolean };
  welcome?: { enabled: boolean };
  tickets?: { enabled: boolean };
  music?: { enabled: boolean };
  fun?: { enabled: boolean };
}

export default function GuildDashboardPage() {
  const { guildId } = useParams<{ guildId: string }>();

  // Fetch guild config from database
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['guild-config', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data as GuildConfig;
    },
    enabled: !!guildId,
  });

  // Fetch guild info from Discord
  const { data: guildInfo, isLoading: guildLoading, refetch, isRefetching } = useQuery({
    queryKey: ['guild-info', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/info`);
      return res.data.data as GuildInfo;
    },
    enabled: !!guildId,
  });

  const isLoading = configLoading || guildLoading;
  const guild = guildInfo || {} as GuildInfo;
  const config = configData || {} as GuildConfig;

  // Calculate enabled modules count
  const enabledModulesCount = moduleConfig.filter(m => {
    const moduleData = config[m.id as keyof GuildConfig];
    return typeof moduleData === 'object' && moduleData?.enabled;
  }).length;

  // Format creation date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-purple-500 flex items-center justify-center">
            <Settings className="w-8 h-8 text-white animate-spin" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading server data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Server Header with Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Banner Background */}
        {guild.banner ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(https://cdn.discordapp.com/banners/${guildId}/${guild.banner}.webp?size=1024)` 
            }}
          />
        ) : (
          <div className="absolute inset-0 gradient-bg" />
        )}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        {/* Content */}
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Server Icon */}
            <div className="relative">
              {guild.icon ? (
                <img 
                  src={`https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.webp?size=128`}
                  alt={guild.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white/20 shadow-2xl"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20">
                  {guild.name?.charAt(0) || 'S'}
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-4 border-[var(--color-surface)]">
                <Activity className="w-3 h-3 text-white" />
              </div>
            </div>
            
            {/* Server Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
                  {guild.name || 'Server'}
                </h1>
                {guild.features?.includes('VERIFIED') && (
                  <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
                {guild.features?.includes('PARTNERED') && (
                  <div className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Partner
                  </div>
                )}
              </div>
              {guild.description && (
                <p className="text-white/70 mt-1 line-clamp-2">{guild.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {formatDate(guild.createdAt)}
                </span>
                {guild.vanityUrl && (
                  <a 
                    href={`https://discord.gg/${guild.vanityUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    discord.gg/{guild.vanityUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, label: 'Members', value: guild.memberCount?.toLocaleString() || '0', color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { icon: Activity, label: 'Online', value: guild.onlineCount?.toLocaleString() || '0', color: 'text-green-400', bg: 'bg-green-500/20' },
          { icon: Hash, label: 'Channels', value: guild.channelCount?.toString() || '0', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { icon: Crown, label: 'Roles', value: guild.roleCount?.toString() || '0', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { icon: Smile, label: 'Emojis', value: guild.emojiCount?.toString() || '0', color: 'text-pink-400', bg: 'bg-pink-500/20' },
          { icon: Zap, label: 'Boosts', value: `${guild.boostCount || 0} (${boostTierNames[guild.boostTier] || 'No Level'})`, color: 'text-purple-400', bg: 'bg-purple-500/20' },
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
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + index * 0.03 }}
            >
              <Link
                to={`/dashboard/guild/${guildId}/${action.href}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-border)] border border-[var(--color-border)] transition-all group hover:scale-105"
              >
                <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <span className="text-sm font-medium">{action.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Modules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--color-accent)]" />
            Modules
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">
              {enabledModulesCount}/{moduleConfig.length} active
            </span>
            <div className="w-24 h-2 rounded-full bg-[var(--color-background)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--color-accent)] to-purple-500 transition-all"
                style={{ width: `${(enabledModulesCount / moduleConfig.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleConfig.map((module, index) => {
            const moduleData = config[module.id as keyof GuildConfig];
            const isEnabled = typeof moduleData === 'object' && moduleData?.enabled;
            
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
              >
                <Link
                  to={`/dashboard/guild/${guildId}/${module.id}`}
                  className={`block p-4 rounded-xl border transition-all group hover:scale-[1.02] ${
                    isEnabled 
                      ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/30 hover:border-[var(--color-accent)]' 
                      : 'bg-[var(--color-background)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <module.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{module.name}</h3>
                        {isEnabled ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs">Inactive</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">{module.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-3 text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm mr-1">Configure</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Server Features */}
      {guild.features && guild.features.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Server Features
          </h2>
          <div className="flex flex-wrap gap-2">
            {guild.features.map((feature: string) => (
              <span 
                key={feature}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-background)] text-sm font-medium"
              >
                {feature.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
