// ===========================================
// ASTRA BOT - Passport Configuration
// ===========================================

import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { User } from '../../database/models/index.js';
import { logger } from '../../shared/utils/logger.js';
import { DISCORD_SCOPES } from '../../shared/constants/index.js';

export function configurePassport(): void {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Include accessToken and refreshToken for API calls
      const user = await User.findById(id).select('+accessToken +refreshToken');
      done(null, user as unknown as Express.User);
    } catch (error) {
      done(error, null);
    }
  });

  // Discord OAuth2 Strategy
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    callbackURL: process.env.OAUTH_CALLBACK_URL!,
    scope: DISCORD_SCOPES,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      let user = await User.findOne({ discordId: profile.id });
      
      if (user) {
        // Update existing user
        user.username = profile.username;
        user.discriminator = profile.discriminator || '0';
        user.avatar = profile.avatar || undefined;
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator || '0',
          avatar: profile.avatar || undefined,
          accessToken,
          refreshToken,
        });
      }
      
      logger.info(`User ${profile.username} logged in`);
      done(null, user as unknown as Express.User);
    } catch (error) {
      logger.error('Error in Discord OAuth:', error);
      done(error as Error, undefined);
    }
  }));
}
