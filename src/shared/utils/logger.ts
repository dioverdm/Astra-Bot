// ===========================================
// ASTRA BOT - Enhanced Logger Utility
// ===========================================

import winston from 'winston';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

// Ensure logs directory exists
if (!existsSync('logs')) {
  mkdirSync('logs', { recursive: true });
}

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Level colors and icons
const levelConfig: Record<string, { color: string; icon: string; bg?: string }> = {
  error: { color: colors.red, icon: '✖', bg: '\x1b[41m' },
  warn: { color: colors.yellow, icon: '⚠', bg: '\x1b[43m' },
  info: { color: colors.cyan, icon: '●', bg: '\x1b[46m' },
  http: { color: colors.magenta, icon: '→', bg: '\x1b[45m' },
  debug: { color: colors.gray, icon: '◌', bg: '\x1b[100m' },
  verbose: { color: colors.white, icon: '…', bg: '\x1b[47m' },
};

// Module/category colors
const moduleColors: Record<string, string> = {
  BOT: colors.blue,
  API: colors.green,
  DB: colors.yellow,
  AUTH: colors.magenta,
  CMD: colors.cyan,
  EVENT: colors.white,
  GUILD: colors.green,
  USER: colors.blue,
};

// Custom format for console
const consoleFormat = winston.format.printf(({ level, message, timestamp, module, ...meta }) => {
  const config = levelConfig[level] || { color: colors.white, icon: '•' };
  const time = colors.gray + timestamp + colors.reset;
  const levelStr = config.color + config.icon + ' ' + level.toUpperCase().padEnd(5) + colors.reset;
  
  // Module tag if provided
  let moduleTag = '';
  if (module) {
    const modColor = moduleColors[module as string] || colors.white;
    moduleTag = ` ${modColor}[${module}]${colors.reset}`;
  }
  
  // Format metadata
  let metaStr = '';
  if (Object.keys(meta).length > 0 && meta.stack === undefined) {
    const filtered = Object.entries(meta)
      .filter(([k]) => !['splat', 'stack'].includes(k))
      .map(([k, v]) => `${colors.dim}${k}=${colors.reset}${colors.cyan}${v}${colors.reset}`)
      .join(' ');
    if (filtered) metaStr = ` ${filtered}`;
  }
  
  // Stack trace for errors
  const stack = meta.stack ? `\n${colors.red}${meta.stack}${colors.reset}` : '';
  
  return `${time} ${levelStr}${moduleTag} ${message}${metaStr}${stack}`;
});

// File format (no colors)
const fileFormat = winston.format.printf(({ level, message, timestamp, module, ...meta }) => {
  const moduleTag = module ? `[${module}] ` : '';
  const metaStr = Object.keys(meta).length > 0 && !meta.stack 
    ? ' ' + JSON.stringify(meta) 
    : '';
  const stack = meta.stack ? `\n${meta.stack}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${moduleTag}${message}${metaStr}${stack}`;
});

// Create base logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
    }),
  ],
});

// Extended logger with module support
interface ExtendedLogger extends winston.Logger {
  module: (name: string) => winston.Logger;
  bot: winston.Logger;
  api: winston.Logger;
  db: winston.Logger;
  auth: winston.Logger;
  cmd: winston.Logger;
  event: winston.Logger;
  startup: (message: string) => void;
  success: (message: string, meta?: object) => void;
  request: (method: string, path: string, status: number, duration: number) => void;
}

// Create child loggers for modules
const createModuleLogger = (module: string) => baseLogger.child({ module });

export const logger = baseLogger as ExtendedLogger;

// Add module method
logger.module = (name: string) => createModuleLogger(name.toUpperCase());

// Pre-defined module loggers
logger.bot = createModuleLogger('BOT');
logger.api = createModuleLogger('API');
logger.db = createModuleLogger('DB');
logger.auth = createModuleLogger('AUTH');
logger.cmd = createModuleLogger('CMD');
logger.event = createModuleLogger('EVENT');

// Startup banner
logger.startup = (message: string) => {
  const line = '═'.repeat(50);
  console.log(`\n${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ✨ ${message}${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}\n`);
};

// Success log
logger.success = (message: string, meta?: object) => {
  baseLogger.info(`${colors.green}✓${colors.reset} ${message}`, meta);
};

// HTTP request log
logger.request = (method: string, path: string, status: number, duration: number) => {
  const statusColor = status >= 500 ? colors.red 
    : status >= 400 ? colors.yellow 
    : status >= 300 ? colors.cyan 
    : colors.green;
  
  baseLogger.http(
    `${colors.bright}${method.padEnd(6)}${colors.reset} ${path} ${statusColor}${status}${colors.reset} ${colors.dim}${duration}ms${colors.reset}`,
    { module: 'API' }
  );
};
