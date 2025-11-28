// ===========================================
// ASTRA BOT - Auth Routes
// ===========================================

import { Router, Request, Response } from 'express';
import passport from 'passport';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Discord OAuth2 login
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth2 callback
router.get('/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: `${process.env.DASHBOARD_URL}/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    // Successful authentication
    res.redirect(`${process.env.DASHBOARD_URL}/dashboard`);
  }
);

// Get current user
router.get('/me', isAuthenticated, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatar,
      avatarUrl: user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`,
    },
  });
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to logout' 
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to destroy session' 
        });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Check auth status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
    } : null,
  });
});

export default router;
