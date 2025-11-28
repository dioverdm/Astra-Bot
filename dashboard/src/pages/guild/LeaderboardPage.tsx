// ===========================================
// ASTRA DASHBOARD - Leaderboard Page
// ===========================================

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  TrendingUp, 
  Coins, 
  Medal,
  Crown,
  Star,
  RefreshCw,
  Users,
  MessageSquare,
  Sparkles,
  Search,
  ChevronUp,
  ChevronDown,
  Wallet,
  PiggyBank,
  Award,
  Flame,
} from 'lucide-react';
import { api } from '../../lib/api';

interface LevelUser {
  rank: number;
  odiscordId: string;
  username?: string;
  avatar?: string;
  level: number;
  xp: number;
  totalXp: number;
  messages: number;
}

interface EconomyUser {
  rank: number;
  odiscordId: string;
  username?: string;
  avatar?: string;
  balance: number;
  bank: number;
  totalEarned: number;
}

interface LeaderboardStats {
  totalUsers: number;
  totalXp: number;
  totalMessages: number;
  totalBalance: number;
  totalBank: number;
}

type LeaderboardType = 'levels' | 'economy';
type SortField = 'rank' | 'level' | 'totalXp' | 'messages' | 'balance' | 'bank';

export default function LeaderboardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('levels');
  const [limit, setLimit] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch leaderboard data
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['leaderboard', guildId, activeTab, limit],
    queryFn: async () => {
      const res = await api.get(`/stats/${guildId}/leaderboard/${activeTab}?limit=${limit}`);
      return res.data.data as (LevelUser | EconomyUser)[];
    },
    enabled: !!guildId,
  });

  const leaderboard = data || [];

  // Calculate stats from leaderboard data
  const stats: LeaderboardStats = {
    totalUsers: leaderboard.length,
    totalXp: leaderboard.reduce((acc: number, u: LevelUser | EconomyUser) => acc + ((u as LevelUser).totalXp || 0), 0),
    totalMessages: leaderboard.reduce((acc: number, u: LevelUser | EconomyUser) => acc + ((u as LevelUser).messages || 0), 0),
    totalBalance: leaderboard.reduce((acc: number, u: LevelUser | EconomyUser) => acc + ((u as EconomyUser).balance || 0), 0),
    totalBank: leaderboard.reduce((acc: number, u: LevelUser | EconomyUser) => acc + ((u as EconomyUser).bank || 0), 0),
  };

  // Filter and sort leaderboard
  const filteredLeaderboard = leaderboard
    .filter((user: LevelUser | EconomyUser) => {
      if (!searchQuery) return true;
      const username = user.username?.toLowerCase() || '';
      const id = user.odiscordId.toLowerCase();
      return username.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase());
    })
    .sort((a: LevelUser | EconomyUser, b: LevelUser | EconomyUser) => {
      let aVal: number, bVal: number;
      
      if (sortField === 'rank') {
        aVal = a.rank;
        bVal = b.rank;
      } else if (sortField === 'level') {
        aVal = (a as LevelUser).level || 0;
        bVal = (b as LevelUser).level || 0;
      } else if (sortField === 'totalXp') {
        aVal = (a as LevelUser).totalXp || 0;
        bVal = (b as LevelUser).totalXp || 0;
      } else if (sortField === 'messages') {
        aVal = (a as LevelUser).messages || 0;
        bVal = (b as LevelUser).messages || 0;
      } else if (sortField === 'balance') {
        aVal = (a as EconomyUser).balance || 0;
        bVal = (b as EconomyUser).balance || 0;
      } else if (sortField === 'bank') {
        aVal = (a as EconomyUser).bank || 0;
        bVal = (b as EconomyUser).bank || 0;
      } else {
        aVal = a.rank;
        bVal = b.rank;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-lg" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300 drop-shadow-lg" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />;
      default:
        return (
          <span className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg bg-[var(--color-background)] text-[var(--color-text-muted)]">
            {rank}
          </span>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border-yellow-500/40 shadow-yellow-500/10 shadow-lg';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 via-gray-300/10 to-gray-400/20 border-gray-400/40 shadow-gray-400/10 shadow-lg';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 via-orange-500/10 to-amber-600/20 border-amber-600/40 shadow-amber-600/10 shadow-lg';
      default:
        return 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Calculate XP progress percentage
  const getXpProgress = (user: LevelUser) => {
    const xpForNextLevel = Math.floor(100 * Math.pow(1.5, user.level));
    return Math.min((user.xp / xpForNextLevel) * 100, 100);
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className={`absolute inset-0 ${
          activeTab === 'levels' 
            ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20' 
            : 'bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20'
        }`} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                activeTab === 'levels'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                  : 'bg-gradient-to-br from-yellow-500 to-orange-500'
              }`}>
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Leaderboard</h1>
                <p className="text-[var(--color-text-muted)]">
                  {activeTab === 'levels' ? 'Top members by XP and Level' : 'Richest members on the server'}
                </p>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeTab === 'levels' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Ranked Users</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalXp)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Total XP</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalMessages)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Messages</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20"
            >
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">Lvl {(leaderboard[0] as LevelUser)?.level || 0}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Highest Level</p>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Economy Users</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalBalance)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Total Balance</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <PiggyBank className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalBank)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Total in Bank</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{formatNumber((leaderboard[0] as EconomyUser)?.balance || 0)}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Richest User</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--color-background)] rounded-xl">
            <button
              onClick={() => setActiveTab('levels')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'levels'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'hover:bg-[var(--color-border)]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Levels
            </button>
            <button
              onClick={() => setActiveTab('economy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'economy'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                  : 'hover:bg-[var(--color-border)]'
              }`}
            >
              <Coins className="w-4 h-4" />
              Economy
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all outline-none"
            />
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
          >
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>

        {/* Sort Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
          <span className="text-sm text-[var(--color-text-muted)] mr-2">Sort by:</span>
          <button
            onClick={() => handleSort('rank')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
              sortField === 'rank' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
            }`}
          >
            Rank <SortIcon field="rank" />
          </button>
          {activeTab === 'levels' ? (
            <>
              <button
                onClick={() => handleSort('level')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sortField === 'level' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
                }`}
              >
                Level <SortIcon field="level" />
              </button>
              <button
                onClick={() => handleSort('totalXp')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sortField === 'totalXp' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
                }`}
              >
                XP <SortIcon field="totalXp" />
              </button>
              <button
                onClick={() => handleSort('messages')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sortField === 'messages' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
                }`}
              >
                Messages <SortIcon field="messages" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSort('balance')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sortField === 'balance' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
                }`}
              >
                Balance <SortIcon field="balance" />
              </button>
              <button
                onClick={() => handleSort('bank')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  sortField === 'bank' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
                }`}
              >
                Bank <SortIcon field="bank" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <AnimatePresence mode="wait">
        {filteredLeaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card text-center py-16"
          >
            <Trophy className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No Users Found' : 'No Data Yet'}
            </h3>
            <p className="text-[var(--color-text-muted)]">
              {searchQuery 
                ? `No users match "${searchQuery}"`
                : activeTab === 'levels' 
                  ? 'Members will appear here once they start earning XP!'
                  : 'Members will appear here once they start earning currency!'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-[var(--color-accent)] hover:underline"
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 Podium */}
            {filteredLeaderboard.length >= 3 && sortField === 'rank' && sortDirection === 'asc' && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-4 mb-6"
              >
                {[1, 0, 2].map((podiumIndex) => {
                  const user = filteredLeaderboard[podiumIndex];
                  if (!user) return null;
                  const isFirst = podiumIndex === 0;
                  
                  return (
                    <motion.div
                      key={user.odiscordId}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: podiumIndex * 0.1, type: 'spring', stiffness: 200 }}
                      className={`relative overflow-hidden rounded-2xl border-2 text-center p-6 ${
                        isFirst ? 'order-2 scale-105 z-10' : podiumIndex === 1 ? 'order-1' : 'order-3'
                      } ${getRankStyle(user.rank)}`}
                    >
                      {/* Glow effect for #1 */}
                      {isFirst && (
                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent" />
                      )}
                      
                      <div className="relative">
                        {/* Avatar */}
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full p-1 ${
                          isFirst ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 
                          podiumIndex === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' : 
                          'bg-gradient-to-br from-amber-500 to-orange-600'
                        }`}>
                          <div className="w-full h-full rounded-full bg-[var(--color-surface)] flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img 
                                src={`https://cdn.discordapp.com/avatars/${user.odiscordId}/${user.avatar}.webp?size=128`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-bold">
                                {user.username?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Rank Badge */}
                        <div className="flex justify-center mb-2">
                          {getRankIcon(user.rank)}
                        </div>
                        
                        {/* Username */}
                        <h3 className="font-bold text-lg truncate mb-3">
                          {user.username || `User ${user.odiscordId.slice(-4)}`}
                        </h3>
                        
                        {/* Stats */}
                        {activeTab === 'levels' ? (
                          <div className="space-y-2">
                            <div className={`text-2xl font-bold ${
                              isFirst ? 'text-yellow-400' : podiumIndex === 1 ? 'text-gray-300' : 'text-amber-500'
                            }`}>
                              Level {(user as LevelUser).level}
                            </div>
                            <div className="text-sm text-[var(--color-text-muted)]">
                              {formatNumber((user as LevelUser).totalXp)} XP
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {formatNumber((user as LevelUser).messages)} messages
                            </div>
                            {/* XP Progress Bar */}
                            <div className="mt-3 h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isFirst ? 'bg-yellow-400' : podiumIndex === 1 ? 'bg-gray-400' : 'bg-amber-500'
                                }`}
                                style={{ width: `${getXpProgress(user as LevelUser)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={`text-2xl font-bold ${
                              isFirst ? 'text-yellow-400' : podiumIndex === 1 ? 'text-gray-300' : 'text-amber-500'
                            }`}>
                              {formatNumber((user as EconomyUser).balance)}
                            </div>
                            <div className="text-sm text-[var(--color-text-muted)]">Balance</div>
                            <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                              <PiggyBank className="w-3 h-3" />
                              Bank: {formatNumber((user as EconomyUser).bank)}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Rest of Leaderboard */}
            {(sortField === 'rank' && sortDirection === 'asc' && !searchQuery 
              ? filteredLeaderboard.slice(3) 
              : filteredLeaderboard
            ).map((user: LevelUser | EconomyUser, index: number) => (
              <motion.div
                key={user.odiscordId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.01] ${getRankStyle(user.rank)}`}
              >
                {/* Rank */}
                <div className="w-12 flex justify-center">
                  {getRankIcon(user.rank)}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img 
                        src={`https://cdn.discordapp.com/avatars/${user.odiscordId}/${user.avatar}.webp?size=64`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold">
                        {user.username?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  {user.rank <= 3 && (
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.rank === 1 ? 'bg-yellow-500 text-black' :
                      user.rank === 2 ? 'bg-gray-400 text-black' :
                      'bg-amber-600 text-white'
                    }`}>
                      {user.rank}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-lg">
                    {user.username || `User ${user.odiscordId.slice(-4)}`}
                  </h3>
                  {activeTab === 'levels' ? (
                    <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {formatNumber((user as LevelUser).messages)} msgs
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {formatNumber((user as LevelUser).totalXp)} XP
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <PiggyBank className="w-3 h-3" />
                        Bank: {formatNumber((user as EconomyUser).bank)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Main Stat */}
                {activeTab === 'levels' ? (
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Star className="w-5 h-5 text-blue-400" />
                      <span className="text-xl font-bold">Level {(user as LevelUser).level}</span>
                    </div>
                    {/* Mini XP Progress */}
                    <div className="w-24 h-1.5 bg-[var(--color-background)] rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${getXpProgress(user as LevelUser)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <span className="text-xl font-bold">{formatNumber((user as EconomyUser).balance)}</span>
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      Total: {formatNumber((user as EconomyUser).balance + (user as EconomyUser).bank)}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
