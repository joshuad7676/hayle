require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { load, getGuild, save } = require('../src/database');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT = (process.env.DASHBOARD_URL || `http://localhost:${PORT}`) + '/callback';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: false }));

// Invite URLs: guild install (bot) + user install (global commands in DMs)
const PERMS = 8;
app.get('/api/invite', (req, res) => res.json({
  guildInstall: `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${PERMS}&scope=bot%20applications.commands`,
  userInstall: `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=applications.commands`,
}));

// Discord OAuth2 login
app.get('/login', (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/');
  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
    });
    const tok = await tokenRes.json();
    req.session.access = tok.access_token;
    res.redirect('/dashboard.html');
  } catch (e) { res.status(500).send('OAuth failed: ' + e.message); }
});
app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

// API: my guilds
app.get('/api/me', async (req, res) => {
  if (!req.session.access) return res.status(401).json({ error: 'login' });
  const me = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${req.session.access}` } }).then(r => r.json());
  const guilds = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${req.session.access}` } }).then(r => r.json());
  res.json({ me, guilds });
});

// API: guild settings (read/write)
app.get('/api/guild/:id', (req, res) => {
  if (!req.session.access) return res.status(401).json({ error: 'login' });
  res.json(getGuild(req.params.id));
});
app.post('/api/guild/:id', (req, res) => {
  if (!req.session.access) return res.status(401).json({ error: 'login' });
  const cfg = getGuild(req.params.id);
  const b = req.body;
  if (b.welcome) Object.assign(cfg.welcome, b.welcome);
  if (b.leave) Object.assign(cfg.leave, b.leave);
  if (b.tickets) { if (b.tickets.questions) cfg.tickets.questions = b.tickets.questions.slice(0, 5); Object.assign(cfg.tickets, { ...b.tickets, questions: cfg.tickets.questions }); }
  if (b.verify) Object.assign(cfg.verify || (cfg.verify = {}), b.verify);
  if (b.raid) Object.assign(cfg.raid, b.raid);
  save();
  res.json({ ok: true, cfg });
});

// ── Linked verification (Double-Counter style: Discord OAuth + IP + device fingerprint) ──
app.get('/verify-login', (req, res) => {
  const guild = String(req.query.guild || '');
  const vRedirect = (process.env.DASHBOARD_URL || `http://localhost:${PORT}`) + '/verify-callback?guild=' + encodeURIComponent(guild);
  req.session.pendingGuild = guild;
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(vRedirect)}&response_type=code&scope=identify`;
  res.redirect(url);
});
app.get('/verify-callback', async (req, res) => {
  const code = req.query.code;
  const guild = String(req.query.guild || req.session.pendingGuild || '');
  if (!code || !guild) return res.status(400).send('Missing code/guild.');
  try {
    const vRedirect = (process.env.DASHBOARD_URL || `http://localhost:${PORT}`) + '/verify-callback?guild=' + encodeURIComponent(guild);
    const tok = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: vRedirect }),
    }).then(r => r.json());
    const du = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
    req.session.verifyUser = du;
    req.session.verifyGuild = guild;
    res.redirect('/verify.html?guild=' + encodeURIComponent(guild));
  } catch (e) { res.status(500).send('Verify OAuth failed: ' + e.message); }
});
app.post('/api/verify-complete', async (req, res) => {
  const du = req.session.verifyUser;
  const guild = req.session.verifyGuild || req.body.guild;
  if (!du || !guild) return res.status(401).json({ error: 'login-first' });
  const cfg = getGuild(guild);
  cfg.verify = cfg.verify || { role: null, minAge: 7, verified: {}, records: {} };
  cfg.verify.records = cfg.verify.records || {};
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  const fp = String(req.body.fp || '').slice(0, 128);
  const createdAt = new Date(du.id / 4194304 + 1420070400000).getTime();
  const ageDays = Math.floor((Date.now() - createdAt) / 86400000);
  cfg.verify.records[du.id] = { ip, fp, ua: String(req.headers['user-agent'] || '').slice(0, 200), at: Date.now(), createdAt, username: du.username };
  // alt matches
  const alts = Object.entries(cfg.verify.records)
    .filter(([id, r]) => id !== du.id && ((r.ip && r.ip === ip) || (r.fp && fp && r.fp === fp)))
    .map(([id]) => id);
  const blocked = alts.length > 0 || ageDays < (cfg.verify.minAge ?? 7);
  // try to give role via bot token
  let roleGiven = false, roleError = null;
  if (!blocked && cfg.verify.role && process.env.DISCORD_TOKEN) {
    try {
      const r = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${du.id}/roles/${cfg.verify.role}`, {
        method: 'PUT', headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Length': '0' },
      });
      roleGiven = r.ok;
      if (!r.ok) roleError = await r.text().then(t => t.slice(0, 300));
    } catch (e) { roleError = e.message; }
  }
  if (!blocked) cfg.verify.verified[du.id] = { at: Date.now(), createdAt, joinedAt: Date.now(), linked: true };
  save();
  // log to guild log channel via bot API
  if (cfg.verify.log && process.env.DISCORD_TOKEN) {
    const msg = blocked
      ? `🚨 **Linked verify BLOCKED** — ${du.username} \`${du.id}\` — alts: ${alts.map(a => `<@${a}>`).join(', ') || 'none listed'} — age ${ageDays}d — IP \`${ip}\``
      : `✅ **Linked verified** — ${du.username} \`${du.id}\` — age ${ageDays}d — IP \`${ip}\``;
    await fetch(`https://discord.com/api/v10/channels/${cfg.verify.log}/messages`, {
      method: 'POST', headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msg.slice(0, 1900) }),
    }).catch(() => {});
  }
  res.json({ ok: true, blocked, alts, ageDays, roleGiven, roleError, user: du.username });
});

app.listen(PORT, () => console.log(`🌐 Dashboard: http://localhost:${PORT}`));
