const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Setup audit logs')
    .addSubcommand(s => s.setName('setup').setDescription('Set log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('toggle').setDescription('Enable/disable logs')
      .addBooleanOption(o => o.setName('enabled').setDescription('on/off').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      cfg.logs.channel = i.options.getChannel('channel').id;
      cfg.logs.enabled = true; save();
      return i.reply({ embeds: [embed({ title: '✅ Logs enabled', description: `Logging deletes, edits, joins, leaves + mod actions to <#${cfg.logs.channel}>` })] });
    }
    if (sub === 'toggle') {
      cfg.logs.enabled = i.options.getBoolean('enabled'); save();
      return i.reply({ content: `Logs ${cfg.logs.enabled ? '✅ enabled' : '❌ disabled'}`, ephemeral: true });
    }
  }
};
