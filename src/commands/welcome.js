const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Setup welcome & leave messages')
    .addSubcommand(s => s.setName('set').setDescription('Set welcome channel + message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Use {user} {username} {server} {count}').setRequired(true)))
    .addSubcommand(s => s.setName('leave-set').setDescription('Set leave channel + message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Use {user} {username} {server}').setRequired(true)))
    .addSubcommand(s => s.setName('toggle').setDescription('Enable/disable')
      .addStringOption(o => o.setName('type').setDescription('welcome or leave').setRequired(true).addChoices({ name: 'welcome', value: 'welcome' }, { name: 'leave', value: 'leave' }))
      .addBooleanOption(o => o.setName('enabled').setDescription('on/off').setRequired(true)))
    .addSubcommand(s => s.setName('test').setDescription('Preview messages'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i, client) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'set') {
      cfg.welcome.channel = i.options.getChannel('channel').id;
      cfg.welcome.message = i.options.getString('message');
      cfg.welcome.enabled = true; save();
      return i.reply({ embeds: [embed({ title: '✅ Welcome set', description: `<#${cfg.welcome.channel}>\n\`\`\`${cfg.welcome.message}\`\`\`` })] });
    }
    if (sub === 'leave-set') {
      cfg.leave.channel = i.options.getChannel('channel').id;
      cfg.leave.message = i.options.getString('message');
      cfg.leave.enabled = true; save();
      return i.reply({ embeds: [embed({ title: '✅ Leave set', description: `<#${cfg.leave.channel}>\n\`\`\`${cfg.leave.message}\`\`\`` })] });
    }
    if (sub === 'toggle') {
      const t = i.options.getString('type');
      cfg[t].enabled = i.options.getBoolean('enabled'); save();
      return i.reply({ embeds: [embed({ title: `${cfg[t].enabled ? '✅' : '❌'} ${t} ${cfg[t].enabled ? 'enabled' : 'disabled'}` })] });
    }
    if (sub === 'test') {
      return i.reply({ content: `**Welcome:** ${cfg.welcome.message}\n**Leave:** ${cfg.leave.message}`, ephemeral: true });
    }
  }
};
