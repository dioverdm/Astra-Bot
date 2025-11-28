// ===========================================
// ASTRA DASHBOARD - User Profile Page
// ===========================================

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User,
  Crown, 
  Shield, 
  TrendingUp,
  Coins,
  Calendar,
  Clock,
  AlertTriangle,
  Edit3,
  Ban,
  UserMinus,
  X,
  ChevronLeft,
  MessageSquare,
  Award,
  Activity,
  Volume2,
  VolumeX,
  Trash2,
  History,
  ExternalLink,
  Copy,
  Check,
  Mic,
  MicOff,
  Headphones,
  Star,
  Zap,
  Target,
  Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface MemberProfile {
  id: string;
  odiscordId: string;
  username: string;
  globalName?: string;
  avatar: string | null;
  banner?: string | null;
  accentColor?: number | null;
  roles: { id: string; name: string; color: number }[];
  joinedAt: string;
  createdAt?: string;
  level: number;
  xp: number;
  totalXp: number;
  xpNeeded: number;
  rank: number;
  messages: number;
  balance: number;
  bank: number;
  isOwner: boolean;
  isAdmin: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  warnings: { id: string; reason: string; moderator: string; createdAt: string }[];
  modHistory: { action: string; reason: string; moderator: string; createdAt: string; duration?: number }[];
}

type ActionType = 'timeout' | 'kick' | 'ban' | 'warn' | 'nickname' | 'reset-xp' | 'reset-balance' | 'mute' | 'deafen' | null;

const TIMEOUT_DURATIONS = [
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '1 day' },
  { value: 604800, label: '1 week' },
];

const BAN_DELETE_DAYS = [
  { value: 0, label: 'Don\'t delete any' },
  { value: 1, label: 'Previous 24 hours' },
  { value: 7, label: 'Previous 7 days' },
];

export default function UserProfilePage() {
  const { guildId, odiscordId } = useParams<{ guildId: string; odiscordId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  const [actionModal, setActionModal] = useState<ActionType>(null);
  const [actionReason, setActionReason] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(3600);
  const [banDeleteDays, setBanDeleteDays] = useState(0);
  const [newNickname, setNewNickname] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch member profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['member-profile', guildId, odiscordId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/members/${odiscordId}/profile`);
      return res.data.data as MemberProfile;
    },
    enabled: !!guildId && !!odiscordId,
  });

  // Check if current user is admin/owner
  const { data: guildData } = useQuery({
    queryKey: ['guild-info', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/info`);
      return res.data.data;
    },
    enabled: !!guildId,
  });

  const canModerate = guildData?.ownerId === currentUser?.discordId || 
    (profile && !profile.isOwner && !profile.isAdmin);

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: Record<string, unknown> }) => {
      const res = await api.post(`/guilds/${guildId}/members/${odiscordId}/${action}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.action.charAt(0).toUpperCase() + variables.action.slice(1)} successful!`);
      queryClient.invalidateQueries({ queryKey: ['member-profile', guildId, odiscordId] });
      setActionModal(null);
      setActionReason('');
      
      if (variables.action === 'kick' || variables.action === 'ban') {
        navigate(`/dashboard/guild/${guildId}/members`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || `Action failed`);
    },
  });

  const executeAction = () => {
    if (!actionModal) return;
    
    switch (actionModal) {
      case 'timeout':
        actionMutation.mutate({ action: 'timeout', data: { duration: timeoutDuration, reason: actionReason } });
        break;
      case 'kick':
        actionMutation.mutate({ action: 'kick', data: { reason: actionReason } });
        break;
      case 'ban':
        actionMutation.mutate({ action: 'ban', data: { reason: actionReason, deleteMessageDays: banDeleteDays } });
        break;
      case 'warn':
        actionMutation.mutate({ action: 'warn', data: { reason: actionReason } });
        break;
      case 'nickname':
        actionMutation.mutate({ action: 'nickname', data: { nickname: newNickname } });
        break;
      case 'reset-xp':
        actionMutation.mutate({ action: 'reset-xp' });
        break;
      case 'reset-balance':
        actionMutation.mutate({ action: 'reset-balance' });
        break;
      case 'mute':
        actionMutation.mutate({ action: 'mute' });
        break;
      case 'deafen':
        actionMutation.mutate({ action: 'deafen' });
        break;
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(odiscordId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const formatColor = (color: number) => {
    if (color === 0) return '#99aab5';
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <p className="text-[var(--color-text-muted)] mb-6">This user doesn't exist or isn't a member of this server.</p>
        <Link to={`/dashboard/guild/${guildId}/members`} className="btn btn-primary">
          Back to Members
        </Link>
      </div>
    );
  }

  const xpProgress = (profile.xp / profile.xpNeeded) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link 
        to={`/dashboard/guild/${guildId}/members`}
        className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Members
      </Link>

      {/* Profile Header */}
      <div className="card overflow-hidden">
        {/* Banner */}
        <div 
          className="h-40 relative"
          style={{
            background: profile.banner 
              ? `url(https://cdn.discordapp.com/banners/${profile.odiscordId}/${profile.banner}${profile.banner.startsWith('a_') ? '.gif' : '.png'}?size=600) center/cover`
              : profile.accentColor 
                ? `#${profile.accentColor.toString(16).padStart(6, '0')}`
                : 'linear-gradient(135deg, var(--color-accent) 0%, #9333ea 100%)',
          }}
        >
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
        </div>
        
        <div className="px-6 pb-6">
          {/* Avatar & Basic Info */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${profile.odiscordId}/${profile.avatar}.png?size=128`}
                  alt={profile.username}
                  className="w-32 h-32 rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-surface)]"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-accent)] flex items-center justify-center text-4xl font-bold text-white">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Status Badge */}
              {profile.isOwner && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-[var(--color-surface)]">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
              {profile.isAdmin && !profile.isOwner && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center border-2 border-[var(--color-surface)]">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-display font-bold">{profile.globalName || profile.username}</h1>
                {profile.globalName && (
                  <span className="text-[var(--color-text-muted)]">@{profile.username}</span>
                )}
                {profile.isOwner && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">Owner</span>
                )}
                {profile.isAdmin && !profile.isOwner && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400">Admin</span>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)]">
                <button 
                  onClick={copyId}
                  className="flex items-center gap-1 hover:text-[var(--color-text)] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {profile.odiscordId}
                </button>
                <a 
                  href={`https://discord.com/users/${profile.odiscordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-[var(--color-text)] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Discord Profile
                </a>
              </div>
            </div>

            {/* Quick Actions for Admins */}
            {canModerate && (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setActionModal('warn'); setNewNickname(profile.username); }}
                  className="btn btn-secondary btn-sm"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActionModal('timeout')}
                  className="btn btn-secondary btn-sm"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActionModal('kick')}
                  className="btn bg-orange-500 hover:bg-orange-600 text-white btn-sm"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActionModal('ban')}
                  className="btn bg-red-500 hover:bg-red-600 text-white btn-sm"
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">{profile.level}</div>
          <div className="text-sm text-[var(--color-text-muted)]">Level</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">#{profile.rank || '?'}</div>
          <div className="text-sm text-[var(--color-text-muted)]">Server Rank</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
            <Coins className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold">{(profile.balance + profile.bank).toLocaleString()}</div>
          <div className="text-sm text-[var(--color-text-muted)]">Total Balance</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-2xl font-bold">{profile.messages?.toLocaleString() || 0}</div>
          <div className="text-sm text-[var(--color-text-muted)]">Messages</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* XP Progress */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Level Progress
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Level {profile.level}</span>
                <span>Level {profile.level + 1}</span>
              </div>
              <div className="h-4 bg-[var(--color-border)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
              <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
                <span>{profile.xp.toLocaleString()} XP</span>
                <span>{profile.xpNeeded.toLocaleString()} XP</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Total XP: {profile.totalXp?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Economy Details */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Economy
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--color-background)]">
                <div className="text-sm text-[var(--color-text-muted)]">Wallet</div>
                <div className="text-xl font-bold">{profile.balance.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-background)]">
                <div className="text-sm text-[var(--color-text-muted)]">Bank</div>
                <div className="text-xl font-bold">{profile.bank.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          {/* Achievements/Badges */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Achievements
            </h3>
            <div className="flex flex-wrap gap-3">
              {profile.level >= 10 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
                  <Zap className="w-4 h-4" />
                  Level 10+
                </div>
              )}
              {profile.level >= 25 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                  <Target className="w-4 h-4" />
                  Level 25+
                </div>
              )}
              {profile.level >= 50 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                  <Award className="w-4 h-4" />
                  Level 50+
                </div>
              )}
              {(profile.messages || 0) >= 1000 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm">
                  <MessageSquare className="w-4 h-4" />
                  1K Messages
                </div>
              )}
              {(profile.balance + profile.bank) >= 10000 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                  <Gift className="w-4 h-4" />
                  Rich
                </div>
              )}
              {profile.isOwner && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                  <Crown className="w-4 h-4" />
                  Server Owner
                </div>
              )}
              {profile.isAdmin && !profile.isOwner && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  <Shield className="w-4 h-4" />
                  Administrator
                </div>
              )}
              {(!profile.level || profile.level < 10) && !profile.isOwner && !profile.isAdmin && (
                <p className="text-sm text-[var(--color-text-muted)]">No achievements yet. Keep chatting to unlock!</p>
              )}
            </div>
          </div>
          
          {/* Voice Activity */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-green-400" />
              Voice Activity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--color-background)] flex items-center gap-3">
                {profile.isMuted ? (
                  <MicOff className="w-5 h-5 text-red-400" />
                ) : (
                  <Mic className="w-5 h-5 text-green-400" />
                )}
                <div>
                  <div className="text-sm text-[var(--color-text-muted)]">Microphone</div>
                  <div className="font-medium">{profile.isMuted ? 'Muted' : 'Active'}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-background)] flex items-center gap-3">
                {profile.isDeafened ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-green-400" />
                )}
                <div>
                  <div className="text-sm text-[var(--color-text-muted)]">Audio</div>
                  <div className="font-medium">{profile.isDeafened ? 'Deafened' : 'Active'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Moderation History (Admin only) */}
          {canModerate && profile.modHistory && profile.modHistory.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-red-400" />
                Moderation History
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {profile.modHistory.map((entry, i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-lg bg-[var(--color-background)] flex items-start gap-3"
                  >
                    <div className={`p-2 rounded-lg ${
                      entry.action === 'ban' ? 'bg-red-500/20 text-red-400' :
                      entry.action === 'kick' ? 'bg-orange-500/20 text-orange-400' :
                      entry.action === 'timeout' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {entry.action === 'ban' && <Ban className="w-4 h-4" />}
                      {entry.action === 'kick' && <UserMinus className="w-4 h-4" />}
                      {entry.action === 'timeout' && <Clock className="w-4 h-4" />}
                      {entry.action === 'warn' && <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] truncate">{entry.reason}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">by {entry.moderator}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Roles & Info */}
        <div className="space-y-6">
          {/* Member Info */}
          <div className="card">
            <h3 className="font-semibold mb-4">Member Since</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--color-text-muted)]" />
                <div>
                  <div className="text-sm">Joined Server</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{formatDate(profile.joinedAt)}</div>
                </div>
              </div>
              {profile.createdAt && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                  <div>
                    <div className="text-sm">Account Created</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{formatDate(profile.createdAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Roles */}
          <div className="card">
            <h3 className="font-semibold mb-4">Roles ({profile.roles.length})</h3>
            <div className="flex flex-wrap gap-2">
              {profile.roles.map((role) => (
                <span
                  key={role.id}
                  className="px-2 py-1 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: `${formatColor(role.color)}20`,
                    color: formatColor(role.color),
                  }}
                >
                  @{role.name}
                </span>
              ))}
              {profile.roles.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No roles</p>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {canModerate && (
            <div className="card">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => { setActionModal('nickname'); setNewNickname(profile.username); }}
                  className="w-full btn btn-secondary justify-start gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Change Nickname
                </button>
                <button 
                  onClick={() => setActionModal('mute')}
                  className="w-full btn btn-secondary justify-start gap-2"
                >
                  <VolumeX className="w-4 h-4" />
                  Server Mute
                </button>
                <button 
                  onClick={() => setActionModal('deafen')}
                  className="w-full btn btn-secondary justify-start gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Server Deafen
                </button>
                <div className="border-t border-[var(--color-border)] my-3" />
                <button 
                  onClick={() => setActionModal('reset-xp')}
                  className="w-full btn btn-secondary justify-start gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset XP/Level
                </button>
                <button 
                  onClick={() => setActionModal('reset-balance')}
                  className="w-full btn btn-secondary justify-start gap-2"
                >
                  <Coins className="w-4 h-4" />
                  Reset Balance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActionModal(null)}
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
                <h3 className="font-semibold">
                  {actionModal === 'timeout' && 'Timeout User'}
                  {actionModal === 'kick' && 'Kick User'}
                  {actionModal === 'ban' && 'Ban User'}
                  {actionModal === 'warn' && 'Warn User'}
                  {actionModal === 'nickname' && 'Change Nickname'}
                  {actionModal === 'reset-xp' && 'Reset XP/Level'}
                  {actionModal === 'reset-balance' && 'Reset Balance'}
                  {actionModal === 'mute' && 'Server Mute'}
                  {actionModal === 'deafen' && 'Server Deafen'}
                </h3>
                <button onClick={() => setActionModal(null)} className="p-2 rounded-lg hover:bg-[var(--color-border)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {actionModal === 'timeout' && (
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

                {actionModal === 'ban' && (
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

                {actionModal === 'nickname' && (
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

                {['timeout', 'kick', 'ban', 'warn'].includes(actionModal) && (
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

                {['reset-xp', 'reset-balance', 'mute', 'deafen'].includes(actionModal) && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-300">
                      {actionModal === 'reset-xp' && 'This will reset all XP and level progress for this user.'}
                      {actionModal === 'reset-balance' && 'This will reset the user\'s economy balance to 0.'}
                      {actionModal === 'mute' && 'This will toggle server mute for the user in voice channels.'}
                      {actionModal === 'deafen' && 'This will toggle server deafen for the user in voice channels.'}
                    </p>
                  </div>
                )}

                {['kick', 'ban'].includes(actionModal) && (
                  <div className={`p-3 rounded-lg ${actionModal === 'ban' ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                    <p className={`text-sm ${actionModal === 'ban' ? 'text-red-300' : 'text-orange-300'}`}>
                      {actionModal === 'kick' && 'This will remove the user from the server. They can rejoin with an invite.'}
                      {actionModal === 'ban' && 'This will permanently ban the user from the server.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--color-border)]">
                <button onClick={() => setActionModal(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionMutation.isPending}
                  className={`btn ${
                    actionModal === 'ban' ? 'bg-red-500 hover:bg-red-600' :
                    actionModal === 'kick' ? 'bg-orange-500 hover:bg-orange-600' :
                    'btn-primary'
                  } text-white`}
                >
                  {actionMutation.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
