// ===========================================
// ASTRA DASHBOARD - Level Card Component
// ===========================================

import { motion } from 'framer-motion';

export interface LevelCardConfig {
  backgroundColor: string;
  progressColor: string;
  textColor: string;
  accentColor: string;
  showAvatar: boolean;
  showRank: boolean;
  roundedCorners: boolean;
  showProgressText: boolean;
  style: 'modern' | 'classic' | 'minimal' | 'neon';
}

export interface LevelCardProps {
  username: string;
  discriminator?: string;
  avatar?: string;
  level: number;
  xp: number;
  xpNeeded: number;
  rank?: number;
  config: LevelCardConfig;
  className?: string;
}

export const DEFAULT_CARD_CONFIG: LevelCardConfig = {
  backgroundColor: '#1a1a2e',
  progressColor: '#8b5cf6',
  textColor: '#ffffff',
  accentColor: '#a78bfa',
  showAvatar: true,
  showRank: true,
  roundedCorners: true,
  showProgressText: true,
  style: 'modern',
};

export default function LevelCard({
  username,
  discriminator,
  avatar,
  level,
  xp,
  xpNeeded,
  rank,
  config,
  className = '',
}: LevelCardProps) {
  const progress = Math.min((xp / xpNeeded) * 100, 100);
  const borderRadius = config.roundedCorners ? '1rem' : '0.5rem';

  // Style variants
  const getStyleClasses = () => {
    switch (config.style) {
      case 'neon':
        return 'shadow-lg shadow-purple-500/30';
      case 'minimal':
        return 'border border-white/10';
      case 'classic':
        return 'shadow-xl';
      default:
        return 'shadow-2xl';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden ${getStyleClasses()} ${className}`}
      style={{
        backgroundColor: config.backgroundColor,
        borderRadius,
        width: '400px',
        padding: '1.5rem',
      }}
    >
      {/* Background Decoration */}
      {config.style === 'modern' && (
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: config.progressColor }}
        />
      )}
      {config.style === 'neon' && (
        <>
          <div 
            className="absolute top-0 left-0 w-full h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${config.progressColor}, transparent)` }}
          />
          <div 
            className="absolute bottom-0 left-0 w-full h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)` }}
          />
        </>
      )}

      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        {config.showAvatar && (
          <div 
            className="relative flex-shrink-0"
            style={{
              width: '80px',
              height: '80px',
            }}
          >
            {avatar ? (
              <img 
                src={avatar}
                alt={username}
                className="w-full h-full object-cover"
                style={{ 
                  borderRadius: config.roundedCorners ? '50%' : '0.5rem',
                  border: `3px solid ${config.accentColor}`,
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ 
                  borderRadius: config.roundedCorners ? '50%' : '0.5rem',
                  border: `3px solid ${config.accentColor}`,
                  backgroundColor: config.progressColor,
                  color: config.textColor,
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Level Badge */}
            <div 
              className="absolute -bottom-1 -right-1 px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: config.progressColor,
                color: config.textColor,
                borderRadius: config.roundedCorners ? '999px' : '0.25rem',
              }}
            >
              LVL {level}
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 
                className="font-bold text-lg truncate"
                style={{ color: config.textColor }}
              >
                {username}
              </h3>
              {discriminator && (
                <span 
                  className="text-sm opacity-60"
                  style={{ color: config.textColor }}
                >
                  #{discriminator}
                </span>
              )}
            </div>
            
            {/* Rank */}
            {config.showRank && rank && (
              <div 
                className="text-right"
                style={{ color: config.accentColor }}
              >
                <div className="text-xs opacity-70">RANK</div>
                <div className="text-xl font-bold">#{rank}</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div 
              className="h-3 overflow-hidden"
              style={{ 
                backgroundColor: `${config.textColor}20`,
                borderRadius: config.roundedCorners ? '999px' : '0.25rem',
              }}
            >
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full"
                style={{ 
                  background: config.style === 'neon' 
                    ? `linear-gradient(90deg, ${config.progressColor}, ${config.accentColor})`
                    : config.progressColor,
                  borderRadius: config.roundedCorners ? '999px' : '0.25rem',
                  boxShadow: config.style === 'neon' ? `0 0 10px ${config.progressColor}` : 'none',
                }}
              />
            </div>
            
            {/* XP Text */}
            {config.showProgressText && (
              <div 
                className="flex justify-between mt-1 text-xs"
                style={{ color: config.textColor, opacity: 0.7 }}
              >
                <span>{xp.toLocaleString()} XP</span>
                <span>{xpNeeded.toLocaleString()} XP</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
