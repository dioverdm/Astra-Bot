// ===========================================
// ASTRA DASHBOARD - Custom Commands Page
// ===========================================

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Plus, 
  Trash2, 
  Save,
  Edit2,
  X,
  Check,
  Code,
  MessageSquare,
  AlertCircle,
  Search,
  Zap,
  Clock,
  ToggleLeft,
  ToggleRight,
  Copy,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import EmbedBuilder from '../../components/EmbedBuilder';

const DEFAULT_EMBED = {
  title: '',
  description: '',
  color: '#8b5cf6',
  fields: [],
};

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  response: string;
  embedResponse?: any;
  useEmbed: boolean;
  enabled: boolean;
  cooldown: number;
  allowedRoles?: string[];
  allowedChannels?: string[];
}

const DEFAULT_COMMAND: Omit<CustomCommand, 'id'> = {
  name: '',
  description: '',
  response: 'Hello {user}!',
  useEmbed: false,
  enabled: true,
  cooldown: 0,
};

const VARIABLES = [
  { var: '{user}', desc: 'Mentions the user' },
  { var: '{username}', desc: 'Username without mention' },
  { var: '{server}', desc: 'Server name' },
  { var: '{members}', desc: 'Member count' },
  { var: '{channel}', desc: 'Channel name' },
];

export default function CustomCommandsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch custom commands
  const { data, isLoading } = useQuery({
    queryKey: ['custom-commands', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.customCommands || [];
    },
    enabled: !!guildId,
  });

  useEffect(() => {
    if (data) {
      setCommands(data.map((cmd: any, i: number) => ({
        ...cmd,
        id: cmd.id || `cmd-${i}`,
      })));
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newCommands: CustomCommand[]) => {
      const res = await api.patch(`/guilds/${guildId}`, {
        customCommands: newCommands,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Commands saved!');
      queryClient.invalidateQueries({ queryKey: ['custom-commands', guildId] });
    },
    onError: () => {
      toast.error('Failed to save commands');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(commands);
  };

  const addCommand = () => {
    const newCommand: CustomCommand = {
      ...DEFAULT_COMMAND,
      id: `cmd-${Date.now()}`,
    };
    setEditingCommand(newCommand);
    setIsCreating(true);
  };

  const saveCommand = (cmd: CustomCommand) => {
    if (!cmd.name.trim()) {
      toast.error('Command name is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cmd.name)) {
      toast.error('Command name can only contain lowercase letters, numbers, and hyphens');
      return;
    }
    if (commands.some(c => c.name === cmd.name && c.id !== cmd.id)) {
      toast.error('A command with this name already exists');
      return;
    }

    if (isCreating) {
      setCommands([...commands, cmd]);
    } else {
      setCommands(commands.map(c => c.id === cmd.id ? cmd : c));
    }
    setEditingCommand(null);
    setIsCreating(false);
  };

  const deleteCommand = (id: string) => {
    setCommands(commands.filter(c => c.id !== id));
  };

  const toggleCommand = (id: string) => {
    setCommands(commands.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  // Filter commands
  const filteredCommands = useMemo(() => {
    return commands.filter(cmd => {
      // Search filter
      if (searchQuery && !cmd.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filterStatus === 'active' && !cmd.enabled) return false;
      if (filterStatus === 'disabled' && cmd.enabled) return false;
      return true;
    });
  }, [commands, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: commands.length,
    active: commands.filter(c => c.enabled).length,
    disabled: commands.filter(c => !c.enabled).length,
    withCooldown: commands.filter(c => c.cooldown > 0).length,
  }), [commands]);

  // Copy command
  const copyCommand = (name: string) => {
    navigator.clipboard.writeText(`/${name}`);
    setCopiedId(name);
    toast.success('Command copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Custom Commands</h1>
            <p className="text-[var(--color-text-muted)]">Create custom slash commands for your server</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addCommand}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Command
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn gradient-bg text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Terminal, color: 'blue' },
          { label: 'Active', value: stats.active, icon: Zap, color: 'green' },
          { label: 'Disabled', value: stats.disabled, icon: AlertCircle, color: 'gray' },
          { label: 'With Cooldown', value: stats.withCooldown, icon: Clock, color: 'orange' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-500/20`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      {commands.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'disabled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variables Help */}
      <div className="card bg-[var(--color-accent)]/5 border-[var(--color-accent)]/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[var(--color-accent)]">Available Variables</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {VARIABLES.map((v) => (
                <span key={v.var} className="px-2 py-1 rounded-lg bg-[var(--color-background)] text-xs font-mono cursor-help" title={v.desc}>
                  {v.var}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Commands List */}
      {commands.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <Code className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Custom Commands</h3>
          <p className="text-[var(--color-text-muted)] mb-4">
            Create your own slash commands with custom responses
          </p>
          <button onClick={addCommand} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create First Command
          </button>
        </div>
      ) : filteredCommands.length === 0 ? (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">No commands match your search</p>
          <button 
            onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} 
            className="text-[var(--color-accent)] text-sm mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredCommands.map((cmd) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`card ${!cmd.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">/{cmd.name}</span>
                        {cmd.useEmbed && (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                            Embed
                          </span>
                        )}
                        {cmd.cooldown > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                            {cmd.cooldown}s CD
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">{cmd.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCommand(cmd.name)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      title="Copy command"
                    >
                      {copiedId === cmd.name ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleCommand(cmd.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        cmd.enabled 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {cmd.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {cmd.enabled ? 'Active' : 'Off'}
                    </button>
                    <button
                      onClick={() => { setEditingCommand(cmd); setIsCreating(false); }}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      title="Edit command"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCommand(cmd.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete command"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preview Response */}
                <div className="mt-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-1 text-xs text-[var(--color-text-muted)]">
                    <MessageSquare className="w-3 h-3" />
                    Response Preview
                  </div>
                  <p className="text-sm line-clamp-2">
                    {cmd.useEmbed ? '(Embed Response)' : cmd.response}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCommand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setEditingCommand(null); setIsCreating(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {isCreating ? 'Create Command' : 'Edit Command'}
                </h2>
                <button
                  onClick={() => { setEditingCommand(null); setIsCreating(false); }}
                  className="p-2 rounded-lg hover:bg-[var(--color-surface)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Command Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Command Name *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-lg text-[var(--color-text-muted)]">/</span>
                    <input
                      type="text"
                      value={editingCommand.name}
                      onChange={(e) => setEditingCommand({ ...editingCommand, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="input flex-1 rounded-l-none font-mono"
                      placeholder="command-name"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={editingCommand.description}
                    onChange={(e) => setEditingCommand({ ...editingCommand, description: e.target.value })}
                    className="input w-full"
                    placeholder="What does this command do?"
                    maxLength={100}
                  />
                </div>

                {/* Response Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Response Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCommand({ ...editingCommand, useEmbed: false })}
                      className={`flex-1 p-3 rounded-xl border transition-all ${
                        !editingCommand.useEmbed
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm">Text Message</div>
                    </button>
                    <button
                      onClick={() => setEditingCommand({ 
                        ...editingCommand, 
                        useEmbed: true,
                        embedResponse: editingCommand.embedResponse || DEFAULT_EMBED,
                      })}
                      className={`flex-1 p-3 rounded-xl border transition-all ${
                        editingCommand.useEmbed
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      <Code className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm">Embed</div>
                    </button>
                  </div>
                </div>

                {/* Response Content */}
                {!editingCommand.useEmbed ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Response Message</label>
                    <textarea
                      value={editingCommand.response}
                      onChange={(e) => setEditingCommand({ ...editingCommand, response: e.target.value })}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Hello {user}! Welcome to {server}!"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Embed Response</label>
                    <EmbedBuilder
                      value={editingCommand.embedResponse || DEFAULT_EMBED}
                      onChange={(embed) => setEditingCommand({ ...editingCommand, embedResponse: embed })}
                      variables={VARIABLES.map(v => ({ key: v.var, description: v.desc }))}
                    />
                  </div>
                )}

                {/* Cooldown */}
                <div>
                  <label className="block text-sm font-medium mb-2">Cooldown (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={editingCommand.cooldown}
                    onChange={(e) => setEditingCommand({ ...editingCommand, cooldown: parseInt(e.target.value) || 0 })}
                    className="input w-32"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => { setEditingCommand(null); setIsCreating(false); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveCommand(editingCommand)}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {isCreating ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
