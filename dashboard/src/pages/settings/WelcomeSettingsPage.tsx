import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Save, 
  UserMinus,
  Hash,
  Mail,
  Info,
  Wand2,
  Image,
  Type,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import ChannelSelect from '../../components/ChannelSelect';
import MessageTypeSelector, { type MessageType } from '../../components/MessageTypeSelector';
import EmbedBuilder, { type EmbedData } from '../../components/EmbedBuilder';

type WelcomeTab = 'welcome' | 'goodbye' | 'dm';

interface WelcomeConfig {
  enabled: boolean;
  channelId?: string;
  messageType: MessageType;
  message: string;
  embed: EmbedData;
  // Goodbye settings
  goodbyeEnabled: boolean;
  goodbyeChannelId?: string;
  goodbyeMessageType: MessageType;
  goodbyeMessage: string;
  goodbyeEmbed: EmbedData;
  // DM settings
  dmEnabled: boolean;
  dmMessageType: MessageType;
  dmMessage: string;
  dmEmbed: EmbedData;
}

const DEFAULT_EMBED: EmbedData = {
  title: 'Welcome to {server}!',
  description: 'Hey {user}, welcome to our community! 🎉\n\nWe now have {memberCount} members!',
  color: '#57F287',
  fields: [],
  timestamp: true,
};

const DEFAULT_GOODBYE_EMBED: EmbedData = {
  title: 'Goodbye!',
  description: '{username} has left the server. 👋\n\nWe now have {memberCount} members.',
  color: '#ED4245',
  fields: [],
  timestamp: true,
};

const WELCOME_VARIABLES = [
  { key: '{user}', description: 'Mentions the user' },
  { key: '{username}', description: 'User display name' },
  { key: '{tag}', description: 'User tag (e.g. User#1234)' },
  { key: '{server}', description: 'Server name' },
  { key: '{memberCount}', description: 'Total member count' },
  { key: '{avatar}', description: 'User avatar URL' },
  { key: '{joinDate}', description: 'When user joined' },
];

export default function WelcomeSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<WelcomeTab>('welcome');
  const [config, setConfig] = useState<WelcomeConfig>({
    enabled: false,
    channelId: '',
    messageType: 'both',
    message: 'Welcome {user} to {server}! 🎉',
    embed: { ...DEFAULT_EMBED },
    // Goodbye defaults
    goodbyeEnabled: false,
    goodbyeChannelId: '',
    goodbyeMessageType: 'embed',
    goodbyeMessage: 'Goodbye {username}! 👋',
    goodbyeEmbed: { ...DEFAULT_GOODBYE_EMBED },
    // DM defaults
    dmEnabled: false,
    dmMessageType: 'message',
    dmMessage: 'Welcome to {server}!',
    dmEmbed: { ...DEFAULT_EMBED },
  });

  // Fetch current config
  const { data, isLoading } = useQuery({
    queryKey: ['guild-config', guildId, 'welcome'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.welcome || {};
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
    mutationFn: async (newConfig: WelcomeConfig) => {
      const res = await api.patch(`/guilds/${guildId}/modules/welcome`, newConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Welcome settings saved!');
      queryClient.invalidateQueries({ queryKey: ['guild-config', guildId] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  // Tabs config
  const tabs = [
    { id: 'welcome' as WelcomeTab, label: 'Welcome', icon: UserPlus, color: 'green', enabled: config.enabled },
    { id: 'goodbye' as WelcomeTab, label: 'Goodbye', icon: UserMinus, color: 'red', enabled: config.goodbyeEnabled },
    { id: 'dm' as WelcomeTab, label: 'DM Message', icon: Mail, color: 'blue', enabled: config.dmEnabled },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Welcome & Goodbye</h1>
            <p className="text-[var(--color-text-muted)]">Configure member join and leave messages</p>
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

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`card p-4 text-left transition-all ${
              activeTab === tab.id ? 'ring-2 ring-[var(--color-accent)]' : ''
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${tab.color}-500/20`}>
                  <tab.icon className={`w-5 h-5 text-${tab.color}-400`} />
                </div>
                <div>
                  <h3 className="font-semibold">{tab.label}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {tab.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${tab.enabled ? 'bg-green-400' : 'bg-[var(--color-border)]'}`} />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Variables Reference */}
      <div className="card bg-[var(--color-accent)]/5 border-[var(--color-accent)]/20">
        <div className="flex items-start gap-3">
          <Wand2 className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[var(--color-accent)]">Available Variables</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {WELCOME_VARIABLES.map(v => (
                <span 
                  key={v.key} 
                  className="px-2 py-1 rounded-lg bg-[var(--color-background)] text-xs font-mono cursor-help"
                  title={v.description}
                >
                  {v.key}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Enable Toggle */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-green-400" />
                  <div>
                    <h3 className="font-semibold">Enable Welcome Messages</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Greet new members when they join</p>
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
                <div className="card space-y-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <h3 className="font-semibold">Welcome Channel</h3>
                  </div>
                  <ChannelSelect
                    guildId={guildId!}
                    value={config.channelId}
                    onChange={(channelId) => setConfig(prev => ({ ...prev, channelId }))}
                    placeholder="Select a channel..."
                  />
                </div>

                <div className="card space-y-4">
                  <h3 className="font-semibold">Message Format</h3>
                  <MessageTypeSelector
                    value={config.messageType}
                    onChange={(messageType) => setConfig(prev => ({ ...prev, messageType }))}
                  />
                </div>

                {(config.messageType === 'message' || config.messageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">Text Message</h3>
                    </div>
                    <textarea
                      value={config.message}
                      onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Welcome {user} to {server}! 🎉"
                    />
                  </div>
                )}

                {(config.messageType === 'embed' || config.messageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">Welcome Embed</h3>
                    </div>
                    <EmbedBuilder
                      value={config.embed}
                      onChange={(embed) => setConfig(prev => ({ ...prev, embed }))}
                      variables={WELCOME_VARIABLES}
                    />
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Goodbye Tab */}
        {activeTab === 'goodbye' && (
          <motion.div
            key="goodbye"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserMinus className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="font-semibold">Enable Goodbye Messages</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Send a message when members leave</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, goodbyeEnabled: !prev.goodbyeEnabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.goodbyeEnabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    config.goodbyeEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {config.goodbyeEnabled && (
              <>
                <div className="card space-y-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <h3 className="font-semibold">Goodbye Channel</h3>
                  </div>
                  <ChannelSelect
                    guildId={guildId!}
                    value={config.goodbyeChannelId}
                    onChange={(channelId) => setConfig(prev => ({ ...prev, goodbyeChannelId: channelId }))}
                    placeholder="Select a channel..."
                  />
                </div>

                <div className="card space-y-4">
                  <h3 className="font-semibold">Message Format</h3>
                  <MessageTypeSelector
                    value={config.goodbyeMessageType}
                    onChange={(messageType) => setConfig(prev => ({ ...prev, goodbyeMessageType: messageType }))}
                  />
                </div>

                {(config.goodbyeMessageType === 'message' || config.goodbyeMessageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">Text Message</h3>
                    </div>
                    <textarea
                      value={config.goodbyeMessage}
                      onChange={(e) => setConfig(prev => ({ ...prev, goodbyeMessage: e.target.value }))}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Goodbye {username}! 👋"
                    />
                  </div>
                )}

                {(config.goodbyeMessageType === 'embed' || config.goodbyeMessageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">Goodbye Embed</h3>
                    </div>
                    <EmbedBuilder
                      value={config.goodbyeEmbed}
                      onChange={(embed) => setConfig(prev => ({ ...prev, goodbyeEmbed: embed }))}
                      variables={WELCOME_VARIABLES}
                    />
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* DM Tab */}
        {activeTab === 'dm' && (
          <motion.div
            key="dm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-semibold">Send DM to New Members</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Send a private message when they join</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, dmEnabled: !prev.dmEnabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.dmEnabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    config.dmEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* DM Warning */}
            <div className="card bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  DMs may not be delivered if users have DMs disabled for the server.
                </p>
              </div>
            </div>

            {config.dmEnabled && (
              <>
                <div className="card space-y-4">
                  <h3 className="font-semibold">DM Message Format</h3>
                  <MessageTypeSelector
                    value={config.dmMessageType}
                    onChange={(dmMessageType) => setConfig(prev => ({ ...prev, dmMessageType }))}
                  />
                </div>

                {(config.dmMessageType === 'message' || config.dmMessageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">DM Text Message</h3>
                    </div>
                    <textarea
                      value={config.dmMessage}
                      onChange={(e) => setConfig(prev => ({ ...prev, dmMessage: e.target.value }))}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Welcome to {server}!"
                    />
                  </div>
                )}

                {(config.dmMessageType === 'embed' || config.dmMessageType === 'both') && (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <h3 className="font-semibold">DM Welcome Embed</h3>
                    </div>
                    <EmbedBuilder
                      value={config.dmEmbed}
                      onChange={(dmEmbed) => setConfig(prev => ({ ...prev, dmEmbed }))}
                      variables={WELCOME_VARIABLES}
                    />
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
