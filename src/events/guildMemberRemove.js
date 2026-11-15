const { getGuild } = require('../database');
const { fmt, embed } = require('../utils/helpers');
const { refreshCounters } = require('../utils/counters');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const cfg = getGuild(member.guild.id);
    refreshCounters(member.guild).catch(() => {});
    if (cfg.leave.enabled && cfg.leave.channel) {
      const ch = await member.guild.channels.fetch(cfg.leave.channel).catch(() => null);
      if (ch) ch.send(fmt(cfg.leave.message, member, member.guild)).catch(() => {});
    }
    if (cfg.logs.enabled && cfg.logs.channel) {
      const lc = await member.guild.channels.fetch(cfg.logs.channel).catch(() => null);
      if (lc) lc.send({ embeds: [embed({ title: '📤 Member left', description: `${member.user.tag}`, color: 0xFEE75C })] }).catch(() => {});
    }
  }
};
