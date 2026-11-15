const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;
    try { if (reaction.partial) await reaction.fetch(); } catch { return; }
    const msg = reaction.message;
    if (!msg?.guild) return;

    const cfg = getGuild(msg.guild.id);
    const sb = cfg.starboard;
    if (!sb?.enabled || !sb.channel) return;
    if (reaction.emoji?.name !== (sb.emoji || '⭐')) return;

    const count = reaction.count || 0;
    sb.entries = sb.entries || {};

    // Update an existing starboard post's star count
    if (sb.entries[msg.id]) {
      const ch = await msg.guild.channels.fetch(sb.channel).catch(() => null);
      const starMsg = ch ? await ch.messages.fetch(sb.entries[msg.id]).catch(() => null) : null;
      if (starMsg) await starMsg.edit({ content: `⭐ **${count}** | <#${msg.channel.id}> | [Jump to message](https://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id})` }).catch(() => {});
      return;
    }

    if (count < (sb.threshold || 3)) return;

    const ch = await msg.guild.channels.fetch(sb.channel).catch(() => null);
    if (!ch) return;

    const author = msg.author;
    const image = msg.attachments?.find(a => a.contentType?.startsWith('image/'))?.url;
    const sent = await ch.send({
      content: `⭐ **${count}** | <#${msg.channel.id}> | [Jump to message](https://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id})`,
      embeds: [embed({
        title: '⭐ Starred message',
        description: (msg.content || '*(no text)*').slice(0, 1024),
        thumbnail: author?.displayAvatarURL?.(),
        image,
        footer: `${author?.tag ?? 'Unknown'} • #${msg.channel?.name ?? 'channel'}`,
      })],
    }).catch(() => null);

    if (sent) {
      sb.entries[msg.id] = sent.id;
      save();
    }
  },
};
