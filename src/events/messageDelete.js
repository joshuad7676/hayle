const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  name: 'messageDelete',
  async execute(msg) {
    if (!msg.guild || msg.author?.bot) return;
    const cfg = getGuild(msg.guild.id);
    cfg.snipes = cfg.snipes || {};
    cfg.snipes[msg.channelId] = cfg.snipes[msg.channelId] || {};
    cfg.snipes[msg.channelId].deleted = {
      content: (msg.content || '').slice(0, 1500),
      author: msg.author?.tag || 'Unknown',
      at: new Date().toLocaleString(),
    };
    save();
    if (cfg.logs.enabled && cfg.logs.channel && msg.content) {
      const ch = await msg.guild.channels.fetch(cfg.logs.channel).catch(() => null);
      if (ch && ch.id !== msg.channelId) ch.send({ embeds: [embed({ title: `🗑️ Deleted in #${msg.channel.name}`, description: (msg.content || '*no text*').slice(0, 3000), footer: `Author: ${msg.author?.tag}`, color: 0xED4245 })] }).catch(() => {});
    }
  }
};
