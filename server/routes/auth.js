import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/schema.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = `usr_${uuidv4().substring(0, 10)}`;
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(
      id, name.trim(), email.toLowerCase().trim(), password_hash
    );
    const token = jwt.sign({ id, name: name.trim(), email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name: name.trim(), email: email.toLowerCase().trim() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/google/url — Generate Google OAuth 2.0 authorization URL
authRouter.get('/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback';

  if (!clientId || clientId === 'your_google_client_id_here') {
    return res.status(503).json({
      error: 'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.',
      configured: false,
    });
  }

  // Create a cryptographically signed state token for CSRF protection
  const state = jwt.sign(
    { nonce: uuidv4(), purpose: 'google_oauth_state' },
    JWT_SECRET,
    { expiresIn: '10m' }
  );

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ].join(' '),
    state,
  });

  res.json({ url: `${rootUrl}?${params.toString()}`, configured: true });
});

// POST /api/auth/google/callback — Exchange authorization code for tokens and authenticate user
authRouter.post('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback';

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required.' });
    }

    if (!state) {
      return res.status(400).json({ error: 'OAuth state parameter is missing.' });
    }

    // Verify CSRF state token
    try {
      const statePayload = jwt.verify(state, JWT_SECRET);
      if (statePayload.purpose !== 'google_oauth_state') {
        return res.status(400).json({ error: 'Invalid OAuth state.' });
      }
    } catch (_stateErr) {
      return res.status(400).json({ error: 'OAuth session has expired or state is invalid. Please try logging in again.' });
    }

    if (!clientId || !clientSecret || clientId === 'your_google_client_id_here') {
      return res.status(503).json({ error: 'Google OAuth is not configured on the server.' });
    }

    // Exchange authorization code for Google access token & ID token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[Google OAuth] Token exchange error:', tokenData);
      return res.status(401).json({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google.'
      });
    }

    // Fetch verified user profile from Google UserInfo endpoint
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: 'Failed to retrieve user profile from Google.' });
    }

    const profile = await userInfoResponse.json();
    const googleId = profile.id;
    const email = profile.email;
    const name = profile.name || email.split('@')[0];
    const avatarUrl = profile.picture || null;

    if (!email) {
      return res.status(400).json({ error: 'Google account did not provide an email address.' });
    }

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

    if (user) {
      // Existing Google user — update avatar or name if updated
      if (avatarUrl && user.avatar_url !== avatarUrl) {
        db.prepare('UPDATE users SET avatar_url = ?, name = COALESCE(?, name) WHERE id = ?')
          .run(avatarUrl, name, user.id);
        user.avatar_url = avatarUrl;
      }
    } else {
      // Check if user with same email exists — Link Account
      const existingByEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existingByEmail) {
        const updatedProvider = existingByEmail.auth_provider === 'local' ? 'local,google' : (existingByEmail.auth_provider || 'google');
        db.prepare(`
          UPDATE users 
          SET google_id = ?, avatar_url = COALESCE(?, avatar_url), auth_provider = ? 
          WHERE id = ?
        `).run(googleId, avatarUrl, updatedProvider, existingByEmail.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(existingByEmail.id);
      } else {
        // Create new user for Google login
        const id = `usr_${uuidv4().substring(0, 10)}`;
        const randomSalt = await bcrypt.genSalt(10);
        const randomHash = await bcrypt.hash(uuidv4() + Date.now().toString(), randomSalt);
        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, google_id, avatar_url, auth_provider)
          VALUES (?, ?, ?, ?, ?, ?, 'google')
        `).run(id, name.trim(), email.toLowerCase().trim(), randomHash, googleId, avatarUrl);
        user = {
          id,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          avatar_url: avatarUrl,
          auth_provider: 'google'
        };
      }
    }

    // Issue RecoverAI session JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider
      }
    });
  } catch (err) {
    console.error('[Google OAuth Callback Error]', err);
    res.status(500).json({ error: 'Internal error processing Google authentication.' });
  }
});

// GET /api/auth/me (protected)
authRouter.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const dbUser = db.prepare('SELECT id, name, email, avatar_url, auth_provider FROM users WHERE id = ?').get(req.user.id);
  if (dbUser) {
    return res.json({ user: dbUser });
  }
  res.json({ user: req.user });
});
