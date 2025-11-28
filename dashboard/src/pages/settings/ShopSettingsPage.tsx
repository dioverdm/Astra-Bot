// ===========================================
// ASTRA DASHBOARD - Shop Settings Page
// ===========================================

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Save,
  Package,
  Coins,
  Edit2,
  X,
  Check,
  Search,
  Copy,
  Clock,
  Users,
  Zap,
  Crown,
  Gift,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import RoleSelect from '../../components/RoleSelect';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'role' | 'item' | 'boost' | 'lootbox' | 'badge';
  roleId?: string;
  emoji?: string;
  stock?: number;
  maxPerUser?: number;
  enabled: boolean;
  // New fields
  duration?: number; // For temporary items (seconds)
  boostMultiplier?: number; // For XP boosts
  boostType?: 'xp' | 'coins' | 'both';
  requiredLevel?: number;
  requiredRole?: string;
  category?: string;
  featured?: boolean;
  salePrice?: number;
  saleEnds?: string;
}

const ITEM_TYPES = [
  { value: 'role', label: 'Role', icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/20', description: 'Grants a role when purchased' },
  { value: 'item', label: 'Collectible', icon: Gift, color: 'text-blue-400', bg: 'bg-blue-500/20', description: 'Virtual item for collection' },
  { value: 'boost', label: 'XP Boost', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', description: 'Temporary XP/coin multiplier' },
  { value: 'lootbox', label: 'Lootbox', icon: Package, color: 'text-pink-400', bg: 'bg-pink-500/20', description: 'Random rewards when opened' },
  { value: 'badge', label: 'Badge', icon: Sparkles, color: 'text-green-400', bg: 'bg-green-500/20', description: 'Profile badge/achievement' },
];

const BOOST_TYPES = [
  { value: 'xp', label: 'XP Only', icon: TrendingUp },
  { value: 'coins', label: 'Coins Only', icon: Coins },
  { value: 'both', label: 'XP & Coins', icon: Zap },
];

const DEFAULT_ITEM: Omit<ShopItem, 'id'> = {
  name: '',
  description: '',
  price: 100,
  type: 'item',
  emoji: '🎁',
  enabled: true,
  category: 'general',
};

type SortOption = 'name' | 'price' | 'type' | 'stock';

export default function ShopSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Fetch shop items
  const { data, isLoading } = useQuery({
    queryKey: ['shop-items', guildId],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.data?.economy?.shopItems || [];
    },
    enabled: !!guildId,
  });

  // Update local state when data loads
  useEffect(() => {
    if (data) {
      setItems(data.map((item: any, i: number) => ({
        ...item,
        id: item.id || `item-${i}`,
      })));
    }
  }, [data]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'stock':
          comparison = (a.stock || Infinity) - (b.stock || Infinity);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
    
    return result;
  }, [items, searchQuery, filterType, sortBy, sortAsc]);

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.enabled).length,
    outOfStock: items.filter(i => i.stock === 0).length,
    featured: items.filter(i => i.featured).length,
  }), [items]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newItems: ShopItem[]) => {
      const res = await api.patch(`/guilds/${guildId}/modules/economy`, {
        shopItems: newItems,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Shop items saved!');
      queryClient.invalidateQueries({ queryKey: ['shop-items', guildId] });
    },
    onError: () => {
      toast.error('Failed to save shop items');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(items);
  };

  const addItem = () => {
    const newItem: ShopItem = {
      ...DEFAULT_ITEM,
      id: `item-${Date.now()}`,
    };
    setEditingItem(newItem);
    setIsCreating(true);
  };

  const saveItem = (item: ShopItem) => {
    if (!item.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (item.price < 0) {
      toast.error('Price must be positive');
      return;
    }

    if (isCreating) {
      setItems([...items, item]);
    } else {
      setItems(items.map(i => i.id === item.id ? item : i));
    }
    setEditingItem(null);
    setIsCreating(false);
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const toggleItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  };

  const duplicateItem = (item: ShopItem) => {
    const newItem: ShopItem = {
      ...item,
      id: `item-${Date.now()}`,
      name: `${item.name} (Copy)`,
    };
    setItems([...items, newItem]);
    toast.success('Item duplicated');
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Shop Management</h1>
            <p className="text-[var(--color-text-muted)]">Create and manage shop items</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addItem}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
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
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Total Items</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Active</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.outOfStock}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.featured}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Featured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="input w-full pl-10"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all' 
                  ? 'bg-[var(--color-accent)] text-white' 
                  : 'bg-[var(--color-surface)] hover:bg-[var(--color-border)]'
              }`}
            >
              All
            </button>
            {ITEM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filterType === type.value 
                    ? `${type.bg} ${type.color}` 
                    : 'bg-[var(--color-surface)] hover:bg-[var(--color-border)]'
                }`}
              >
                <type.icon className="w-3.5 h-3.5" />
                {type.label}
              </button>
            ))}
          </div>
          
          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input"
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="type">Type</option>
              <option value="stock">Stock</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortAsc ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 && items.length > 0 ? (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h3 className="text-lg font-semibold mb-2">No items found</h3>
          <p className="text-[var(--color-text-muted)]">Try a different search or filter</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h3 className="text-xl font-semibold mb-2">No Shop Items</h3>
          <p className="text-[var(--color-text-muted)] mb-4">
            Create items that members can purchase with their currency
          </p>
          <button onClick={addItem} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const itemType = ITEM_TYPES.find(t => t.value === item.type);
              const TypeIcon = itemType?.icon || Gift;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`card relative overflow-hidden ${!item.enabled ? 'opacity-60' : ''}`}
                >
                  {/* Featured Badge */}
                  {item.featured && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </div>
                  )}
                  
                  {/* Sale Badge */}
                  {item.salePrice && item.salePrice < item.price && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                      SALE
                    </div>
                  )}
                  
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${itemType?.bg || 'bg-blue-500/20'} flex items-center justify-center`}>
                        {item.emoji ? (
                          <span className="text-2xl">{item.emoji}</span>
                        ) : (
                          <TypeIcon className={`w-6 h-6 ${itemType?.color || 'text-blue-400'}`} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${itemType?.bg || 'bg-blue-500/20'} ${itemType?.color || 'text-blue-400'}`}>
                          {itemType?.label || item.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => duplicateItem(item)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingItem(item); setIsCreating(false); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--color-text-muted)] mb-4 line-clamp-2">
                    {item.description || 'No description'}
                  </p>

                  {/* Extra Info */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.stock !== undefined && item.stock > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface)] flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {item.stock} left
                      </span>
                    )}
                    {item.stock === 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
                        Out of stock
                      </span>
                    )}
                    {item.maxPerUser && (
                      <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface)] flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Max {item.maxPerUser}/user
                      </span>
                    )}
                    {item.duration && (
                      <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.duration >= 3600 ? `${Math.floor(item.duration / 3600)}h` : `${Math.floor(item.duration / 60)}m`}
                      </span>
                    )}
                    {item.requiredLevel && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                        Lvl {item.requiredLevel}+
                      </span>
                    )}
                  </div>

                  {/* Price & Status */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      {item.salePrice && item.salePrice < item.price ? (
                        <>
                          <span className="text-[var(--color-text-muted)] line-through text-sm">
                            {item.price.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-red-400 font-bold">
                            <Coins className="w-4 h-4" />
                            {item.salePrice.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                          <Coins className="w-4 h-4" />
                          {item.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        item.enabled 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {item.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setEditingItem(null); setIsCreating(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {isCreating ? 'Create Item' : 'Edit Item'}
                </h2>
                <button
                  onClick={() => { setEditingItem(null); setIsCreating(false); }}
                  className="p-2 rounded-lg hover:bg-[var(--color-surface)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Emoji & Name */}
                <div className="flex gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Emoji</label>
                    <input
                      type="text"
                      value={editingItem.emoji || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, emoji: e.target.value.slice(0, 2) })}
                      className="input w-16 text-center text-2xl"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="input w-full"
                      placeholder="Item name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="input w-full h-20 resize-none"
                    placeholder="What does this item do?"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ITEM_TYPES.map((type) => {
                      const TypeIcon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setEditingItem({ ...editingItem, type: type.value as ShopItem['type'] })}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            editingItem.type === type.value
                              ? `border-[var(--color-accent)] ${type.bg}`
                              : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                          }`}
                        >
                          <TypeIcon className={`w-6 h-6 mx-auto ${type.color}`} />
                          <div className="text-sm font-medium mt-1">{type.label}</div>
                          <div className="text-xs text-[var(--color-text-muted)] mt-0.5 hidden sm:block">{type.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Boost Settings (for boost type) */}
                {editingItem.type === 'boost' && (
                  <div className="space-y-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <h4 className="font-medium text-yellow-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Boost Settings
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Boost Type</label>
                        <select
                          value={editingItem.boostType || 'xp'}
                          onChange={(e) => setEditingItem({ ...editingItem, boostType: e.target.value as 'xp' | 'coins' | 'both' })}
                          className="input w-full"
                        >
                          {BOOST_TYPES.map((bt) => (
                            <option key={bt.value} value={bt.value}>{bt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Multiplier</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          step={0.1}
                          value={editingItem.boostMultiplier || 1.5}
                          onChange={(e) => setEditingItem({ ...editingItem, boostMultiplier: parseFloat(e.target.value) || 1.5 })}
                          className="input w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
                      <input
                        type="number"
                        min={60}
                        value={editingItem.duration || 3600}
                        onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 3600 })}
                        className="input w-full"
                      />
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {editingItem.duration ? (editingItem.duration >= 3600 ? `${Math.floor(editingItem.duration / 3600)}h` : `${Math.floor(editingItem.duration / 60)}m`) : '1h'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Role Select (for role type) */}
                {editingItem.type === 'role' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Role to Grant</label>
                    <RoleSelect
                      guildId={guildId!}
                      value={editingItem.roleId || ''}
                      onChange={(roleId) => setEditingItem({ ...editingItem, roleId })}
                      placeholder="Select a role..."
                    />
                  </div>
                )}

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    Price
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                  />
                </div>

                {/* Stock & Max Per User */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Stock (0 = unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.stock || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, stock: parseInt(e.target.value) || 0 })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max per User (0 = unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.maxPerUser || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, maxPerUser: parseInt(e.target.value) || 0 })}
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Required Level (0 = none)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.requiredLevel || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, requiredLevel: parseInt(e.target.value) || 0 })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Required Role</label>
                    <RoleSelect
                      guildId={guildId!}
                      value={editingItem.requiredRole || ''}
                      onChange={(roleId) => setEditingItem({ ...editingItem, requiredRole: roleId })}
                      placeholder="None"
                    />
                  </div>
                </div>

                {/* Sale Settings */}
                <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      Sale Settings
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Sale Price (0 = no sale)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingItem.salePrice || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, salePrice: parseInt(e.target.value) || 0 })}
                        className="input w-full"
                      />
                      {editingItem.salePrice && editingItem.salePrice > 0 && editingItem.salePrice < editingItem.price && (
                        <p className="text-xs text-green-400 mt-1">
                          {Math.round((1 - editingItem.salePrice / editingItem.price) * 100)}% off
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sale Ends</label>
                      <input
                        type="datetime-local"
                        value={editingItem.saleEnds || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, saleEnds: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Featured Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <Sparkles className={`w-5 h-5 ${editingItem.featured ? 'text-yellow-400' : 'text-[var(--color-text-muted)]'}`} />
                    <div>
                      <h4 className="font-medium">Featured Item</h4>
                      <p className="text-xs text-[var(--color-text-muted)]">Show prominently in shop</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingItem({ ...editingItem, featured: !editingItem.featured })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      editingItem.featured ? 'bg-yellow-500' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      editingItem.featured ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => { setEditingItem(null); setIsCreating(false); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveItem(editingItem)}
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
