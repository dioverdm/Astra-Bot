// ===========================================
// ASTRA DASHBOARD - Embed Builder Component
// ===========================================

import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Image, 
  Type, 
  AlignLeft, 
  Palette,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  thumbnail?: string;
  image?: string;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  author?: {
    name: string;
    iconUrl?: string;
    url?: string;
  };
  fields: EmbedField[];
  timestamp?: boolean;
}

interface EmbedBuilderProps {
  value: EmbedData;
  onChange: (embed: EmbedData) => void;
  variables?: { key: string; description: string }[];
}

const DEFAULT_EMBED: EmbedData = {
  title: '',
  description: '',
  color: '#5865F2',
  fields: [],
  timestamp: false,
};

const PRESET_COLORS = [
  { name: 'Discord Blurple', value: '#5865F2' },
  { name: 'Green', value: '#57F287' },
  { name: 'Yellow', value: '#FEE75C' },
  { name: 'Red', value: '#ED4245' },
  { name: 'Pink', value: '#EB459E' },
  { name: 'Purple', value: '#9B59B6' },
  { name: 'Orange', value: '#E67E22' },
  { name: 'Cyan', value: '#1ABC9C' },
];

export default function EmbedBuilder({ value, onChange, variables = [] }: EmbedBuilderProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    author: false,
    body: true,
    images: false,
    footer: false,
    fields: false,
  });

  const embed = { ...DEFAULT_EMBED, ...value };

  const updateEmbed = (updates: Partial<EmbedData>) => {
    onChange({ ...embed, ...updates });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addField = () => {
    updateEmbed({
      fields: [...embed.fields, { name: 'Field Name', value: 'Field Value', inline: false }],
    });
  };

  const updateField = (index: number, updates: Partial<EmbedField>) => {
    const newFields = [...embed.fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateEmbed({ fields: newFields });
  };

  const removeField = (index: number) => {
    updateEmbed({ fields: embed.fields.filter((_, i) => i !== index) });
  };

  const Section = ({ 
    title, 
    section, 
    children 
  }: { 
    title: string; 
    section: keyof typeof expandedSections; 
    children: React.ReactNode;
  }) => (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[var(--color-background)] hover:bg-[var(--color-border)] transition-colors"
      >
        <span className="font-medium">{title}</span>
        {expandedSections[section] ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {expandedSections[section] && (
        <div className="p-4 space-y-4 bg-[var(--color-surface)]">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Type className="w-4 h-4" />
            Embed Editor
          </h3>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary text-sm flex items-center gap-2 lg:hidden"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        {/* Variables Info */}
        {variables.length > 0 && (
          <div className="p-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
            <p className="text-sm font-medium mb-2">Available Variables:</p>
            <div className="flex flex-wrap gap-2">
              {variables.map(v => (
                <code key={v.key} className="px-2 py-1 rounded bg-[var(--color-background)] text-xs" title={v.description}>
                  {v.key}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Author Section */}
        <Section title="Author" section="author">
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Author Name</label>
              <input
                type="text"
                value={embed.author?.name || ''}
                onChange={(e) => updateEmbed({ author: { ...embed.author, name: e.target.value } as EmbedData['author'] })}
                className="input w-full"
                placeholder="Author name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Icon URL</label>
                <input
                  type="url"
                  value={embed.author?.iconUrl || ''}
                  onChange={(e) => updateEmbed({ author: { ...embed.author, iconUrl: e.target.value } as EmbedData['author'] })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1">URL</label>
                <input
                  type="url"
                  value={embed.author?.url || ''}
                  onChange={(e) => updateEmbed({ author: { ...embed.author, url: e.target.value } as EmbedData['author'] })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Body Section */}
        <Section title="Body" section="body">
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input
                type="text"
                value={embed.title || ''}
                onChange={(e) => updateEmbed({ title: e.target.value })}
                className="input w-full"
                placeholder="Embed title"
                maxLength={256}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea
                value={embed.description || ''}
                onChange={(e) => updateEmbed({ description: e.target.value })}
                className="input w-full h-32 resize-none"
                placeholder="Embed description (supports markdown)"
                maxLength={4096}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={embed.color || '#5865F2'}
                  onChange={(e) => updateEmbed({ color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateEmbed({ color: c.value })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        embed.color === c.value ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Images Section */}
        <Section title="Images" section="images">
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Thumbnail URL
              </label>
              <input
                type="url"
                value={embed.thumbnail || ''}
                onChange={(e) => updateEmbed({ thumbnail: e.target.value })}
                className="input w-full"
                placeholder="https://... (small image on right)"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Image URL
              </label>
              <input
                type="url"
                value={embed.image || ''}
                onChange={(e) => updateEmbed({ image: e.target.value })}
                className="input w-full"
                placeholder="https://... (large image at bottom)"
              />
            </div>
          </div>
        </Section>

        {/* Footer Section */}
        <Section title="Footer" section="footer">
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Footer Text</label>
              <input
                type="text"
                value={embed.footer?.text || ''}
                onChange={(e) => updateEmbed({ footer: { ...embed.footer, text: e.target.value } as EmbedData['footer'] })}
                className="input w-full"
                placeholder="Footer text"
                maxLength={2048}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Footer Icon URL</label>
              <input
                type="url"
                value={embed.footer?.iconUrl || ''}
                onChange={(e) => updateEmbed({ footer: { ...embed.footer, iconUrl: e.target.value } as EmbedData['footer'] })}
                className="input w-full"
                placeholder="https://..."
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={embed.timestamp || false}
                onChange={(e) => updateEmbed({ timestamp: e.target.checked })}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm">Show timestamp</span>
            </label>
          </div>
        </Section>

        {/* Fields Section */}
        <Section title={`Fields (${embed.fields.length}/25)`} section="fields">
          <div className="space-y-3">
            {embed.fields.map((field, index) => (
              <div key={index} className="p-3 rounded-lg bg-[var(--color-background)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Field {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  className="input w-full"
                  placeholder="Field name"
                  maxLength={256}
                />
                <textarea
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Field value"
                  maxLength={1024}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.inline}
                    onChange={(e) => updateField(index, { inline: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-accent)]"
                  />
                  <span className="text-sm">Inline</span>
                </label>
              </div>
            ))}
            {embed.fields.length < 25 && (
              <button
                type="button"
                onClick={addField}
                className="w-full py-2 border-2 border-dashed border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            )}
          </div>
        </Section>
      </div>

      {/* Preview */}
      <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
        <div className="sticky top-4">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4" />
            Preview
          </h3>
          <EmbedPreview embed={embed} />
        </div>
      </div>
    </div>
  );
}

// Embed Preview Component
function EmbedPreview({ embed }: { embed: EmbedData }) {
  const hasContent = embed.title || embed.description || embed.author?.name || 
                     embed.footer?.text || embed.fields.length > 0 || 
                     embed.thumbnail || embed.image;

  if (!hasContent) {
    return (
      <div className="p-8 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-center text-[var(--color-text-muted)]">
        <AlignLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Start editing to see preview</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#2f3136] p-4 overflow-hidden">
      {/* Discord-style embed */}
      <div 
        className="rounded-l-[4px] pl-3 border-l-4"
        style={{ borderColor: embed.color || '#5865F2' }}
      >
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {/* Author */}
            {embed.author?.name && (
              <div className="flex items-center gap-2 mb-2">
                {embed.author.iconUrl && (
                  <img src={embed.author.iconUrl} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-sm font-medium text-white">
                  {embed.author.url ? (
                    <a href={embed.author.url} className="hover:underline">{embed.author.name}</a>
                  ) : embed.author.name}
                </span>
              </div>
            )}

            {/* Title */}
            {embed.title && (
              <div className="font-semibold text-white mb-1">{embed.title}</div>
            )}

            {/* Description */}
            {embed.description && (
              <div className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
                {embed.description}
              </div>
            )}

            {/* Fields */}
            {embed.fields.length > 0 && (
              <div className="grid gap-2 mt-2" style={{ 
                gridTemplateColumns: embed.fields.some(f => f.inline) 
                  ? 'repeat(auto-fill, minmax(150px, 1fr))' 
                  : '1fr' 
              }}>
                {embed.fields.map((field, i) => (
                  <div key={i} className={field.inline ? '' : 'col-span-full'}>
                    <div className="text-xs font-semibold text-white">{field.name}</div>
                    <div className="text-sm text-gray-300">{field.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Image */}
            {embed.image && (
              <img 
                src={embed.image} 
                alt="" 
                className="rounded mt-3 max-w-full max-h-64 object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {/* Thumbnail */}
          {embed.thumbnail && (
            <img 
              src={embed.thumbnail} 
              alt="" 
              className="w-20 h-20 rounded object-cover flex-shrink-0"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>

        {/* Footer */}
        {(embed.footer?.text || embed.timestamp) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            {embed.footer?.iconUrl && (
              <img src={embed.footer.iconUrl} alt="" className="w-5 h-5 rounded-full" />
            )}
            <span>
              {embed.footer?.text}
              {embed.footer?.text && embed.timestamp && ' • '}
              {embed.timestamp && new Date().toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export { EmbedPreview };
