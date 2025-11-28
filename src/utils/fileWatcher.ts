// ===========================================
// ASTRA BOT - File Watcher for Auto-Reload
// ===========================================

import chokidar, { FSWatcher } from 'chokidar';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../shared/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

interface WatcherConfig {
  enabled: boolean;
  debounceMs: number;
  watchPaths: string[];
  ignorePaths: string[];
  onChangeCommand?: string;
}

const defaultConfig: WatcherConfig = {
  enabled: process.env.FILE_WATCHER_ENABLED === 'true',
  debounceMs: 1000,
  watchPaths: [
    'src/**/*.ts',
    'dashboard/src/**/*.tsx',
    'dashboard/src/**/*.ts',
    'dashboard/src/**/*.css',
  ],
  ignorePaths: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/logs/**',
    '**/*.log',
  ],
};

class FileWatcher {
  private watcher: FSWatcher | null = null;
  private config: WatcherConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private buildProcess: ChildProcess | null = null;
  private isBuilding = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Start watching files
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('File watcher is disabled');
      return;
    }

    const watchPaths = this.config.watchPaths.map(p => path.join(rootDir, p));

    this.watcher = chokidar.watch(watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath: string) => this.handleChange('add', filePath))
      .on('change', (filePath: string) => this.handleChange('change', filePath))
      .on('unlink', (filePath: string) => this.handleChange('unlink', filePath))
      .on('addDir', (filePath: string) => this.handleChange('addDir', filePath))
      .on('unlinkDir', (filePath: string) => this.handleChange('unlinkDir', filePath))
      .on('error', (error: unknown) => logger.error('Watcher error:', error))
      .on('ready', () => {
        logger.info('🔍 File watcher ready');
        logger.info(`   Watching: ${this.config.watchPaths.join(', ')}`);
      });
  }

  /**
   * Handle file change event
   */
  private handleChange(event: string, filePath: string): void {
    const relativePath = path.relative(rootDir, filePath);
    logger.debug(`File ${event}: ${relativePath}`);

    // Debounce to prevent multiple rapid rebuilds
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.triggerRebuild(relativePath);
    }, this.config.debounceMs);
  }

  /**
   * Trigger rebuild based on changed file
   */
  private async triggerRebuild(changedFile: string): Promise<void> {
    if (this.isBuilding) {
      logger.warn('Build already in progress, skipping...');
      return;
    }

    this.isBuilding = true;
    logger.info(`🔄 Rebuilding due to change in: ${changedFile}`);

    try {
      // Determine what to rebuild
      if (changedFile.startsWith('dashboard/')) {
        await this.runCommand('npm', ['run', 'build'], path.join(rootDir, 'dashboard'));
      } else if (changedFile.startsWith('src/')) {
        await this.runCommand('npm', ['run', 'build:bot'], rootDir);
      }

      logger.info('✅ Rebuild completed successfully');
    } catch (error) {
      logger.error('❌ Rebuild failed:', error);
    } finally {
      this.isBuilding = false;
    }
  }

  /**
   * Run a command and return a promise
   */
  private runCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Kill previous build if still running
      if (this.buildProcess) {
        this.buildProcess.kill();
      }

      this.buildProcess = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      this.buildProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      this.buildProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      this.buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error(`Build output:\n${stdout}\n${stderr}`);
          reject(new Error(`Build exited with code ${code}`));
        }
        this.buildProcess = null;
      });

      this.buildProcess.on('error', (error) => {
        reject(error);
        this.buildProcess = null;
      });
    });
  }

  /**
   * Stop watching files
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('File watcher stopped');
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.buildProcess) {
      this.buildProcess.kill();
      this.buildProcess = null;
    }
  }
}

// Singleton instance
let watcherInstance: FileWatcher | null = null;

export function startFileWatcher(config?: Partial<WatcherConfig>): FileWatcher {
  if (!watcherInstance) {
    watcherInstance = new FileWatcher(config);
    watcherInstance.start();
  }
  return watcherInstance;
}

export function stopFileWatcher(): void {
  if (watcherInstance) {
    watcherInstance.stop();
    watcherInstance = null;
  }
}

export { FileWatcher, WatcherConfig };
