const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system with custom Q&A')
    .addSubcommand(s => s.setName('setup').setDescription('Post ticket panel')
      .addChannelOption(o => o.setName('channel').setDescription('Panel channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addChannelOption(o => o.setName('category').setDescription('Category for tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addRoleOption(o => o.setName('staff').setDescription('Staff role').setRequired(true))
      .addChannelOption(o => o.setName('log').setDescription('Transcript log channel').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('questions').setDescription('Set custom questions (separate with | )')
      .addStringOption(o => o.setName('list').setDescription('Q1 | Q2 | Q3 ...').setRequired(true)))
    .addSubcommand(s => s.setName('close').setDescription('Close current ticket'))
    .addSubcommand(s => s.setName('add').setDescription('Add user to ticket')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i, client) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      cfg.tickets.enabled = true;
      cfg.tickets.category = i.options.getChannel('category').id;
      cfg.tickets.staffRole = i.options.getRole('staff').id;
      cfg.tickets.logChannel = i.options.getChannel('log')?.id || null;
      save();
      const panel = embed({ title: '🎫 Support Tickets', description: (cfg.tickets.questions.map((q, n) => `**${n + 1}.** ${q}`).join('\n') || 'Click below to open a ticket.') + '\n\nYou will be asked to answer the questions on open.' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
      );
      await i.options.getChannel('channel').send({ embeds: [panel], components: [row] });
      return i.reply({ content: '✅ Ticket panel posted.', ephemeral: true });
    }
    if (sub === 'questions') {
      const qs = i.options.getString('list').split('|').map(s => s.trim()).filter(Boolean).slice(0, 5);
      if (!qs.length) return i.reply({ content: '❌ Give at least 1 question.', ephemeral: true });
      cfg.tickets.questions = qs; save();
      return i.reply({ embeds: [embed({ title: '✅ Ticket questions updated', description: qs.map((q, n) => `**${n + 1}.** ${q}`).join('\n') })] });
    }
    if (sub === 'close') {
      if (!i.channel.name.startsWith('ticket-')) return i.reply({ content: '❌ Use this inside a ticket channel.', ephemeral: true });
      const msgs = await i.channel.messages.fetch({ limit: 100 }).catch(() => null);
      const transcript = msgs ? [...msgs.values()].reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n').slice(0, 6000) : 'No transcript';
      if (cfg.tickets.logChannel) {
        const lc = await i.guild.channels.fetch(cfg.tickets.logChannel).catch(() => null);
        if (lc) lc.send({ embeds: [embed({ title: `📁 Ticket closed: ${i.channel.name}`, description: `Closed by ${i.user}\n\`\`\`${transcript.slice(0, 3500)}\`\`\`` })] });
      }
      await i.reply('🔒 Closing in 5s...');
      setTimeout(() => i.channel.delete().catch(() => {}), 5000);
      return;
    }
    if (sub === 'add') {
      const u = i.options.getUser('user');
      await i.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true });
      return i.reply({ content: `✅ Added ${u}`, ephemeral: true });
    }
  }
};
