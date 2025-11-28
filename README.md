# ✨ Astra Bot

A modern, performant All-in-One Discord Bot with a beautiful anime-inspired web dashboard.

**Single Port Architecture** - Optimized for Pelican.dev and similar hosting platforms.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

## 🌟 Features

### Bot Features
- **🛡️ Moderation** - Ban, kick, timeout, warn, and automod
- **📈 Leveling** - XP system with level roles and rewards
- **💰 Economy** - Virtual currency, shops, and collectibles
- **🎵 Music** - High-quality music playback
- **🎮 Fun** - Anime commands, games, and entertainment
- **👋 Welcome** - Customizable welcome messages and auto-roles
- **🎫 Tickets** - Support ticket system

### Dashboard Features
- **🔐 Discord OAuth2** - Secure login with Discord
- **🎨 Theme Switcher** - 7 beautiful themes including anime-inspired designs
- **📊 Statistics** - Real-time server statistics and leaderboards
- **⚙️ Easy Configuration** - Intuitive settings for all modules
- **📱 Responsive** - Works on all devices
- **👥 Role System** - Owner, Admin, Developer, Moderator, Support, User roles

### Architecture
- **🔌 Single Port** - API and Dashboard served from one port (Pelican.dev compatible)
- **☁️ Cloudflare Ready** - Trust proxy and proper headers for reverse proxy
- **🔄 File Watcher** - Auto-rebuild on file changes (development)
- **🛡️ Nginx Compatible** - Works behind reverse proxy

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v24 recommended)
- MongoDB database
- Discord Bot Token

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/astra-bot.git
cd astra-bot
```

2. **Install dependencies**
```bash
# Install bot/API dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Start development**
```bash
# Start everything (bot + API + dashboard)
npm run dev

# Or start individually
npm run dev:bot      # Discord bot only
npm run dev:api      # API server only
npm run dev:dashboard # Dashboard only
```

## 📁 Project Structure

```
astra-bot/
├── src/
│   ├── bot/                 # Discord bot
│   │   ├── commands/        # Slash commands
│   │   ├── events/          # Event handlers
│   │   └── handlers/        # Command/event loaders
│   ├── api/                 # Express API
│   │   ├── routes/          # API routes
│   │   └── middleware/      # Auth middleware
│   ├── database/            # MongoDB models
│   │   └── models/          # Mongoose schemas
│   └── shared/              # Shared utilities
│       ├── types/           # TypeScript types
│       ├── constants/       # Constants
│       └── utils/           # Utility functions
├── dashboard/               # React dashboard
│   └── src/
│       ├── pages/           # Page components
│       ├── layouts/         # Layout components
│       ├── stores/          # Zustand stores
│       └── lib/             # API client
└── logs/                    # Log files
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 client secret |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Session encryption secret |
| `API_PORT` | API server port (default: 3001) |
| `DASHBOARD_URL` | Dashboard URL for OAuth callback |
| `OAUTH_CALLBACK_URL` | OAuth callback URL |

## 🎨 Themes

Astra includes 7 beautiful themes:

| Theme | Description |
|-------|-------------|
| **Dark** | Default dark theme |
| **Light** | Clean light theme |
| **Royal Purple** | Deep purple aesthetic |
| **Midnight** | Blue-tinted dark theme |
| **Sunset** | Warm orange/red gradient |
| **Sakura** | Pink cherry blossom theme |
| **Ocean** | Teal/cyan ocean theme |

## 📝 Commands

### Moderation
| Command | Description |
|---------|-------------|
| `/ban` | Ban a user from the server |
| `/kick` | Kick a user from the server |
| `/timeout` | Timeout a user |

### Fun
| Command | Description |
|---------|-------------|
| `/anime image` | Get random anime images |
| `/anime gif` | Get random anime GIFs |
| `/anime quote` | Get random anime quotes |
| `/waifu` | Get random waifu images |

## 🛠️ Development

### Scripts

```bash
npm run dev          # Start all services in development
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Tech Stack

- **Bot**: Discord.js v14, TypeScript
- **API**: Express, Passport, MongoDB
- **Dashboard**: React, TailwindCSS, Zustand, React Query
- **Database**: MongoDB with Mongoose

## 🚀 Deployment

### Pelican.dev (Node.js Generic Egg)

**Single Port Architecture** - Both API and Dashboard run on the same port.

Start command:
```bash
npm run pelican:start
```

Or manually:
```bash
npm install && npm run build && npm run start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
TRUST_PROXY=true
DASHBOARD_URL=https://your-domain.com
OAUTH_CALLBACK_URL=https://your-domain.com/api/auth/discord/callback
```

### Cloudflare / Nginx Reverse Proxy

The app is configured to work behind reverse proxies:
- `trust proxy` is enabled
- Proper security headers are set
- CORS is configured for production

### Docker (Coming Soon)

Docker support will be added in a future update.

## 👥 Dashboard Roles

| Role | Level | Description |
|------|-------|-------------|
| **User** | 0 | Basic access - view only |
| **Support** | 1 | View tickets, moderation logs |
| **Moderator** | 2 | Manage moderation, tickets |
| **Developer** | 3 | Access logs, debug tools |
| **Admin** | 4 | Full guild management |
| **Owner** | 5 | Guild owner - all permissions |
| **Bot Owner** | 99 | Global access to all guilds |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

- [Discord Server](https://discord.gg/your-server)
- [GitHub Issues](https://github.com/yourusername/astra-bot/issues)

---

Made with ❤️ for Discord communities
