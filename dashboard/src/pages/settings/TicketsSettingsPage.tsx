import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Ticket, 
  Save, 
  Plus,
  Trash2,
  FolderOpen,
  MessageSquare,
  Users,
  Clock,
  Tag,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
import EmojiPicker from '../../components/EmojiPicker';

interface TicketPanel {
  id: string;
  name: string;
  description: string;
  emoji: string;
  buttonStyle: 'primary' | 'secondary' | 'success' | 'danger';
}

interface TicketsConfig {
  enabled: boolean;
  categoryId?: string;
  logChannelId?: string;
  transcriptChannelId?: string;
  supportRoleIds: string[];
  maxTicketsPerUser: number;
  welcomeMessage: string;
  autoCloseHours: number;
  namingFormat: string;
  panels: TicketPanel[];
  allowUserClose: boolean;
  requireReason: boolean;
  pingOnCreate: boolean;
}

const DEFAULT_PANELS: TicketPanel[] = [
  { id: 'general', name: 'General Support', description: 'General questions and help', emoji: '🎫', buttonStyle: 'primary' },
];

const BUTTON_STYLES = [
  { value: 'primary', label: 'Blue', color: 'bg-blue-500' },
  { value: 'secondary', label: 'Gray', color: 'bg-gray-500' },
  { value: 'success', label: 'Green', color: 'bg-green-500' },
  { value: 'danger', label: 'Red', color: 'bg-red-500' },
];

export default function TicketsSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<TicketsConfig>({
    enabled: false,
    categoryId: '',
    logChannelId: '',
    transcriptChannelId: '',
    supportRoleIds: [],
    maxTicketsPerUser: 1,
    welcomeMessage: 'Thank you for creating a ticket! Our support team will be with you shortly.',
    autoCloseHours: 0,
    namingFormat: 'ticket-{number}',
    panels: DEFAULT_PANELS,
    allowUserClose: true,
    requireReason: false,
    pingOnCreate: true,
  });

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'tickets'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.tickets || {};
    },
    enabled: !!guildId,
  });

  useEffect(() => {
    if (data) {
      setConfig(prev => ({ ...prev, ...data }));
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: TicketsConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/tickets`, newConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Ticket settings saved!');
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  // Add panel
  const addPanel = () => {
    const newPanel: TicketPanel = {
      id: `panel-${Date.now()}`,
      name: 'New Panel',
      description: 'Click to create a ticket',
      emoji: '🎫',
      buttonStyle: 'primary',
    };
    setConfig(prev => ({ ...prev, panels: [...prev.panels, newPanel] }));
  };

  // Update panel
  const updatePanel = (id: string, updates: Partial<TicketPanel>) => {
    setConfig(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  };

  // Delete panel
  const deletePanel = (id: string) => {
    setConfig(prev => ({
      ...prev,
      panels: prev.panels.filter(p => p.id !== id),
    }));
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Ticket System</h1>
            <p className="text-[var(--color-text-muted)]">Configure support ticket panels and settings</p>
          </div>
        </div>
        <button
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending}
          className="btn gradient-bg text-white flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Panels', value: config.panels.length, icon: Tag, color: 'purple' },
          { label: 'Max per User', value: config.maxTicketsPerUser, icon: Users, color: 'blue' },
          { label: 'Auto-Close', value: config.autoCloseHours ? `${config.autoCloseHours}h` : 'Off', icon: Clock, color: 'orange' },
          { label: 'Status', value: config.enabled ? 'Active' : 'Disabled', icon: config.enabled ? CheckCircle : AlertCircle, color: config.enabled ? 'green' : 'gray' },
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
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Enable Toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-semibold">Enable Ticket System</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Allow members to create support tickets</p>
            </div>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.enabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Channel Settings */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Channel Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[var(--color-text-muted)]" />
                  Ticket Category
                </label>
                <ChannelSelect
                  guildId={guildId!}
                  value={config.categoryId}
                  onChange={(channelId) => setConfig(prev => ({ ...prev, categoryId: channelId }))}
                  types={[4]}
                  placeholder="Select category..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)]" />
                  Log Channel
                </label>
                <ChannelSelect
                  guildId={guildId!}
                  value={config.logChannelId}
                  onChange={(channelId) => setConfig(prev => ({ ...prev, logChannelId: channelId }))}
                  placeholder="Select log channel..."
                />
              </div>
            </div>
          </div>

          {/* Ticket Panels */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Ticket Panels
              </h2>
              <button onClick={addPanel} className="btn btn-sm btn-secondary flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Panel
              </button>
            </div>
            
            <div className="space-y-3">
              {config.panels.map((panel) => (
                <div key={panel.id} className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Emoji</label>
                      <EmojiPicker
                        guildId={guildId!}
                        value={panel.emoji}
                        onChange={(emoji) => updatePanel(panel.id, { emoji })}
                        placeholder="Pick emoji"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Name</label>
                      <input
                        type="text"
                        value={panel.name}
                        onChange={(e) => updatePanel(panel.id, { name: e.target.value })}
                        className="input w-full"
                        placeholder="Panel name"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <select
                        value={panel.buttonStyle}
                        onChange={(e) => updatePanel(panel.id, { buttonStyle: e.target.value as any })}
                        className="input flex-1"
                      >
                        {BUTTON_STYLES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deletePanel(panel.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        disabled={config.panels.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Description</label>
                    <input
                      type="text"
                      value={panel.description}
                      onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                      className="input w-full"
                      placeholder="Button description"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Behavior Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Tickets per User</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.maxTicketsPerUser}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTicketsPerUser: parseInt(e.target.value) || 1 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Auto-Close (hours, 0 = off)</label>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={config.autoCloseHours}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoCloseHours: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Naming Format</label>
                <input
                  type="text"
                  value={config.namingFormat}
                  onChange={(e) => setConfig(prev => ({ ...prev, namingFormat: e.target.value }))}
                  className="input w-full font-mono text-sm"
                  placeholder="ticket-{number}"
                />
              </div>
            </div>

            {/* Toggle Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
              {[
                { key: 'allowUserClose', label: 'Allow Users to Close', desc: 'Let users close their own tickets' },
                { key: 'requireReason', label: 'Require Reason', desc: 'Require a reason when creating' },
                { key: 'pingOnCreate', label: 'Ping Support', desc: 'Ping support roles on new tickets' },
              ].map((option) => (
                <div key={option.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{option.desc}</p>
                  </div>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, [option.key]: !prev[option.key as keyof TicketsConfig] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      config[option.key as keyof TicketsConfig] ? 'bg-green-500' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config[option.key as keyof TicketsConfig] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Welcome Message
            </h2>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="input w-full h-32 resize-none"
              placeholder="Thank you for creating a ticket!"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              This message is sent when a new ticket is created. Use {'{user}'} to mention the user.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
