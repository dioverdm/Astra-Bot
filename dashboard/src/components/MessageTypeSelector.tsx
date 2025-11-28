// ===========================================
// ASTRA DASHBOARD - Message Type Selector
// ===========================================

import { MessageSquare, Layout, Layers } from 'lucide-react';

export type MessageType = 'message' | 'embed' | 'both';

interface MessageTypeSelectorProps {
  value: MessageType;
  onChange: (type: MessageType) => void;
  className?: string;
}

const OPTIONS: { value: MessageType; label: string; icon: React.ElementType; description: string }[] = [
  { 
    value: 'message', 
    label: 'Text Only', 
    icon: MessageSquare, 
    description: 'Simple text message' 
  },
  { 
    value: 'embed', 
    label: 'Embed Only', 
    icon: Layout, 
    description: 'Rich embed with colors & fields' 
  },
  { 
    value: 'both', 
    label: 'Text + Embed', 
    icon: Layers, 
    description: 'Message with embed attached' 
  },
];

export default function MessageTypeSelector({ value, onChange, className = '' }: MessageTypeSelectorProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              isSelected 
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' 
                : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
            }`}
          >
            <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-[var(--color-accent)]' : ''}`} />
            <div className="font-medium">{option.label}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{option.description}</div>
          </button>
        );
      })}
    </div>
  );
}
