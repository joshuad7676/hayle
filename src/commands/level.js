const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');
const { levelFromXp, progressBar } = require('../utils/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('MEE6-style levels — check rank, leaderboard, or configure')
    .addSubcommand(s => s.setName('show').setDescription('Show your (or someone\'s) level')
      .addUserOption(o => o.setName('user').setDescription('User to check')))
    .addSubcommand(s => s.setName('leaderboard').setDescription('Server XP leaderboard'))
    .addSubcommand(s => s.setName('config').setDescription('Enable/disable or set announce channel')
      .addBooleanOption(o => o.setName('enabled').setDescription('Turn leveling on/off'))
      .addChannelOption(o => o.setName('announce').setDescription('Channel for level-up announcements')))
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.levels = cfg.levels || { enabled: true, announceChannel: null, users: {} };
    const sub = i.options.getSubcommand();

    if (sub === 'show') {
      const u = i.options.getUser('user') || i.user;
      const rec = cfg.levels.users[u.id] || { xp: 0 };
      const { level, into, need } = levelFromXp(rec.xp);
      const sorted = Object.entries(cfg.levels.users).sort((a, b) => b[1].xp - a[1].xp);
      const rank = sorted.findIndex(([id]) => id === u.id) + 1;
      return i.reply({ embeds: [embed({
        title: `${u.username} — Level ${level}`,
        thumbnail: u.displayAvatarURL(),
        description:
          `${progressBar(into, need)} **${into} / ${need} XP**\n` +
          `Total XP: **${rec.xp}**\n` +
          `Rank: **${rank ? `#${rank}` : 'Unranked'}** of ${sorted.length}`,
      })] });
    }

    if (sub === 'leaderboard') {
      const sorted = Object.entries(cfg.levels.users).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
      if (!sorted.length) return i.reply({ content: 'Nobody has earned XP yet — start chatting!', ephemeral: true });
      const medals = ['🥇', '🥈', '🥉'];
      const lines = sorted.map(([id, rec], n) => {
        const { level } = levelFromXp(rec.xp);
        return `${medals[n] || `**${n + 1}.**`} <@${id}> — Level **${level}** (${rec.xp} XP)`;
      });
      return i.reply({ embeds: [embed({ title: '🏆 XP Leaderboard', description: lines.join('\n') })] });
    }

    if (sub === 'config') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return i.reply({ content: '❌ You need **Manage Server** to configure leveling.', ephemeral: true });
      }
      const enabled = i.options.getBoolean('enabled');
      const announce = i.options.getChannel('announce');
      if (enabled !== null) cfg.levels.enabled = enabled;
      if (announce) cfg.levels.announceChannel = announce.id;
      save();
      return i.reply({ embeds: [embed({
        title: '✅ Leveling config',
        description: `Enabled: **${cfg.levels.enabled ? 'yes' : 'no'}**\nAnnounce channel: ${cfg.levels.announceChannel ? `<#${cfg.levels.announceChannel}>` : 'same channel as the chat'}`,
      })], ephemeral: true });
    }
  },
};
