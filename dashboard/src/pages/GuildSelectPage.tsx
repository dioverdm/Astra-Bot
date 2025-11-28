import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Server, Plus, Check, Search, Crown,
  Settings, ExternalLink, Sparkles, RefreshCw,
  LayoutGrid, List, ArrowRight
} from 'lucide-react';
import { apiHelpers } from '../lib/api';
import { BOT_LINKS } from '../config/links';
import astraAvatar from '../images/astra.png';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  owner: boolean;
  hasBot: boolean;
  memberCount?: number;
}

export default function GuildSelectPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const res = await apiHelpers.getGuilds();
      return res.data.data as Guild[];
    },
  });

  // Filter guilds based on search
  const filterGuilds = (guilds: Guild[]) => {
    if (!searchQuery) return guilds;
    return guilds.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const guildsWithBot = filterGuilds(data?.filter((g: Guild) => g.hasBot) || []);
  const guildsWithoutBot = filterGuilds(data?.filter((g: Guild) => !g.hasBot) || []);
  const totalGuilds = (data?.length || 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-purple-500 flex items-center justify-center">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-[var(--color-accent)] animate-ping opacity-20" />
        </motion.div>
        <p className="text-[var(--color-text-muted)]">Loading your servers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center py-12"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Server className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load servers</h3>
        <p className="text-[var(--color-text-muted)] mb-4">Please try again or check your connection.</p>
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <img src={astraAvatar} alt="Astra" className="w-16 h-16 rounded-2xl shadow-xl" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">
                Your Servers
              </h1>
              <p className="text-white/70">
                Select a server to configure or add Astra to a new one
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-white/70" />
                  <span className="text-white font-bold">{totalGuilds}</span>
                  <span className="text-white/60 text-sm">servers</span>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-bold">{data?.filter((g: Guild) => g.hasBot).length || 0}</span>
                  <span className="text-green-400/60 text-sm">with Astra</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all outline-none"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-[var(--color-accent)] text-white' 
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-colors ${
                viewMode === 'list' 
                  ? 'bg-[var(--color-accent)] text-white' 
                  : 'bg-[var(--color-background)] hover:bg-[var(--color-border)]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-3 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Servers with Bot */}
      <AnimatePresence mode="wait">
        {guildsWithBot.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold">Servers with Astra</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                {guildsWithBot.length}
              </span>
            </div>
            
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-3"
            }>
              {guildsWithBot.map((guild, index) => (
                <motion.div
                  key={guild.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/dashboard/guild/${guild.id}`}
                    className={`card card-hover group block ${
                      viewMode === 'list' ? 'flex items-center gap-4' : ''
                    }`}
                  >
                    <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'mb-4' : 'flex-1'}`}>
                      <div className="relative">
                        {guild.iconUrl ? (
                          <img 
                            src={guild.iconUrl} 
                            alt={guild.name} 
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {guild.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[var(--color-surface)]">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate flex items-center gap-2">
                          {guild.name}
                          {guild.owner && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </h3>
                        <p className="text-sm text-green-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Configured
                        </p>
                      </div>
                    </div>
                    
                    {viewMode === 'grid' && (
                      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                        <span className="text-sm text-[var(--color-text-muted)]">
                          Click to manage
                        </span>
                        <div className="flex items-center gap-2 text-[var(--color-accent)] group-hover:gap-3 transition-all">
                          <Settings className="w-4 h-4" />
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2 text-[var(--color-accent)]">
                        <Settings className="w-5 h-5" />
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Servers without Bot */}
      <AnimatePresence mode="wait">
        {guildsWithoutBot.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <h2 className="text-lg font-semibold">Add Astra to a Server</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-background)] text-[var(--color-text-muted)]">
                {guildsWithoutBot.length}
              </span>
            </div>
            
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-3"
            }>
              {guildsWithoutBot.map((guild, index) => (
                <motion.a
                  key={guild.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  href={`https://discord.com/api/oauth2/authorize?client_id=${(import.meta as any).env?.VITE_DISCORD_CLIENT_ID || '1207805728530763796'}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`card card-hover group block border-dashed border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] ${
                    viewMode === 'list' ? 'flex items-center gap-4' : ''
                  }`}
                >
                  <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'mb-4' : 'flex-1'}`}>
                    <div className="relative opacity-60 group-hover:opacity-100 transition-opacity">
                      {guild.iconUrl ? (
                        <img 
                          src={guild.iconUrl} 
                          alt={guild.name} 
                          className="w-14 h-14 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[var(--color-border)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/20 transition-colors">
                          <span className="text-[var(--color-text-muted)] font-bold text-lg group-hover:text-[var(--color-accent)]">
                            {guild.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate flex items-center gap-2 opacity-75 group-hover:opacity-100">
                        {guild.name}
                        {guild.owner && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </h3>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Click to add Astra
                      </p>
                    </div>
                  </div>
                  
                  {viewMode === 'grid' && (
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] border-dashed">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        Invite bot
                      </span>
                      <div className="flex items-center gap-2 text-[var(--color-accent)]">
                        <Plus className="w-4 h-4" />
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2 text-[var(--color-accent)]">
                      <Plus className="w-5 h-5" />
                      <ExternalLink className="w-5 h-5" />
                    </div>
                  )}
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {guildsWithBot.length === 0 && guildsWithoutBot.length === 0 && searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-12"
        >
          <Search className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No servers found</h3>
          <p className="text-[var(--color-text-muted)]">
            No servers match "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-[var(--color-accent)] hover:underline"
          >
            Clear search
          </button>
        </motion.div>
      )}

      {/* No Servers at All */}
      {!data?.length && !searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-12"
        >
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-4">
            <Server className="w-10 h-10 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No servers found</h3>
          <p className="text-[var(--color-text-muted)] max-w-md mx-auto mb-6">
            You need to be an administrator of a Discord server to configure Astra.
            Create a server or ask for admin permissions.
          </p>
          <a
            href={BOT_LINKS.botInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-[var(--color-accent)] text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Astra to a Server
          </a>
        </motion.div>
      )}
    </div>
  );
}
