const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../utils/helpers');
const config = require('../config');

const CATEGORIES = [
  ['🤖 AI Assistant', ['ask', 'generate']],
  ['🛡️ Moderation', ['mod', 'automod', 'raid', 'logs']],
  ['🎭 Roles', ['role', 'buttonrole']],
  ['🎮 Levels & XP', ['level']],
  ['🎉 Community', ['giveaway', 'event', 'tag', 'starboard', 'afk', 'snipe', 'activity']],
  ['🎫 Support', ['ticket', 'verify']],
  ['📊 Stats & Counters', ['counter', 'ping']],
  ['🎨 Server Setup', ['welcome', 'embed']],
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('See everything Hayle can do')
    .setDMPermission(true),
  async execute(i, client) {
    const byName = new Map([...client.commands.values()].map(c => [c.data.name, c]));
    const described = new Set();
    const sections = CATEGORIES.map(([title, names]) => {
      const lines = names
        .filter(n => byName.has(n))
        .map(n => { described.add(n); return `**/${n}** — ${byName.get(n).data.description}`; });
      return lines.length ? `**${title}**\n${lines.join('\n')}` : null;
    }).filter(Boolean);

    const rest = [...byName.values()].filter(c => !described.has(c.data.name));
    if (rest.length) sections.push(`**✨ Everything else**\n${rest.map(c => `**/${c.data.name}** — ${c.data.description}`).join('\n')}`);

    return i.reply({
      embeds: [embed({
        title: `👋 ${config.botName} — ${config.tagline}`,
        description: sections.join('\n\n').slice(0, 4000),
        footer: `${config.botName} • Your loyal expert • /help anytime`,
      })],
      ephemeral: true,
    });
  },
};
