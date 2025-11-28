// ===========================================
// ASTRA DASHBOARD - Audit Log Viewer
// ===========================================

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Ban, 
  UserMinus, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  User,
  Calendar,
  FileText,
  Download,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

interface ModerationLog {
  _id: string;
  caseId: number | string;
  guildId: string;
  action: 'ban' | 'kick' | 'timeout' | 'warn' | 'unban' | 'untimeout' | 'mute' | 'unmute';
  targetId: string;
  targetUsername: string;
  targetAvatar?: string;
  moderatorId: string;
  moderatorUsername: string;
  moderatorAvatar?: string;
  reason: string;
  duration?: number;
  createdAt: string;
}

interface ActionStats {
  [key: string]: number;
}

const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; gradient: string; label: string }> = {
  ban: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/20', gradient: 'from-red-500 to-rose-500', label: 'Ban' },
  kick: { icon: UserMinus, color: 'text-orange-400', bg: 'bg-orange-500/20', gradient: 'from-orange-500 to-amber-500', label: 'Kick' },
  timeout: { icon: Timer, color: 'text-yellow-400', bg: 'bg-yellow-500/20', gradient: 'from-yellow-500 to-amber-500', label: 'Timeout' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', gradient: 'from-amber-500 to-yellow-500', label: 'Warn' },
  unban: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', gradient: 'from-green-500 to-emerald-500', label: 'Unban' },
  untimeout: { icon: Clock, color: 'text-green-400', bg: 'bg-green-500/20', gradient: 'from-green-500 to-teal-500', label: 'Untimeout' },
  mute: { icon: XCircle, color: 'text-purple-400', bg: 'bg-purple-500/20', gradient: 'from-purple-500 to-violet-500', label: 'Mute' },
  unmute: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20', gradient: 'from-blue-500 to-cyan-500', label: 'Unmute' },
};

type ActionFilter = 'all' | 'ban' | 'kick' | 'timeout' | 'warn' | 'unban' | 'mute';

export default function AuditLogPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActionFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedLog, setSelectedLog] = useState<ModerationLog | null>(null);
  const limit = 15;

  // Connect to WebSocket for real-time updates
  useSocket(guildId);

  // Fetch moderation logs with pagination
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['moderation-logs', guildId, page, filter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filter !== 'all') params.append('action', filter);
      if (search) params.append('search', search);
      
      const res = await api.get(`/stats/${guildId}/moderation?${params.toString()}`);
      return res.data;
    },
    enabled: !!guildId,
    refetchInterval: 30000,
  });

  const logs = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalLogs = data?.pagination?.total || 0;
  const stats: ActionStats = data?.stats?.actionCounts || {};
  const totalAllLogs = data?.stats?.total || 0;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatDuration = (ms: number) => {
    if (!ms) return 'Permanent';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Case ID', 'Action', 'Target', 'Moderator', 'Reason', 'Duration', 'Date'].join(','),
      ...logs.map((log: ModerationLog) => [
        log.caseId,
        log.action,
        log.targetUsername,
        log.moderatorUsername,
        `"${log.reason?.replace(/"/g, '""') || ''}"`,
        log.duration ? formatDuration(log.duration) : '',
        formatDate(log.createdAt),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${guildId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading audit logs...</p>
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
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Audit Log</h1>
                <p className="text-[var(--color-text-muted)]">
                  {totalAllLogs.toLocaleString()} moderation actions recorded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportLogs}
                disabled={logs.length === 0}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                title="Export as CSV"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(ACTION_CONFIG).slice(0, 6).map(([action, config], index) => (
          <motion.button
            key={action}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              setFilter(filter === action ? 'all' : action as ActionFilter);
              setPage(1);
            }}
            className={`p-4 rounded-xl border-2 transition-all ${
              filter === action 
                ? `${config.bg} border-current ${config.color}` 
                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <config.icon className={`w-5 h-5 ${config.color}`} />
              <span className="font-bold text-lg">{stats[action] || 0}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{config.label}s</p>
          </motion.button>
        ))}
      </div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by username, ID, or reason..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all outline-none"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleSearch}
            className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>

        {/* Active Filters */}
        {(filter !== 'all' || search) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Active filters:</span>
            {filter !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${ACTION_CONFIG[filter]?.bg} ${ACTION_CONFIG[filter]?.color}`}>
                {ACTION_CONFIG[filter]?.label}
                <button onClick={() => setFilter('all')} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                "{search}"
                <button onClick={() => { setSearch(''); setSearchInput(''); }} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setFilter('all');
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="text-sm text-[var(--color-text-muted)] hover:text-white ml-auto"
            >
              Clear all
            </button>
          </div>
        )}
      </motion.div>

      {/* Logs List */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-12"
          >
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 font-medium">Failed to load audit logs</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-[var(--color-accent)] hover:underline"
            >
              Try again
            </button>
          </motion.div>
        ) : logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-16"
          >
            <Shield className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Moderation Actions</h3>
            <p className="text-[var(--color-text-muted)]">
              {search || filter !== 'all' 
                ? 'No actions match your filters'
                : 'No moderation actions have been recorded yet'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: ModerationLog, index: number) => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.warn;
              const Icon = config.icon;

              return (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="card hover:border-[var(--color-accent)]/30 transition-all cursor-pointer group"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start gap-4">
                    {/* Action Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${config.bg} ${config.color}`}>
                          #{log.caseId} {config.label.toUpperCase()}
                        </span>
                        {log.duration && (
                          <span className="px-2 py-0.5 rounded text-xs bg-[var(--color-background)] text-[var(--color-text-muted)]">
                            {formatDuration(log.duration)}
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        {/* Target */}
                        <div className="flex items-center gap-2">
                          {log.targetAvatar ? (
                            <img 
                              src={`https://cdn.discordapp.com/avatars/${log.targetId}/${log.targetAvatar}.webp?size=32`}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                              <User className="w-3 h-3 text-red-400" />
                            </div>
                          )}
                          <span className="text-[var(--color-text-muted)]">Target:</span>
                          <span className="font-medium">{log.targetUsername}</span>
                        </div>

                        {/* Moderator */}
                        <div className="flex items-center gap-2">
                          {log.moderatorAvatar ? (
                            <img 
                              src={`https://cdn.discordapp.com/avatars/${log.moderatorId}/${log.moderatorAvatar}.webp?size=32`}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Shield className="w-3 h-3 text-blue-400" />
                            </div>
                          )}
                          <span className="text-[var(--color-text-muted)]">By:</span>
                          <span className="font-medium">{log.moderatorUsername}</span>
                        </div>
                      </div>

                      {log.reason && (
                        <p className="mt-2 text-sm text-[var(--color-text-muted)] line-clamp-1">
                          {log.reason}
                        </p>
                      )}
                    </div>

                    {/* View Button */}
                    <button className="p-2 rounded-lg bg-[var(--color-background)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    page === pageNum
                      ? 'bg-[var(--color-accent)] text-white shadow-lg'
                      : 'bg-[var(--color-surface)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="ml-4 text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages} ({totalLogs} results)
          </span>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`p-6 bg-gradient-to-r ${ACTION_CONFIG[selectedLog.action]?.gradient || 'from-gray-500 to-gray-600'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = ACTION_CONFIG[selectedLog.action]?.icon || Shield;
                      return <Icon className="w-8 h-8 text-white" />;
                    })()}
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Case #{selectedLog.caseId}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Target */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)]">
                  {selectedLog.targetAvatar ? (
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${selectedLog.targetId}/${selectedLog.targetAvatar}.webp?size=64`}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Target User</p>
                    <p className="font-semibold">{selectedLog.targetUsername}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{selectedLog.targetId}</p>
                  </div>
                </div>

                {/* Moderator */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)]">
                  {selectedLog.moderatorAvatar ? (
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${selectedLog.moderatorId}/${selectedLog.moderatorAvatar}.webp?size=64`}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Moderator</p>
                    <p className="font-semibold">{selectedLog.moderatorUsername}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{selectedLog.moderatorId}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-3 rounded-xl bg-[var(--color-background)]">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Reason</p>
                  <p className="text-sm">{selectedLog.reason || 'No reason provided'}</p>
                </div>

                {/* Duration & Date */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedLog.duration && (
                    <div className="p-3 rounded-xl bg-[var(--color-background)]">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Duration</p>
                      <p className="font-semibold">{formatDuration(selectedLog.duration)}</p>
                    </div>
                  )}
                  <div className={`p-3 rounded-xl bg-[var(--color-background)] ${selectedLog.duration ? '' : 'col-span-2'}`}>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Date & Time</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <p className="font-semibold">{formatDate(selectedLog.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
