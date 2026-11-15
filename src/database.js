const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data.json');

let cache = null;
function load() {
  // Always re-read from disk so bot + dashboard (two processes) stay in sync
  try {
    if (!fs.existsSync(DB_PATH)) {
      cache = { guilds: {}, globalBans: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
      return cache;
    }
    const fresh = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!fresh.guilds) fresh.guilds = {};
    // merge in-memory snipes/activity if disk is stale? disk wins for config, keep it simple:
    cache = fresh;
    return cache;
  } catch {
    if (!cache) cache = { guilds: {}, globalBans: [] };
    return cache;
  }
}
function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
}
function getGuild(gid) {
  const db = load();
  if (!db.guilds[gid]) {
    db.guilds[gid] = {
      welcome: { enabled: false, channel: null, message: 'Welcome {user} to {server}! You are member #{count}.' },
      leave: { enabled: false, channel: null, message: '{user} left {server}.' },
      logs: { enabled: false, channel: null, events: ['messageDelete', 'messageUpdate', 'memberJoin', 'memberLeave', 'mod'] },
      tickets: { enabled: false, category: null, logChannel: null, staffRole: null, questions: ['What is your issue?', 'When did it happen?', 'Any proof / screenshots?'] },
      verify: { role: null, log: null, minAge: 7, verified: {}, records: {} },
      raid: { enabled: false, joinsPerSeconds: 5, windowSec: 10, action: 'kick', lockdown: false },
      events: [],
      snipes: {},
      activity: {},
      embeds: {},
      tags: {},
      levels: { enabled: true, announceChannel: null, xpPerMessage: [15, 25], cooldownSec: 60, users: {} },
      starboard: { enabled: false, channel: null, threshold: 3, emoji: '⭐', entries: {} },
      counters: [],
      automod: { enabled: false, invites: true, mentionLimit: 5, spam: true, spamCount: 5, spamWindowSec: 5, log: null },
      afk: {},
      giveaways: [],
    };
    save();
  }
  return db.guilds[gid];
}

module.exports = { load, save, getGuild, DB_PATH };
