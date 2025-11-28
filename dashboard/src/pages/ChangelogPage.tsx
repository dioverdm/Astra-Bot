// ===========================================
// ASTRA DASHBOARD - Changelog Page
// ===========================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Plus, 
  RefreshCw, 
  Wrench, 
  Trash2, 
  Sparkles,
  Tag,
  Calendar,
  ChevronDown,
  Rocket,
  Github,
  MessageCircle,
  Zap,
  Filter,
  Search,
} from 'lucide-react';
import { CHANGELOG, CURRENT_VERSION, VERSION_DATE, type ChangelogEntry } from '../config/changelog';
import { BOT_LINKS } from '../config/links';
import astraAvatar from '../images/astra.png';

// ============================================
// Constants
// ============================================

const CHANGE_ICONS = {
  added: { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Added', gradient: 'from-green-500 to-emerald-500' },
  changed: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Changed', gradient: 'from-blue-500 to-cyan-500' },
  fixed: { icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Fixed', gradient: 'from-orange-500 to-amber-500' },
  removed: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Removed', gradient: 'from-red-500 to-rose-500' },
  improved: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Improved', gradient: 'from-purple-500 to-violet-500' },
};

const VERSION_COLORS = {
  major: 'from-red-500 to-orange-500',
  minor: 'from-blue-500 to-purple-500',
  patch: 'from-green-500 to-teal-500',
};

export default function ChangelogPage() {
  const [expandedVersions, setExpandedVersions] = useState<string[]>([CURRENT_VERSION]);
  const [filter, setFilter] = useState<'all' | 'added' | 'changed' | 'fixed' | 'improved' | 'removed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => 
      prev.includes(version) 
        ? prev.filter(v => v !== version)
        : [...prev, version]
    );
  };

  const expandAll = () => {
    setExpandedVersions(CHANGELOG.map(e => e.version));
  };

  const collapseAll = () => {
    setExpandedVersions([]);
  };

  // Filter and search changes
  const filterChanges = (changes: ChangelogEntry['changes']) => {
    let filtered = changes;
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.type === filter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.text.toLowerCase().includes(query));
    }
    return filtered;
  };

  // Filter versions based on search
  const filteredChangelog = useMemo(() => {
    if (!searchQuery.trim()) return CHANGELOG;
    const query = searchQuery.toLowerCase();
    return CHANGELOG.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.description?.toLowerCase().includes(query) ||
      entry.changes.some(c => c.text.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Calculate stats
  const changesByType = useMemo(() => ({
    added: CHANGELOG.reduce((acc, e) => acc + e.changes.filter(c => c.type === 'added').length, 0),
    improved: CHANGELOG.reduce((acc, e) => acc + e.changes.filter(c => c.type === 'improved').length, 0),
    fixed: CHANGELOG.reduce((acc, e) => acc + e.changes.filter(c => c.type === 'fixed').length, 0),
    changed: CHANGELOG.reduce((acc, e) => acc + e.changes.filter(c => c.type === 'changed').length, 0),
    removed: CHANGELOG.reduce((acc, e) => acc + e.changes.filter(c => c.type === 'removed').length, 0),
    total: CHANGELOG.reduce((acc, e) => acc + e.changes.length, 0),
  }), []);

  // Calculate days since first release
  const daysSinceFirstRelease = useMemo(() => {
    const firstRelease = new Date(CHANGELOG[CHANGELOG.length - 1].date);
    const now = new Date();
    return Math.floor((now.getTime() - firstRelease.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
            <div className="flex items-center gap-4">
              <img src={astraAvatar} alt="Astra" className="w-16 h-16 rounded-2xl shadow-xl" />
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Changelog</h1>
                <p className="text-white/70">Track all updates and improvements</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-white/70" />
                  <span className="text-white font-bold">v{CURRENT_VERSION}</span>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm">{VERSION_DATE}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{CHANGELOG.length}</p>
                  <p className="text-xs text-white/60">Versions</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/30 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{changesByType.added}</p>
                  <p className="text-xs text-white/60">Features</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{changesByType.improved}</p>
                  <p className="text-xs text-white/60">Improvements</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/30 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{changesByType.fixed}</p>
                  <p className="text-xs text-white/60">Bug Fixes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card space-y-4"
      >
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search changes, features, fixes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-medium">Filter by type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'added', 'improved', 'changed', 'fixed', 'removed'] as const).map((type) => {
              const config = type === 'all' ? null : CHANGE_ICONS[type];
              const count = type === 'all' ? changesByType.total : changesByType[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filter === type
                      ? type === 'all' 
                        ? 'bg-[var(--color-accent)] text-white'
                        : `${config?.bg} ${config?.color}`
                      : 'bg-[var(--color-background)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {config && <config.icon className="w-3.5 h-3.5" />}
                  {type === 'all' ? 'All' : config?.label}
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg text-sm bg-[var(--color-background)] hover:bg-[var(--color-border)] transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg text-sm bg-[var(--color-background)] hover:bg-[var(--color-border)] transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
            <Search className="w-4 h-4" />
            Found {filteredChangelog.length} version{filteredChangelog.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-accent)] via-purple-500/50 to-transparent" />

        {/* Version Entries */}
        <div className="space-y-4">
          {filteredChangelog.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card text-center py-12"
            >
              <Search className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-[var(--color-text-muted)]">
                Try a different search term or clear the filter
              </p>
              <button
                onClick={() => { setSearchQuery(''); setFilter('all'); }}
                className="btn btn-secondary mt-4"
              >
                Clear filters
              </button>
            </motion.div>
          ) : filteredChangelog.map((entry, index) => {
            const isExpanded = expandedVersions.includes(entry.version);
            const filteredChanges = filterChanges(entry.changes);
            const isLatest = entry.version === CURRENT_VERSION;

            return (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-16"
              >
                {/* Timeline Dot */}
                <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-[var(--color-background)] shadow-lg ${
                  isLatest 
                    ? 'bg-gradient-to-r from-[var(--color-accent)] to-purple-500' 
                    : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                }`}>
                  {isLatest && (
                    <div className="absolute inset-0 rounded-full bg-[var(--color-accent)] animate-ping opacity-50" />
                  )}
                </div>

                {/* Version Card */}
                <div className={`card overflow-hidden transition-all ${isLatest ? 'ring-2 ring-[var(--color-accent)]/30' : ''}`}>
                  {/* Header */}
                  <button
                    onClick={() => toggleVersion(entry.version)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-background)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${VERSION_COLORS[entry.type]} shadow-lg`}>
                        v{entry.version}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold flex items-center gap-2">
                          {entry.title}
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Latest
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(entry.date).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                            entry.type === 'major' ? 'bg-red-500/20 text-red-400' :
                            entry.type === 'minor' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {entry.type}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1">
                        {entry.changes.slice(0, 3).map((change, i) => {
                          const config = CHANGE_ICONS[change.type];
                          return (
                            <div key={i} className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center`}>
                              <config.icon className={`w-3 h-3 ${config.color}`} />
                            </div>
                          );
                        })}
                        {entry.changes.length > 3 && (
                          <span className="text-xs text-[var(--color-text-muted)] ml-1">
                            +{entry.changes.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[var(--color-text-muted)] hidden md:block">
                        {filteredChanges.length} changes
                      </span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Changes List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[var(--color-border)] overflow-hidden"
                      >
                        {entry.description && (
                          <div className="px-4 py-3 bg-[var(--color-background)]/50 border-b border-[var(--color-border)]">
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {entry.description}
                            </p>
                          </div>
                        )}
                        <ul className="divide-y divide-[var(--color-border)]">
                          {filteredChanges.map((change, changeIndex) => {
                            const config = CHANGE_ICONS[change.type];
                            const Icon = config.icon;
                            return (
                              <motion.li
                                key={changeIndex}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: changeIndex * 0.03 }}
                                className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-background)]/50 transition-colors group"
                              >
                                <div className={`p-1.5 rounded-lg ${config.bg} group-hover:scale-110 transition-transform`}>
                                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm">{change.text}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                  {config.label}
                                </span>
                              </motion.li>
                            );
                          })}
                          {filteredChanges.length === 0 && (
                            <li className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No {filter} changes in this version
                            </li>
                          )}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card overflow-hidden"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/10 to-purple-500/10" />
          <div className="relative p-8 text-center">
            <Rocket className="w-16 h-16 mx-auto mb-4 text-[var(--color-accent)]" />
            <h3 className="text-2xl font-display font-bold mb-2">More Updates Coming Soon!</h3>
            <p className="text-[var(--color-text-muted)] max-w-lg mx-auto mb-6">
              Astra is constantly being improved with new features, bug fixes, and performance enhancements.
              Stay tuned for more exciting updates!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href={BOT_LINKS.supportServer} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn bg-[#5865F2] hover:bg-[#4752C4] text-white flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Join Discord
              </a>
              <a 
                href={BOT_LINKS.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn bg-[var(--color-surface)] hover:bg-[var(--color-border)] flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
