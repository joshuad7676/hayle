const { getGuild, save } = require('../database');
const { fmt, embed } = require('../utils/helpers');
const { refreshCounters } = require('../utils/counters');

async function sendLog(guild, cfg, title, desc, color) {
  if (!cfg.logs.enabled || !cfg.logs.channel) return;
  const ch = await guild.channels.fetch(cfg.logs.channel).catch(() => null);
  if (ch) ch.send({ embeds: [embed({ title, description: desc, color })] }).catch(() => {});
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const cfg = getGuild(member.guild.id);
    // Raid protect
    if (cfg.raid.lockdown) {
      try { await member.kick('Server in lockdown'); } catch {}
      return;
    }
    if (cfg.raid.enabled) {
      const now = Date.now();
      const arr = client.joinTimestamps.get(member.guild.id) || [];
      const fresh = [...arr, now].filter(t => now - t < cfg.raid.windowSec * 1000);
      client.joinTimestamps.set(member.guild.id, fresh);
      if (fresh.length >= cfg.raid.joinsPerSeconds) {
        try {
          if (cfg.raid.action === 'ban') await member.ban({ reason: 'Raid protect: join spike' });
          else await member.kick('Raid protect: join spike');
        } catch {}
        sendLog(member.guild, cfg, '🛡️ Raid action', `Removed ${member.user.tag} (join spike: ${fresh.length}/${cfg.raid.windowSec}s)`, 0xED4245);
        client.joinTimestamps.set(member.guild.id, []);
      }
    }
    if (cfg.welcome.enabled && cfg.welcome.channel) {
      const ch = await member.guild.channels.fetch(cfg.welcome.channel).catch(() => null);
      if (ch) ch.send(fmt(cfg.welcome.message, member, member.guild)).catch(() => {});
    }
    sendLog(member.guild, cfg, '📥 Member joined', `${member.user.tag} (<@${member.id}>) — now ${member.guild.memberCount}`, 0x57F287);
    refreshCounters(member.guild).catch(() => {});
  }
};
