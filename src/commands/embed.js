const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create & send embeds')
    .addSubcommand(s => s.setName('create').setDescription('Save an embed template')
      .addStringOption(o => o.setName('name').setDescription('Template name').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Title'))
      .addStringOption(o => o.setName('color').setDescription('Hex e.g. #ff0000'))
      .addStringOption(o => o.setName('footer').setDescription('Footer text'))
      .addStringOption(o => o.setName('image').setDescription('Image URL')))
    .addSubcommand(s => s.setName('send').setDescription('Send embed / template to channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('template').setDescription('Saved template name (optional)'))
      .addStringOption(o => o.setName('title').setDescription('Title (if no template)'))
      .addStringOption(o => o.setName('description').setDescription('Description (if no template)'))
      .addStringOption(o => o.setName('color').setDescription('Hex')))
    .addSubcommand(s => s.setName('list').setDescription('List saved embeds'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'create') {
      const name = i.options.getString('name').toLowerCase();
      cfg.embeds[name] = {
        title: i.options.getString('title') || null,
        description: i.options.getString('description'),
        color: i.options.getString('color') || '#5865F2',
        footer: i.options.getString('footer') || null,
        image: i.options.getString('image') || null,
      };
      save();
      return i.reply({ embeds: [embed({ title: '✅ Embed saved', description: `Template \`${name}\` saved. Use \`/embed send template:${name}\`` })] });
    }
    if (sub === 'send') {
      const ch = i.options.getChannel('channel');
      const tplName = i.options.getString('template')?.toLowerCase();
      let data = tplName ? cfg.embeds[tplName] : null;
      if (tplName && !data) return i.reply({ content: `❌ Template \`${tplName}\` not found.`, ephemeral: true });
      if (!data) {
        data = {
          title: i.options.getString('title') || null,
          description: i.options.getString('description') || ' ',
          color: i.options.getString('color') || '#5865F2',
        };
      }
      const e = new EmbedBuilder()
        .setDescription(data.description)
        .setColor(data.color || '#5865F2')
        .setTimestamp();
      if (data.title) e.setTitle(data.title);
      if (data.footer) e.setFooter({ text: data.footer });
      if (data.image) e.setImage(data.image);
      await ch.send({ embeds: [e] });
      return i.reply({ content: `✅ Sent to ${ch}`, ephemeral: true });
    }
    if (sub === 'list') {
      const names = Object.keys(cfg.embeds);
      return i.reply({ embeds: [embed({ title: '📦 Saved embeds', description: names.length ? names.map(n => `• \`${n}\``).join('\n') : 'None yet.' })], ephemeral: true });
    }
  }
};
