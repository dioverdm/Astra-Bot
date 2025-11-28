// ===========================================
// ASTRA DASHBOARD - Role Select Component
// ===========================================

import { useGuildRoles, type Role } from '../hooks/useGuildData';

interface RoleSelectProps {
  guildId: string;
  value: string | undefined;
  onChange: (roleId: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  excludeEveryone?: boolean;
  excludeManaged?: boolean;
}

export default function RoleSelect({
  guildId,
  value,
  onChange,
  placeholder = 'Select a role',
  label,
  disabled = false,
  excludeEveryone = true,
  excludeManaged = false,
}: RoleSelectProps) {
  const { data: roles, isLoading } = useGuildRoles(guildId);
  
  // Filter roles
  const filteredRoles = roles?.filter((role: Role) => {
    if (excludeEveryone && role.name === '@everyone') return false;
    if (excludeManaged && role.managed) return false;
    return true;
  }) || [];

  // Sort by position (highest first)
  const sortedRoles = [...filteredRoles].sort((a: Role, b: Role) => b.position - a.position);

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
        {sortedRoles.map((role: Role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Multi-select Role Component
interface MultiRoleSelectProps {
  guildId: string;
  value: string[];
  onChange: (roleIds: string[]) => void;
  label?: string;
  disabled?: boolean;
  excludeEveryone?: boolean;
  excludeManaged?: boolean;
  max?: number;
}

export function MultiRoleSelect({
  guildId,
  value,
  onChange,
  label,
  disabled = false,
  excludeEveryone = true,
  excludeManaged = false,
  max,
}: MultiRoleSelectProps) {
  const { data: roles, isLoading } = useGuildRoles(guildId);
  
  // Filter roles
  const filteredRoles = roles?.filter((role: Role) => {
    if (excludeEveryone && role.name === '@everyone') return false;
    if (excludeManaged && role.managed) return false;
    return true;
  }) || [];

  // Sort by position (highest first)
  const sortedRoles = [...filteredRoles].sort((a: Role, b: Role) => b.position - a.position);

  const toggleRole = (roleId: string) => {
    if (value.includes(roleId)) {
      onChange(value.filter(id => id !== roleId));
    } else if (!max || value.length < max) {
      onChange([...value, roleId]);
    }
  };

  if (isLoading) {
    return (
      <div>
        {label && <label className="block text-sm font-medium mb-2">{label}</label>}
        <div className="animate-pulse bg-[var(--color-border)] h-20 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label} {max && <span className="text-[var(--color-text-muted)]">({value.length}/{max})</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] max-h-48 overflow-y-auto">
        {sortedRoles.map((role: Role) => {
          const isSelected = value.includes(role.id);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => !disabled && toggleRole(role.id)}
              disabled={disabled || (!isSelected && max !== undefined && value.length >= max)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-[var(--color-background)]'
                  : 'opacity-60 hover:opacity-100'
              } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                backgroundColor: role.color ? `${role.color}33` : 'var(--color-surface)',
                color: role.color ? String(role.color) : 'var(--color-text)',
                borderColor: role.color ? String(role.color) : 'var(--color-border)',
              }}
            >
              {role.name}
            </button>
          );
        })}
        {sortedRoles.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No roles available</p>
        )}
      </div>
    </div>
  );
}
