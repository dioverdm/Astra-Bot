// ===========================================
// ASTRA DASHBOARD - Analytics Page
// ===========================================

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  MessageSquare,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Shield,
  Coins,
  Sparkles,
  RefreshCw,
  Trophy,
  Clock,
  Zap,
  UserCheck,
  Ban,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { api } from '../../lib/api';

// Types based on API response
interface CommandStat {
  name: string;
  uses: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface DailyStats {
  date: string;
  modActions: number;
  activeUsers: number;
  members: number;
}

interface ModActionBreakdown {
  action: string;
  count: number;
}

interface RecentModAction {
  id: string;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
}

interface LeaderboardUser {
  rank: number;
  odiscordId: string;
  level?: number;
  xp?: number;
  totalXp?: number;
  messages?: number;
  balance?: number;
  bank?: number;
}

interface AnalyticsData {
  overview: {
    totalMessages: number;
    totalXp: number;
    totalLevelUsers: number;
    activeLevelUsers: number;
    modActionsCount: number;
    modActionsTrend: number;
    memberCount: number;
    onlineCount: number;
  };
  economy: {
    totalBalance: number;
    totalBank: number;
    totalUsers: number;
  };
  moderation: {
    total: number;
    breakdown: ModActionBreakdown[];
    recent: RecentModAction[];
  };
  leaderboards: {
    levels: LeaderboardUser[];
    economy: LeaderboardUser[];
  };
  topCommands: CommandStat[];
  dailyStats: DailyStats[];
  timeRange: {
    days: number;
    startDate: string;
  };
}

type TimeRange = '7d' | '30d' | '90d';

// Moderation action icons and colors
const modActionConfig: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  kick: { icon: UserCheck, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  ban: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/20' },
  timeout: { icon: Timer, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  mute: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

export default function AnalyticsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeChart, setActiveChart] = useState<'modActions' | 'activeUsers'>('activeUsers');

  // Fetch analytics data
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['guild-analytics', guildId, timeRange],
    queryFn: async () => {
      const res = await api.get(`/stats/${guildId}/analytics?range=${timeRange}`);
      return res.data.data as AnalyticsData;
    },
    enabled: !!guildId,
    retry: 1,
    staleTime: 60000,
  });

  // Trend icon component
  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-400" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Bar chart component
  const BarChart = ({ data, dataKey, color, label }: { 
    data: DailyStats[]; 
    dataKey: keyof DailyStats; 
    color: string;
    label: string;
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)]">
          No data available
        </div>
      );
    }
    
    const values = data.map(d => d[dataKey] as number);
    const maxValue = Math.max(...values, 1);
    const total = values.reduce((a, b) => a + b, 0);
    const average = Math.round(total / values.length);
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color-text-muted)]">Total: {total.toLocaleString()}</span>
          <span className="text-sm text-[var(--color-text-muted)]">Avg: {average.toLocaleString()}/day</span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {data.map((item, index) => {
            const value = item[dataKey] as number;
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const date = new Date(item.date);
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div 
                  className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer"
                  style={{ 
                    height: `${Math.max(height, 2)}%`, 
                    backgroundColor: color,
                    minHeight: '4px'
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    <p className="font-medium">{date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</p>
                    <p className="text-[var(--color-text-muted)]">{value} {label}</p>
                  </div>
                </div>
                {data.length <= 7 && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {date.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
            <BarChart3 className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading analytics...</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
          <BarChart3 className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Unable to load analytics</h2>
        <p className="text-[var(--color-text-muted)] mb-4">Please try again later or check if the bot is online.</p>
        <button 
          onClick={() => refetch()}
          className="btn bg-[var(--color-accent)] text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Analytics</h1>
                <p className="text-[var(--color-text-muted)]">Server activity and statistics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-xl">
                {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      timeRange === range
                        ? 'bg-[var(--color-accent)] text-white shadow-lg'
                        : 'hover:bg-[var(--color-background)]'
                    }`}
                  >
                    {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
                  </button>
                ))}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            icon: MessageSquare, 
            label: 'Total Messages', 
            value: data.overview.totalMessages.toLocaleString(),
            color: 'text-blue-400',
            bg: 'bg-blue-500/20',
          },
          { 
            icon: Sparkles, 
            label: 'Total XP Earned', 
            value: data.overview.totalXp.toLocaleString(),
            color: 'text-purple-400',
            bg: 'bg-purple-500/20',
          },
          { 
            icon: Users, 
            label: 'Active Users', 
            value: `${data.overview.activeLevelUsers} / ${data.overview.totalLevelUsers}`,
            subtext: 'in selected period',
            color: 'text-green-400',
            bg: 'bg-green-500/20',
          },
          { 
            icon: Shield, 
            label: 'Mod Actions', 
            value: data.overview.modActionsCount.toString(),
            trend: data.overview.modActionsTrend,
            color: 'text-red-400',
            bg: 'bg-red-500/20',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card"
          >
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold truncate">{stat.value}</p>
                  {stat.trend !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendIcon value={stat.trend} />
                      <span className={`text-xs ${
                        stat.trend > 0 ? 'text-green-400' : 
                        stat.trend < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stat.trend > 0 ? '+' : ''}{stat.trend}%
                      </span>
                    </div>
                  )}
                </div>
                {stat.subtext && (
                  <p className="text-xs text-[var(--color-text-muted)]">{stat.subtext}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Server Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20"
        >
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{data.overview.memberCount.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Members</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{data.overview.onlineCount.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Online</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20"
        >
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{data.economy.totalBalance.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Total Currency</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold">{data.economy.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Economy Users</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Daily Activity
            </h3>
            <div className="flex gap-1 p-1 bg-[var(--color-background)] rounded-lg">
              <button
                onClick={() => setActiveChart('activeUsers')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeChart === 'activeUsers' ? 'bg-green-500/20 text-green-400' : ''
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveChart('modActions')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeChart === 'modActions' ? 'bg-red-500/20 text-red-400' : ''
                }`}
              >
                Mod Actions
              </button>
            </div>
          </div>
          <BarChart 
            data={data.dailyStats} 
            dataKey={activeChart}
            color={activeChart === 'activeUsers' ? '#22C55E' : '#EF4444'}
            label={activeChart === 'activeUsers' ? 'active users' : 'mod actions'}
          />
        </motion.div>

        {/* Moderation Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Moderation Breakdown
          </h3>
          {data.moderation.breakdown.length > 0 ? (
            <div className="space-y-3">
              {data.moderation.breakdown.map((item: ModActionBreakdown) => {
                const config = modActionConfig[item.action] || { icon: Shield, color: 'text-gray-400', bg: 'bg-gray-500/20' };
                const Icon = config.icon;
                const maxCount = Math.max(...data.moderation.breakdown.map((b: ModActionBreakdown) => b.count));
                const percentage = (item.count / maxCount) * 100;
                
                return (
                  <div key={item.action} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{item.action}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">{item.count}</span>
                      </div>
                      <div className="h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${config.bg.replace('/20', '')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
              <Shield className="w-12 h-12 mb-2 opacity-50" />
              <p>No moderation actions in this period</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Top Level Users
          </h3>
          {data.leaderboards.levels.length > 0 ? (
            <div className="space-y-3">
              {data.leaderboards.levels.map((user: LeaderboardUser, index: number) => (
                <div key={user.odiscordId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-400' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-[var(--color-background)] text-[var(--color-text-muted)]'
                  }`}>
                    #{user.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.odiscordId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {user.messages?.toLocaleString() || 0} messages
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-400">Lvl {user.level}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{user.totalXp?.toLocaleString()} XP</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
              <Trophy className="w-12 h-12 mb-2 opacity-50" />
              <p>No level data yet</p>
            </div>
          )}
        </motion.div>

        {/* Economy Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Top Economy Users
          </h3>
          {data.leaderboards.economy.length > 0 ? (
            <div className="space-y-3">
              {data.leaderboards.economy.map((user: LeaderboardUser, index: number) => (
                <div key={user.odiscordId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-400' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-[var(--color-background)] text-[var(--color-text-muted)]'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.odiscordId}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Bank: {user.bank?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{user.balance?.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">balance</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
              <Coins className="w-12 h-12 mb-2 opacity-50" />
              <p>No economy data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Moderation Actions */}
      {data.moderation.recent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-accent)]" />
            Recent Moderation Actions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 font-medium">Moderator</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.moderation.recent.slice(0, 5).map((action: RecentModAction) => {
                  const config = modActionConfig[action.action] || { icon: Shield, color: 'text-gray-400', bg: 'bg-gray-500/20' };
                  const Icon = config.icon;
                  
                  return (
                    <tr key={action.id} className="hover:bg-[var(--color-background)] transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-3 h-3 ${config.color}`} />
                          </div>
                          <span className="capitalize font-medium">{action.action}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-[var(--color-text-muted)]">{action.targetId}</td>
                      <td className="py-3 text-sm text-[var(--color-text-muted)]">{action.moderatorId}</td>
                      <td className="py-3 text-sm text-[var(--color-text-muted)] max-w-[200px] truncate">
                        {action.reason || 'No reason'}
                      </td>
                      <td className="py-3 text-sm text-[var(--color-text-muted)]">
                        {action.timestamp ? new Date(action.timestamp).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Top Commands */}
      {data.topCommands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--color-accent)]" />
            Top Commands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.topCommands.map((cmd: CommandStat, index: number) => {
              const maxUses = Math.max(...data.topCommands.map((c: CommandStat) => c.uses), 1);
              const percentage = (cmd.uses / maxUses) * 100;
              
              return (
                <div key={cmd.name} className="flex items-center gap-3">
                  <span className="w-6 text-sm text-[var(--color-text-muted)] font-medium">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-medium bg-[var(--color-background)] px-2 py-0.5 rounded">{cmd.name}</code>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cmd.uses.toLocaleString()}</span>
                        <TrendIcon value={cmd.change} />
                      </div>
                    </div>
                    <div className="h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[var(--color-accent)] to-purple-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
