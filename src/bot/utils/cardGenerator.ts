// ===========================================
// ASTRA BOT - Card Generator Utility
// ===========================================
// Uses @napi-rs/canvas for fast image generation

import { createCanvas, loadImage, GlobalFonts, SKRSContext2D } from '@napi-rs/canvas';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register fonts (optional - uses system fonts by default)
// GlobalFonts.registerFromPath(join(__dirname, '../../assets/fonts/Inter-Bold.ttf'), 'Inter');

// ==========================================
// TYPES
// ==========================================

export interface RankCardData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  xpNeeded: number;
  rank: number;
  totalXp: number;
  messages?: number;
  accentColor?: string;
}

export interface LeaderboardCardData {
  title: string;
  users: {
    username: string;
    avatarUrl?: string;
    value: number;
    valueSuffix: string;
    level?: number;
    rank: number;
  }[];
  type: 'xp' | 'level' | 'messages' | 'balance' | 'weekly';
}

export interface BalanceCardData {
  username: string;
  avatarUrl?: string;
  wallet: number;
  bank: number;
  netWorth: number;
  rank: number;
  dailyStreak?: number;
}

export interface DailyCardData {
  username: string;
  avatarUrl?: string;
  reward: number;
  streakBonus: number;
  weeklyBonus: number;
  totalReward: number;
  newStreak: number;
  newBalance: number;
}

// ==========================================
// COLOR PALETTES
// ==========================================

const COLORS = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceLight: '#21262d',
  border: '#30363d',
  text: '#f0f6fc',
  textMuted: '#8b949e',
  accent: '#8b5cf6',
  accentLight: '#a78bfa',
  success: '#3fb950',
  warning: '#d29922',
  error: '#f85149',
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function loadAvatarImage(url: string | undefined): Promise<any> {
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return await loadImage(Buffer.from(response.data));
  } catch {
    return null;
  }
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCircularImage(ctx: SKRSContext2D, img: any, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ==========================================
// RANK CARD GENERATOR
// ==========================================

export async function generateRankCard(data: RankCardData): Promise<Buffer> {
  const width = 934;
  const height = 282;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.background;
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fill();

  // Decorative gradient blob
  const gradient = ctx.createRadialGradient(width - 100, 50, 0, width - 100, 50, 200);
  gradient.addColorStop(0, data.accentColor || COLORS.accent + '40');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Inner card
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.fill();

  // Avatar
  const avatarSize = 150;
  const avatarX = 50;
  const avatarY = (height - avatarSize) / 2;
  
  const avatar = await loadAvatarImage(data.avatarUrl);
  
  // Avatar border
  ctx.strokeStyle = data.accentColor || COLORS.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.stroke();
  
  if (avatar) {
    drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
  } else {
    // Default avatar
    ctx.fillStyle = data.accentColor || COLORS.accent;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }

  // Level badge on avatar
  const badgeWidth = 60;
  const badgeHeight = 28;
  const badgeX = avatarX + avatarSize - badgeWidth + 10;
  const badgeY = avatarY + avatarSize - badgeHeight + 5;
  
  ctx.fillStyle = data.accentColor || COLORS.accent;
  roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 14);
  ctx.fill();
  
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LVL ${data.level}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // User info section
  const infoX = avatarX + avatarSize + 40;
  const infoWidth = width - infoX - 50;

  // Username
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const displayName = data.displayName || data.username;
  ctx.fillText(displayName.length > 20 ? displayName.slice(0, 20) + '...' : displayName, infoX, 50);

  // Username if different from display name
  if (data.displayName && data.displayName !== data.username) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '18px sans-serif';
    ctx.fillText(`@${data.username}`, infoX, 88);
  }

  // Rank
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('RANK', width - 50, 50);
  
  ctx.fillStyle = data.rank <= 3 
    ? data.rank === 1 ? COLORS.gold : data.rank === 2 ? COLORS.silver : COLORS.bronze
    : COLORS.accentLight;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`#${data.rank}`, width - 50, 70);

  // Stats row
  const statsY = 130;
  const statWidth = infoWidth / 3;
  
  const stats = [
    { label: 'TOTAL XP', value: formatNumber(data.totalXp) },
    { label: 'MESSAGES', value: formatNumber(data.messages || 0) },
    { label: 'NEXT LVL', value: formatNumber(data.xpNeeded - data.xp) + ' XP' },
  ];

  stats.forEach((stat, i) => {
    const x = infoX + (statWidth * i);
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, x, statsY);
    
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(stat.value, x, statsY + 22);
  });

  // Progress bar
  const progressY = 200;
  const progressHeight = 24;
  const progressWidth = infoWidth;
  const progress = Math.min((data.xp / data.xpNeeded) * 100, 100);

  // Progress background
  ctx.fillStyle = COLORS.surfaceLight;
  roundRect(ctx, infoX, progressY, progressWidth, progressHeight, 12);
  ctx.fill();

  // Progress fill
  if (progress > 0) {
    const fillWidth = Math.max((progressWidth * progress) / 100, 24);
    const progressGradient = ctx.createLinearGradient(infoX, 0, infoX + fillWidth, 0);
    progressGradient.addColorStop(0, data.accentColor || COLORS.accent);
    progressGradient.addColorStop(1, COLORS.accentLight);
    ctx.fillStyle = progressGradient;
    roundRect(ctx, infoX, progressY, fillWidth, progressHeight, 12);
    ctx.fill();
  }

  // Progress text
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${data.xp.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP`, infoX + progressWidth / 2, progressY + progressHeight / 2);

  return canvas.toBuffer('image/png');
}

// ==========================================
// LEADERBOARD CARD GENERATOR
// ==========================================

export async function generateLeaderboardCard(data: LeaderboardCardData): Promise<Buffer> {
  const userHeight = 80;
  const headerHeight = 90;
  const padding = 25;
  const width = 900;
  const height = headerHeight + (data.users.length * userHeight) + padding * 2 + 10;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, COLORS.background);
  bgGradient.addColorStop(1, '#0d1117');
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  // Decorative accent
  ctx.fillStyle = COLORS.accent + '15';
  ctx.beginPath();
  ctx.arc(width - 80, 60, 120, 0, Math.PI * 2);
  ctx.fill();

  // Header background
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, padding, padding, width - padding * 2, headerHeight - padding, 16);
  ctx.fill();

  // Type icon indicator
  const typeColors: Record<string, string> = {
    xp: '#a78bfa', level: '#60a5fa', messages: '#34d399', balance: '#fbbf24', weekly: '#f472b6'
  };
  const typeLabels: Record<string, string> = {
    xp: 'XP', level: 'LEVEL', messages: 'MESSAGES', balance: 'BALANCE', weekly: 'WEEKLY'
  };
  
  // Type badge
  const badgeColor = typeColors[data.type] || COLORS.accent;
  ctx.fillStyle = badgeColor + '30';
  roundRect(ctx, padding + 15, padding + 12, 80, 36, 8);
  ctx.fill();
  
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeLabels[data.type] || 'XP', padding + 55, padding + 30);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.title, padding + 110, headerHeight / 2 + padding / 2);

  // Users
  for (let i = 0; i < data.users.length; i++) {
    const user = data.users[i];
    const y = headerHeight + (i * userHeight) + 5;
    
    // Row background (alternating)
    ctx.fillStyle = i % 2 === 0 ? COLORS.surface + '60' : COLORS.surface + '30';
    roundRect(ctx, padding, y, width - padding * 2, userHeight - 8, 12);
    ctx.fill();

    // Rank medal/number
    const rankX = padding + 40;
    const rankY = y + userHeight / 2 - 4;
    
    if (user.rank <= 3) {
      const medalColors = [COLORS.gold, COLORS.silver, COLORS.bronze];
      const medalGradient = ctx.createRadialGradient(rankX, rankY, 0, rankX, rankY, 22);
      medalGradient.addColorStop(0, medalColors[user.rank - 1]);
      medalGradient.addColorStop(1, medalColors[user.rank - 1] + '80');
      ctx.fillStyle = medalGradient;
      ctx.beginPath();
      ctx.arc(rankX, rankY, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Medal border
      ctx.strokeStyle = medalColors[user.rank - 1];
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px sans-serif';
    } else {
      ctx.fillStyle = COLORS.surfaceLight;
      ctx.beginPath();
      ctx.arc(rankX, rankY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = 'bold 14px sans-serif';
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.rank.toString(), rankX, rankY);

    // Avatar
    const avatarSize = 50;
    const avatarX = rankX + 45;
    const avatarY = y + (userHeight - avatarSize) / 2 - 4;
    
    const avatar = await loadAvatarImage(user.avatarUrl);
    if (avatar) {
      // Avatar border
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      
      drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
    } else {
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    // Username
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const usernameX = avatarX + avatarSize + 20;
    const displayName = user.username.length > 20 ? user.username.slice(0, 20) + '...' : user.username;
    ctx.fillText(displayName, usernameX, rankY - 10);
    
    // Level (if available)
    if (user.level !== undefined) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '14px sans-serif';
      ctx.fillText(`Level ${user.level}`, usernameX, rankY + 12);
    }

    // Value with background
    const valueText = `${formatNumber(user.value)}${user.valueSuffix}`;
    ctx.font = 'bold 18px sans-serif';
    const valueWidth = ctx.measureText(valueText).width;
    
    // Value background pill
    const valueColor = typeColors[data.type] || COLORS.accent;
    ctx.fillStyle = valueColor + '25';
    roundRect(ctx, width - padding - valueWidth - 50, rankY - 15, valueWidth + 30, 30, 15);
    ctx.fill();
    
    ctx.fillStyle = valueColor;
    ctx.textAlign = 'right';
    ctx.fillText(valueText, width - padding - 35, rankY);
  }

  return canvas.toBuffer('image/png');
}

// ==========================================
// BALANCE CARD GENERATOR
// ==========================================

export async function generateBalanceCard(data: BalanceCardData): Promise<Buffer> {
  const width = 600;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fill();

  // Decorative circles
  ctx.fillStyle = '#fbbf2420';
  ctx.beginPath();
  ctx.arc(width - 50, 50, 100, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#fbbf2410';
  ctx.beginPath();
  ctx.arc(50, height - 30, 80, 0, Math.PI * 2);
  ctx.fill();

  // Header section
  const avatar = await loadAvatarImage(data.avatarUrl);
  const avatarSize = 80;
  const avatarX = 30;
  const avatarY = 30;

  // Avatar border
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();

  if (avatar) {
    drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
  } else {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.background;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }

  // Username
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(data.username.length > 15 ? data.username.slice(0, 15) + '...' : data.username, avatarX + avatarSize + 20, avatarY + 10);

  // Rank badge
  ctx.fillStyle = COLORS.gold + '30';
  roundRect(ctx, avatarX + avatarSize + 20, avatarY + 45, 80, 28, 14);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Rank #${data.rank}`, avatarX + avatarSize + 60, avatarY + 59);

  // Balance cards
  const cardY = 140;
  const cardWidth = (width - 80) / 2;
  const cardHeight = 80;

  // Wallet card
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, 30, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💵 Wallet', 50, cardY + 25);
  
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(formatNumber(data.wallet), 50, cardY + 55);

  // Bank card
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, 50 + cardWidth, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🏦 Bank', 70 + cardWidth, cardY + 25);
  
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(formatNumber(data.bank), 70 + cardWidth, cardY + 55);

  // Net Worth section
  ctx.fillStyle = COLORS.surfaceLight;
  roundRect(ctx, 30, cardY + cardHeight + 20, width - 60, 70, 12);
  ctx.fill();

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💰 Net Worth', width / 2, cardY + cardHeight + 45);
  
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(formatNumber(data.netWorth) + ' coins', width / 2, cardY + cardHeight + 75);

  // Daily streak (if available)
  if (data.dailyStreak !== undefined && data.dailyStreak > 0) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`🔥 ${data.dailyStreak} day streak`, width - 30, height - 30);
  }

  return canvas.toBuffer('image/png');
}

// ==========================================
// DAILY REWARD CARD GENERATOR
// ==========================================

export async function generateDailyCard(data: DailyCardData): Promise<Buffer> {
  const width = 500;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fill();

  // Decorative sparkles
  ctx.fillStyle = '#fbbf2430';
  ctx.beginPath();
  ctx.arc(width - 60, 60, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, height - 60, 60, 0, Math.PI * 2);
  ctx.fill();

  // Gift icon / header
  ctx.fillStyle = COLORS.success;
  ctx.beginPath();
  ctx.arc(width / 2, 60, 35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎁', width / 2, 60);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Daily Reward!', width / 2, 120);

  // Avatar and username
  const avatar = await loadAvatarImage(data.avatarUrl);
  const avatarSize = 50;
  const avatarX = (width - avatarSize) / 2;
  const avatarY = 145;

  if (avatar) {
    drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
  }
  
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '16px sans-serif';
  ctx.fillText(data.username, width / 2, avatarY + avatarSize + 20);

  // Reward breakdown
  const breakdownY = 240;
  const lineHeight = 32;
  
  // Base reward
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💵 Base Reward', 60, breakdownY);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.success;
  ctx.fillText(`+${formatNumber(data.reward)}`, width - 60, breakdownY);

  // Streak bonus
  if (data.streakBonus > 0) {
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(`🔥 Streak Bonus (Day ${data.newStreak})`, 60, breakdownY + lineHeight);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.warning;
    ctx.fillText(`+${formatNumber(data.streakBonus)}`, width - 60, breakdownY + lineHeight);
  }

  // Weekly bonus
  if (data.weeklyBonus > 0) {
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText('🎉 Weekly Bonus', 60, breakdownY + lineHeight * 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`+${formatNumber(data.weeklyBonus)}`, width - 60, breakdownY + lineHeight * 2);
  }

  // Divider line
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, breakdownY + lineHeight * 2.5);
  ctx.lineTo(width - 60, breakdownY + lineHeight * 2.5);
  ctx.stroke();

  // Total
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Total: ${formatNumber(data.totalReward)} coins`, width / 2, breakdownY + lineHeight * 3.5);

  // New balance
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '14px sans-serif';
  ctx.fillText(`New Balance: ${formatNumber(data.newBalance)} coins`, width / 2, height - 30);

  return canvas.toBuffer('image/png');
}
