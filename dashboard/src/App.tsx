import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { useEffect } from 'react';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GuildSelectPage from './pages/GuildSelectPage';
import GuildDashboardPage from './pages/GuildDashboardPage';
import ModerationSettingsPage from './pages/settings/ModerationSettingsPage';
import LevelingSettingsPage from './pages/settings/LevelingSettingsPage';
import EconomySettingsPage from './pages/settings/EconomySettingsPage';
import WelcomeSettingsPage from './pages/settings/WelcomeSettingsPage';
import TicketsSettingsPage from './pages/settings/TicketsSettingsPage';
import AutomodSettingsPage from './pages/settings/AutomodSettingsPage';
import MusicSettingsPage from './pages/settings/MusicSettingsPage';
import GiveawaySettingsPage from './pages/settings/GiveawaySettingsPage';
import AuditLogPage from './pages/guild/AuditLogPage';
import MembersPage from './pages/guild/MembersPage';
import AnalyticsPage from './pages/guild/AnalyticsPage';
import LeaderboardPage from './pages/guild/LeaderboardPage';
import ChangelogPage from './pages/ChangelogPage';
import StatusPage from './pages/StatusPage';
import RoleRewardsPage from './pages/settings/RoleRewardsPage';
import ShopSettingsPage from './pages/settings/ShopSettingsPage';
import LevelCardPage from './pages/guild/LevelCardPage';
import CustomCommandsPage from './pages/settings/CustomCommandsPage';
import RolesPage from './pages/guild/RolesPage';
import UserProfilePage from './pages/guild/UserProfilePage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { theme } = useThemeStore();
  const { checkAuth } = useAuthStore();
  
  // Apply theme on mount and changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Check authentication on mount (only once)
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/status" element={<StatusPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="guilds" element={<GuildSelectPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
        <Route path="guild/:guildId" element={<GuildDashboardPage />} />
        <Route path="guild/:guildId/moderation" element={<ModerationSettingsPage />} />
        <Route path="guild/:guildId/leveling" element={<LevelingSettingsPage />} />
        <Route path="guild/:guildId/economy" element={<EconomySettingsPage />} />
        <Route path="guild/:guildId/welcome" element={<WelcomeSettingsPage />} />
        <Route path="guild/:guildId/tickets" element={<TicketsSettingsPage />} />
        <Route path="guild/:guildId/automod" element={<AutomodSettingsPage />} />
        <Route path="guild/:guildId/music" element={<MusicSettingsPage />} />
        <Route path="guild/:guildId/giveaway" element={<GiveawaySettingsPage />} />
        <Route path="guild/:guildId/audit-log" element={<AuditLogPage />} />
        <Route path="guild/:guildId/members" element={<MembersPage />} />
        <Route path="guild/:guildId/analytics" element={<AnalyticsPage />} />
        <Route path="guild/:guildId/leaderboard" element={<LeaderboardPage />} />
        <Route path="guild/:guildId/role-rewards" element={<RoleRewardsPage />} />
        <Route path="guild/:guildId/shop" element={<ShopSettingsPage />} />
        <Route path="guild/:guildId/level-card" element={<LevelCardPage />} />
        <Route path="guild/:guildId/commands" element={<CustomCommandsPage />} />
        <Route path="guild/:guildId/roles" element={<RolesPage />} />
        <Route path="guild/:guildId/member/:odiscordId" element={<UserProfilePage />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
