const { EmbedBuilder } = require('discord.js');
const config = require('../config');
function embed({ title, description, fields, color, footer, image, thumbnail }) {
  const e = new EmbedBuilder().setColor(color ?? config.embedColor).setTimestamp();
  if (title) e.setTitle(title.slice(0, 256));
  if (description) e.setDescription(description.slice(0, 4096));
  if (fields) e.addFields(fields.slice(0, 25));
  if (footer) e.setFooter({ text: String(footer).slice(0, 2048) });
  else e.setFooter({ text: `${config.botName} • ${config.tagline}` });
  if (image) e.setImage(image);
  if (thumbnail) e.setThumbnail(thumbnail);
  return e;
}
function fmt(str, member, guild) {
  return String(str || '')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{tag}', member.user.tag)
    .replaceAll('{server}', guild.name)
    .replaceAll('{count}', String(guild.memberCount));
}
module.exports = { embed, fmt };
