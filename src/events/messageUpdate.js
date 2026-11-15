const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMsg, newMsg) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if ((oldMsg.content || '') === (newMsg.content || '')) return;
    const cfg = getGuild(newMsg.guild.id);
    cfg.snipes = cfg.snipes || {};
    cfg.snipes[newMsg.channelId] = cfg.snipes[newMsg.channelId] || {};
    cfg.snipes[newMsg.channelId].edited = {
      before: (oldMsg.content || '*none*').slice(0, 1000),
      after: (newMsg.content || '*none*').slice(0, 1000),
      author: newMsg.author?.tag || 'Unknown',
    };
    save();
    if (cfg.logs.enabled && cfg.logs.channel) {
      const ch = await newMsg.guild.channels.fetch(cfg.logs.channel).catch(() => null);
      if (ch) ch.send({ embeds: [embed({ title: `✏️ Edited in #${newMsg.channel.name}`, description: `**Before:** ${(oldMsg.content || '').slice(0, 1000)}\n**After:** ${(newMsg.content || '').slice(0, 1000)}\n[Jump](https://discord.com/channels/${newMsg.guildId}/${newMsg.channelId}/${newMsg.id})`, footer: `By ${newMsg.author?.tag}` })] }).catch(() => {});
    }
  }
};
