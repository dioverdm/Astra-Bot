// ===========================================
// ASTRA BOT - Public Links Configuration
// All links are loaded from environment variables
// ===========================================

export const BOT_LINKS = {
  // Discord
  supportServer: process.env.DISCORD_SUPPORT_URL || 'https://discord.gg/KD84DmNA89',
  inviteCode: process.env.DISCORD_INVITE_CODE || 'KD84DmNA89',
  
  // Bot Invite (replace YOUR_CLIENT_ID with actual ID)
  botInvite: process.env.BOT_INVITE_URL || `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
  
  // GitHub
  github: process.env.GITHUB_URL || 'https://github.com/XSaitoKungX/Astra-Bot',
  githubRepo: process.env.GITHUB_REPO || 'XSaitoKungX/Astra-Bot',
  
  // Website / Dashboard
  website: process.env.WEBSITE_URL || process.env.DASHBOARD_URL || 'https://astra.novaplex.xyz',
  banner: process.env.DASHBOARD_BANNER_URL || 'https://astra.novaplex.xyz/Astra_Banner.png',
  
  // Bot Lists
  topgg: process.env.TOPGG_URL || '',
  discordBots: process.env.DISCORDBOTS_URL || '',
  
  // Social (Optional)
  twitter: process.env.TWITTER_URL || '',
  youtube: process.env.YOUTUBE_URL || '',
  patreon: process.env.PATREON_URL || '',
  kofi: process.env.KOFI_URL || '',
} as const;

// Bot Info
export const BOT_INFO = {
  name: process.env.BOT_NAME || 'Astra',
  version: process.env.BOT_VERSION || '2.1.0',
  prefix: process.env.BOT_PREFIX || '/',
  ownerId: process.env.BOT_OWNER_ID || '',
} as const;

// Helper to generate invite link with custom permissions
export function generateInviteLink(clientId: string, permissions: bigint | number = 8n): string {
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
}

// Helper to check if a link is configured
export function hasLink(key: keyof typeof BOT_LINKS): boolean {
  return !!BOT_LINKS[key] && BOT_LINKS[key].length > 0;
}

// Get all configured links (non-empty)
export function getConfiguredLinks(): Partial<typeof BOT_LINKS> {
  return Object.fromEntries(
    Object.entries(BOT_LINKS).filter(([_, value]) => value && value.length > 0)
  );
}
