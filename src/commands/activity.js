const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('Activity checks (message-based)')
    .addSubcommand(s => s.setName('check').setDescription('Show most active members (top 10)'))
    .addSubcommand(s => s.setName('user').setDescription('Check a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('reset').setDescription('Reset stats'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    const act = cfg.activity || {};
    const sub = i.options.getSubcommand();
    if (sub === 'reset') { cfg.activity = {}; save(); return i.reply({ content: '🧹 Activity reset.', ephemeral: true }); }
    if (sub === 'user') {
      const u = i.options.getUser('user');
      const c = act[u.id] || 0;
      return i.reply({ embeds: [embed({ title: `📊 ${u.tag}`, description: `Messages sent: **${c}**` })], ephemeral: true });
    }
    const top = Object.entries(act).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return i.reply({ embeds: [embed({ title: '📊 Activity leaderboard', description: top.length ? top.map(([id, c], n) => `**${n + 1}.** <@${id}> — ${c} msgs`).join('\n') : 'No data yet. Stats build as people chat.' })] });
  }
};
