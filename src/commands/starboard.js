const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Pin the community\'s favorite messages to a starboard channel')
    .addSubcommand(s => s.setName('setup').setDescription('Enable the starboard')
      .addChannelOption(o => o.setName('channel').setDescription('Starboard channel').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('⭐ reactions needed (default 3)').setMinValue(1).setMaxValue(20)))
    .addSubcommand(s => s.setName('toggle').setDescription('Enable/disable the starboard'))
    .addSubcommand(s => s.setName('status').setDescription('Show starboard status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.starboard = cfg.starboard || { enabled: false, channel: null, threshold: 3, emoji: '⭐', entries: {} };
    const sub = i.options.getSubcommand();

    if (sub === 'setup') {
      cfg.starboard.channel = i.options.getChannel('channel').id;
      cfg.starboard.threshold = i.options.getInteger('threshold') ?? cfg.starboard.threshold ?? 3;
      cfg.starboard.enabled = true;
      save();
      return i.reply({ embeds: [embed({
        title: '⭐ Starboard enabled',
        description: `Channel: <#${cfg.starboard.channel}>\nThreshold: **${cfg.starboard.threshold}** ⭐\n\nGive any message ${cfg.starboard.threshold} stars and I'll immortalize it.`,
      })] });
    }
    if (sub === 'toggle') {
      cfg.starboard.enabled = !cfg.starboard.enabled;
      save();
      return i.reply({ content: `⭐ Starboard is now **${cfg.starboard.enabled ? 'enabled' : 'disabled'}**.`, ephemeral: true });
    }
    if (sub === 'status') {
      return i.reply({ embeds: [embed({
        title: '⭐ Starboard status',
        description: `Enabled: **${cfg.starboard.enabled ? 'yes' : 'no'}**\nChannel: ${cfg.starboard.channel ? `<#${cfg.starboard.channel}>` : 'not set'}\nThreshold: **${cfg.starboard.threshold}**\nPosts so far: **${Object.keys(cfg.starboard.entries || {}).length}**`,
      })], ephemeral: true });
    }
  },
};
