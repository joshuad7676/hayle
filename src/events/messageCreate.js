const { PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { levelFromXp } = require('../utils/levels');

const INVITE_RE = /(discord\.gg\/|discord(?:app)?\.com\/invite\/)[a-z0-9-]*/i;

async function automodLog(guild, cfg, text) {
  const channelId = cfg.automod?.log || cfg.logs?.channel;
  const enabled = cfg.automod?.log || (cfg.logs?.enabled && cfg.logs?.channel);
  if (!channelId || !enabled) return;
  const ch = await guild.channels.fetch(channelId).catch(() => null);
  if (ch) ch.send(text).catch(() => {});
}

module.exports = {
  name: 'messageCreate',
  async execute(msg, client) {
    if (!msg.guild || msg.author.bot) return;
    const cfg = getGuild(msg.guild.id);
    const isMod = msg.member?.permissions?.has(PermissionFlagsBits.ManageMessages);

    // ── Automod (Dyno-style) ──
    if (cfg.automod?.enabled && !isMod) {
      const a = cfg.automod;
      const content = msg.content || '';
      const violation =
        (a.invites && INVITE_RE.test(content)) ? 'invite link' :
        (a.mentionLimit > 0 && (msg.mentions.users.size + msg.mentions.roles.size + (msg.mentions.everyone ? 99 : 0)) > a.mentionLimit) ? 'mention spam' :
        null;
      if (violation) {
        await msg.delete().catch(() => {});
        await msg.channel.send(`🛡️ ${msg.author}, that message was removed (**${violation}**).`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
        automodLog(msg.guild, cfg, `🛡️ Automod: deleted **${violation}** from ${msg.author.tag} in ${msg.channel}`);
        return;
      }
      if (a.spam) {
        client.automodSpam = client.automodSpam || new Map();
        const key = `${msg.guild.id}:${msg.author.id}`;
        const now = Date.now();
        const stamps = [...(client.automodSpam.get(key) || []), now].filter(t => now - t < a.spamWindowSec * 1000);
        client.automodSpam.set(key, stamps);
        if (stamps.length > a.spamCount) {
          await msg.delete().catch(() => {});
          await msg.channel.send(`🛡️ ${msg.author}, slow down — you're sending messages too fast.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
          automodLog(msg.guild, cfg, `🛡️ Automod: flood from ${msg.author.tag} in ${msg.channel}`);
          return;
        }
      }
    }

    // ── AFK ──
    cfg.afk = cfg.afk || {};
    let touchedAfk = false;
    if (cfg.afk[msg.author.id]) {
      delete cfg.afk[msg.author.id];
      touchedAfk = true;
      msg.reply('👋 Welcome back — your AFK status was removed.').catch(() => {});
    }
    const mentionedAfk = [...msg.mentions.users.values()].filter(u => u.id !== msg.author.id && cfg.afk[u.id]);
    if (mentionedAfk.length) {
      msg.reply(mentionedAfk.map(u => `😴 **${u.username}** is AFK: ${cfg.afk[u.id].reason}`).join('\n').slice(0, 1900)).catch(() => {});
    }
    if (touchedAfk) save();

    // ── Tags: !name replies with saved snippet (Carl-bot style) ──
    if (msg.content.startsWith('!')) {
      const name = msg.content.slice(1).trim().toLowerCase();
      cfg.tags = cfg.tags || {};
      if (name && !/\s/.test(name) && cfg.tags[name]) {
        return msg.reply(cfg.tags[name].content.slice(0, 1900)).catch(() => {});
      }
    }

    // ── Activity tracking ──
    cfg.activity = cfg.activity || {};
    cfg.activity[msg.author.id] = (cfg.activity[msg.author.id] || 0) + 1;

    // ── Leveling (MEE6-style) ──
    cfg.levels = cfg.levels || { enabled: true, announceChannel: null, users: {} };
    if (cfg.levels.enabled !== false) {
      cfg.levels.users = cfg.levels.users || {};
      client.xpCooldowns = client.xpCooldowns || new Map();
      const cdKey = `${msg.guild.id}:${msg.author.id}`;
      const now = Date.now();
      const cdMs = (cfg.levels.cooldownSec ?? 60) * 1000;
      if (now - (client.xpCooldowns.get(cdKey) || 0) >= cdMs) {
        client.xpCooldowns.set(cdKey, now);
        const [minXp, maxXp] = cfg.levels.xpPerMessage || [15, 25];
        const gain = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
        const before = levelFromXp(cfg.levels.users[msg.author.id]?.xp || 0).level;
        const newXp = (cfg.levels.users[msg.author.id]?.xp || 0) + gain;
        cfg.levels.users[msg.author.id] = { xp: newXp };
        const after = levelFromXp(newXp).level;
        if (after > before) {
          const ch = cfg.levels.announceChannel
            ? await msg.guild.channels.fetch(cfg.levels.announceChannel).catch(() => null)
            : msg.channel;
          if (ch) ch.send(`🎉 ${msg.author} leveled up to **Level ${after}**!`).catch(() => {});
        }
      }
    }

    save();
  },
};
