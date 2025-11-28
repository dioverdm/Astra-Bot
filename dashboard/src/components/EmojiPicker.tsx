// ===========================================
// ASTRA DASHBOARD - Emoji Picker Component
// ===========================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Search, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
// @ts-ignore - emojibase-data types
import emojis from 'emojibase-data/en/data.json';
// @ts-ignore - emojibase-data types
import groups from 'emojibase-data/meta/groups.json';

interface Emoji {
  emoji: string;
  label: string;
  tags?: string[];
  group: number;
}

interface ServerEmoji {
  id: string;
  name: string;
  animated: boolean;
  available: boolean;
}

interface EmojiPickerProps {
  guildId: string;
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

// Group names mapping
const GROUP_NAMES: Record<number, string> = {
  0: 'Smileys & Emotion',
  1: 'People & Body',
  2: 'Animals & Nature',
  3: 'Food & Drink',
  4: 'Travel & Places',
  5: 'Activities',
  6: 'Objects',
  7: 'Symbols',
  8: 'Flags',
};

// Group icons for tabs (using well-supported emojis)
const GROUP_ICONS: Record<number, string> = {
  0: '😊',
  1: '👋',
  2: '🐱',
  3: '🍕',
  4: '🚗',
  5: '⚽',
  6: '📦',
  7: '❤️',
  8: '🚩',
};

export default function EmojiPicker({ guildId, value, onChange, placeholder = 'Select emoji' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'server' | 'standard'>('standard');
  const [activeGroup, setActiveGroup] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cast emojis to proper type
  const allEmojis = emojis as Emoji[];

  // Fetch server emojis
  const { data: serverEmojis, isLoading } = useQuery({
    queryKey: ['guild-emojis', guildId],
    queryFn: async () => {
      try {
        const res = await api.get(`/guilds/${guildId}/discord-emojis`);
        return res.data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!guildId && isOpen,
  });

  // Group emojis by category
  const groupedEmojis = useMemo(() => {
    const grouped: Record<number, Emoji[]> = {};
    for (const emoji of allEmojis) {
      if (emoji.group !== undefined && emoji.group >= 0 && emoji.group <= 8) {
        if (!grouped[emoji.group]) grouped[emoji.group] = [];
        grouped[emoji.group].push(emoji);
      }
    }
    return grouped;
  }, [allEmojis]);

  // Filter emojis by search
  const filteredEmojis = useMemo(() => {
    if (!search) return groupedEmojis[activeGroup] || [];
    const searchLower = search.toLowerCase();
    return allEmojis.filter(e => 
      e.label?.toLowerCase().includes(searchLower) ||
      e.tags?.some(t => t.toLowerCase().includes(searchLower))
    ).slice(0, 100); // Limit search results
  }, [search, activeGroup, groupedEmojis, allEmojis]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter server emojis
  const filteredServerEmojis = (serverEmojis || []).filter((emoji: ServerEmoji) =>
    !search || emoji.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectEmoji = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
    setSearch('');
  };

  const handleSelectServerEmoji = (emoji: ServerEmoji) => {
    const formatted = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
    onChange(formatted);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input w-full flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className="text-2xl">{value || <Smile className="w-5 h-5 text-[var(--color-text-muted)]" />}</span>
        <span className="text-sm text-[var(--color-text-muted)]">{value ? 'Change' : placeholder}</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-50 top-full mt-2 left-0 w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]">
              <button
                onClick={() => setActiveTab('standard')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'standard'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setActiveTab('server')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'server'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Server ({(serverEmojis || []).length})
              </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-[var(--color-border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search emojis..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-full pl-9 pr-8 py-1.5 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-background)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs for Standard */}
            {activeTab === 'standard' && !search && (
              <div className="flex gap-1 p-2 border-b border-[var(--color-border)] overflow-x-auto">
                {Object.entries(GROUP_ICONS).map(([group, icon]) => (
                  <button
                    key={group}
                    onClick={() => setActiveGroup(Number(group))}
                    className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg transition-colors flex-shrink-0 ${
                      activeGroup === Number(group)
                        ? 'bg-[var(--color-accent)]/20'
                        : 'hover:bg-[var(--color-background)]'
                    }`}
                    title={GROUP_NAMES[Number(group)]}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="max-h-64 overflow-y-auto p-2">
              {activeTab === 'standard' ? (
                // Standard Emojis
                <div>
                  {!search && (
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 px-1">
                      {GROUP_NAMES[activeGroup]}
                    </p>
                  )}
                  {search && (
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 px-1">
                      Search results ({filteredEmojis.length})
                    </p>
                  )}
                  <div className="grid grid-cols-9 gap-1">
                    {filteredEmojis.map((emoji, i) => (
                      <button
                        key={`${emoji.emoji}-${i}`}
                        onClick={() => handleSelectEmoji(emoji.emoji)}
                        className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--color-background)] rounded-lg transition-colors"
                        title={emoji.label}
                      >
                        {emoji.emoji}
                      </button>
                    ))}
                  </div>
                  {filteredEmojis.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-[var(--color-text-muted)]">No emojis found</p>
                    </div>
                  )}
                </div>
              ) : (
                // Server Emojis
                <div>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
                    </div>
                  ) : filteredServerEmojis.length === 0 ? (
                    <div className="text-center py-8">
                      <Smile className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)]" />
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {search ? 'No emojis found' : 'No server emojis'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {filteredServerEmojis.map((emoji: ServerEmoji) => (
                        <button
                          key={emoji.id}
                          onClick={() => handleSelectServerEmoji(emoji)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-background)] rounded-lg transition-colors"
                          title={`:${emoji.name}:`}
                        >
                          <img
                            src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=32`}
                            alt={emoji.name}
                            className="w-7 h-7"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Select */}
            <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-background)]">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Frequently used:</p>
              <div className="flex gap-1">
                {['🎫', '❓', '🛠️', '💬', '🎮', '🛒', '📝', '🔧', '⭐', '✅'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelectEmoji(emoji)}
                    className="w-7 h-7 flex items-center justify-center text-lg hover:bg-[var(--color-surface)] rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
