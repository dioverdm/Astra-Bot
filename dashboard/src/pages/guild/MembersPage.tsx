// ===========================================
// ASTRA DASHBOARD - Member Management Page
// ===========================================

import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Crown, 
  Shield, 
  TrendingUp,
  Coins,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Ban,
  UserMinus,
  Clock,
  AlertTriangle,
  Edit3,
  ExternalLink,
  X,
  Trash2,
  Volume2,
  VolumeX,
  LayoutGrid,
  List,
  Bot,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

interface Member {
  id: string;
  odiscordId: string;
  username: string;
  globalName?: string;
  avatar: string | null;
  roles: string[];
  joinedAt: string;
  createdAt?: string;
  level?: number;
  xp?: number;
  totalXp?: number;
  balance?: number;
  bank?: number;
  messages?: number;
  isOwner?: boolean;
  isAdmin?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isBot?: boolean;
  isPending?: boolean;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

type ActionType = 'timeout' | 'kick' | 'ban' | 'warn' | 'nickname' | 'role' | 'dm' | 'reset-xp' | 'reset-balance' | 'mute' | 'deafen' | null;

interface ActionModalState {
  type: ActionType;
  member: Member | null;
}

type SortField = 'username' | 'joinedAt' | 'level' | 'balance' | 'messages';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type QuickFilter = 'all' | 'admins' | 'bots' | 'new' | 'top-level' | 'top-balance';
type PageSize = 30 | 50 | 100 | 300 | 'all';

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 300, label: '300' },
  { value: 'all', label: 'All' },
];

const QUICK_FILTERS: { value: QuickFilter; label: string; icon: typeof Users }[] = [
  { value: 'all', label: 'All Members', icon: Users },
  { value: 'admins', label: 'Admins', icon: Shield },
  { value: 'bots', label: 'Bots', icon: Bot },
  { value: 'new', label: 'New (7 days)', icon: Calendar },
  { value: 'top-level', label: 'Top Level', icon: TrendingUp },
  { value: 'top-balance', label: 'Top Balance', icon: Coins },
];

const TIMEOUT_DURATIONS = [
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 21600, label: '6 hours' },
  { value: 86400, label: '1 day' },
  { value: 604800, label: '1 week' },
];

const BAN_DELETE_DAYS = [
  { value: 0, label: 'Don\'t delete any' },
  { value: 1, label: 'Previous 24 hours' },
  { value: 7, label: 'Previous 7 days' },
];

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

export default function MembersPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  
  // View & Filter state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Selection & Pagination
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(30);
  
  // Action modal state
  const [actionModal, setActionModal] = useState<ActionModalState>({ type: null, member: null });
  const [actionReason, setActionReason] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(3600);
  const [banDeleteDays, setBanDeleteDays] = useState(0);
  const [newNickname, setNewNickname] = useState('');

  // Connect to WebSocket for real-time updates
  useSocket(guildId);

  // Member action mutation
  const actionMutation = useMutation({
    mutationFn: async ({ action, memberId, data }: { action: string; memberId: string; data?: Record<string, unknown> }) => {
      const res = await api.post(`/guilds/${guildId}/members/${memberId}/${action}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.action.charAt(0).toUpperCase() + variables.action.slice(1)} successful!`);
      queryClient.invalidateQueries({ queryKey: ['guild-members', guildId] });
      closeActionModal();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || `Action failed`);
    },
  });

  const openActionModal = (type: ActionType, member: Member) => {
    setActionModal({ type, member });
    setActionReason('');
    setNewNickname(member.username);
    setTimeoutDuration(3600);
    setBanDeleteDays(0);
  };

  const closeActionModal = () => {
    setActionModal({ type: null, member: null });
    setSelectedMember(null);
  };

  const executeAction = () => {
    if (!actionModal.member || !actionModal.type) return;
    
    const memberId = actionModal.member.odiscordId;
    
    switch (actionModal.type) {
      case 'timeout':
        actionMutation.mutate({ action: 'timeout', memberId, data: { duration: timeoutDuration, reason: actionReason } });
        break;
      case 'kick':
        actionMutation.mutate({ action: 'kick', memberId, data: { reason: actionReason } });
        break;
      case 'ban':
        actionMutation.mutate({ action: 'ban', memberId, data: { reason: actionReason, deleteMessageDays: banDeleteDays } });
        break;
      case 'warn':
        actionMutation.mutate({ action: 'warn', memberId, data: { reason: actionReason } });
        break;
      case 'nickname':
        actionMutation.mutate({ action: 'nickname', memberId, data: { nickname: newNickname } });
        break;
      case 'reset-xp':
        actionMutation.mutate({ action: 'reset-xp', memberId });
        break;
      case 'reset-balance':
        actionMutation.mutate({ action: 'reset-balance', memberId });
        break;
      case 'mute':
        actionMutation.mutate({ action: 'mute', memberId });
        break;
      case 'deafen':
        actionMutation.mutate({ action: 'deafen', memberId });
        break;
    }
  };

  // Fetch members
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['guild-members', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/members`);
      return res.data;
    },
    enabled: !!guildId,
    refetchInterval: 60000, // Refetch every minute
  });

  const members: Member[] = data?.data || [];

  // Stats
  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter(m => m.isAdmin || m.isOwner).length;
    const bots = members.filter(m => m.isBot).length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newMembers = members.filter(m => new Date(m.joinedAt).getTime() > sevenDaysAgo).length;
    const withLevel = members.filter(m => (m.level || 0) > 0).length;
    const totalLevel = members.reduce((sum, m) => sum + (m.level || 0), 0);
    const totalBalance = members.reduce((sum, m) => sum + (m.balance || 0) + (m.bank || 0), 0);
    
    return { total, admins, bots, newMembers, withLevel, totalLevel, totalBalance };
  }, [members]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Quick filter
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    switch (quickFilter) {
      case 'admins':
        result = result.filter(m => m.isAdmin || m.isOwner);
        break;
      case 'bots':
        result = result.filter(m => m.isBot);
        break;
      case 'new':
        result = result.filter(m => new Date(m.joinedAt).getTime() > sevenDaysAgo);
        break;
      case 'top-level':
        result = result.filter(m => (m.level || 0) > 0);
        break;
      case 'top-balance':
        result = result.filter(m => (m.balance || 0) + (m.bank || 0) > 0);
        break;
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(m => 
        m.username.toLowerCase().includes(searchLower) ||
        m.globalName?.toLowerCase().includes(searchLower) ||
        m.odiscordId?.includes(search)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'username':
          comparison = a.username.localeCompare(b.username);
          break;
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
        case 'level':
          comparison = (a.level || 0) - (b.level || 0);
          break;
        case 'balance':
          comparison = ((a.balance || 0) + (a.bank || 0)) - ((b.balance || 0) + (b.bank || 0));
          break;
        case 'messages':
          comparison = (a.messages || 0) - (b.messages || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [members, search, sortField, sortOrder, quickFilter]);

  // Selection helpers
  const clearSelection = useCallback(() => {
    setSelectedMembers(new Set());
  }, []);

  // Pagination
  const totalMembers = filteredMembers.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalMembers / pageSize);
  const paginatedMembers = useMemo(() => {
    if (pageSize === 'all') return filteredMembers;
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Reset to page 1 when search/sort/pageSize changes
  const handlePageSizeChange = (newSize: PageSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            Members
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Manage {stats.total.toLocaleString()} server members
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[var(--color-accent)] text-white' : 'hover:bg-[var(--color-border)]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-[var(--color-accent)] text-white' : 'hover:bg-[var(--color-border)]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
          { label: 'Admins', value: stats.admins, icon: Shield, color: 'red' },
          { label: 'Bots', value: stats.bots, icon: Bot, color: 'purple' },
          { label: 'New (7d)', value: stats.newMembers, icon: Calendar, color: 'green' },
          { label: 'With Level', value: stats.withLevel, icon: TrendingUp, color: 'cyan' },
          { label: 'Total Coins', value: stats.totalBalance.toLocaleString(), icon: Coins, color: 'yellow' },
        ].map((stat) => (
          <div key={stat.label} className="card p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setQuickFilter(filter.value); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              quickFilter === filter.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
            }`}
          >
            <filter.icon className="w-3.5 h-3.5" />
            {filter.label}
            {filter.value === 'admins' && <span className="text-xs opacity-75">({stats.admins})</span>}
            {filter.value === 'bots' && <span className="text-xs opacity-75">({stats.bots})</span>}
            {filter.value === 'new' && <span className="text-xs opacity-75">({stats.newMembers})</span>}
          </button>
        ))}
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by username, display name, or ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input pl-10 w-full"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-border)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="input"
            >
              <option value="joinedAt">Join Date</option>
              <option value="username">Username</option>
              <option value="level">Level</option>
              <option value="balance">Balance</option>
              <option value="messages">Messages</option>
            </select>
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary p-2"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as PageSize)}
              className="input"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Results info */}
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>
            {filteredMembers.length === members.length 
              ? `${members.length} members` 
              : `${filteredMembers.length} of ${members.length} members`}
          </span>
          {selectedMembers.size > 0 && (
            <div className="flex items-center gap-2">
              <span>{selectedMembers.size} selected</span>
              <button onClick={clearSelection} className="text-[var(--color-accent)] hover:underline">
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Grid/List */}
      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-red-400">Failed to load members</p>
        </div>
      ) : paginatedMembers.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-[var(--color-text-muted)]">
            {search ? 'Try a different search term' : 'No members match the current filter'}
          </p>
        </div>
      ) : (
        <>
        {/* Grid View */}
        {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMembers.map((member, index) => (
            <motion.div
              key={member.odiscordId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.02 }}
              className="card card-hover relative group"
            >
              <div className="flex items-start gap-4">
                {/* Avatar with Status */}
                <div className="relative">
                  {member.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${member.odiscordId}/${member.avatar}.png`}
                      alt={member.username}
                      className="w-12 h-12 rounded-xl"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Status indicator */}
                  {member.status && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface)] ${STATUS_COLORS[member.status]}`} />
                  )}
                  {/* Badge */}
                  {member.isOwner && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {member.isAdmin && !member.isOwner && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {member.isBot && !member.isOwner && !member.isAdmin && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{member.globalName || member.username}</h3>
                    {member.globalName && member.globalName !== member.username && (
                      <span className="text-xs text-[var(--color-text-muted)]">@{member.username}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Joined {formatDate(member.joinedAt)}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {member.level !== undefined && member.level > 0 && (
                      <div className="flex items-center gap-1 text-xs" title="Level">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <span>Lvl {member.level}</span>
                      </div>
                    )}
                    {((member.balance || 0) + (member.bank || 0)) > 0 && (
                      <div className="flex items-center gap-1 text-xs" title="Balance">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        <span>{((member.balance || 0) + (member.bank || 0)).toLocaleString()}</span>
                      </div>
                    )}
                    {member.messages !== undefined && member.messages > 0 && (
                      <div className="flex items-center gap-1 text-xs" title="Messages">
                        <MessageSquare className="w-3 h-3 text-green-400" />
                        <span>{member.messages.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {selectedMember === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-20 overflow-hidden">
                      {/* View Profile */}
                      <Link
                        to={`/dashboard/guild/${guildId}/member/${member.odiscordId}`}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-400" />
                        View Profile
                      </Link>
                      
                      <div className="border-t border-[var(--color-border)] my-1" />
                      
                      {/* Edit Nickname */}
                      <button 
                        onClick={() => openActionModal('nickname', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-purple-400" />
                        Change Nickname
                      </button>
                      
                      {/* Warn */}
                      <button 
                        onClick={() => openActionModal('warn', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        Warn
                      </button>
                      
                      {/* Timeout */}
                      <button 
                        onClick={() => openActionModal('timeout', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4 text-orange-400" />
                        Timeout
                      </button>
                      
                      <div className="border-t border-[var(--color-border)] my-1" />
                      
                      {/* Voice Actions */}
                      <button 
                        onClick={() => openActionModal('mute', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <VolumeX className="w-4 h-4 text-gray-400" />
                        Server Mute
                      </button>
                      <button 
                        onClick={() => openActionModal('deafen', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        Server Deafen
                      </button>
                      
                      <div className="border-t border-[var(--color-border)] my-1" />
                      
                      {/* Reset Stats */}
                      <button 
                        onClick={() => openActionModal('reset-xp', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4 text-blue-400" />
                        Reset XP/Level
                      </button>
                      <button 
                        onClick={() => openActionModal('reset-balance', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2"
                      >
                        <Coins className="w-4 h-4 text-yellow-400" />
                        Reset Balance
                      </button>
                      
                      <div className="border-t border-[var(--color-border)] my-1" />
                      
                      {/* Kick & Ban */}
                      <button 
                        onClick={() => openActionModal('kick', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2 text-orange-400"
                      >
                        <UserMinus className="w-4 h-4" />
                        Kick
                      </button>
                      <button 
                        onClick={() => openActionModal('ban', member)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] flex items-center gap-2 text-red-400"
                      >
                        <Ban className="w-4 h-4" />
                        Ban
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        ) : (
        /* List View */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-muted)]">Member</th>
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-muted)] hidden md:table-cell">Joined</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--color-text-muted)] hidden sm:table-cell">Level</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--color-text-muted)] hidden sm:table-cell">Balance</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member) => (
                <tr key={member.odiscordId} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-border)]/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {member.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${member.odiscordId}/${member.avatar}.png`}
                            alt={member.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-sm">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {member.isOwner && (
                          <Crown className="w-3 h-3 absolute -top-0.5 -right-0.5 text-yellow-500" />
                        )}
                        {member.isAdmin && !member.isOwner && (
                          <Shield className="w-3 h-3 absolute -top-0.5 -right-0.5 text-red-500" />
                        )}
                        {member.isBot && !member.isOwner && !member.isAdmin && (
                          <Bot className="w-3 h-3 absolute -top-0.5 -right-0.5 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.globalName || member.username}</p>
                        {member.globalName && member.globalName !== member.username && (
                          <p className="text-xs text-[var(--color-text-muted)]">@{member.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-[var(--color-text-muted)] hidden md:table-cell">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell">
                    {member.level !== undefined && member.level > 0 ? (
                      <span className="text-sm">{member.level}</span>
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell">
                    {((member.balance || 0) + (member.bank || 0)) > 0 ? (
                      <span className="text-sm">{((member.balance || 0) + (member.bank || 0)).toLocaleString()}</span>
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/dashboard/guild/${guildId}/member/${member.odiscordId}`}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                        title="View Profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openActionModal('warn', member)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                        title="Warn"
                      >
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      </button>
                      <button
                        onClick={() => openActionModal('timeout', member)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                        title="Timeout"
                      >
                        <Clock className="w-4 h-4 text-orange-400" />
                      </button>
                      <button
                        onClick={() => openActionModal('kick', member)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                        title="Kick"
                      >
                        <UserMinus className="w-4 h-4 text-orange-400" />
                      </button>
                      <button
                        onClick={() => openActionModal('ban', member)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                        title="Ban"
                      >
                        <Ban className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination Controls */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[var(--color-text-muted)]">
              Showing {((currentPage - 1) * (pageSize as number)) + 1} - {Math.min(currentPage * (pageSize as number), totalMembers)} of {totalMembers} members
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="btn btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'hover:bg-[var(--color-border)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal.type && actionModal.member && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeActionModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  {actionModal.member.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${actionModal.member.odiscordId}/${actionModal.member.avatar}.png`}
                      alt={actionModal.member.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
                      {actionModal.member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{actionModal.member.username}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {actionModal.type === 'timeout' && 'Timeout Member'}
                      {actionModal.type === 'kick' && 'Kick Member'}
                      {actionModal.type === 'ban' && 'Ban Member'}
                      {actionModal.type === 'warn' && 'Warn Member'}
                      {actionModal.type === 'nickname' && 'Change Nickname'}
                      {actionModal.type === 'reset-xp' && 'Reset XP/Level'}
                      {actionModal.type === 'reset-balance' && 'Reset Balance'}
                      {actionModal.type === 'mute' && 'Server Mute'}
                      {actionModal.type === 'deafen' && 'Server Deafen'}
                    </p>
                  </div>
                </div>
                <button onClick={closeActionModal} className="p-2 rounded-lg hover:bg-[var(--color-border)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {/* Timeout Duration */}
                {actionModal.type === 'timeout' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration</label>
                    <select
                      value={timeoutDuration}
                      onChange={(e) => setTimeoutDuration(Number(e.target.value))}
                      className="input w-full"
                    >
                      {TIMEOUT_DURATIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ban Delete Days */}
                {actionModal.type === 'ban' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Delete Messages</label>
                    <select
                      value={banDeleteDays}
                      onChange={(e) => setBanDeleteDays(Number(e.target.value))}
                      className="input w-full"
                    >
                      {BAN_DELETE_DAYS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Nickname Input */}
                {actionModal.type === 'nickname' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">New Nickname</label>
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="Enter new nickname..."
                      className="input w-full"
                      maxLength={32}
                    />
                  </div>
                )}

                {/* Reason Input */}
                {['timeout', 'kick', 'ban', 'warn'].includes(actionModal.type) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason (optional)</label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Enter reason..."
                      rows={3}
                      className="input w-full resize-none"
                    />
                  </div>
                )}

                {/* Confirmation for dangerous actions */}
                {['reset-xp', 'reset-balance', 'mute', 'deafen'].includes(actionModal.type) && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-300">
                      {actionModal.type === 'reset-xp' && 'This will reset all XP and level progress for this member.'}
                      {actionModal.type === 'reset-balance' && 'This will reset the member\'s economy balance to 0.'}
                      {actionModal.type === 'mute' && 'This will server mute the member in voice channels.'}
                      {actionModal.type === 'deafen' && 'This will server deafen the member in voice channels.'}
                    </p>
                  </div>
                )}

                {/* Warning for kick/ban */}
                {['kick', 'ban'].includes(actionModal.type) && (
                  <div className={`p-3 rounded-lg ${actionModal.type === 'ban' ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                    <p className={`text-sm ${actionModal.type === 'ban' ? 'text-red-300' : 'text-orange-300'}`}>
                      {actionModal.type === 'kick' && 'This will remove the member from the server. They can rejoin with an invite.'}
                      {actionModal.type === 'ban' && 'This will permanently ban the member from the server.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--color-border)]">
                <button onClick={closeActionModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionMutation.isPending}
                  className={`btn ${
                    ['ban'].includes(actionModal.type) ? 'bg-red-500 hover:bg-red-600' :
                    ['kick'].includes(actionModal.type) ? 'bg-orange-500 hover:bg-orange-600' :
                    'btn-primary'
                  } text-white`}
                >
                  {actionMutation.isPending ? 'Processing...' : (
                    <>
                      {actionModal.type === 'timeout' && 'Timeout'}
                      {actionModal.type === 'kick' && 'Kick'}
                      {actionModal.type === 'ban' && 'Ban'}
                      {actionModal.type === 'warn' && 'Warn'}
                      {actionModal.type === 'nickname' && 'Save'}
                      {actionModal.type === 'reset-xp' && 'Reset XP'}
                      {actionModal.type === 'reset-balance' && 'Reset Balance'}
                      {actionModal.type === 'mute' && 'Mute'}
                      {actionModal.type === 'deafen' && 'Deafen'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
