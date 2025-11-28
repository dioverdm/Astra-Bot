import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, Shield, TrendingUp, Coins, Music, Gamepad2, ArrowRight, 
  Zap, Settings, Star, Github, Heart, Users, Server,
  ChevronDown, ExternalLink, Clock, MessageCircle, CheckCircle2,
  Bot, Palette, BarChart3, Ticket, Globe, Award, Activity,
  Headphones, ImageIcon, Command, Cpu
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { CURRENT_VERSION } from '../config/changelog';
import { BOT_LINKS } from '../config/links';
import astraAvatar from '../images/astra.png';

// Feature definitions with icons and colors
const features = [
  { icon: Shield, title: 'Moderation', description: 'Ban, kick, timeout, warn, and more with detailed logging and case management', color: 'from-red-500 to-orange-500' },
  { icon: TrendingUp, title: 'Leveling', description: 'Engaging XP system with customizable role rewards and beautiful rank cards', color: 'from-green-500 to-emerald-500' },
  { icon: Coins, title: 'Economy', description: 'Virtual currency system with daily rewards, shop, gambling, and trading', color: 'from-yellow-500 to-amber-500' },
  { icon: Music, title: 'Music', description: 'High-quality music playback from YouTube, Spotify, SoundCloud & more', color: 'from-pink-500 to-rose-500' },
  { icon: Gamepad2, title: 'Fun & Anime', description: 'Waifu images, anime info, memes, mini-games, and entertainment', color: 'from-purple-500 to-violet-500' },
  { icon: Settings, title: 'Dashboard', description: 'Beautiful web dashboard to configure every aspect of your bot', color: 'from-blue-500 to-cyan-500' },
];

// Bot stats interface
interface BotStats {
  guilds: number;
  users: number;
  commands: number;
  uptime: number;
  ping: number;
  version: string;
  online?: boolean;
  commandList?: CommandInfo[];
}

interface CommandInfo {
  name: string;
  description: string;
  category: string;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  
  // Fetch bot stats from public API (no auth required)
  const { data: botStats, isLoading: statsLoading } = useQuery<BotStats>({
    queryKey: ['botStatsPublic'],
    queryFn: async () => {
      const res = await api.get('/bot/stats/public');
      return res.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
  });
  
  // Use dynamic links from config
  const INVITE_URL = BOT_LINKS.botInvite;
  
  // Format uptime
  const formatUptime = (ms: number) => {
    if (!ms) return '24/7';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };
  
  // Dynamic stats
  const stats = [
    { 
      value: statsLoading ? '...' : (botStats?.guilds?.toLocaleString() || '0'), 
      label: 'Servers', 
      icon: Server 
    },
    { 
      value: statsLoading ? '...' : (botStats?.users?.toLocaleString() || '0'), 
      label: 'Users', 
      icon: Users 
    },
    { 
      value: statsLoading ? '...' : (botStats?.commands?.toString() || '10+'), 
      label: 'Commands', 
      icon: Zap 
    },
    { 
      value: statsLoading ? '...' : formatUptime(botStats?.uptime || 0), 
      label: 'Uptime', 
      icon: Clock 
    },
  ];
  
  // Get commands from API or use defaults
  const defaultCommands: CommandInfo[] = [
    { name: 'help', description: 'Interactive help menu with categories', category: 'utility' },
    { name: 'ping', description: 'Check bot latency', category: 'utility' },
    { name: 'userinfo', description: 'View user information', category: 'utility' },
    { name: 'serverinfo', description: 'View server statistics', category: 'utility' },
    { name: 'avatar', description: 'View user avatars', category: 'utility' },
    { name: 'banner', description: 'View user banners', category: 'utility' },
    { name: 'ban', description: 'Ban a member', category: 'moderation' },
    { name: 'kick', description: 'Kick a member', category: 'moderation' },
    { name: 'timeout', description: 'Timeout a member', category: 'moderation' },
    { name: 'anime', description: 'Get anime information', category: 'fun' },
    { name: 'waifu', description: 'Get random waifu images', category: 'fun' },
  ];
  
  const commands: CommandInfo[] = botStats?.commandList?.slice(0, 12) || defaultCommands;
  
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="min-h-screen bg-[var(--color-background)] overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-500/10 to-transparent rounded-full" />
      </div>
      
      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <img 
              src={astraAvatar} 
              alt="Astra" 
              className="w-12 h-12 rounded-2xl shadow-lg shadow-purple-500/20"
            />
            <span className="font-display font-bold text-2xl gradient-text">Astra</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link 
              to={isAuthenticated ? "/dashboard" : "/login"} 
              className="btn btn-ghost hidden sm:flex"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </Link>
            <a href={INVITE_URL} className="btn btn-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Add to Discord</span>
              <span className="sm:hidden">Invite</span>
            </a>
          </motion.div>
        </nav>
        
        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Version {CURRENT_VERSION} {botStats?.ping ? `• ${botStats.ping}ms` : ''}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-6 leading-tight">
                Your All-in-One
                <span className="block gradient-text">Discord Companion</span>
              </h1>
              
              <p className="text-lg text-[var(--color-text-muted)] max-w-xl mb-8">
                Astra brings powerful moderation, engaging leveling, fun economy, 
                and entertainment to your Discord server — all managed through a 
                beautiful dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a 
                  href={INVITE_URL}
                  className="btn btn-primary text-lg px-8 py-4 flex items-center gap-3 w-full sm:w-auto justify-center group"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Add to Discord
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </a>
                <Link 
                  to="/dashboard" 
                  className="btn btn-secondary text-lg px-8 py-4 flex items-center gap-3 w-full sm:w-auto justify-center"
                >
                  Open Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
                {stats.map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <stat.icon className="w-5 h-5 text-purple-400" />
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Avatar/Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-3xl scale-75" />
              <div className="relative">
                <img 
                  src={astraAvatar} 
                  alt="Astra Bot" 
                  className="w-80 h-80 rounded-3xl shadow-2xl shadow-purple-500/30 border-4 border-white/10"
                />
                {/* Floating badges */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute -top-4 -right-4 px-4 py-2 bg-green-500 rounded-xl text-white font-semibold shadow-lg"
                >
                  Online 24/7
                </motion.div>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                  className="absolute -bottom-4 -left-4 px-4 py-2 bg-purple-500 rounded-xl text-white font-semibold shadow-lg flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Moderation
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.button
          onClick={scrollToFeatures}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronDown className="w-8 h-8 animate-bounce" />
        </motion.button>
      </header>
      
      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 font-medium mb-4 block">Features</span>
            <h2 className="text-3xl lg:text-5xl font-display font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-lg">
              Packed with powerful features to make your Discord server amazing
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card card-hover group relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[var(--color-text-muted)]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Commands Preview */}
      <section className="py-24 px-6 bg-[var(--color-surface)]/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-purple-400 font-medium mb-4 block">Commands</span>
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              Powerful Slash Commands
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">
              {botStats?.commands 
                ? `${botStats.commands} commands to make managing your server a breeze`
                : 'Easy to use commands that make managing your server a breeze'}
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {commands.map((cmd, i) => {
              const categoryColors: Record<string, string> = {
                moderation: 'text-red-400',
                utility: 'text-blue-400',
                fun: 'text-purple-400',
                leveling: 'text-green-400',
                economy: 'text-yellow-400',
              };
              return (
                <motion.div
                  key={cmd.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[var(--color-background)] rounded-xl p-4 border border-[var(--color-border)] hover:border-purple-500/50 transition-all hover:scale-[1.02] group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className={`font-mono font-semibold ${categoryColors[cmd.category] || 'text-purple-400'}`}>
                      /{cmd.name}
                    </code>
                    <span className="text-xs text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {cmd.category}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{cmd.description}</p>
                </motion.div>
              );
            })}
          </div>
          
          {/* View all commands link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all commands in dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Live Status Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-green-400 font-medium mb-4 block">Status</span>
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              Always Online, Always Ready
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-bold text-xl mb-2">99.9% Uptime</h3>
              <p className="text-[var(--color-text-muted)]">Enterprise-grade reliability with constant monitoring</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="card text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl mb-2">
                {statsLoading ? '...' : `${botStats?.ping || '<50'}ms`} Response
              </h3>
              <p className="text-[var(--color-text-muted)]">Lightning-fast command execution</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="card text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-bold text-xl mb-2">Global Hosting</h3>
              <p className="text-[var(--color-text-muted)]">Optimized servers for worldwide performance</p>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link 
              to="/status"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              View live status page
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Why Choose Astra */}
      <section className="py-20 px-6 bg-[var(--color-surface)]/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-purple-400 font-medium mb-4 block">Why Astra?</span>
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              Built Different
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">
              Not just another Discord bot. Astra is designed for modern communities.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Palette, title: 'Beautiful Dashboard', desc: 'Modern, responsive web dashboard to manage everything without commands' },
              { icon: Command, title: 'Slash Commands', desc: 'All commands use Discord\'s native slash command system for easy discovery' },
              { icon: BarChart3, title: 'Analytics & Insights', desc: 'Detailed statistics about your server\'s activity and growth' },
              { icon: Ticket, title: 'Ticket System', desc: 'Professional support ticket system with categories and transcripts' },
              { icon: Award, title: 'Role Rewards', desc: 'Automatically assign roles when members reach certain levels' },
              { icon: ImageIcon, title: 'Custom Rank Cards', desc: 'Personalize your level-up cards with backgrounds and colors' },
              { icon: Headphones, title: '24/7 Support', desc: 'Active support server with quick response times' },
              { icon: Bot, title: 'Regular Updates', desc: 'New features and improvements added constantly' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Support CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#5865F2]/20 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-[#5865F2]" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Need Help?</h3>
                <p className="text-[var(--color-text-muted)]">Join our support server for assistance</p>
              </div>
            </div>
            <a 
              href={BOT_LINKS.supportServer}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Join Support Server
              <ExternalLink className="w-4 h-4 opacity-50" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 gradient-bg" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative p-12 lg:p-16 text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="inline-block mb-6"
              >
                <img src={astraAvatar} alt="Astra" className="w-24 h-24 rounded-2xl shadow-2xl" />
              </motion.div>
              <h2 className="text-3xl lg:text-5xl font-display font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto text-lg">
                Add Astra to your server today and unlock a world of features for your community.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href={INVITE_URL}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Add Astra Now
                </a>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/20"
                >
                  Open Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={astraAvatar} alt="Astra" className="w-10 h-10 rounded-xl" />
                <span className="font-display font-bold text-xl gradient-text">Astra</span>
              </div>
              <p className="text-[var(--color-text-muted)] max-w-sm">
                Your all-in-one Discord companion for moderation, leveling, economy, and entertainment.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2 text-[var(--color-text-muted)]">
                <li><Link to="/dashboard" className="hover:text-[var(--color-text)] transition-colors">Dashboard</Link></li>
                <li><a href={INVITE_URL} className="hover:text-[var(--color-text)] transition-colors">Add Bot</a></li>
                <li><Link to="/status" className="hover:text-[var(--color-text)] transition-colors">Status</Link></li>
                <li><a href={BOT_LINKS.supportServer} className="hover:text-[var(--color-text)] transition-colors">Support</a></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-[var(--color-text-muted)]">
                <li><Link to="/privacy" className="hover:text-[var(--color-text)] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-[var(--color-text)] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[var(--color-border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              © 2024 Astra Bot. Made with <Heart className="w-4 h-4 inline text-red-500" /> for Discord communities.
            </p>
            <div className="flex items-center gap-4">
              <a href={BOT_LINKS.githubProfile} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
