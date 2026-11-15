const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Raid protection system')
    .addSubcommand(s => s.setName('setup').setDescription('Configure raid protect')
      .addIntegerOption(o => o.setName('joins').setDescription('Max joins allowed (default 5)').setRequired(true))
      .addIntegerOption(o => o.setName('seconds').setDescription('In X seconds (default 10)').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('kick or ban').addChoices({ name: 'kick', value: 'kick' }, { name: 'ban', value: 'ban' })))
    .addSubcommand(s => s.setName('toggle').setDescription('Enable/disable')
      .addBooleanOption(o => o.setName('enabled').setDescription('on/off').setRequired(true)))
    .addSubcommand(s => s.setName('lockdown').setDescription('Lock/unlock server (block joins)')
      .addBooleanOption(o => o.setName('on').setDescription('lockdown on?').setRequired(true)))
    .addSubcommand(s => s.setName('status').setDescription('Show status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      cfg.raid.joinsPerSeconds = i.options.getInteger('joins');
      cfg.raid.windowSec = i.options.getInteger('seconds');
      cfg.raid.action = i.options.getString('action') || 'kick';
      cfg.raid.enabled = true; save();
      return i.reply({ embeds: [embed({ title: '🛡️ Raid protect on', description: `>${cfg.raid.joinsPerSeconds} joins / ${cfg.raid.windowSec}s → **${cfg.raid.action}**` })] });
    }
    if (sub === 'toggle') { cfg.raid.enabled = i.options.getBoolean('enabled'); save(); return i.reply({ content: `Raid protect ${cfg.raid.enabled ? '✅' : '❌'}`, ephemeral: true }); }
    if (sub === 'lockdown') {
      cfg.raid.lockdown = i.options.getBoolean('on'); save();
      return i.reply({ embeds: [embed({ title: cfg.raid.lockdown ? '🔒 LOCKDOWN ON' : '🔓 Lockdown off', color: cfg.raid.lockdown ? 0xED4245 : 0x57F287 })] });
    }
    if (sub === 'status') {
      return i.reply({ embeds: [embed({ title: '🛡️ Raid status', description: `Enabled: ${cfg.raid.enabled}\nLockdown: ${cfg.raid.lockdown}\nThreshold: ${cfg.raid.joinsPerSeconds}/${cfg.raid.windowSec}s\nAction: ${cfg.raid.action}` })], ephemeral: true });
    }
  }
};
