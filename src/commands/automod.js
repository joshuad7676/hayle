const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Dyno-style automod — invite links, mention spam & message floods')
    .addSubcommand(s => s.setName('enable').setDescription('Turn automod on'))
    .addSubcommand(s => s.setName('disable').setDescription('Turn automod off'))
    .addSubcommand(s => s.setName('config').setDescription('Configure filters')
      .addBooleanOption(o => o.setName('invites').setDescription('Block Discord invite links'))
      .addIntegerOption(o => o.setName('mentions').setDescription('Max mentions per message (0 = disable)').setMinValue(0).setMaxValue(50))
      .addBooleanOption(o => o.setName('spam').setDescription('Delete message floods'))
      .addIntegerOption(o => o.setName('spamcount').setDescription('Messages allowed per window (default 5)').setMinValue(2).setMaxValue(30))
      .addIntegerOption(o => o.setName('spamwindow').setDescription('Flood window in seconds (default 5)').setMinValue(1).setMaxValue(60))
      .addChannelOption(o => o.setName('log').setDescription('Channel for automod actions')))
    .addSubcommand(s => s.setName('status').setDescription('Show current automod config'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.automod = { enabled: false, invites: true, mentionLimit: 5, spam: true, spamCount: 5, spamWindowSec: 5, log: null, ...(cfg.automod || {}) };
    const sub = i.options.getSubcommand();

    if (sub === 'enable') { cfg.automod.enabled = true; save(); return i.reply({ content: '🛡️ Automod **enabled**.', ephemeral: true }); }
    if (sub === 'disable') { cfg.automod.enabled = false; save(); return i.reply({ content: '🛡️ Automod **disabled**.', ephemeral: true }); }

    if (sub === 'config') {
      const invites = i.options.getBoolean('invites');
      const mentions = i.options.getInteger('mentions');
      const spam = i.options.getBoolean('spam');
      const spamCount = i.options.getInteger('spamcount');
      const spamWindow = i.options.getInteger('spamwindow');
      const log = i.options.getChannel('log');
      if (invites !== null) cfg.automod.invites = invites;
      if (mentions !== null) cfg.automod.mentionLimit = mentions;
      if (spam !== null) cfg.automod.spam = spam;
      if (spamCount !== null) cfg.automod.spamCount = spamCount;
      if (spamWindow !== null) cfg.automod.spamWindowSec = spamWindow;
      if (log) cfg.automod.log = log.id;
      save();
      return showStatus(i, cfg, true);
    }

    if (sub === 'status') return showStatus(i, cfg, true);
  },
};

function showStatus(i, cfg, ephemeral) {
  const a = cfg.automod;
  return i.reply({
    embeds: [embed({
      title: '🛡️ Automod',
      description:
        `Enabled: **${a.enabled ? 'yes' : 'no'}**\n` +
        `Invite links: **${a.invites ? 'blocked' : 'allowed'}**\n` +
        `Mention limit: **${a.mentionLimit || 'off'}** per message\n` +
        `Flood filter: **${a.spam ? `${a.spamCount} msgs / ${a.spamWindowSec}s` : 'off'}**\n` +
        `Log channel: ${a.log ? `<#${a.log}>` : 'none (falls back to server log)'}`,
    })],
    ephemeral,
  });
}
