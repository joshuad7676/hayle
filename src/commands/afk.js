const { SlashCommandBuilder } = require('discord.js');
const { getGuild, save } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK — I\'ll let people know when they ping you')
    .addStringOption(o => o.setName('reason').setDescription('Why you\'re away').setMaxLength(150))
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.afk = cfg.afk || {};
    cfg.afk[i.user.id] = { reason: i.options.getString('reason') || 'AFK', at: Date.now() };
    save();
    return i.reply({ content: `😴 You're marked AFK: **${cfg.afk[i.user.id].reason}**`, ephemeral: true });
  },
};
