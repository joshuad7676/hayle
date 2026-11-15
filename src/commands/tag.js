const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

const CLEAN = s => String(s).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Carl-bot style tags — save & recall snippets')
    .addSubcommand(s => s.setName('get').setDescription('Show a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)))
    .addSubcommand(s => s.setName('add').setDescription('Create or overwrite a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))
      .addStringOption(o => o.setName('content').setDescription('Tag content').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all tags'))
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.tags = cfg.tags || {};
    const sub = i.options.getSubcommand();
    const name = CLEAN(i.options.getString('name') ?? '');

    if (sub === 'get') {
      const tag = cfg.tags[name];
      if (!tag) return i.reply({ content: `❌ Tag \`${name}\` not found.`, ephemeral: true });
      return i.reply({ content: tag.content.slice(0, 1900) });
    }
    if (sub === 'add') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return i.reply({ content: '❌ You need **Manage Messages** to add tags.', ephemeral: true });
      }
      const content = i.options.getString('content');
      cfg.tags[name] = { content, author: i.user.id, createdAt: Date.now() };
      save();
      return i.reply({ content: `✅ Tag \`${name}\` saved — quote it with \`/tag get ${name}\` or type \`!${name}\`.`, ephemeral: true });
    }
    if (sub === 'delete') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return i.reply({ content: '❌ You need **Manage Messages** to delete tags.', ephemeral: true });
      }
      if (!cfg.tags[name]) return i.reply({ content: `❌ Tag \`${name}\` not found.`, ephemeral: true });
      delete cfg.tags[name];
      save();
      return i.reply({ content: `✅ Tag \`${name}\` deleted.`, ephemeral: true });
    }
    if (sub === 'list') {
      const names = Object.keys(cfg.tags);
      return i.reply({ embeds: [embed({
        title: `🏷️ Tags (${names.length})`,
        description: names.length ? names.map(n => `\`${n}\``).join('  ').slice(0, 4000) : 'No tags yet. Add one with `/tag add`.',
      })], ephemeral: true });
    }
  },
};
