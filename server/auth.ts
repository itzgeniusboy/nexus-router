import crypto from 'crypto';
import type { Express } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDatabase } from './db';
import { routerStore } from './store';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
}

export function getUserByEmail(email: string): UserSession | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!row) return null;
  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar || undefined,
  };
}

export function getUserById(id: string): UserSession | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar || undefined,
  };
}

export function createOrUpdateGoogleUser(profile: {
  email: string;
  name: string;
  avatar?: string;
}): UserSession {
  const db = getDatabase();
  const existing = getUserByEmail(profile.email);

  if (existing) {
    db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(
      profile.name,
      profile.avatar || null,
      existing.userId
    );
    // Ensure this email exists in gmail_accounts for this user
    routerStore.addGmailAccount(profile.email, profile.name, existing.userId);
    return {
      userId: existing.userId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    };
  }

  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  db.prepare(`
    INSERT INTO users (id, email, name, avatar, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(userId, profile.email, profile.name, profile.avatar || null);

  // Auto-create primary gmail_accounts row for this authenticated Google user
  const accountId = `gm-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT OR IGNORE INTO gmail_accounts (id, user_id, email, name, is_primary, avatar_color, added_at)
    VALUES (?, ?, ?, ?, 1, '#5B6CFF', datetime('now'))
  `).run(accountId, userId, profile.email, profile.name);

  return {
    userId,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
  };
}

export function configurePassport(app: Express) {
  passport.serializeUser((user: any, done) => {
    done(null, user.userId || user.id);
  });

  passport.deserializeUser((id: string, done) => {
    try {
      const user = getUserById(id);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nexusrouter.vercel.app');
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/auth/google/callback`;

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL,
          proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }
            const name = profile.displayName || email.split('@')[0];
            const avatar = profile.photos?.[0]?.value;

            const user = createOrUpdateGoogleUser({ email, name, avatar });
            return done(null, user);
          } catch (err) {
            return done(err as Error, undefined);
          }
        }
      )
    );
  }
}
