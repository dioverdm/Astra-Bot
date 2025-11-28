import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 
  | 'dark' 
  | 'light' 
  | 'royal-purple' 
  | 'midnight' 
  | 'sunset' 
  | 'sakura' 
  | 'ocean'
  | 'forest'
  | 'nord'
  | 'dracula'
  | 'monokai'
  | 'cyberpunk'
  | 'coffee';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'astra-theme',
    }
  )
);

// Theme categories for organized display
export type ThemeCategory = 'dark' | 'light' | 'colorful';

// Theme metadata for UI
export interface ThemeInfo {
  id: Theme;
  name: string;
  colors: string[];
  category: ThemeCategory;
  description: string;
  isNew?: boolean;
  isPremium?: boolean;
}

export const themes: ThemeInfo[] = [
  // Dark Themes
  { id: 'dark', name: 'Dark', colors: ['#0F172A', '#1E293B', '#8B5CF6'], category: 'dark', description: 'Default dark theme' },
  { id: 'midnight', name: 'Midnight', colors: ['#020617', '#0F172A', '#3B82F6'], category: 'dark', description: 'Deep blue darkness' },
  { id: 'dracula', name: 'Dracula', colors: ['#282A36', '#44475A', '#BD93F9'], category: 'dark', description: 'Classic Dracula palette', isNew: true },
  { id: 'nord', name: 'Nord', colors: ['#2E3440', '#3B4252', '#88C0D0'], category: 'dark', description: 'Arctic, north-bluish' },
  { id: 'monokai', name: 'Monokai', colors: ['#272822', '#3E3D32', '#F92672'], category: 'dark', description: 'Vibrant code editor' },
  
  // Light Themes
  { id: 'light', name: 'Light', colors: ['#FFFFFF', '#F8FAFC', '#6366F1'], category: 'light', description: 'Clean and bright' },
  { id: 'sakura', name: 'Sakura', colors: ['#FDF2F8', '#FCE7F3', '#EC4899'], category: 'light', description: 'Soft pink blossoms' },
  { id: 'coffee', name: 'Coffee', colors: ['#F5F5DC', '#D4C4A8', '#8B4513'], category: 'light', description: 'Warm coffee tones', isNew: true },
  
  // Colorful Themes
  { id: 'royal-purple', name: 'Royal Purple', colors: ['#1A0A2E', '#2D1B4E', '#9333EA'], category: 'colorful', description: 'Majestic purple vibes' },
  { id: 'sunset', name: 'Sunset', colors: ['#1C1917', '#292524', '#F97316'], category: 'colorful', description: 'Warm orange glow' },
  { id: 'ocean', name: 'Ocean', colors: ['#042F2E', '#134E4A', '#0891B2'], category: 'colorful', description: 'Deep sea colors' },
  { id: 'forest', name: 'Forest', colors: ['#0D1F0D', '#1A3A1A', '#22C55E'], category: 'colorful', description: 'Natural green tones', isNew: true },
  { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#0D0221', '#1A0533', '#FF00FF'], category: 'colorful', description: 'Neon futuristic', isNew: true },
];

// Helper to get themes by category
export const getThemesByCategory = (category: ThemeCategory): ThemeInfo[] => 
  themes.filter(t => t.category === category);
