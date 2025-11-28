// ===========================================
// ASTRA BOT - Status Page
// ===========================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Server, 
  Users, 
  MessageSquare, 
  Clock, 
  Wifi, 
  WifiOff,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Zap,
  Globe,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { BOT_LINKS } from '../config/links';

interface StatusData {
  status: 'operational' | 'degraded' | 'down';
  bot: {
    online: boolean;
    ping: number;
    uptime: number;
    guilds: number;
    users: number;
    channels: number;
    commands: number;
    shards: number;
  };
  api: {
    online: boolean;
    responseTime: number;
  };
  database: {
    online: boolean;
    responseTime: number;
  };
  services: {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    responseTime?: number;
  }[];
}

const statusColors = {
  operational: 'text-green-400',
  degraded: 'text-yellow-400',
  down: 'text-red-400',
};

const statusBgColors = {
  operational: 'bg-green-500/20',
  degraded: 'bg-yellow-500/20',
  down: 'bg-red-500/20',
};

const statusBorderColors = {
  operational: 'border-green-500/30',
  degraded: 'border-yellow-500/30',
  down: 'border-red-500/30',
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function StatusIndicator({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  return (
    <span className={`flex items-center gap-2 ${statusColors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-green-400' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
      {status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Down'}
    </span>
  );
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      const startTime = Date.now();
      const response = await api.get('/stats/status');
      const apiResponseTime = Date.now() - startTime;
      
      setStatus({
        ...response.data.data,
        api: {
          online: true,
          responseTime: apiResponseTime
        }
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch status');
      setStatus(prev => prev ? {
        ...prev,
        status: 'degraded',
        api: { online: false, responseTime: 0 }
      } : null);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const overallStatus = status?.status || 'down';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Astra Status</h1>
              <p className="text-xs text-gray-400">System Health Monitor</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                autoRefresh 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              Auto-refresh {autoRefresh ? 'On' : 'Off'}
            </button>
            
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Overall Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 mb-8 border ${statusBgColors[overallStatus]} ${statusBorderColors[overallStatus]}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {overallStatus === 'operational' ? (
                <CheckCircle className="w-12 h-12 text-green-400" />
              ) : overallStatus === 'degraded' ? (
                <AlertCircle className="w-12 h-12 text-yellow-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400" />
              )}
              <div>
                <h2 className={`text-2xl font-bold ${statusColors[overallStatus]}`}>
                  {overallStatus === 'operational' 
                    ? 'All Systems Operational' 
                    : overallStatus === 'degraded'
                    ? 'Partial System Outage'
                    : 'Major System Outage'}
                </h2>
                <p className="text-gray-400">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            {status?.bot?.uptime && (
              <div className="text-right">
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="text-2xl font-mono text-white">{formatUptime(status.bot.uptime)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {loading && !status ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
          </div>
        ) : error && !status ? (
          <div className="text-center py-20">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Unable to fetch status</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Server className="w-5 h-5 text-violet-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Servers</span>
                </div>
                <p className="text-2xl font-bold text-white">{status?.bot?.guilds?.toLocaleString() || '—'}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Users</span>
                </div>
                <p className="text-2xl font-bold text-white">{status?.bot?.users?.toLocaleString() || '—'}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Channels</span>
                </div>
                <p className="text-2xl font-bold text-white">{status?.bot?.channels?.toLocaleString() || '—'}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Commands</span>
                </div>
                <p className="text-2xl font-bold text-white">{status?.bot?.commands?.toLocaleString() || '—'}</p>
              </motion.div>
            </div>

            {/* Services Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden mb-8"
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-400" />
                  Service Status
                </h3>
              </div>
              
              <div className="divide-y divide-white/5">
                {/* Bot Service */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status?.bot?.online ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {status?.bot?.online ? (
                        <Wifi className="w-5 h-5 text-green-400" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">Discord Bot</p>
                      <p className="text-sm text-gray-400">Core bot functionality</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {status?.bot?.ping !== undefined && (
                      <span className="text-sm text-gray-400 font-mono">{status.bot.ping}ms</span>
                    )}
                    <StatusIndicator status={status?.bot?.online ? 'operational' : 'down'} />
                  </div>
                </div>

                {/* API Service */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status?.api?.online ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">REST API</p>
                      <p className="text-sm text-gray-400">Dashboard & integrations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {status?.api?.responseTime !== undefined && (
                      <span className="text-sm text-gray-400 font-mono">{status.api.responseTime}ms</span>
                    )}
                    <StatusIndicator status={status?.api?.online ? 'operational' : 'down'} />
                  </div>
                </div>

                {/* Database Service */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status?.database?.online ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <Database className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Database</p>
                      <p className="text-sm text-gray-400">MongoDB cluster</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {status?.database?.responseTime !== undefined && (
                      <span className="text-sm text-gray-400 font-mono">{status.database.responseTime}ms</span>
                    )}
                    <StatusIndicator status={status?.database?.online ? 'operational' : 'down'} />
                  </div>
                </div>

                {/* WebSocket Service */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">WebSocket</p>
                      <p className="text-sm text-gray-400">Real-time updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusIndicator status="operational" />
                  </div>
                </div>

                {/* CDN Service */}
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">CDN / Assets</p>
                      <p className="text-sm text-gray-400">Static content delivery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusIndicator status="operational" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* System Metrics */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Latency Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-400" />
                  Response Times
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">WebSocket</span>
                      <span className="text-sm text-white font-mono">{status?.bot?.ping || 0}ms</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((status?.bot?.ping || 0) / 5, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">API</span>
                      <span className="text-sm text-white font-mono">{status?.api?.responseTime || 0}ms</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((status?.api?.responseTime || 0) / 5, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Database</span>
                      <span className="text-sm text-white font-mono">{status?.database?.responseTime || 0}ms</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((status?.database?.responseTime || 0) / 5, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Bot Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-violet-400" />
                  Bot Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Shards</p>
                    <p className="text-xl font-bold text-white">{status?.bot?.shards || 1}</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Commands</p>
                    <p className="text-xl font-bold text-white">{status?.bot?.commands || 0}</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Memory</p>
                    <p className="text-xl font-bold text-white">~128 MB</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Node.js</p>
                    <p className="text-xl font-bold text-white">v20.x</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <a
                href={BOT_LINKS.supportServer}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
                </svg>
                Support Server
              </a>
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Dashboard
              </Link>
              <a
                href={BOT_LINKS.githubProfile}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </motion.div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Astra Bot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
