import { Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { 
  Home, 
  Server, 
  Shield, 
  TrendingUp, 
  Coins, 
  UserPlus, 
  Ticket, 
  Menu,
  X,
  LogOut,
  Palette,
  ChevronDown,
  ChevronRight,
  Users,
  ScrollText,
  Bot,
  BarChart3,
  History,
  Trophy,
  Gift,
  ShoppingBag,
  CreditCard,
  Terminal,
  Crown,
  ExternalLink,
  Search,
  HelpCircle,
  Github,
  Heart,
  Zap,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  MessageSquare,
  Info,
  User,
  Moon,
  Sun,
  Layers,
  Check,
  Music,
  PartyPopper,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore, themes, type Theme, type ThemeCategory } from '../stores/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import astraAvatar from '../images/astra.png';
import { CURRENT_VERSION } from '../config/changelog';
import { BOT_LINKS } from '../config/links';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Servers', href: '/dashboard/guilds', icon: Server },
  { name: 'Changelog', href: '/dashboard/changelog', icon: History },
];

// Categorized guild navigation
const guildNavCategories = [
  {
    name: 'General',
    items: [
      { name: 'Overview', href: '', icon: Home },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    ],
  },
  {
    name: 'Moderation',
    items: [
      { name: 'Moderation', href: '/moderation', icon: Shield },
      { name: 'Automod', href: '/automod', icon: Bot },
      { name: 'Audit Log', href: '/audit-log', icon: ScrollText },
    ],
  },
  {
    name: 'Leveling',
    items: [
      { name: 'Settings', href: '/leveling', icon: TrendingUp },
      { name: 'Level Card', href: '/level-card', icon: CreditCard },
      { name: 'Role Rewards', href: '/role-rewards', icon: Gift },
    ],
  },
  {
    name: 'Economy',
    items: [
      { name: 'Settings', href: '/economy', icon: Coins },
      { name: 'Shop', href: '/shop', icon: ShoppingBag },
    ],
  },
  {
    name: 'Engagement',
    items: [
      { name: 'Music', href: '/music', icon: Music },
      { name: 'Giveaways', href: '/giveaway', icon: PartyPopper },
    ],
  },
  {
    name: 'Server',
    items: [
      { name: 'Members', href: '/members', icon: Users },
      { name: 'Roles', href: '/roles', icon: Crown },
      { name: 'Welcome', href: '/welcome', icon: UserPlus },
      { name: 'Tickets', href: '/tickets', icon: Ticket },
      { name: 'Commands', href: '/commands', icon: Terminal },
    ],
  },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [themeCategory, setThemeCategory] = useState<ThemeCategory>('dark');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isGuildRoute = location.pathname.includes('/guild/');

  // Fetch current guild info if on guild route
  const { data: guildData } = useQuery({
    queryKey: ['guild-info', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}/info`);
      return res.data;
    },
    enabled: !!guildId && isGuildRoute,
    staleTime: 60000,
  });

  const currentGuild = guildData?.data;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setThemeMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setThemeMenuOpen(false);
      setUserMenuOpen(false);
    };
    if (themeMenuOpen || userMenuOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [themeMenuOpen, userMenuOpen]);

  // Generate breadcrumbs
  const getBreadcrumbs = useCallback(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { name: string; href: string }[] = [];
    
    if (paths[0] === 'dashboard') {
      breadcrumbs.push({ name: 'Dashboard', href: '/dashboard' });
      
      if (paths[1] === 'guild' && guildId) {
        breadcrumbs.push({ 
          name: currentGuild?.name || 'Server', 
          href: `/dashboard/guild/${guildId}` 
        });
        
        // Add current page
        if (paths[3]) {
          const pageName = paths[3].charAt(0).toUpperCase() + paths[3].slice(1).replace(/-/g, ' ');
          breadcrumbs.push({ 
            name: pageName, 
            href: location.pathname 
          });
        }
      } else if (paths[1] === 'guilds') {
        breadcrumbs.push({ name: 'Servers', href: '/dashboard/guilds' });
      } else if (paths[1] === 'changelog') {
        breadcrumbs.push({ name: 'Changelog', href: '/dashboard/changelog' });
      }
    }
    
    return breadcrumbs;
  }, [location.pathname, guildId, currentGuild?.name]);

  const breadcrumbs = getBreadcrumbs();

  // Handle search navigation
  const handleSearch = useCallback((query: string) => {
    // Simple navigation based on search query
    const q = query.toLowerCase();
    if (q.includes('member') && guildId) navigate(`/dashboard/guild/${guildId}/members`);
    else if (q.includes('level') && guildId) navigate(`/dashboard/guild/${guildId}/leveling`);
    else if (q.includes('economy') && guildId) navigate(`/dashboard/guild/${guildId}/economy`);
    else if (q.includes('shop') && guildId) navigate(`/dashboard/guild/${guildId}/shop`);
    else if (q.includes('mod') && guildId) navigate(`/dashboard/guild/${guildId}/moderation`);
    else if (q.includes('ticket') && guildId) navigate(`/dashboard/guild/${guildId}/tickets`);
    else if (q.includes('welcome') && guildId) navigate(`/dashboard/guild/${guildId}/welcome`);
    else if (q.includes('server') || q.includes('guild')) navigate('/dashboard/guilds');
    else if (q.includes('change') || q.includes('log')) navigate('/dashboard/changelog');
    setSearchOpen(false);
    setSearchQuery('');
  }, [guildId, navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)]">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={astraAvatar} alt="Astra" className="w-9 h-9 rounded-xl" />
            {!sidebarCollapsed && (
              <span className="font-display font-bold text-xl gradient-text">Astra</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-background)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Info (wenn auf Guild-Route) */}
        {isGuildRoute && currentGuild && !sidebarCollapsed && (
          <div className="p-3 border-b border-[var(--color-border)]">
            <Link 
              to={`/dashboard/guild/${guildId}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-background)] transition-colors"
            >
              {currentGuild.icon ? (
                <img 
                  src={`https://cdn.discordapp.com/icons/${guildId}/${currentGuild.icon}.png`} 
                  alt={currentGuild.name}
                  className="w-10 h-10 rounded-xl"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
                  {currentGuild.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{currentGuild.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {currentGuild.memberCount?.toLocaleString()} members
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Navigation - scrollable with hidden scrollbar */}
        <nav className={`p-2 overflow-y-auto scrollbar-hide ${isGuildRoute ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-8rem)]'}`}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text)]'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}

          {/* Guild-specific navigation with categories */}
          {isGuildRoute && guildId && (
            <div className="space-y-1 mt-2">
              {guildNavCategories.map((category) => (
                <div key={category.name}>
                  {!sidebarCollapsed && (
                    <div className="pt-4 pb-2 px-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        {category.name}
                      </span>
                    </div>
                  )}
                  {sidebarCollapsed && <div className="my-2 mx-2 border-t border-[var(--color-border)]" />}
                  {category.items.map((item) => {
                    const href = `/dashboard/guild/${guildId}${item.href}`;
                    const isActive = location.pathname === href;
                    return (
                      <Link
                        key={item.name}
                        to={href}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 transition-all duration-200 ${
                          isActive
                            ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25'
                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text)]'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]`}>
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>v{CURRENT_VERSION}</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-background)] transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-full p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors flex justify-center"
              title="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>
      </aside>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full max-w-lg bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
                <Search className="w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search pages, settings, commands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="flex-1 bg-transparent border-none outline-none text-lg"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs rounded bg-[var(--color-background)] border border-[var(--color-border)]">
                  ESC
                </kbd>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                <p className="px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] uppercase">Quick Navigation</p>
                {[
                  { name: 'Servers', icon: Server, href: '/dashboard/guilds' },
                  { name: 'Changelog', icon: History, href: '/dashboard/changelog' },
                  ...(guildId ? [
                    { name: 'Members', icon: Users, href: `/dashboard/guild/${guildId}/members` },
                    { name: 'Leveling', icon: TrendingUp, href: `/dashboard/guild/${guildId}/leveling` },
                    { name: 'Economy', icon: Coins, href: `/dashboard/guild/${guildId}/economy` },
                    { name: 'Shop', icon: ShoppingBag, href: `/dashboard/guild/${guildId}/shop` },
                    { name: 'Moderation', icon: Shield, href: `/dashboard/guild/${guildId}/moderation` },
                  ] : []),
                ].filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-background)] transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span>{item.name}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-background)]"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />}
                    <Link
                      to={crumb.href}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        index === breadcrumbs.length - 1
                          ? 'text-[var(--color-text)] font-medium'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]'
                      }`}
                    >
                      {crumb.name}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-border)] transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline text-sm text-[var(--color-text-muted)]">Search...</span>
                <kbd className="hidden lg:inline px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  ⌘K
                </kbd>
              </button>

              {/* Help */}
              <a
                href={BOT_LINKS.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl hover:bg-[var(--color-background)] transition-colors hidden sm:flex"
                title="Documentation"
              >
                <HelpCircle className="w-5 h-5 text-[var(--color-text-muted)]" />
              </a>

              {/* Theme Switcher */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); }}
                  className="p-2 rounded-xl hover:bg-[var(--color-background)] transition-colors"
                  title="Change theme"
                >
                  <Palette className="w-5 h-5 text-[var(--color-text-muted)]" />
                </button>

                <AnimatePresence>
                  {themeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-[var(--color-border)]">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Theme Settings
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          Personalize your dashboard appearance
                        </p>
                      </div>

                      {/* Category Tabs */}
                      <div className="flex border-b border-[var(--color-border)]">
                        {[
                          { id: 'dark' as ThemeCategory, label: 'Dark', icon: Moon },
                          { id: 'light' as ThemeCategory, label: 'Light', icon: Sun },
                          { id: 'colorful' as ThemeCategory, label: 'Colorful', icon: Layers },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setThemeCategory(cat.id)}
                            className={`flex-1 px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                              themeCategory === cat.id
                                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                          >
                            <cat.icon className="w-3.5 h-3.5" />
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Themes Grid */}
                      <div className="p-3 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                          {themes.filter(t => t.category === themeCategory).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setTheme(t.id as Theme);
                              }}
                              className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                                theme === t.id
                                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                                  : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-background)]'
                              }`}
                            >
                              {/* Color Preview */}
                              <div className="flex gap-1 mb-2">
                                {t.colors.map((color, i) => (
                                  <div
                                    key={i}
                                    className="w-5 h-5 rounded-md shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              
                              {/* Name & Description */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{t.name}</span>
                                {t.isNew && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-500/20 text-green-400">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                                {t.description}
                              </p>

                              {/* Selected Indicator */}
                              {theme === t.id && (
                                <div className="absolute top-2 right-2">
                                  <Check className="w-4 h-4 text-[var(--color-accent)]" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-background)]/50">
                        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                          {themes.length} themes available • Your choice is saved automatically
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setThemeMenuOpen(false); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--color-background)] transition-colors"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-8 h-8 rounded-full ring-2 ring-[var(--color-border)]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-sm font-bold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
                              {user?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{user?.username}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">ID: {user?.discordId}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                        >
                          <Home className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm">Dashboard</span>
                        </Link>
                        {guildId && (
                          <Link
                            to={`/dashboard/guild/${guildId}/member/${user?.discordId}`}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                          >
                            <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                            <span className="text-sm">My Profile</span>
                          </Link>
                        )}
                        <Link
                          to="/dashboard/guilds"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                        >
                          <Server className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm">My Servers</span>
                        </Link>
                        <Link
                          to="/dashboard/changelog"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                        >
                          <History className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm">Changelog</span>
                        </Link>
                      </div>

                      <div className="border-t border-[var(--color-border)] py-1">
                        <a
                          href={BOT_LINKS.githubProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                        >
                          <Github className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm">GitHub</span>
                          <ExternalLink className="w-3 h-3 ml-auto text-[var(--color-text-muted)]" />
                        </a>
                        <Link
                          to="/"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-background)] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm">Landing Page</span>
                        </Link>
                      </div>

                      <div className="border-t border-[var(--color-border)] py-1">
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 min-h-[calc(100vh-4rem-3rem)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  Made with love
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  v{CURRENT_VERSION}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <a href={BOT_LINKS.githubProfile} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href={BOT_LINKS.supportServer} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </a>
                <Link to="/dashboard/changelog" className="hover:text-[var(--color-text)] transition-colors flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  <span className="hidden sm:inline">What's New</span>
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
