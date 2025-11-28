// ===========================================
// ASTRA DASHBOARD - Role Management Page
// ===========================================

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users,
  RefreshCw,
  Search,
  Bot,
  Eye,
  Copy,
  Check,
  Hash,
  AtSign,
  Palette,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string;
  memberCount?: number;
}

type RoleFilter = 'all' | 'managed' | 'hoisted' | 'mentionable' | 'colored' | 'admin';

// Discord permission flags
const ADMIN_PERMISSION = BigInt(0x8); // ADMINISTRATOR

export default function RolesPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch roles
  const { data: rolesData, isLoading, refetch } = useQuery({
    queryKey: ['guild-roles', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/discord-roles`);
      return res.data.data || [];
    },
    enabled: !!guildId,
  });

  const roles: Role[] = rolesData || [];

  // Check if role has admin permission
  const hasAdminPermission = (permissions?: string) => {
    if (!permissions) return false;
    try {
      return (BigInt(permissions) & ADMIN_PERMISSION) === ADMIN_PERMISSION;
    } catch {
      return false;
    }
  };

  // Filter and search roles
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      // Search filter
      if (searchQuery && !role.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Type filter
      switch (roleFilter) {
        case 'managed': return role.managed === true;
        case 'hoisted': return role.hoist === true;
        case 'mentionable': return role.mentionable === true;
        case 'colored': return role.color !== 0;
        case 'admin': return hasAdminPermission(role.permissions);
        default: return true;
      }
    });
  }, [roles, searchQuery, roleFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: roles.length,
    managed: roles.filter(r => r.managed === true).length,
    hoisted: roles.filter(r => r.hoist === true).length,
    mentionable: roles.filter(r => r.mentionable === true).length,
    colored: roles.filter(r => r.color !== 0).length,
    admin: roles.filter(r => hasAdminPermission(r.permissions)).length,
  }), [roles]);

  // Copy role ID
  const copyRoleId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Role ID copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatColor = (color: number) => {
    if (color === 0) return '#99aab5';
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  // Filter options
  const filterOptions: { value: RoleFilter; label: string; icon: typeof Shield; count: number }[] = [
    { value: 'all', label: 'All Roles', icon: Shield, count: stats.total },
    { value: 'managed', label: 'Bot/Integration', icon: Bot, count: stats.managed },
    { value: 'hoisted', label: 'Hoisted', icon: Eye, count: stats.hoisted },
    { value: 'mentionable', label: 'Mentionable', icon: AtSign, count: stats.mentionable },
    { value: 'colored', label: 'Colored', icon: Palette, count: stats.colored },
    { value: 'admin', label: 'Admin', icon: ShieldCheck, count: stats.admin },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Server Roles</h1>
            <p className="text-[var(--color-text-muted)]">View and manage server roles</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setRoleFilter(option.value)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              roleFilter === option.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            <option.icon className="w-3.5 h-3.5" />
            {option.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              roleFilter === option.value
                ? 'bg-white/20'
                : 'bg-[var(--color-background)]'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search roles by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-12 pr-10 py-3"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-surface)]"
          >
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Showing {filteredRoles.length} of {roles.length} roles
            </p>
            {roleFilter !== 'all' && (
              <button
                onClick={() => setRoleFilter('all')}
                className="text-sm text-[var(--color-accent)] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Roles Grid */}
          {filteredRoles.length === 0 ? (
            <div className="card text-center py-16">
              <Search className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-[var(--color-text-muted)]">No roles match your search</p>
              <button 
                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }} 
                className="text-[var(--color-accent)] text-sm mt-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredRoles.map((role) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className="card p-4 hover:border-[var(--color-accent)]/30 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Color Circle */}
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${formatColor(role.color)}20` }}
                      >
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: formatColor(role.color) }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{role.name}</span>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {role.managed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                              <Bot className="w-3 h-3" />
                              Bot
                            </span>
                          )}
                          {role.hoist && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400">
                              <Eye className="w-3 h-3" />
                              Hoisted
                            </span>
                          )}
                          {role.mentionable && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                              <AtSign className="w-3 h-3" />
                              Mentionable
                            </span>
                          )}
                          {hasAdminPermission(role.permissions) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {role.memberCount?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Pos {role.position}
                          </span>
                        </div>
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => copyRoleId(role.id)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface)] transition-all"
                        title="Copy Role ID"
                      >
                        {copiedId === role.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-[var(--color-text-muted)]" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
