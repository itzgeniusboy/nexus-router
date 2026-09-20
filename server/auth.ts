import crypto from 'crypto';
import type { Express } from 'express';
import passport from 'passport';
import { getDatabase } from './db';
import { pgUpsertUser } from './postgres';

export interface UserSession {
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  email?: string;
}

/**
 * Derives a cryptographically secure hash for a password with salt using PBKDF2 (SHA-512, 100,000 iterations).
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Verifies a plain text password against a stored hash and salt using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false;
  try {
    const computedHash = hashPassword(password, salt);
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

export function getUserById(id: string): UserSession | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    userId: row.id,
    username: row.username || row.email?.split('@')[0] || row.name || 'user',
    name: row.name || row.username || 'User',
    avatar: row.avatar || undefined,
    email: row.email || undefined,
  };
}

export function getUserByUsername(username: string): (UserSession & { passwordHash: string; passwordSalt: string }) | null {
  const db = getDatabase();
  const cleanUsername = username.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanUsername, cleanUsername) as any;
  if (!row) return null;
  return {
    userId: row.id,
    username: row.username || row.email?.split('@')[0] || cleanUsername,
    name: row.name || row.username || 'User',
    avatar: row.avatar || undefined,
    email: row.email || undefined,
    passwordHash: row.password_hash || '',
    passwordSalt: row.password_salt || '',
  };
}

/**
 * Registers a new user with a unique username, password, and optional display name.
 */
export function registerUser(username: string, password: string, name?: string): UserSession {
  const cleanUsername = (username || '').trim();

  // Validate username
  if (!cleanUsername) {
    throw new Error('Username is required.');
  }
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.');
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUsername)) {
    throw new Error('Username can only contain alphanumeric characters, underscores, hyphens, and periods.');
  }

  // Validate password
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const db = getDatabase();

  // Check uniqueness (case-insensitive)
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
  if (existing) {
    throw new Error(`Username "${cleanUsername}" is already taken. Please choose another username.`);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const displayName = (name || '').trim() || cleanUsername;

  // Insert into SQLite
  db.prepare(`
    INSERT INTO users (id, username, password_hash, password_salt, name, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(userId, cleanUsername, passwordHash, salt, displayName);

  // Sync to PostgreSQL if configured
  pgUpsertUser({
    id: userId,
    username: cleanUsername,
    passwordHash,
    passwordSalt: salt,
    name: displayName,
  }).catch(() => {});

  return {
    userId,
    username: cleanUsername,
    name: displayName,
  };
}

/**
 * Authenticates an existing user by username and password.
 */
export function loginUser(username: string, password: string): UserSession {
  const cleanUsername = (username || '').trim();
  if (!cleanUsername) {
    throw new Error('Username is required.');
  }
  if (!password) {
    throw new Error('Password is required.');
  }

  const user = getUserByUsername(cleanUsername);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    throw new Error('Invalid username or password.');
  }

  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    throw new Error('Invalid username or password.');
  }

  return {
    userId: user.userId,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    email: user.email,
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
}
