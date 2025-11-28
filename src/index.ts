// ===========================================
// ASTRA BOT - Main Entry Point
// ===========================================

import { config } from 'dotenv';
config();

import { logger } from './shared/utils/logger.js';

// Determine which services to start based on environment
const mode = process.env.RUN_MODE || 'all';

async function main(): Promise<void> {
  logger.info('🌟 Starting Astra...');
  logger.info(`Mode: ${mode}`);
  
  try {
    if (mode === 'bot' || mode === 'all') {
      // Start Discord bot
      await import('./bot/index.js');
      logger.info('✅ Discord bot started');
    }
    
    if (mode === 'api' || mode === 'all') {
      // Start API server
      await import('./api/index.js');
      logger.info('✅ API server started');
    }
    
    logger.info('🎉 Astra is fully operational!');
  } catch (error) {
    logger.error('Failed to start Astra:', error);
    process.exit(1);
  }
}

main();
