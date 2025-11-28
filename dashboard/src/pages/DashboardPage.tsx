import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Server, TrendingUp, Users, Activity, History, Sparkles, 
  Zap, Clock, Wifi, ArrowRight, ExternalLink, Terminal,
  Shield, Gamepad2, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { CURRENT_VERSION, getLatestVersion } from '../config/changelog';
import { BOT_LINKS } from '../config/links';
import astraAvatar from '../images/astra.png';

// Bot stats interface
interface BotStats {
  guilds: number;
  users: number;
  commands: number;
  uptime: number;
  ping: number;
  online: boolean;
  version: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  // Fetch bot stats from public endpoint
  const { data: botStats, isLoading } = useQuery<BotStats>({
    queryKey: ['dashboard-bot-stats'],
    queryFn: async () => {
      const res = await api.get('/bot/stats/public');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Format uptime
  const formatUptime = (ms: number) => {
    if (!ms) return '0h';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  // Stats cards data
  const statsCards = [
    { 
      label: 'Servers', 
      value: botStats?.guilds?.toLocaleString() || '0', 
      icon: Server, 
      color: 'purple',
      gradient: 'from-purple-500 to-violet-500'
    },
    { 
      label: 'Users', 
      value: botStats?.users?.toLocaleString() || '0', 
      icon: Users, 
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Commands', 
      value: botStats?.commands?.toString() || '0', 
      icon: Zap, 
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      label: 'Uptime', 
      value: formatUptime(botStats?.uptime || 0), 
      icon: Clock, 
      color: 'orange',
      gradient: 'from-orange-500 to-amber-500'
    },
  ];
  
  const latestUpdate = getLatestVersion();
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <img 
            src={astraAvatar} 
            alt="Astra" 
            className="w-20 h-20 rounded-2xl shadow-xl border-2 border-white/20"
          />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
              Welcome back, {user?.username}! 👋
            </h1>
            <p className="text-white/80 max-w-xl">
              Manage your Discord servers and configure Astra from your personal dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {botStats?.online !== false ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium text-sm">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-xl border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-medium text-sm">Offline</span>
              </div>
            )}
            {botStats?.ping && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl">
                <Wifi className="w-4 h-4 text-white/70" />
                <span className="text-white font-medium text-sm">{botStats.ping}ms</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card group hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="inline-block w-16 h-7 bg-[var(--color-background)] rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
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
      >
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/dashboard/guilds" className="card card-hover group flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Manage Servers</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Configure your Discord servers</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
          </Link>
          
          <a 
            href={BOT_LINKS.botInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="card card-hover group flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Add to Server</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Invite Astra to a new server</p>
            </div>
            <ExternalLink className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
          </a>
          
          <Link to="/dashboard/changelog" className="card card-hover group flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <History className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Changelog</h3>
              <p className="text-sm text-[var(--color-text-muted)]">See what's new in v{CURRENT_VERSION}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
          </Link>
        </div>
      </motion.div>
      
      {/* Latest Update & Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Update */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/dashboard/changelog" className="card card-hover group block h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Latest Update
              </h2>
              <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-[var(--color-accent)] to-purple-500 text-white text-sm font-bold">
                v{CURRENT_VERSION}
              </span>
            </div>
            <h3 className="font-semibold text-lg mb-2">{latestUpdate.title}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {latestUpdate.description}
            </p>
            <div className="space-y-2">
              {latestUpdate.changes.slice(0, 3).map((change, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    change.type === 'added' ? 'text-green-400' : 
                    change.type === 'improved' ? 'text-blue-400' : 
                    change.type === 'fixed' ? 'text-orange-400' : 'text-gray-400'
                  }`} />
                  <span className="text-[var(--color-text-muted)]">{change.text}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-accent)] mt-4 group-hover:gap-3 transition-all">
              <History className="w-4 h-4" />
              View full changelog
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>

        {/* Bot Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-lg font-semibold mb-4">Bot Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, label: 'Moderation', color: 'text-red-400', bg: 'bg-red-500/10' },
              { icon: TrendingUp, label: 'Leveling', color: 'text-green-400', bg: 'bg-green-500/10' },
              { icon: Activity, label: 'Economy', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { icon: Gamepad2, label: 'Fun & Games', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { icon: Terminal, label: 'Utility', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: Sparkles, label: 'Anime', color: 'text-pink-400', bg: 'bg-pink-500/10' },
            ].map((feature) => (
              <div 
                key={feature.label}
                className={`flex items-center gap-3 p-3 rounded-xl ${feature.bg} transition-colors`}
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                <span className="font-medium text-sm">{feature.label}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-medium mb-3">Getting Started</h3>
            <div className="space-y-2">
              {[
                'Select a server from the sidebar',
                'Enable modules you want to use',
                'Configure settings to your liking',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xs">
                    {i + 1}
                  </div>
                  <span className="text-[var(--color-text-muted)]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
