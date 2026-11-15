const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { TYPES, createCounter, removeCounter } = require('../utils/counters');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('counter')
    .setDescription('ServerStats-style voice counters — members, boosts, roles & more')
    .addSubcommand(s => s.setName('create').setDescription('Create a locked voice counter')
      .addStringOption(o => o.setName('type').setDescription('What to count').setRequired(true)
        .addChoices(...Object.entries(TYPES).map(([value, t]) => ({ name: t.label, value }))))
      .addStringOption(o => o.setName('label').setDescription('Custom label (default: type name)')))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a counter')
      .addChannelOption(o => o.setName('channel').setDescription('The counter voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(s => s.setName('list').setDescription('List counters'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.counters = cfg.counters || [];
    const sub = i.options.getSubcommand();

    if (sub === 'create') {
      const type = i.options.getString('type');
      try {
        const { channel } = await createCounter(i.guild, type, i.options.getString('label'));
        return i.reply({ content: `✅ Counter created: ${channel}. It updates automatically.`, ephemeral: true });
      } catch (e) {
        return i.reply({ content: `❌ Could not create counter (check my channel permissions): ${e.message}`, ephemeral: true });
      }
    }
    if (sub === 'remove') {
      const channel = i.options.getChannel('channel');
      await removeCounter(i.guild, channel.id);
      return i.reply({ content: `✅ Counter ${channel.name} removed.`, ephemeral: true });
    }
    if (sub === 'list') {
      const lines = cfg.counters.map(c => `• <#${c.channelId}> — **${c.label}** (${c.type})`);
      return i.reply({ embeds: [embed({
        title: '📊 Counters',
        description: lines.length ? lines.join('\n') : 'No counters yet. Add one with `/counter create`.',
      })], ephemeral: true });
    }
  },
};
