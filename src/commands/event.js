const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create events people can sign up for')
    .addSubcommand(s => s.setName('create').setDescription('Post an event')
      .addStringOption(o => o.setName('title').setDescription('Event name').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Details').setRequired(true))
      .addStringOption(o => o.setName('time').setDescription('When? e.g. Sat 8PM EST').setRequired(true))
      .addIntegerOption(o => o.setName('slots').setDescription('Max signups (0 = unlimited)'))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('list').setDescription('List events'))
    .setDMPermission(false),
  async execute(i, client) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'create') {
      const ev = {
        id: Date.now().toString(36),
        title: i.options.getString('title'),
        description: i.options.getString('description'),
        time: i.options.getString('time'),
        slots: i.options.getInteger('slots') || 0,
        signups: [],
        by: i.user.id,
      };
      cfg.events.push(ev); save();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`event_join_${ev.id}`).setLabel('Sign Up ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`event_leave_${ev.id}`).setLabel('Leave ❌').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`event_list_${ev.id}`).setLabel('Attendees').setStyle(ButtonStyle.Primary),
      );
      const msg = { embeds: [embed({ title: `📅 ${ev.title}`, description: `${ev.description}\n\n🕒 **When:** ${ev.time}\n👥 **Slots:** ${ev.slots || 'Unlimited'}\n✅ **Signed up:** 0`, footer: `Event ID: ${ev.id} • by ${i.user.tag}` })], components: [row] };
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send(msg);
      return i.reply({ content: `✅ Event posted in ${ch}`, ephemeral: true });
    }
    if (sub === 'list') {
      return i.reply({ embeds: [embed({ title: '📅 Events', description: cfg.events.length ? cfg.events.map(e => `**${e.title}** (\`${e.id}\`) — ${e.time} — ${e.signups.length} signed up`).join('\n') : 'No events.' })], ephemeral: true });
    }
  }
};
