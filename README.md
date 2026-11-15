# Hayle — Helpful Assistant, Your Loyal Expert

Hayle bundles the good parts of Carl-bot, MEE6, Dyno, Double Counter and ServerStats
into one loyal package — plus an AI expert that actually answers.

## 1. Install
```bash
npm install
cp .env.example .env   # fill in DISCORD_TOKEN, CLIENT_ID (OPENAI_API_KEY optional)
```

Node 18+ required. Enable **Server Members** + **Message Content** privileged intents at
https://discord.com/developers/applications → your app → Bot.

For public bot listing: tick **PUBLIC BOT** in the Bot tab, and in Settings → Installation
add Guild Install (bot + applications.commands scopes).

## 2. Deploy commands
```bash
npm run deploy
```
(Global = works everywhere, ~1hr to propagate. `GUILD_ID` in .env = instant test-guild deploy.)

## 3. Run
```bash
npm start            # bot
npm run dashboard    # optional website dashboard on http://localhost:3000
```

## What's built in
| Feature | Command(s) | Inspired by |
|---|---|---|
| **Leveling / XP** | `/level` (show, leaderboard, config) | MEE6 |
| **Self-role buttons** | `/buttonrole create` | Carl-bot |
| **Tags** | `/tag` (add/get/delete/list, `!name` in chat) | Carl-bot |
| **Starboard** | `/starboard setup/toggle/status` | classic starboard bots |
| **Voice counters** (member/bot/boost/channel/role) | `/counter create/remove/list` | ServerStats |
| **Automod** (invites, mention spam, floods) | `/automod enable/disable/config/status` | Dyno |
| **Giveaways** | `/giveaway start` | popular giveaway bots |
| **AFK** | `/afk` | Dyno |
| **Alt detection / verify** | `/verify` | **Double Counter** |
| **Roles, welcome/leave, logs, raid protect** | `/role` `/welcome` `/logs` `/raid` | Carl-bot / Dyno |
| **Tickets with Q&A, mod tools, snipe, activity** | `/ticket` `/mod` `/snipe` `/activity` | all-in-one staples |
| **AI assistant** | `/ask` `/generate` | chatgpt bots |
| **Events with signups** | `/event` | community staples |

## Double Counter-style alt checks
`/verify setup` posts a button; accounts get scored on age, avatar, join clusters and
optional browser fingerprint/IP records (via the dashboard `/verify.html` full-verify page).
High risk = blocked for staff review, medium = role + warning log.

Branding lives in `src/config.js` (`botName`, `tagline`, `embedColor`) and every embed
footer carries it automatically.

## GitHub
git is installed locally (full path `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`, may need adding to PATH).
```bash
cd hayle
git init
git add .
git commit -m "Hayle — Helpful Assistant, Your Loyal Expert"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hayle-bot.git
git push -u origin main
```
`.env` and `data.json` are gitignored — secrets and server state never leave your machine.

## Render
Two options, free first:

**Option A — Free Web Service** (sleeps without traffic; the bot includes a health endpoint)
1. Push to GitHub, then at render.com: **New → Web Service → your repo** (it auto-detects `render.yaml`), or **New → Blueprint** and pick the repo.
2. Set env vars: `DISCORD_TOKEN`, `CLIENT_ID`, optional `GUILD_ID`, `OPENAI_API_KEY`.
3. Free instances spin down after 15 min without HTTP traffic — point UptimeRobot (or similar) at your Render URL every 5 min.

**Option B — Background Worker** ($7/mo, always on, no pinger needed)
Render → New → Background Worker → same repo, Build: `npm install`, Start: `npm start`, same env vars.

`npm run deploy` still needed once after any command changes (locally or in Render shell).

## Rich Presence (your profile)
See `presence/README.md` — a tiny local companion that puts "Playing Hayle" on your profile. Local-only, can't run on Render.

## Notes
- Giveaway timers re-arm automatically on restart.
- Counters refresh on member join/leave and every 10 minutes (Discord rate-limits channel renames — don't go below 10 min).
- Leveling uses a 60s per-user cooldown and 15–25 XP per message (tunable in `cfg.levels` per server).
