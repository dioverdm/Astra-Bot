// ===========================================
// ASTRA DASHBOARD - Toggle Switch Component
// ===========================================

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function Toggle({ enabled, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div>
          {label && <h3 className="font-semibold">{label}</h3>}
          {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-500' : 'bg-[var(--color-border)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
