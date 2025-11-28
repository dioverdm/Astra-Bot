// ===========================================
// ASTRA DASHBOARD - Channel Select Component
// ===========================================

import { useGuildChannels, type Channel } from '../hooks/useGuildData';

interface ChannelSelectProps {
  guildId: string;
  value: string | undefined;
  onChange: (channelId: string) => void;
  types?: number[]; // Filter by channel types (0=text, 2=voice, 4=category, 5=announcement)
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function ChannelSelect({
  guildId,
  value,
  onChange,
  types = [0, 5], // Default to text and announcement channels
  placeholder = 'Select a channel',
  label,
  disabled = false,
}: ChannelSelectProps) {
  const { data: channels, isLoading } = useGuildChannels(guildId);
  
  // Filter channels by type
  const filteredChannels = channels?.filter((c: Channel) => types.includes(c.type)) || [];
  
  // Group by category
  const categories = channels?.filter((c: Channel) => c.type === 4) || [];
  const channelsByCategory = new Map<string | null, Channel[]>();
  
  filteredChannels.forEach((channel: Channel) => {
    const key = channel.parentId;
    if (!channelsByCategory.has(key)) {
      channelsByCategory.set(key, []);
    }
    channelsByCategory.get(key)!.push(channel);
  });

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2">{label}</label>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="input w-full"
      >
        <option value="">{isLoading ? 'Loading...' : placeholder}</option>
        
        {/* Channels without category */}
        {channelsByCategory.get(null)?.map((channel: Channel) => (
          <option key={channel.id} value={channel.id}>
            # {channel.name}
          </option>
        ))}
        
        {/* Channels grouped by category */}
        {categories.map((category: Channel) => {
          const categoryChannels = channelsByCategory.get(category.id);
          if (!categoryChannels?.length) return null;
          
          return (
            <optgroup key={category.id} label={category.name}>
              {categoryChannels.map((channel: Channel) => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
